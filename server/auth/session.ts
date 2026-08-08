/**
 * Sessions and request guards (v0.3).
 *
 * A session is a 32-byte random token in an httpOnly cookie. Only the SHA-256
 * of that token is stored, so the database cannot be replayed as a live login.
 * Cookies are `SameSite=Lax` and `Secure` in production; mutating requests are
 * additionally checked against the configured origins, which is enough CSRF
 * protection for a cookie that browsers will not attach to cross-site POSTs.
 */
import { createHash, randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { sqlite } from "../db";
import { env } from "../env";
import { findUserById, markSignedIn, publicUser } from "./accounts";
import type { PublicUser, User } from "@shared/schema";

export type SignInMethod = "passkey" | "magic-link" | "dev";

export type SessionContext = {
  sessionId: string;
  user: User;
  method: SignInMethod;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: SessionContext;
    }
  }
}

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const nowIso = () => new Date().toISOString();

function cookieValue(req: Request): string | undefined {
  const jar = (req as Request & { cookies?: Record<string, string> }).cookies;
  const raw = jar?.[env.cookieName];
  return typeof raw === "string" && raw.length >= 32 ? raw : undefined;
}

export function issueSession(res: Response, user: User, method: SignInMethod) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + env.sessionDays * 86_400_000);
  sqlite
    .prepare(
      `INSERT INTO sessions (id, user_id, created_at, last_seen_at, expires_at, method)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(hash(token), user.id, nowIso(), nowIso(), expires.toISOString(), method);
  markSignedIn(user.id);
  res.cookie(env.cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    expires,
  });
  return token;
}

export function readSession(req: Request): SessionContext | undefined {
  const token = cookieValue(req);
  if (!token) return undefined;
  const row = sqlite
    .prepare(
      `SELECT id, user_id AS userId, expires_at AS expiresAt, method FROM sessions WHERE id = ?`,
    )
    .get(hash(token)) as { id: string; userId: string; expiresAt: string; method: string } | undefined;
  if (!row) return undefined;
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    sqlite.prepare(`DELETE FROM sessions WHERE id = ?`).run(row.id);
    return undefined;
  }
  const user = findUserById(row.userId);
  if (!user) {
    sqlite.prepare(`DELETE FROM sessions WHERE id = ?`).run(row.id);
    return undefined;
  }
  sqlite.prepare(`UPDATE sessions SET last_seen_at = ? WHERE id = ?`).run(nowIso(), row.id);
  return { sessionId: row.id, user, method: row.method as SignInMethod };
}

export function destroySession(req: Request, res: Response) {
  const token = cookieValue(req);
  if (token) sqlite.prepare(`DELETE FROM sessions WHERE id = ?`).run(hash(token));
  res.clearCookie(env.cookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
  });
}

/** Sign every other session of this user out (used when a passkey is removed). */
export function destroyOtherSessions(userId: string, keepSessionId: string) {
  sqlite.prepare(`DELETE FROM sessions WHERE user_id = ? AND id != ?`).run(userId, keepSessionId);
}

/* --------------------------------------------------------------- middleware */

/** Attach `req.auth` when a valid session cookie is present. Never rejects. */
export function attachSession(req: Request, _res: Response, next: NextFunction) {
  req.auth = readSession(req);
  next();
}

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Reject state-changing API calls whose Origin is not one we configured. Runs
 * before the session guard so a hostile page cannot even reach an endpoint.
 */
export function checkOrigin(req: Request, res: Response, next: NextFunction) {
  if (SAFE.has(req.method)) return next();
  const origin = req.headers.origin;
  if (!origin) return next(); // same-origin form/fetch without Origin (e.g. curl)
  if (env.origins.includes(origin.replace(/\/+$/, ""))) return next();
  return res.status(403).json({ error: "Request blocked: unrecognised origin" });
}

/** Require a signed-in author. Answers 401 with a stable shape the client uses. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.auth) return next();
  return res.status(401).json({ error: "Sign in to continue", signIn: "/#/sign-in" });
}

export function currentUser(req: Request): PublicUser | null {
  return req.auth ? publicUser(req.auth.user) : null;
}
