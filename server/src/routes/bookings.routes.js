
import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { pool } from "../config/db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

const bookSchema = z.object({
  sessionId: z.coerce.number().int().positive(),
});

const cancelSchema = z.coerce.number().int().positive();

const checkInSchema = z.object({
  sessionId: z.coerce.number().int().positive(),
  code: z.string().trim().min(1).max(20),
});

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function confirmationCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

async function releaseClient(client) {
  client.release();
}

// Book a session, or join its waitlist when full.
router.post("/", requireAuth, async (req, res, next) => {
  const parsed = bookSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Valid sessionId is required" },
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const sessionResult = await client.query(
      "SELECT id, start_at, capacity FROM gym_sessions WHERE id = $1 FOR UPDATE",
      [parsed.data.sessionId]
    );

    const session = sessionResult.rows[0];

    if (!session) {
      throw httpError(404, "SESSION_NOT_FOUND", "Session not found");
    }

    if (new Date(session.start_at) <= new Date()) {
      throw httpError(409, "SESSION_STARTED", "This session is no longer bookable");
    }

    const existingBooking = await client.query(
      `SELECT id FROM bookings
       WHERE user_id = $1 AND session_id = $2 AND status = 'CONFIRMED'`,
      [req.user.id, session.id]
    );

    if (existingBooking.rowCount) {
      throw httpError(409, "ALREADY_BOOKED", "You already have a booking for this session");
    }

    const existingWaitlist = await client.query(
      `SELECT id FROM waitlist_entries
       WHERE user_id = $1 AND session_id = $2 AND status = 'WAITING'`,
      [req.user.id, session.id]
    );

    if (existingWaitlist.rowCount) {
      throw httpError(409, "ALREADY_WAITLISTED", "You are already on this session's waitlist");
    }

    const countResult = await client.query(
      `SELECT COUNT(*)::int AS count FROM bookings
       WHERE session_id = $1 AND status = 'CONFIRMED'`,
      [session.id]
    );

    if (countResult.rows[0].count >= session.capacity) {
      const waitlistResult = await client.query(
        `INSERT INTO waitlist_entries (user_id, session_id)
         VALUES ($1, $2)
         RETURNING id, session_id AS "sessionId", status, joined_at AS "joinedAt"`,
        [req.user.id, session.id]
      );

      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        message: "Session is full. You have joined the waitlist.",
        data: { waitlist: waitlistResult.rows[0] },
      });
    }

    const code = confirmationCode();

    const bookingResult = await client.query(
      `INSERT INTO bookings (user_id, session_id, confirmation_code)
       VALUES ($1, $2, $3)
       RETURNING id, session_id AS "sessionId", status,
                 confirmation_code AS "confirmationCode",
                 booked_at AS "bookedAt"`,
      [req.user.id, session.id, code]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Session booked successfully",
      data: { booking: bookingResult.rows[0] },
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (error.code === "23505") {
      return next(httpError(409, "BOOKING_CONFLICT", "A booking or waitlist entry already exists"));
    }
    next(error);
  } finally {
    await releaseClient(client);
  }
});

// Members can see only their own bookings.
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.session_id AS "sessionId", b.status,
              b.confirmation_code AS "confirmationCode",
              b.booked_at AS "bookedAt",
              b.cancelled_at AS "cancelledAt",
              s.start_at AS "startAt",
              s.start_at + INTERVAL '1 hour' AS "endAt"
       FROM bookings b
       JOIN gym_sessions s ON s.id = b.session_id
       WHERE b.user_id = $1
       ORDER BY s.start_at DESC`,
      [req.user.id]
    );

    res.json({ success: true, data: { bookings: result.rows } });
  } catch (error) {
    next(error);
  }
});

// Cancel an active booking. Promote the oldest waiting member if eligible.
router.delete("/:id", requireAuth, async (req, res, next) => {
  const parsedId = cancelSchema.safeParse(req.params.id);

  if (!parsedId.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid booking ID" },
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const bookingResult = await client.query(
      `SELECT b.id, b.user_id, b.session_id, b.status, s.start_at, s.capacity
       FROM bookings b
       JOIN gym_sessions s ON s.id = b.session_id
       WHERE b.id = $1
       FOR UPDATE OF b`,
      [parsedId.data]
    );

    const booking = bookingResult.rows[0];

    if (!booking) {
      throw httpError(404, "BOOKING_NOT_FOUND", "Booking not found");
    }

    if (Number(booking.user_id) !== Number(req.user.id) && req.user.role !== "ADMIN") {
      throw httpError(403, "FORBIDDEN", "You cannot cancel another member's booking");
    }

    if (booking.status !== "CONFIRMED") {
      throw httpError(409, "BOOKING_NOT_ACTIVE", "This booking is not active");
    }

    if (new Date(booking.start_at) <= new Date()) {
      throw httpError(409, "CANCELLATION_CLOSED", "Cancellation closes when the session starts");
    }

    // Lock the session to serialize cancellation/promotion with new bookings.
    await client.query(
      "SELECT id FROM gym_sessions WHERE id = $1 FOR UPDATE",
      [booking.session_id]
    );

    await client.query(
      `UPDATE bookings SET status = 'CANCELLED', cancelled_at = NOW()
       WHERE id = $1`,
      [booking.id]
    );

    const waitingResult = await client.query(
      `SELECT w.id, w.user_id
       FROM waitlist_entries w
       WHERE w.session_id = $1 AND w.status = 'WAITING'
       ORDER BY w.joined_at ASC, w.id ASC
       FOR UPDATE`,
      [booking.session_id]
    );

    let promoted = null;

    if (new Date(booking.start_at) > new Date() && waitingResult.rows.length) {
      for (const waiting of waitingResult.rows) {
        const activeBooking = await client.query(
          `SELECT id FROM bookings
           WHERE user_id = $1 AND session_id = $2 AND status = 'CONFIRMED'`,
          [waiting.user_id, booking.session_id]
        );

        if (activeBooking.rowCount) {
          await client.query(
            "UPDATE waitlist_entries SET status = 'CANCELLED' WHERE id = $1",
            [waiting.id]
          );
          continue;
        }

        const code = confirmationCode();

        const promotedBooking = await client.query(
          `INSERT INTO bookings (user_id, session_id, confirmation_code)
           VALUES ($1, $2, $3)
           RETURNING id, user_id AS "userId", session_id AS "sessionId",
                     confirmation_code AS "confirmationCode"`,
          [waiting.user_id, booking.session_id, code]
        );

        await client.query(
          "UPDATE waitlist_entries SET status = 'PROMOTED' WHERE id = $1",
          [waiting.id]
        );

        promoted = promotedBooking.rows[0];
        break;
      }
    }

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Booking cancelled",
      data: { promotedBooking: promoted },
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    await releaseClient(client);
  }
});

// Leave a waitlist before the session starts.
router.delete("/waitlist/:id", requireAuth, async (req, res, next) => {
  const parsedId = cancelSchema.safeParse(req.params.id);

  if (!parsedId.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid waitlist ID" },
    });
  }

  try {
    const result = await pool.query(
      `UPDATE waitlist_entries w
       SET status = 'CANCELLED'
       FROM gym_sessions s
       WHERE w.id = $1
         AND w.session_id = s.id
         AND w.user_id = $2
         AND w.status = 'WAITING'
         AND s.start_at > NOW()
       RETURNING w.id`,
      [parsedId.data, req.user.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        success: false,
        error: { code: "WAITLIST_ENTRY_NOT_FOUND", message: "Active waitlist entry not found" },
      });
    }

    res.json({ success: true, message: "Removed from waitlist" });
  } catch (error) {
    next(error);
  }
});

// Admin check-in: code is valid only during the session's one-hour window.
router.post("/check-in", requireAuth, requireAdmin, async (req, res, next) => {
  const parsed = checkInSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "sessionId and code are required" },
    });
  }

  try {
    const result = await pool.query(
      `UPDATE bookings b
       SET checked_in_at = NOW()
       FROM gym_sessions s
       WHERE b.session_id = s.id
         AND b.session_id = $1
         AND b.confirmation_code = $2
         AND b.status = 'CONFIRMED'
         AND b.checked_in_at IS NULL
         AND NOW() >= s.start_at
         AND NOW() < s.start_at + INTERVAL '1 hour'
       RETURNING b.id, b.user_id AS "userId", b.checked_in_at AS "checkedInAt"`,
      [parsed.data.sessionId, parsed.data.code.toUpperCase()]
    );

    if (!result.rowCount) {
      return res.status(409).json({
        success: false,
        error: {
          code: "CHECK_IN_FAILED",
          message: "Invalid code, cancelled booking, already checked in, or outside session hours",
        },
      });
    }

    res.json({
      success: true,
      message: "Check-in successful",
      data: { checkIn: result.rows[0] },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
