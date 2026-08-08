/**
 * Development-only demo account.
 *
 * The seeded books (The Glass Meridian, Salt and Signal, The Weatherwright's
 * Daughter) are sample content, not anybody's work. They are attached to a
 * single account flagged `is_demo = 1`, so a real new account never inherits
 * them — a fresh sign-in lands on the empty library and its create/import
 * onboarding.
 *
 * Everything here is inert unless WORDSMITHERY_DEMO_SEED=true, and `loadEnv()`
 * refuses to start production if that switch is set.
 */
import { env } from "../env";
import { storage } from "../storage";
import { createUser, findUserByEmail } from "./accounts";
import type { User } from "@shared/schema";

export const demoEnabled = () => env.demoSeed;

export function demoUser(): User | undefined {
  if (!demoEnabled()) return undefined;
  const existing = findUserByEmail(env.demoOwnerEmail);
  if (existing) return existing;
  return createUser(env.demoOwnerEmail, { isDemo: true, displayName: "Demo author" });
}

/** Create the demo account and seed it once, at startup, in development only. */
export function prepareDemoLibrary() {
  if (!demoEnabled()) return;
  const user = demoUser();
  if (!user) return;
  if (storage.isEmpty(user.id)) storage.seedDemoLibrary(user.id);
  console.log(
    `[demo] development demo account ready: ${user.email} — sign in from the sign-in page's ` +
      `"development demo" panel. This path is disabled in production.`,
  );
}

/** Guard for the demo endpoints: only the flagged demo account may use them. */
export function isDemoOwner(user: User | undefined) {
  return Boolean(demoEnabled() && user && user.isDemo === 1);
}
