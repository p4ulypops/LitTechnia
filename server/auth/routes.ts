/**
 * Authentication endpoints.
 *
 * Everything here is unauthenticated by necessity, so each route is rate
 * limited and answers with neutral messages: requesting a magic link returns
 * the same 202 whether or not the address has an account, and passkey options
 * never disclose which credentials exist.
 */
import type { Express, Request, RequestHandler } from "express";
import { z } from "zod";
import {
  challengeIdSchema,
  emailRequestSchema,
  passkeyLabelSchema,
  type SessionResponse,
} from "@shared/schema";
import {
  env,
  passkeyAvailableForHost,
  publicAuthConfig,
  requestHostname,
} from "../env";
import { findUserById, publicUser, upsertUserByEmail } from "./accounts";
import { demoEnabled, demoUser } from "./demo";
import {
  consumeMagicLink,
  deliverMagicLink,
  issueMagicLink,
} from "./magic-link";
import { limit } from "./rate-limit";
import {
  currentUser,
  destroyOtherSessions,
  destroySession,
  issueSession,
  requireAuth,
} from "./session";
import {
  authenticationOptions,
  listPasskeys,
  registrationOptions,
  removePasskey,
  verifyAuthentication,
  verifyRegistration,
} from "./webauthn";

const registrationVerifySchema = challengeIdSchema
  .extend(passkeyLabelSchema.shape)
  .extend({ response: z.record(z.string(), z.unknown()) });

const authenticationVerifySchema = challengeIdSchema.extend({
  response: z.record(z.string(), z.unknown()),
});

const emailFor = (req: Request) => {
  const parsed = emailRequestSchema.safeParse(req.body);
  return parsed.success ? parsed.data.email : "invalid";
};

export function registerAuthRoutes(app: Express) {
  /* ------------------------------------------------------------- session */

  app.get("/api/auth/session", (req, res) => {
    const user = currentUser(req);
    const body: SessionResponse = {
      user,
      needsPasskey: Boolean(user && user.passkeyCount === 0),
      auth: publicAuthConfig(requestHostname(req.headers)),
    };
    res.json(body);
  });

  app.post("/api/auth/sign-out", (req, res) => {
    destroySession(req, res);
    res.json({ ok: true });
  });

  /* ---------------------------------------------------------- magic link */

  app.post(
    "/api/auth/magic-link/request",
    limit({ name: "magic-ip", max: 10, windowMs: 15 * 60_000 }),
    limit({ name: "magic-email", max: 4, windowMs: 15 * 60_000, by: emailFor }),
    async (req, res) => {
      const parsed = emailRequestSchema.safeParse(req.body);
      // Neutral response either way: an invalid address is not confirmation.
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: "That does not look like an email address." });
      }
      const email = parsed.data.email;
      const { url } = issueMagicLink(email);
      const delivered = await deliverMagicLink(email, url);
      const body: Record<string, unknown> = {
        status: "sent",
        message: `If ${email} can receive mail, a sign-in link is on its way. It expires in about ${env.magicLinkTtlMinutes} minutes.`,
        expiresInMinutes: env.magicLinkTtlMinutes,
        transport: delivered,
      };
      // Development convenience only; loadEnv() forbids this flag in production.
      if (env.devEchoMagicLink) body.devLink = url;
      res.status(202).json(body);
    },
  );

  app.get(
    "/api/auth/magic-link/callback",
    limit({ name: "magic-callback", max: 30, windowMs: 15 * 60_000 }),
    (req, res) => {
      const token = typeof req.query.token === "string" ? req.query.token : "";
      const email = consumeMagicLink(token);
      if (!email) {
        return res.redirect(302, `${env.appUrl}/#/sign-in?error=link-expired`);
      }
      const user = upsertUserByEmail(email);
      issueSession(res, user, "magic-link");
      const next =
        listPasskeys(user.id).length === 0 ? "/#/passkey-setup" : "/#/";
      res.redirect(302, `${env.appUrl}${next}`);
    },
  );

  /* ------------------------------------------------------------ passkeys */

  /**
   * The message an author sees when passkeys cannot work on the address they
   * are using. Deliberately free of WebAuthn vocabulary: the browser's own text
   * ("127.0.0.1 is an invalid domain") names a configuration detail the author
   * cannot act on. The technical facts are logged here, server-side only.
   */
  const PASSKEY_WRONG_ADDRESS =
    "Passkeys are not available on this address. Use the email link, or open Wordsmithery on its proper https:// address.";

  const warnedHosts = new Set<string>();

  const requirePasskeyHost: RequestHandler = (req, res, next) => {
    const hostname = requestHostname(req.headers);
    if (passkeyAvailableForHost(hostname)) return next();
    if (!warnedHosts.has(hostname)) {
      warnedHosts.add(hostname);
      console.warn(
        `[auth] passkey ceremony refused: host "${hostname}" does not match PASSKEY_RP_ID ` +
          `"${env.rpId}". WebAuthn would fail in the browser. Open the app on ` +
          `${env.appUrl} or set PASSKEY_RP_ID to match the address in use.`,
      );
    }
    return res
      .status(400)
      .json({ error: PASSKEY_WRONG_ADDRESS, reason: "passkey-wrong-address" });
  };

  app.post(
    "/api/auth/passkey/authenticate/options",
    requirePasskeyHost,
    limit({ name: "passkey-options", max: 30, windowMs: 10 * 60_000 }),
    async (_req, res) => {
      const { challengeId, options } = await authenticationOptions();
      res.json({ challengeId, options });
    },
  );

  app.post(
    "/api/auth/passkey/authenticate/verify",
    limit({ name: "passkey-verify", max: 20, windowMs: 10 * 60_000 }),
    async (req, res) => {
      const parsed = authenticationVerifySchema.safeParse(req.body);
      if (!parsed.success)
        return res.status(400).json({ error: "Incomplete passkey response." });
      const result = await verifyAuthentication({
        challengeId: parsed.data.challengeId,
        response: parsed.data.response as never,
      });
      if (!result.ok) return res.status(401).json({ error: result.error });
      const user = findUserById(result.userId);
      if (!user)
        return res
          .status(401)
          .json({ error: "That passkey is no longer usable." });
      issueSession(res, user, "passkey");
      res.json({ user: publicUser(user) });
    },
  );

  app.post(
    "/api/auth/passkey/register/options",
    requireAuth,
    requirePasskeyHost,
    limit({ name: "passkey-reg-options", max: 20, windowMs: 10 * 60_000 }),
    async (req, res) => {
      const { challengeId, options } = await registrationOptions(
        req.auth!.user,
      );
      res.json({ challengeId, options });
    },
  );

  app.post(
    "/api/auth/passkey/register/verify",
    requireAuth,
    limit({ name: "passkey-reg-verify", max: 20, windowMs: 10 * 60_000 }),
    async (req, res) => {
      const parsed = registrationVerifySchema.safeParse(req.body);
      if (!parsed.success)
        return res.status(400).json({ error: "Incomplete passkey response." });
      const result = await verifyRegistration({
        user: req.auth!.user,
        challengeId: parsed.data.challengeId,
        label: parsed.data.label,
        response: parsed.data.response as never,
      });
      if (!result.ok) return res.status(400).json({ error: result.error });
      res.status(201).json({ user: publicUser(req.auth!.user) });
    },
  );

  app.get("/api/auth/passkeys", requireAuth, (req, res) => {
    res.json({
      passkeys: listPasskeys(req.auth!.user.id).map((credential) => ({
        id: credential.id,
        label: credential.label,
        createdAt: credential.createdAt,
        lastUsedAt: credential.lastUsedAt,
        deviceType: credential.deviceType,
      })),
    });
  });

  app.delete("/api/auth/passkeys/:id", requireAuth, (req, res) => {
    const remaining = listPasskeys(req.auth!.user.id);
    if (remaining.length <= 1) {
      return res.status(400).json({
        error:
          "Keep at least one passkey, or you would need an email link to get back in.",
      });
    }
    if (!removePasskey(req.auth!.user.id, String(req.params.id))) {
      return res
        .status(404)
        .json({ error: "No such passkey on this account." });
    }
    destroyOtherSessions(req.auth!.user.id, req.auth!.sessionId);
    res.status(204).end();
  });

  /* --------------------------------------------------------- dev only */

  /**
   * Local demo sign-in. Exists so the interface can be exercised without a
   * WebAuthn authenticator or a mail provider. It only ever signs in the
   * flagged demo account, and it is not registered at all in production or
   * without WORDSMITHERY_DEMO_SEED=true.
   */
  if (demoEnabled()) {
    app.post(
      "/api/auth/dev/demo-sign-in",
      limit({ name: "demo-sign-in", max: 30, windowMs: 10 * 60_000 }),
      (req, res) => {
        const user = demoUser();
        if (!user)
          return res
            .status(404)
            .json({ error: "Demo account is not enabled." });
        issueSession(res, user, "dev");
        res.json({ user: publicUser(user), demo: true });
      },
    );
  }
}
