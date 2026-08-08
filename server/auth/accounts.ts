/**
 * Accounts — the only place a user row is created or read.
 *
 * There is no password anywhere. An account is an email address plus zero or
 * more passkeys; a magic link is the recovery/bootstrap path.
 */
import { randomUUID } from "node:crypto";
import { sqlite } from "../db";
import type { PublicUser, User } from "@shared/schema";

const nowIso = () => new Date().toISOString();

export function findUserByEmail(email: string): User | undefined {
  return sqlite.prepare(`SELECT id, email, display_name AS displayName,
      created_at AS createdAt, last_sign_in_at AS lastSignInAt, is_demo AS isDemo
    FROM users WHERE email = ?`).get(email.trim().toLowerCase()) as User | undefined;
}

export function findUserById(id: string): User | undefined {
  return sqlite.prepare(`SELECT id, email, display_name AS displayName,
      created_at AS createdAt, last_sign_in_at AS lastSignInAt, is_demo AS isDemo
    FROM users WHERE id = ?`).get(id) as User | undefined;
}

export function createUser(email: string, options: { isDemo?: boolean; displayName?: string } = {}) {
  const normalised = email.trim().toLowerCase();
  const user: User = {
    id: `usr_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
    email: normalised,
    displayName: options.displayName ?? normalised.split("@")[0],
    createdAt: nowIso(),
    lastSignInAt: "",
    isDemo: options.isDemo ? 1 : 0,
  };
  sqlite
    .prepare(
      `INSERT INTO users (id, email, display_name, created_at, last_sign_in_at, is_demo)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(user.id, user.email, user.displayName, user.createdAt, user.lastSignInAt, user.isDemo);
  return user;
}

/** Find or create — used after a verified magic link, never before verification. */
export function upsertUserByEmail(email: string) {
  return findUserByEmail(email) ?? createUser(email);
}

export function markSignedIn(userId: string) {
  sqlite.prepare(`UPDATE users SET last_sign_in_at = ? WHERE id = ?`).run(nowIso(), userId);
}

export function countPasskeys(userId: string) {
  const row = sqlite
    .prepare(`SELECT COUNT(*) AS n FROM passkeys WHERE user_id = ?`)
    .get(userId) as { n: number };
  return row.n;
}

/** Strip everything the browser has no business knowing. */
export function publicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName || user.email.split("@")[0],
    isDemo: user.isDemo === 1,
    passkeyCount: countPasskeys(user.id),
  };
}
