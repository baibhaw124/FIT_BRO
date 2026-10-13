
import { Router } from "express";
import { z } from "zod";
import { pool } from "../config/db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

const createSessionSchema = z.object({
  startAt: z.string().datetime({ offset: true }),
});

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
    const parsedDate = req.query.date
      ? dateSchema.safeParse(req.query.date)
      : null;

    if (parsedDate && !parsedDate.success) {
      return res.status(422).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "date must use YYYY-MM-DD format",
        },
      });
    }

    const result = await pool.query(
      `SELECT
         s.id,
         s.start_at AS "startAt",
         s.start_at + INTERVAL '1 hour' AS "endAt",
         s.capacity,
         GREATEST(
           s.capacity - COUNT(b.id) FILTER (WHERE b.status = 'CONFIRMED'),
           0
         )::int AS "remainingSeats"
       FROM gym_sessions s
       LEFT JOIN bookings b ON b.session_id = s.id
       WHERE ($1::date IS NULL OR (s.start_at AT TIME ZONE 'UTC')::date = $1::date)
       GROUP BY s.id
       ORDER BY s.start_at ASC`,
      [parsedDate?.success ? parsedDate.data : null]
    );

    res.json({ success: true, data: { sessions: result.rows } });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const parsed = createSessionSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(422).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "startAt must be a valid ISO datetime with timezone",
        },
      });
    }

    const startAt = new Date(parsed.data.startAt);

    if (!Number.isFinite(startAt.getTime()) || startAt <= new Date()) {
      return res.status(422).json({
        success: false,
        error: {
          code: "INVALID_SESSION_TIME",
          message: "Session must start in the future",
        },
      });
    }

  const submittedStart = parsed.data.startAt;

if (!/T\d{2}:00:00(?:\.000)?(?:Z|[+-]\d{2}:\d{2})$/.test(submittedStart)) {
      return res.status(422).json({
        success: false,
        error: {
          code: "INVALID_SESSION_TIME",
          message: "Sessions must start at the beginning of an hour",
        },
      });
    }

    const result = await pool.query(
      `INSERT INTO gym_sessions (start_at, capacity, created_by)
       VALUES ($1, 20, $2)
       RETURNING id, start_at AS "startAt", capacity`,
      [startAt.toISOString(), req.user.id]
    );

    res.status(201).json({
      success: true,
      message: "Session created",
      data: { session: result.rows[0] },
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        error: {
          code: "SESSION_EXISTS",
          message: "A session already exists at that start time",
        },
      });
    }

    next(error);
  }
});

router.get("/:id/bookings", requireAuth, requireAdmin, async (req, res, next) => {
  const parsedId = z.coerce.number().int().positive().safeParse(req.params.id);

  if (!parsedId.success) {
    return res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid session ID" },
    });
  }

  try {
    const sessionResult = await pool.query(
      `SELECT id, start_at AS "startAt", capacity
       FROM gym_sessions
       WHERE id = $1`,
      [parsedId.data]
    );

    if (!sessionResult.rowCount) {
      return res.status(404).json({
        success: false,
        error: { code: "SESSION_NOT_FOUND", message: "Session not found" },
      });
    }

    const bookingsResult = await pool.query(
      `SELECT b.id, b.user_id AS "userId",
              u.name, u.email,
              b.status,
              b.confirmation_code AS "confirmationCode",
              b.booked_at AS "bookedAt",
              b.cancelled_at AS "cancelledAt",
              b.checked_in_at AS "checkedInAt"
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       WHERE b.session_id = $1
       ORDER BY b.booked_at ASC`,
      [parsedId.data]
    );

    res.json({
      success: true,
      data: {
        session: sessionResult.rows[0],
        bookings: bookingsResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
});


export default router;
