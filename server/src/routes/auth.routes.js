
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "../config/db.js";
import { getFirebaseAdminAuth } from "../config/firebaseAdmin.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(72),
});

router.post("/register", async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(422).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid registration details",
          details: parsed.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
      });
    }

    const { name, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);

    try {
      const result = await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'MEMBER')
         RETURNING id, name, email, role, created_at`,
        [name, normalizedEmail, passwordHash]
      );

      return res.status(201).json({
        success: true,
        message: "Registration successful",
        data: { user: result.rows[0] },
      });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          error: {
            code: "EMAIL_EXISTS",
            message: "An account with this email already exists",
          },
        });
      }

      throw error;
    }
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(422).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid login details",
        },
      });
    }

    const { email, password } = parsed.data;

    const result = await pool.query(
      `SELECT id, name, email, role, password_hash
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      });
    }

    const token = jwt.sign(
      { sub: String(user.id) },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    return res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});
router.post("/firebase", async (req, res, next) => {
  try {
    const parsed = z.object({
      idToken: z.string().min(1),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(422).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "A Firebase ID token is required",
        },
      });
    }

    // Verify the token using Firebase Admin, never client-supplied claims.
    const decoded = await getFirebaseAdminAuth()
      .verifyIdToken(parsed.data.idToken);

    const uid = decoded.uid;
    const email = decoded.email?.trim().toLowerCase() || null;
    const phone = decoded.phone_number || null;
    const name =
      decoded.name?.trim() ||
      (email ? email.split("@")[0] : null) ||
      phone ||
      "FIT_BRO Member";

    if (!email && !phone) {
      return res.status(422).json({
        success: false,
        error: {
          code: "IDENTITY_REQUIRED",
          message: "The Firebase account must provide an email or verified phone number",
        },
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      let result = await client.query(
        `SELECT id, name, email, role, firebase_uid, phone_number
         FROM users
         WHERE firebase_uid = $1
         FOR UPDATE`,
        [uid]
      );

      let user = result.rows[0];

      if (!user && email && decoded.email_verified) {
        result = await client.query(
          `SELECT id, name, email, role, firebase_uid, phone_number
           FROM users
           WHERE email = $1
           FOR UPDATE`,
          [email]
        );

        user = result.rows[0];

        // Do not silently link an account already linked to another Firebase UID.
        if (user?.firebase_uid && user.firebase_uid !== uid) {
          await client.query("ROLLBACK");
          return res.status(409).json({
            success: false,
            error: {
              code: "ACCOUNT_LINK_CONFLICT",
              message: "This email is linked to another sign-in identity",
            },
          });
        }
      }

      if (!user && phone) {
        result = await client.query(
          `SELECT id, name, email, role, firebase_uid, phone_number
           FROM users
           WHERE phone_number = $1
           FOR UPDATE`,
          [phone]
        );

        user = result.rows[0];

        if (user?.firebase_uid && user.firebase_uid !== uid) {
          await client.query("ROLLBACK");
          return res.status(409).json({
            success: false,
            error: {
              code: "ACCOUNT_LINK_CONFLICT",
              message: "This phone number is linked to another sign-in identity",
            },
          });
        }
      }

      if (user) {
        const updated = await client.query(
          `UPDATE users
           SET firebase_uid = $1,
               phone_number = COALESCE(phone_number, $2),
               email = COALESCE(email, $3),
               name = CASE
                 WHEN name IS NULL OR name = '' THEN $4
                 ELSE name
               END
           WHERE id = $5
           RETURNING id, name, email, role`,
          [uid, phone, decoded.email_verified ? email : null, name, user.id]
        );

        user = updated.rows[0];
      } else {
        const created = await client.query(
          `INSERT INTO users
             (name, email, password_hash, role, firebase_uid, phone_number)
           VALUES ($1, $2, NULL, 'MEMBER', $3, $4)
           RETURNING id, name, email, role`,
          [name, decoded.email_verified ? email : null, uid, phone]
        );

        user = created.rows[0];
      }

      await client.query("COMMIT");

      const token = jwt.sign(
        { sub: String(user.id) },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
      );

      return res.json({
        success: true,
        message: "Firebase sign-in successful",
        data: {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
      });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error.code === "auth/argument-error" ||
        error.code === "auth/id-token-expired" ||
        error.code === "auth/invalid-id-token" ||
        error.code === "auth/invalid-credential") {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_FIREBASE_TOKEN",
          message: "Firebase sign-in token is invalid or expired",
        },
      });
    }

    next(error);
  }
});

export default router;
