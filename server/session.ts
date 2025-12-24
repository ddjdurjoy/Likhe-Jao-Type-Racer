import session from "express-session";
import pgSession from "connect-pg-simple";
import { pool } from "./db";

const PgSession = pgSession(session);

export const sessionMiddleware = session({
  name: "lj_session",
  secret: process.env.SESSION_SECRET || "dev-secret-change-me",
  resave: false,
  saveUninitialized: false,
  store:
    process.env.DATABASE_URL && pool
      ? new PgSession({ pool, tableName: "user_sessions", createTableIfMissing: true })
      : undefined,
  cookie: {
    httpOnly: true,
    // For cross-origin setup (Vercel + Render), we need 'none' with secure
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production", // Required for sameSite: none
    maxAge: 1000 * 60 * 60 * 24 * 14, // 14 days
    // Allow cross-domain cookies
    domain: process.env.COOKIE_DOMAIN || undefined,
  },
  // Set proxy trust for production
  proxy: process.env.NODE_ENV === "production",
});
