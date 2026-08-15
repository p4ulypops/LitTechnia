/**
 * Magic links (server only).
 *
 * Rules this module enforces:
 *   - the emailed token is 32 random bytes; only its SHA-256 is stored
 *   - single use, ~15 minutes by default (MAGIC_LINK_TTL_MINUTES, 5–60)
 *   - requesting a link never reveals whether an account exists
 *   - a request invalidates the sender's older unused tokens
 *   - with no Resend key configured the link is written to the server log
 *     instead of being emailed; it is only ever returned in an HTTP response
 *     when DEV_ECHO_MAGIC_LINK=true outside production
 *
 * RESEND_API_KEY is read here and nowhere else, and never leaves the process.
 */
import { createHash, randomBytes } from "node:crypto";
import { sqlite } from "../db";
import { env } from "../env";

export type IssuedLink = { url: string; expiresAt: Date; delivered: "email" | "log" };

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export function issueMagicLink(email: string) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.magicLinkTtlMinutes * 60_000);
  sqlite.prepare(`DELETE FROM magic_links WHERE email = ? AND used_at = ''`).run(email);
  sqlite
    .prepare(
      `INSERT INTO magic_links (id, email, created_at, expires_at, used_at) VALUES (?, ?, ?, ?, '')`,
    )
    .run(hash(token), email, now.toISOString(), expiresAt.toISOString());
  const url = `${env.appUrl}/api/auth/magic-link/callback?token=${encodeURIComponent(token)}`;
  return { token, url, expiresAt };
}

/** Consume a token. Returns the email address it was issued to, or undefined. */
export function consumeMagicLink(token: string): string | undefined {
  if (!token || token.length < 32) return undefined;
  const id = hash(token);
  const row = sqlite
    .prepare(
      `SELECT id, email, expires_at AS expiresAt, used_at AS usedAt FROM magic_links WHERE id = ?`,
    )
    .get(id) as { id: string; email: string; expiresAt: string; usedAt: string } | undefined;
  if (!row || row.usedAt) return undefined;
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    sqlite.prepare(`DELETE FROM magic_links WHERE id = ?`).run(id);
    return undefined;
  }
  // Mark used before issuing a session: a replay of the same link fails.
  sqlite.prepare(`UPDATE magic_links SET used_at = ? WHERE id = ?`).run(new Date().toISOString(), id);
  return row.email;
}

/* ------------------------------------------------------------------ delivery */

let resendClient: { emails: { send: (payload: Record<string, unknown>) => Promise<unknown> } } | null =
  null;

async function getResend() {
  if (!env.resendApiKey) return null;
  if (!resendClient) {
    const { Resend } = await import("resend");
    resendClient = new Resend(env.resendApiKey) as unknown as typeof resendClient;
  }
  return resendClient;
}

const plainBody = (url: string, minutes: number) =>
  [
    "Your LitTechnia sign-in link",
    "",
    url,
    "",
    `This link works once and expires in about ${minutes} minutes.`,
    "If you did not ask to sign in, you can ignore this email — nothing has changed.",
  ].join("\n");

const htmlBody = (url: string, minutes: number) => `<!doctype html>
<html><body style="margin:0;background:#f7f5f1;padding:32px;font-family:Georgia,'Iowan Old Style',serif;color:#231f1c">
  <table role="presentation" style="max-width:520px;margin:0 auto;background:#fffdf9;border:1px solid #e3ddd3;border-radius:6px">
    <tr><td style="padding:32px">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#7a6f63">LitTechnia</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:600">Your sign-in link</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6">Open the link below to sign in and carry on writing.</p>
      <p style="margin:0 0 24px"><a href="${url}" style="display:inline-block;padding:12px 20px;background:#231f1c;color:#fffdf9;text-decoration:none;border-radius:4px;font-size:15px">Sign in to LitTechnia</a></p>
      <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#5c534a">This link works once and expires in about ${minutes} minutes.</p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#5c534a">If you did not ask to sign in, ignore this email — nothing has changed.</p>
    </td></tr>
  </table>
</body></html>`;

/**
 * Send the link. Never throws into the request path: delivery failures are
 * logged and reported as the same neutral response as success.
 */
export async function deliverMagicLink(email: string, url: string): Promise<IssuedLink["delivered"]> {
  const minutes = env.magicLinkTtlMinutes;
  const resend = await getResend();
  if (!resend || !env.emailFrom) {
    // Documented development transport: log-only, no mail leaves the machine.
    console.log(`[auth] magic link for ${email} (log transport, not emailed): ${url}`);
    return "log";
  }
  try {
    await resend.emails.send({
      from: env.emailFrom,
      to: email,
      subject: "Your LitTechnia sign-in link",
      text: plainBody(url, minutes),
      html: htmlBody(url, minutes),
    });
    return "email";
  } catch (error) {
    console.error(`[auth] magic link delivery failed: ${(error as Error).message}`);
    return "log";
  }
}
