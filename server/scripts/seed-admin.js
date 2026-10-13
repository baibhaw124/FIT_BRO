
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { pool } from "../src/config/db.js";

dotenv.config();

const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || "";
const name = process.env.ADMIN_NAME || "Gym Administrator";

if (!email || password.length < 12) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) in server/.env");
  process.exitCode = 1;
} else {
  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'ADMIN')
       ON CONFLICT (email) DO NOTHING
       RETURNING id, name, email, role`,
      [name, email, passwordHash]
    );

    if (result.rows.length) {
      console.log("Admin created:", result.rows[0]);
    } else {
      console.log("That email already exists. No account was changed.");
    }
  } catch (error) {
    console.error("Admin seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
