/**
 * Client-side session state.
 *
 * This file holds *no* authority. It reads GET /api/auth/session and reflects
 * whatever the server says; the guard in App.tsx only decides what to render.
 * Every protected request is checked again on the server, so a tampered client
 * flag gains nothing.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import {
  apiRequest,
  getQueryFn,
  UNAUTHENTICATED_EVENT,
} from "@/lib/queryClient";
import type { PublicUser, SessionResponse } from "@shared/schema";

export const SESSION_KEY = ["/api/auth/session"] as const;

type AuthValue = {
  user: PublicUser | null;
  needsPasskey: boolean;
  magicLinkEnabled: boolean;
  passkeyEnabled: boolean;
  /** False when this address cannot run a passkey ceremony at all. */
  passkeyAvailableHere: boolean;
  demoEnabled: boolean;
  isLoading: boolean;
  isError: boolean;
  refresh: () => Promise<SessionResponse>;
  signOut: () => Promise<void>;
  signInWithPasskey: () => Promise<void>;
  registerPasskey: (label: string) => Promise<void>;
  requestMagicLink: (
    email: string,
  ) => Promise<{ message: string; devLink?: string }>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const client = useQueryClient();
  const query = useQuery<SessionResponse>({
    queryKey: SESSION_KEY,
    queryFn: getQueryFn<SessionResponse>({ on401: "returnNull" }),
    retry: false,
  });

  /**
   * Read the session back from the server and write it straight into the cache.
   * Sign-in and sign-out both cross a cache-clearing boundary, so an explicit
   * read is more predictable than hoping a background refetch lands first.
   */
  const refresh = useCallback(async () => {
    const next = (await (
      await apiRequest("GET", "/api/auth/session")
    ).json()) as SessionResponse;
    client.setQueryData(SESSION_KEY, next);
    return next;
  }, [client]);

  // Any 401 anywhere re-checks the session, so an expired cookie shows the
  // sign-in page instead of a wall of failed panels.
  useEffect(() => {
    const onUnauthenticated = () => {
      void client.invalidateQueries({ queryKey: SESSION_KEY });
    };
    window.addEventListener(UNAUTHENTICATED_EVENT, onUnauthenticated);
    return () =>
      window.removeEventListener(UNAUTHENTICATED_EVENT, onUnauthenticated);
  }, [client]);

  /**
   * Forget every cached record from the previous account without disturbing the
   * session query itself — clearing the whole client detaches this observer and
   * the gate can then miss the new session.
   */
  const dropAccountData = useCallback(() => {
    client.removeQueries({
      predicate: (q) => String(q.queryKey[0] ?? "") !== "/api/auth/session",
    });
  }, [client]);

  const value = useMemo<AuthValue>(() => {
    const data = query.data ?? null;
    return {
      user: data?.user ?? null,
      needsPasskey: Boolean(data?.needsPasskey),
      magicLinkEnabled: data?.auth?.magicLinkEnabled ?? true,
      passkeyEnabled: data?.auth?.passkeyEnabled ?? true,
      passkeyAvailableHere: data?.auth?.passkeyAvailableHere ?? true,
      demoEnabled: Boolean(data?.auth?.demoEnabled),
      isLoading: query.isLoading,
      isError: query.isError,
      refresh,
      async signOut() {
        await apiRequest("POST", "/api/auth/sign-out");
        dropAccountData();
        await refresh();
      },
      async signInWithPasskey() {
        const optionsRes = await apiRequest(
          "POST",
          "/api/auth/passkey/authenticate/options",
          {},
        );
        const { challengeId, options } = await optionsRes.json();
        const response = await startAuthentication({ optionsJSON: options });
        await apiRequest("POST", "/api/auth/passkey/authenticate/verify", {
          challengeId,
          response,
        });
        dropAccountData();
        await refresh();
      },
      async registerPasskey(label: string) {
        const optionsRes = await apiRequest(
          "POST",
          "/api/auth/passkey/register/options",
          {},
        );
        const { challengeId, options } = await optionsRes.json();
        const response = await startRegistration({ optionsJSON: options });
        await apiRequest("POST", "/api/auth/passkey/register/verify", {
          challengeId,
          label,
          response,
        });
        await refresh();
      },
      async requestMagicLink(email: string) {
        const res = await apiRequest("POST", "/api/auth/magic-link/request", {
          email,
        });
        return (await res.json()) as { message: string; devLink?: string };
      },
    };
  }, [
    client,
    dropAccountData,
    query.data,
    query.isLoading,
    query.isError,
    refresh,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

/**
 * Messages an author can act on. Nothing here names WebAuthn, an RP ID, a
 * domain or an exception class.
 */
export const PASSKEY_WRONG_ADDRESS_MESSAGE =
  "Passkeys are not available on this address. Use the email link, or open LitTechnia on its proper https:// address.";

const PASSKEY_GENERIC_MESSAGE =
  "Passkeys did not work in this browser. Use the email link instead.";

/**
 * Our own API answers with prose written for authors, so those messages may be
 * shown. Browser exceptions may not: their text names hostnames, RP IDs and
 * exception classes. Read the useful ones by *name* and translate; send the
 * rest to a plain fallback.
 */
function serverMessage(error: unknown): string | null {
  const raw = error instanceof Error ? error.message : String(error);
  const match = raw.match(/^(\d{3}): ([\s\S]*)$/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[2]) as { error?: string };
    if (typeof parsed.error === "string" && parsed.error.trim())
      return parsed.error;
  } catch {
    const text = match[2].trim();
    // Anything that is not JSON from our API (an HTML error page, say) is not
    // safe to show verbatim.
    if (text && !/^</.test(text) && text.length <= 200) return text;
  }
  return null;
}

/** Turn a thrown Response error into something an author can act on. */
export function authErrorMessage(error: unknown) {
  const fromServer = serverMessage(error);
  if (fromServer) return fromServer;
  return "Something went wrong. Please try again.";
}

/**
 * Passkey ceremonies fail for several reasons and the browser describes them in
 * technical terms that vary by engine — "127.0.0.1 is an invalid domain",
 * "The RP ID \"example.com\" is invalid for this domain", "The operation is
 * insecure". None of that belongs on screen. This maps every failure onto one of
 * four calm messages, defaulting to the generic one rather than passing raw text
 * through.
 */
export function passkeyErrorMessage(error: unknown) {
  const fromServer = serverMessage(error);
  if (fromServer) return fromServer;

  const name = error instanceof Error ? error.name : "";
  const raw = error instanceof Error ? error.message : String(error);
  const text = `${name} ${raw}`;

  // The author dismissed the OS prompt, or it timed out. Their next move is
  // simply to try again.
  if (
    /NotAllowedError|AbortError|TimeoutError|timed out|not allowed/i.test(text)
  ) {
    return "That passkey prompt was closed or timed out. You can try again.";
  }
  // A passkey for this account already exists on this device.
  if (/InvalidStateError/i.test(text)) {
    return "This device already has a passkey for LitTechnia. Try signing in with it instead.";
  }
  // Wrong hostname for the configured RP ID, an IP address, a plain-http or
  // otherwise insecure context: an operator problem, not the author's.
  if (
    /SecurityError|invalid domain|invalid for this domain|\bRP ID\b|relying party|secure context|insecure|https/i.test(
      text,
    )
  ) {
    return PASSKEY_WRONG_ADDRESS_MESSAGE;
  }
  return PASSKEY_GENERIC_MESSAGE;
}
