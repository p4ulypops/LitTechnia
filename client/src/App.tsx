import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme";
import { AppShell } from "@/components/shell";
import { DraftZeroOverlay } from "@/components/draft-zero";
import { WorkspaceProvider } from "@/lib/workspace";
import { AuthProvider, useAuth } from "@/lib/auth";
import SignInPage from "@/pages/sign-in";
import { AccountRoute, PasskeySetupPage } from "@/pages/account";
import HomePage from "@/pages/home";
import LibraryPage from "@/pages/library";
import ImportPage from "@/pages/import";
import ManuscriptPage from "@/pages/manuscript";
import CharactersPage from "@/pages/characters";
import PlotsPage from "@/pages/plots";
import TimelinePage from "@/pages/timeline";
import WorldPage from "@/pages/world";
import ResearchPage from "@/pages/research";
import CaptureInboxPage from "@/pages/capture-inbox";
import ExportsPage from "@/pages/exports";
import ConnectionsPage from "@/pages/connections";
import NotFound from "@/pages/not-found";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/library" component={LibraryPage} />
      <Route path="/import" component={ImportPage} />
      <Route path="/manuscript" component={ManuscriptPage} />
      <Route path="/characters" component={CharactersPage} />
      <Route path="/plot" component={PlotsPage} />
      <Route path="/timeline" component={TimelinePage} />
      <Route path="/worldbuilding" component={WorldPage} />
      <Route path="/research" component={ResearchPage} />
      <Route path="/capture" component={CaptureInboxPage} />
      <Route path="/exports" component={ExportsPage} />
      <Route path="/connections" component={ConnectionsPage} />
      <Route path="/account" component={AccountRoute} />
      <Route path="/passkey-setup" component={PasskeySetupPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

/**
 * The one gate. While the session is being checked nothing data-shaped is
 * rendered; without a session only the sign-in page exists. This is a rendering
 * decision only — every API route re-checks the session server-side.
 */
function AuthGate() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center px-6"
        data-testid="status-session-loading"
      >
        <p className="text-sm text-muted-foreground">Opening your workshop…</p>
      </div>
    );
  }

  if (!user) return <SignInPage />;

  return (
    <WorkspaceProvider>
      {/* A button, not an anchor: hash routing would treat href="#main" as a route. */}
      <button
        type="button"
        data-testid="button-skip-to-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:border focus:border-border focus:bg-card focus:px-3 focus:py-2 focus:text-sm"
        onClick={() => {
          const main = document.getElementById("main");
          if (!main) return;
          main.setAttribute("tabindex", "-1");
          main.focus();
          main.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      >
        Skip to content
      </button>
      <AppShell>
        <AppRouter />
      </AppShell>
      <DraftZeroOverlay />
    </WorkspaceProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router hook={useHashLocation}>
            <AuthProvider>
              <AuthGate />
            </AuthProvider>
          </Router>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
