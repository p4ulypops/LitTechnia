/**
 * Passkeys via @simplewebauthn/server v13.
 *
 * Everything security-relevant happens on this side of the wire: the challenge
 * is generated here, stored here, used once, and the response is verified
 * against the configured origin(s) and RP ID before any session exists. Only
 * public keys and signature counters are stored — private key material never
 * leaves the author's device.
 */
import { randomUUID } from "node:crypto";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { sqlite } from "../db";
import { env } from "../env";
import type { Passkey, User } from "@shared/schema";

const CHALLENGE_TTL_MS = 5 * 60_000;

type Purpose = "registration" | "authentication";

function storeChallenge(purpose: Purpose, challenge: string, userId = "") {
  const id = `chl_${randomUUID().replace(/-/g, "")}`;
  const now = new Date();
  sqlite
    .prepare(
      `INSERT INTO webauthn_challenges (id, user_id, purpose, challenge, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      userId,
      purpose,
      challenge,
      now.toISOString(),
      new Date(now.getTime() + CHALLENGE_TTL_MS).toISOString(),
    );
  return id;
}

function takeChallenge(id: string, purpose: Purpose) {
  const row = sqlite
    .prepare(
      `SELECT id, user_id AS userId, purpose, challenge, expires_at AS expiresAt
       FROM webauthn_challenges WHERE id = ?`,
    )
    .get(id) as
    | { id: string; userId: string; purpose: string; challenge: string; expiresAt: string }
    | undefined;
  if (!row) return undefined;
  sqlite.prepare(`DELETE FROM webauthn_challenges WHERE id = ?`).run(id); // single use
  if (row.purpose !== purpose) return undefined;
  if (new Date(row.expiresAt).getTime() < Date.now()) return undefined;
  return row;
}

/* ------------------------------------------------------------- credentials */

export function listPasskeys(userId: string): Passkey[] {
  return sqlite
    .prepare(
      `SELECT id, user_id AS userId, label, public_key AS publicKey, counter, transports,
              device_type AS deviceType, backed_up AS backedUp, created_at AS createdAt,
              last_used_at AS lastUsedAt
       FROM passkeys WHERE user_id = ? ORDER BY created_at ASC`,
    )
    .all(userId) as Passkey[];
}

function getPasskey(id: string): Passkey | undefined {
  return sqlite
    .prepare(
      `SELECT id, user_id AS userId, label, public_key AS publicKey, counter, transports,
              device_type AS deviceType, backed_up AS backedUp, created_at AS createdAt,
              last_used_at AS lastUsedAt
       FROM passkeys WHERE id = ?`,
    )
    .get(id) as Passkey | undefined;
}

export function removePasskey(userId: string, id: string) {
  return (
    sqlite.prepare(`DELETE FROM passkeys WHERE id = ? AND user_id = ?`).run(id, userId).changes > 0
  );
}

const parseTransports = (raw: string): AuthenticatorTransportFuture[] => {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AuthenticatorTransportFuture[]) : [];
  } catch {
    return [];
  }
};

/* ------------------------------------------------------------ registration */

export async function registrationOptions(user: User) {
  const existing = listPasskeys(user.id);
  const options = await generateRegistrationOptions({
    rpName: env.rpName,
    rpID: env.rpId,
    userName: user.email,
    userDisplayName: user.displayName || user.email,
    userID: new Uint8Array(Buffer.from(user.id, "utf8")),
    attestationType: "none",
    excludeCredentials: existing.map((credential) => ({
      id: credential.id,
      transports: parseTransports(credential.transports),
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      requireResidentKey: false,
      userVerification: "preferred",
    },
  });
  const challengeId = storeChallenge("registration", options.challenge, user.id);
  return { challengeId, options };
}

export async function verifyRegistration(input: {
  user: User;
  challengeId: string;
  label: string;
  response: RegistrationResponseJSON;
}) {
  const stored = takeChallenge(input.challengeId, "registration");
  if (!stored || stored.userId !== input.user.id) {
    return { ok: false as const, error: "That passkey request expired. Please try again." };
  }
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: input.response,
      expectedChallenge: stored.challenge,
      expectedOrigin: env.origins,
      expectedRPID: env.rpId,
      requireUserVerification: false,
    });
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }
  if (!verification.verified || !verification.registrationInfo) {
    return { ok: false as const, error: "That passkey could not be verified." };
  }
  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  if (getPasskey(credential.id)) {
    return { ok: false as const, error: "That passkey is already registered." };
  }
  sqlite
    .prepare(
      `INSERT INTO passkeys (id, user_id, label, public_key, counter, transports, device_type,
                             backed_up, created_at, last_used_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '')`,
    )
    .run(
      credential.id,
      input.user.id,
      input.label,
      Buffer.from(credential.publicKey).toString("base64url"),
      credential.counter,
      JSON.stringify(credential.transports ?? input.response.response.transports ?? []),
      credentialDeviceType,
      credentialBackedUp ? 1 : 0,
      new Date().toISOString(),
    );
  return { ok: true as const, credentialId: credential.id };
}

/* ---------------------------------------------------------- authentication */

/**
 * Discoverable-credential sign-in: no email is required and no credential ids
 * are listed, so requesting options leaks nothing about who has an account.
 */
export async function authenticationOptions() {
  const options = await generateAuthenticationOptions({
    rpID: env.rpId,
    userVerification: "preferred",
  });
  const challengeId = storeChallenge("authentication", options.challenge);
  return { challengeId, options };
}

export async function verifyAuthentication(input: {
  challengeId: string;
  response: AuthenticationResponseJSON;
}) {
  const stored = takeChallenge(input.challengeId, "authentication");
  if (!stored) {
    return { ok: false as const, error: "That sign-in request expired. Please try again." };
  }
  const credential = getPasskey(input.response.id);
  if (!credential) {
    return { ok: false as const, error: "That passkey is not registered here." };
  }
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: input.response,
      expectedChallenge: stored.challenge,
      expectedOrigin: env.origins,
      expectedRPID: env.rpId,
      requireUserVerification: false,
      credential: {
        id: credential.id,
        publicKey: new Uint8Array(Buffer.from(credential.publicKey, "base64url")),
        counter: credential.counter,
        transports: parseTransports(credential.transports),
      },
    });
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }
  if (!verification.verified) {
    return { ok: false as const, error: "That passkey could not be verified." };
  }
  sqlite
    .prepare(`UPDATE passkeys SET counter = ?, last_used_at = ? WHERE id = ?`)
    .run(verification.authenticationInfo.newCounter, new Date().toISOString(), credential.id);
  return { ok: true as const, userId: credential.userId };
}
