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
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 14, // 14 days
  },
});
