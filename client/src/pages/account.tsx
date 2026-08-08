/**
 * Account — identity, passkeys, sign out.
 *
 * Also the landing page straight after a magic link (route /passkey-setup),
 * where naming and creating a passkey is the one thing being asked for. No
 * passwords, no profile busywork.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Fingerprint, KeyRound, LogOut, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, Panel } from "@/components/fields";
import {
  PASSKEY_WRONG_ADDRESS_MESSAGE,
  authErrorMessage,
  passkeyErrorMessage,
  useAuth,
} from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

type PasskeyRow = {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string;
  deviceType: string;
};

const PASSKEYS_KEY = ["/api/auth/passkeys"] as const;

function suggestLabel() {
  const agent = navigator.userAgent;
  if (/iPhone|iPad/i.test(agent)) return "This iPhone or iPad";
  if (/Macintosh/i.test(agent)) return "This Mac";
  if (/Android/i.test(agent)) return "This Android device";
  if (/Windows/i.test(agent)) return "This Windows PC";
  return "This device";
}

export default function AccountPage({ prompt = false }: { prompt?: boolean }) {
  const { user, registerPasskey, signOut, passkeyAvailableHere } = useAuth();
  const [, navigate] = useLocation();
  const [label, setLabel] = useState(suggestLabel());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const passkeys = useQuery<{ passkeys: PasskeyRow[] }>({
    queryKey: PASSKEYS_KEY,
  });
  const rows = passkeys.data?.passkeys ?? [];

  async function onAdd(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setDone("");
    // Say it plainly before the browser can raise a technical error about the
    // address in use.
    if (!passkeyAvailableHere) {
      setError(PASSKEY_WRONG_ADDRESS_MESSAGE);
      return;
    }
    setBusy(true);
    try {
      await registerPasskey(label.trim() || "This device");
      await queryClient.invalidateQueries({ queryKey: PASSKEYS_KEY });
      setDone("Passkey saved. You can sign in with it from now on.");
    } catch (caught) {
      setError(passkeyErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(id: string) {
    setError("");
    setDone("");
    try {
      await apiRequest(
        "DELETE",
        `/api/auth/passkeys/${encodeURIComponent(id)}`,
      );
      await queryClient.invalidateQueries({ queryKey: PASSKEYS_KEY });
    } catch (caught) {
      setError(authErrorMessage(caught));
    }
  }

  return (
    <div className="max-w-3xl space-y-8" data-testid="page-account">
      <header>
        <p className="eyebrow">{prompt ? "One last step" : "Account"}</p>
        <h1 className="mt-1 font-serif text-2xl leading-tight md:text-3xl">
          {prompt ? "Add a passkey to this device" : "Your account"}
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
          {prompt
            ? "You are signed in. Naming a passkey now means next time you can open Wordsmithery with your fingerprint, face or device PIN instead of waiting for an email."
            : "Wordsmithery has no password to change. Sign-in is a passkey on a device you trust, with an emailed single-use link as a fallback."}
        </p>
      </header>

      <Panel title="Signed in as" testId="panel-identity">
        <p className="font-mono text-sm" data-testid="text-account-email">
          {user?.email ?? "—"}
        </p>
        {user?.isDemo && (
          <p
            className="mt-1 text-xs text-muted-foreground"
            data-testid="text-account-demo"
          >
            This is the local demo account. Its sample books are not anybody's
            real work.
          </p>
        )}
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => void signOut()}
          data-testid="button-account-signout"
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden />
          Sign out
        </Button>
      </Panel>

      <Panel title="Passkeys" testId="panel-passkeys">
        {error && (
          <p
            className="mb-3 text-sm text-destructive"
            role="alert"
            data-testid="text-passkey-error"
          >
            {error}
          </p>
        )}
        {done && (
          <p
            className="mb-3 text-sm text-muted-foreground"
            data-testid="text-passkey-done"
          >
            {done}
          </p>
        )}

        {rows.length === 0 ? (
          <EmptyState
            title="No passkey on this account yet"
            body="Add one and you can skip the email step next time."
            testId="empty-passkeys"
          />
        ) : (
          <ul className="divide-y divide-border" data-testid="list-passkeys">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 py-2.5"
                data-testid={`row-passkey-${row.id.slice(0, 8)}`}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm">
                    <KeyRound
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    {row.label}
                  </span>
                  <span className="block font-mono text-xs text-muted-foreground">
                    added {row.createdAt.slice(0, 10)}
                    {row.lastUsedAt
                      ? ` · last used ${row.lastUsedAt.slice(0, 10)}`
                      : " · not used yet"}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void onRemove(row.id)}
                  data-testid={`button-remove-passkey-${row.id.slice(0, 8)}`}
                  aria-label={`Remove passkey ${row.label}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form
          className="mt-5 space-y-3 border-t border-border pt-4"
          onSubmit={onAdd}
        >
          <div className="space-y-1.5">
            <Label htmlFor="passkey-label">Name this passkey</Label>
            <Input
              id="passkey-label"
              value={label}
              maxLength={60}
              onChange={(event) => setLabel(event.target.value)}
              data-testid="input-passkey-label"
            />
            <p className="text-xs text-muted-foreground">
              A name you will recognise later, like “My laptop” or “Work phone”.
            </p>
            {!passkeyAvailableHere && (
              <p
                className="text-xs text-muted-foreground"
                data-testid="text-passkey-unavailable-here"
              >
                Passkeys need Wordsmithery&rsquo;s proper https:// address. Open
                it there to add one.
              </p>
            )}
          </div>
          <Button
            type="submit"
            disabled={busy}
            data-testid="button-add-passkey"
          >
            <Fingerprint className="mr-2 h-4 w-4" aria-hidden />
            {busy ? "Waiting for your device…" : "Create passkey"}
          </Button>
        </form>
      </Panel>

      {prompt && (
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          data-testid="button-skip-passkey"
        >
          Not now — take me to my library
        </Button>
      )}
    </div>
  );
}

export function PasskeySetupPage() {
  return <AccountPage prompt />;
}

/** Route-friendly wrapper: wouter passes route props, which AccountPage ignores. */
export function AccountRoute() {
  return <AccountPage />;
}
