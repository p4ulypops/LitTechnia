/**
 * Environment configuration (v0.3).
 *
 * One place resolves every setting the server needs, and it fails *loudly at
 * startup* in production when something required is missing. Nothing here is
 * ever sent to the browser: the client only learns the two booleans in
 * `publicAuthConfig()`.
 *
 * Development defaults are deliberately safe rather than convenient:
 *   - no Resend key  → magic links are written to the server log only
 *   - localhost RP id/origin so a local virtual authenticator can be used
 *   - the demo library is *off* unless WORDSMITHERY_DEMO_SEED=true
 */
const truthy = (value: string | undefined) =>
  value !== undefined &&
  ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());

export type AppEnv = {
  nodeEnv: "development" | "production" | "test";
  isProduction: boolean;
  port: number;
  /** Absolute base URL used to build magic links. */
  appUrl: string;
  databasePath: string;
  cookieName: string;
  sessionDays: number;
  magicLinkTtlMinutes: number;
  rpId: string;
  rpName: string;
  /** Every origin a WebAuthn ceremony or state-changing request may come from. */
  origins: string[];
  resendApiKey: string;
  emailFrom: string;
  /** True when a real provider is configured; false = log-only transport. */
  emailConfigured: boolean;
  /** Development only: return the magic link in the API response. */
  devEchoMagicLink: boolean;
  /** Development only: seed the demo library under a demo owner. */
  demoSeed: boolean;
  demoOwnerEmail: string;
};

class ConfigError extends Error {}

function stripSlash(url: string) {
  return url.replace(/\/+$/, "");
}

function parseOrigins(
  env: NodeJS.ProcessEnv,
  appUrl: string,
  rpId: string,
  isProduction: boolean,
) {
  const listed = [env.PASSKEY_ORIGIN, ...(env.TRUSTED_ORIGINS ?? "").split(",")]
    .map((value) => (value ?? "").trim())
    .filter(Boolean)
    .map(stripSlash);
  const set = new Set(listed);
  if (appUrl) set.add(stripSlash(appUrl));
  if (!isProduction) {
    set.add("http://localhost:5000");
    set.add("http://127.0.0.1:5000");
    if (rpId && rpId !== "localhost") set.add(`https://${rpId}`);
  }
  return Array.from(set);
}

export function loadEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  const nodeEnv = (
    env.NODE_ENV === "production"
      ? "production"
      : env.NODE_ENV === "test"
        ? "test"
        : "development"
  ) as AppEnv["nodeEnv"];
  const isProduction = nodeEnv === "production";
  const missing: string[] = [];
  const require = (name: string, value: string | undefined) => {
    const trimmed = (value ?? "").trim();
    if (!trimmed && isProduction) missing.push(name);
    return trimmed;
  };

  const port = Number(env.PORT ?? 5000);
  const appUrl = stripSlash(
    require("APP_URL", env.APP_URL) || `http://localhost:${port}`,
  );
  const rpId = require("PASSKEY_RP_ID", env.PASSKEY_RP_ID) || "localhost";
  const rpName =
    (env.PASSKEY_RP_NAME ?? "LitTechnia").trim() || "LitTechnia";
  const resendApiKey = require("RESEND_API_KEY", env.RESEND_API_KEY);
  const emailFrom = require("EMAIL_FROM", env.EMAIL_FROM);
  const devEchoMagicLink = truthy(env.DEV_ECHO_MAGIC_LINK);
  const demoSeed = truthy(env.WORDSMITHERY_DEMO_SEED);

  if (isProduction) {
    if (devEchoMagicLink)
      missing.push("DEV_ECHO_MAGIC_LINK must not be set in production");
    if (demoSeed)
      missing.push("WORDSMITHERY_DEMO_SEED must not be set in production");
    if (appUrl && !appUrl.startsWith("https://")) {
      missing.push("APP_URL must be an https:// URL in production");
    }
  }
  if (missing.length) {
    throw new ConfigError(
      `LitTechnia cannot start: invalid configuration.\n  - ${missing.join("\n  - ")}\n` +
        `See .env.example and docs/wordsmithery-vps-deployment.md.`,
    );
  }

  const magicLinkTtlMinutes = Math.min(
    Math.max(Number(env.MAGIC_LINK_TTL_MINUTES ?? 15), 5),
    60,
  );

  return {
    nodeEnv,
    isProduction,
    port,
    appUrl,
    databasePath: (env.DATABASE_PATH ?? "./data.db").trim(),
    cookieName: (env.SESSION_COOKIE_NAME ?? "wordsmithery_session").trim(),
    sessionDays: Math.min(Math.max(Number(env.SESSION_TTL_DAYS ?? 30), 1), 90),
    magicLinkTtlMinutes,
    rpId,
    rpName,
    origins: parseOrigins(env, appUrl, rpId, isProduction),
    resendApiKey,
    emailFrom,
    emailConfigured: Boolean(resendApiKey && emailFrom),
    devEchoMagicLink: !isProduction && devEchoMagicLink,
    demoSeed: !isProduction && demoSeed,
    demoOwnerEmail: (env.WORDSMITHERY_DEMO_EMAIL ?? "demo@localhost")
      .trim()
      .toLowerCase(),
  };
}

/**
 * Resolved once at startup. A misconfigured production process prints the
 * problem and exits 1 rather than booting an app with, say, no RP ID and a
 * silently broken sign-in.
 */
function loadOrExit(): AppEnv {
  try {
    return loadEnv();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`\n${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }
}

export const env: AppEnv = loadOrExit();

/**
 * The address the browser used, without the port. Trusts the Origin header
 * first (browsers set it on our POSTs and it cannot be spoofed by page script)
 * and falls back to Host.
 */
export function requestHostname(headers: {
  origin?: string | string[];
  host?: string | string[];
}): string {
  const first = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value) ?? "";
  const origin = first(headers.origin);
  if (origin) {
    try {
      return new URL(origin).hostname.toLowerCase();
    } catch {
      /* fall through to Host */
    }
  }
  const host = first(headers.host).trim().toLowerCase();
  // Strip the port; keep IPv6 literals intact.
  if (host.startsWith("[")) return host.slice(0, host.indexOf("]") + 1);
  return host.split(":")[0];
}

/**
 * WebAuthn will only run when the page's hostname equals the configured RP ID
 * or is a subdomain of it. Visiting the same dev server through a different
 * name — 127.0.0.1 instead of localhost, a LAN IP, a tunnel host — fails inside
 * the browser with a technical message ("127.0.0.1 is an invalid domain"), so we
 * detect it *before* starting a ceremony and say something an author can act on.
 */
export function passkeyAvailableForHost(
  hostname: string,
  rpId: string = env.rpId,
): boolean {
  const host = (hostname ?? "").trim().toLowerCase().replace(/\.$/, "");
  const rp = (rpId ?? "").trim().toLowerCase().replace(/\.$/, "");
  if (!host || !rp) return false;
  return host === rp || host.endsWith(`.${rp}`);
}

/** The only configuration the browser is told about. Contains no secrets. */
export function publicAuthConfig(hostname?: string) {
  return {
    magicLinkEnabled:
      env.emailConfigured || env.devEchoMagicLink || !env.isProduction,
    passkeyEnabled: true,
    /**
     * Whether a passkey ceremony can actually succeed on the address in use.
     * A UI hint only — the server re-checks it before issuing any challenge.
     */
    passkeyAvailableHere:
      hostname === undefined ? true : passkeyAvailableForHost(hostname),
    // Never true in production: loadEnv() refuses to start with the switch set.
    demoEnabled: env.demoSeed,
  };
}

export { ConfigError };
