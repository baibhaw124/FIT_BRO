

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { testDatabaseConnection } from "./src/config/db.js";
import sessionRoutes from "./src/routes/sessions.routes.js";
import bookingRoutes from "./src/routes/bookings.routes.js";
import authRoutes from "./src/routes/auth.routes.js";
import {
  notFoundHandler,
  errorHandler,
} from "./src/middleware/errorHandler.js";

dotenv.config();

const app = express();
const allowedOrigins = [
  "https://fit-bro-delta.vercel.app",
  "https://fit-bro-git-main-team-baibhaw.vercel.app",
  "http://localhost:5173",
];

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked: ${origin}`));
  },
}));
app.use(express.json({ limit: "20kb" }));

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Gym Booking API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/bookings", bookingRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = Number(process.env.PORT || 5000);

try {
  await testDatabaseConnection();

  app.listen(PORT, () => {
    console.log(`Gym Booking API running at http://localhost:${PORT}`);
  });
} catch (error) {
  console.error("Failed to connect to PostgreSQL:", error.message);
  process.exit(1);
}
