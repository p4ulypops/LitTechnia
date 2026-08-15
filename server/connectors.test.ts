import { describe, expect, it } from "vitest";
import { resolveConnectors } from "./connectors";
import type { AppEnv } from "./env";

/**
 * A fully-configured environment: every connector's env vars present,
 * credential encryption present, connectors flag on. Used as the "best
 * case" baseline -- if a connector is still not `available` here, that is a
 * deliberate release decision, not a missing env var.
 */
function fixtureEnv(overrides: Partial<AppEnv> = {}): AppEnv {
  return {
    nodeEnv: "test",
    isProduction: false,
    port: 5000,
    appUrl: "http://localhost:5000",
    databasePath: ":memory:",
    cookieName: "test_session",
    sessionDays: 30,
    magicLinkTtlMinutes: 15,
    rpId: "localhost",
    rpName: "LitTechnia",
    origins: ["http://localhost:5000"],
    resendApiKey: "",
    emailFrom: "LitTechnia <no-reply@littechnia.com>",
    emailConfigured: false,
    devEchoMagicLink: true,
    demoSeed: false,
    demoOwnerEmail: "demo@localhost",
    connectorsEnabled: true,
    credentialEncryptionConfigured: true,
    googleOAuthConfigured: true,
    microsoftOAuthConfigured: true,
    wordpressComOAuthConfigured: true,
    youtubeOAuthConfigured: true,
    elevenLabsConfigured: true,
    ...overrides,
  };
}

function stateOf(env: AppEnv, id: string) {
  const connector = resolveConnectors(env).find((c) => c.id === id);
  if (!connector) throw new Error(`No connector registered with id "${id}"`);
  return connector;
}

describe("resolveConnectors", () => {
  it("returns exactly one entry per registered connector id", () => {
    const connectors = resolveConnectors(fixtureEnv());
    const ids = connectors.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(0);
  });

  it("never puts a secret or key value in any reason or summary field", () => {
    const env = fixtureEnv({
      credentialEncryptionConfigured: true,
      elevenLabsConfigured: true,
    });
    for (const connector of resolveConnectors(env)) {
      const text = `${connector.summary} ${connector.reason}`;
      expect(text).not.toMatch(/sk-|Bearer |xox[bp]-/);
    }
  });

  it("keeps every credential-backed connector on blocked_security even when fully configured", () => {
    const env = fixtureEnv(); // everything present
    for (const id of [
      "wordpress-self-hosted",
      "wordpress-com",
      "google-docs",
      "microsoft-onedrive",
      "elevenlabs",
    ]) {
      expect(stateOf(env, id).state).toBe("blocked_security");
    }
  });

  it("changes the stated reason for an OAuth connector once its keys are present, without upgrading its state", () => {
    const missing = stateOf(
      fixtureEnv({ credentialEncryptionConfigured: true, googleOAuthConfigured: false }),
      "google-docs",
    );
    const present = stateOf(
      fixtureEnv({ credentialEncryptionConfigured: true, googleOAuthConfigured: true }),
      "google-docs",
    );
    expect(missing.state).toBe("blocked_security");
    expect(present.state).toBe("blocked_security");
    expect(missing.reason).not.toBe(present.reason);
    expect(missing.reason).toMatch(/Needs GOOGLE_OAUTH/);
    expect(present.reason).toMatch(/adapter/);
  });

  it("blames missing credential encryption first, even if the OAuth keys themselves are set", () => {
    const connector = stateOf(
      fixtureEnv({ credentialEncryptionConfigured: false, googleOAuthConfigured: true }),
      "google-docs",
    );
    expect(connector.state).toBe("blocked_security");
    expect(connector.reason).toMatch(/CREDENTIAL_ENCRYPTION_KEY/);
  });

  it("marks Medium and Substack as handoff_only with no external link", () => {
    for (const id of ["medium", "substack"]) {
      const connector = stateOf(fixtureEnv(), id);
      expect(connector.state).toBe("handoff_only");
      expect(connector.actionHref).toBeUndefined();
    }
  });

  it("marks working no-account file/feed capabilities as file_based", () => {
    for (const id of ["markdown-txt", "rss-atom"]) {
      expect(stateOf(fixtureEnv(), id).state).toBe("file_based");
    }
  });

  it("routes unsupported file connectors to the real Markdown import as a safe alternative", () => {
    for (const id of ["rich-documents", "goodreads"]) {
      const connector = stateOf(fixtureEnv(), id);
      expect(connector.state).toBe("unsupported");
      expect(connector.actionHref).toBe("/import");
    }
  });

  it("marks video platforms unsupported regardless of configuration", () => {
    for (const id of ["youtube", "instagram", "tiktok"]) {
      expect(stateOf(fixtureEnv(), id).state).toBe("unsupported");
    }
  });
});
