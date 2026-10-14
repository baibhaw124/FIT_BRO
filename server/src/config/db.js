
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

export const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false,
      },
    })
  : new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

export async function testDatabaseConnection() {
  const result = await pool.query(
    "SELECT current_database() AS database"
  );

  console.log(`Connected to database: ${result.rows[0].database}`);
}
