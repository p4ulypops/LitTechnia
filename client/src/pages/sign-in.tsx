/**
 * Sign in — passwordless.
 *
 * Passkey first, because it is the calmest and safest path: one prompt, no
 * typing, nothing to forget. An email link is offered underneath for a new
 * device or a browser without an authenticator. There is no password field
 * anywhere in Wordsmithery, and this page never claims to know whether an
 * address has an account.
 */
import { useEffect, useState } from "react";
import { AlertCircle, Fingerprint, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WordsmitheryLockup } from "@/components/brand";
import { ThemeToggle } from "@/components/theme";
import {
  PASSKEY_WRONG_ADDRESS_MESSAGE,
  authErrorMessage,
  passkeyErrorMessage,
  useAuth,
} from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";

type Stage = "idle" | "working" | "sent";

export default function SignInPage() {
  const {
    signInWithPasskey,
    refresh,
    magicLinkEnabled,
    passkeyAvailableHere,
    demoEnabled,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [notice, setNotice] = useState("");
  const [devLink, setDevLink] = useState("");
  const [error, setError] = useState("");
  const [passkeyBusy, setPasskeyBusy] = useState(false);

  // /#/sign-in?error=link-expired — the server redirects here after a dead link.
  // Also watch hashchange: arriving from the redirect may not reload the document.
  useEffect(() => {
    const read = () => {
      if (window.location.hash.includes("error=link-expired")) {
        setError(
          "That sign-in link has already been used or has expired. Ask for a fresh one.",
        );
      }
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  async function onPasskey() {
    setError("");
    // The server already told us this address cannot run a passkey ceremony, so
    // say so plainly instead of letting the browser raise a technical error.
    if (!passkeyAvailableHere) {
      setError(PASSKEY_WRONG_ADDRESS_MESSAGE);
      return;
    }
    setPasskeyBusy(true);
    try {
      await signInWithPasskey();
    } catch (caught) {
      setError(passkeyErrorMessage(caught));
    } finally {
      setPasskeyBusy(false);
    }
  }

  async function onMagicLink(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setDevLink("");
    setStage("working");
    try {
      const response = await requestLink(email);
      setNotice(response.message);
      if (response.devLink) setDevLink(response.devLink);
      setStage("sent");
    } catch (caught) {
      setError(authErrorMessage(caught));
      setStage("idle");
    }
  }

  async function requestLink(address: string) {
    const res = await apiRequest("POST", "/api/auth/magic-link/request", {
      email: address,
    });
    return (await res.json()) as { message: string; devLink?: string };
  }

  async function onDemoSignIn() {
    setError("");
    try {
      await apiRequest("POST", "/api/auth/dev/demo-sign-in", {});
      await refresh();
    } catch (caught) {
      setError(authErrorMessage(caught));
    }
  }

  return (
    <div
      className="min-h-screen bg-background px-4 py-10 md:px-8"
      data-testid="page-sign-in"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <WordsmitheryLockup />
        <ThemeToggle />
      </div>

      <main
        id="main"
        className="mx-auto mt-10 grid max-w-5xl gap-10 md:mt-16 md:grid-cols-[1.05fr_1fr] md:gap-16"
      >
        <section className="max-w-prose">
          <p className="eyebrow">Your workshop</p>
          <h1 className="mt-2 font-serif text-3xl leading-[1.12] md:text-4xl">
            Sign in to your writing rooms
          </h1>
          <p className="mt-4 text-[0.975rem] leading-relaxed text-muted-foreground">
            Wordsmithery keeps your manuscript, characters, plots, timeline and
            notes in one place — and never writes a word of them for you. Your
            books are yours; you can export the whole library as Markdown or
            JSON at any time.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                No passwords to invent or lose. A passkey uses the fingerprint,
                face or PIN your device already trusts.
              </span>
            </li>
            <li className="flex gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                On a new device, ask for a single-use email link. It expires in
                about 15 minutes.
              </span>
            </li>
          </ul>
        </section>

        <section className="rounded-sm border border-border bg-card p-5 md:p-7">
          <h2 className="font-serif text-lg">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Two ways in. Both passwordless.
          </p>

          {error && (
            <p
              className="mt-4 flex items-start gap-2 rounded-sm border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              role="alert"
              data-testid="text-auth-error"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </p>
          )}

          {/* When passkeys cannot work on this address, the email link becomes the
              primary action: leading an author towards the button that will fail
              is not a kindness. */}
          <Button
            className="mt-5 w-full"
            variant={passkeyAvailableHere ? "default" : "outline"}
            onClick={onPasskey}
            disabled={passkeyBusy}
            data-testid="button-signin-passkey"
          >
            <Fingerprint className="mr-2 h-4 w-4" aria-hidden />
            {passkeyBusy
              ? "Waiting for your device…"
              : "Continue with a passkey"}
          </Button>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {passkeyAvailableHere ? (
              <>
                Your device will ask you to confirm. If you have not made a
                passkey yet, use the email link below first — you can add one
                straight afterwards.
              </>
            ) : (
              <span data-testid="text-passkey-unavailable-here">
                Passkeys need Wordsmithery&rsquo;s proper https:// address. On
                this one, use the email link below.
              </span>
            )}
          </p>

          <div className="my-6 flex items-center gap-3" aria-hidden>
            <span className="h-px flex-1 bg-border" />
            <span className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
              or
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          {stage === "sent" ? (
            <div data-testid="panel-magiclink-sent">
              <p className="text-sm leading-relaxed">{notice}</p>
              {devLink && (
                <p className="mt-3 break-all rounded-sm border border-dashed border-border px-3 py-2 text-xs">
                  <span className="eyebrow block">
                    development link (not emailed)
                  </span>
                  <a
                    className="underline"
                    href={devLink}
                    data-testid="link-dev-magiclink"
                  >
                    {devLink}
                  </a>
                </p>
              )}
              <Button
                variant="ghost"
                className="mt-3 px-0 text-sm"
                onClick={() => {
                  setStage("idle");
                  setNotice("");
                  setDevLink("");
                }}
                data-testid="button-magiclink-again"
              >
                Use a different address
              </Button>
            </div>
          ) : (
            <form
              className="space-y-3"
              onSubmit={onMagicLink}
              data-testid="form-magiclink"
            >
              <div className="space-y-1.5">
                <Label htmlFor="signin-email">Email a sign-in link</Label>
                <Input
                  id="signin-email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  data-testid="input-signin-email"
                />
              </div>
              <Button
                type="submit"
                variant={passkeyAvailableHere ? "outline" : "default"}
                className="w-full"
                disabled={stage === "working" || !magicLinkEnabled}
                data-testid="button-signin-magiclink"
              >
                <Mail className="mr-2 h-4 w-4" aria-hidden />
                {stage === "working" ? "Sending…" : "Send me a link"}
              </Button>
              {!magicLinkEnabled && (
                <p
                  className="text-xs text-muted-foreground"
                  data-testid="text-magiclink-unavailable"
                >
                  Email links are not configured on this server yet. Use a
                  passkey, or ask the administrator to set RESEND_API_KEY and
                  EMAIL_FROM.
                </p>
              )}
            </form>
          )}

          {demoEnabled && (
            <div
              className="mt-7 border-t border-border pt-4"
              data-testid="panel-dev-demo"
            >
              <p className="eyebrow">development only</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Open the sample library as the local demo author. This button is
                not built into production and the server refuses the request
                unless the demo switch is on.
              </p>
              <Button
                variant="ghost"
                className="mt-2 h-8 px-2 text-xs"
                onClick={onDemoSignIn}
                data-testid="button-dev-demo-signin"
              >
                Open the demo library
              </Button>
            </div>
          )}
        </section>
      </main>

      <footer className="mx-auto mt-14 max-w-5xl border-t border-border pt-4 text-xs text-muted-foreground">
        Wordsmithery never generates prose, scenes or endings. The writing is
        yours.
      </footer>
    </div>
  );
}
