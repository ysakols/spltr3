import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

// Initialize PostgreSQL session store
const PgSession = connectPgSimple(session);

// Create session setup with PostgreSQL store
export const sessionMiddleware = session({
  store: new PgSession({
    pool: pool,
    tableName: "sessions", // Optional. Default is "session"
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || "keyboard cat",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
});