import { useEffect } from "react";
import { useLocation } from "wouter";
import {
  BookOpen,
  Boxes,
  CalendarClock,
  Download,
  FileStack,
  FileUp,
  Home,
  Library,
  NotebookPen,
  LogOut,
  Plug,
  UserRound,
  Users,
  Wand2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LitTechniaLockup } from "@/components/brand";
import { ThemeToggle } from "@/components/theme";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { manuscriptWords, useLibrary, useSnapshot, useWorkspace } from "@/lib/workspace";

const nav = [
  { href: "/", label: "Home", icon: Home, group: "Project" },
  { href: "/library", label: "Library", icon: Library, group: "Project" },
  { href: "/manuscript", label: "Manuscript", icon: BookOpen, group: "Writing" },
  { href: "/characters", label: "Characters", icon: Users, group: "Story development" },
  { href: "/plot", label: "Plot & subplots", icon: FileStack, group: "Story development" },
  { href: "/timeline", label: "Timeline", icon: CalendarClock, group: "Story development" },
  { href: "/worldbuilding", label: "Worldbuilding", icon: Boxes, group: "Story development" },
  { href: "/research", label: "Research", icon: NotebookPen, group: "Material" },
  { href: "/import", label: "Import", icon: FileUp, group: "Material" },
  { href: "/exports", label: "Exports", icon: Download, group: "Material" },
  { href: "/connections", label: "Connections", icon: Plug, group: "Material" },
  { href: "/account", label: "Account", icon: UserRound, group: "Material" },
];

const groups = ["Project", "Writing", "Story development", "Material"];

/** Book switcher. Lives in the header and again at the top of the sidebar. */
function BookSwitcher({ testId, onSwitched }: { testId: string; onSwitched?: () => void }) {
  const { activeProjectId, setActiveProject } = useWorkspace();
  const { data: library, isLoading: libraryLoading } = useLibrary();
  const [, navigate] = useLocation();
  const books = (library?.projects ?? []).filter((b) => b.archived === 0);
  // A new account has no books at all; say so rather than implying a stuck load.
  const placeholder = libraryLoading ? "Loading books" : books.length ? "Choose a book" : "No books yet";
  const value = activeProjectId && books.some((b) => b.id === activeProjectId) ? activeProjectId : "";

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next === "__library") {
          navigate("/library");
        } else {
          setActiveProject(next);
        }
        onSwitched?.();
      }}
    >
      <SelectTrigger
        className="h-9 w-full max-w-[22rem] border-transparent bg-transparent px-2 hover:bg-accent"
        data-testid={testId}
        aria-label="Switch book"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {books.map((book) => (
          <SelectItem key={book.id} value={book.id} data-testid={`option-project-${book.id}`}>
            {book.title}
          </SelectItem>
        ))}
        <SelectItem value="__library" data-testid="option-project-library">
          Manage library…
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

function NavSidebar() {
  const [location, navigate] = useLocation();
  const { setOpenMobile, isMobile } = useSidebar();

  return (
    <Sidebar data-testid="nav-sidebar">
      <SidebarHeader className="px-3 py-4">
        <LitTechniaLockup />
        <p className="mt-2 pl-[2.3rem] text-xs leading-snug text-muted-foreground">
          Your wordsmith's workshop. Not a ghostwriter.
        </p>
        <div className="mt-3 rounded-sm border border-border">
          <p className="px-2 pt-1.5 text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
            Open book
          </p>
          <BookSwitcher
            testId="select-project-sidebar"
            onSwitched={() => {
              if (isMobile) setOpenMobile(false);
            }}
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group}>
            <SidebarGroupLabel>{group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {nav
                  .filter((item) => item.group === group)
                  .map((item) => {
                    const active =
                      location === item.href ||
                      (item.href !== "/" && location.startsWith(item.href));
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          isActive={active}
                          onClick={() => {
                            navigate(item.href);
                            if (isMobile) setOpenMobile(false);
                          }}
                          data-testid={`link-nav-${item.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                        >
                          <item.icon className="h-4 w-4" aria-hidden />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="px-3 py-3 text-xs text-muted-foreground">
        <p className="flex items-start gap-2">
          <Wand2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>No AI writes here. LitTechnia never generates prose for you.</span>
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}

/** Who is signed in, and the way out. Identity comes from the server session. */
function AccountStrip() {
  const { user, signOut } = useAuth();
  const [, navigate] = useLocation();
  if (!user) return null;

  return (
    <span className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 max-w-[11rem] justify-start gap-1.5 px-2 md:px-2.5"
        onClick={() => navigate("/account")}
        data-testid="button-account"
        title={user.email}
      >
        <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {/* On narrow screens the icon alone stands for the account; the address is
            still reachable on the Account page and in the button's title. */}
        <span className="hidden truncate font-mono text-xs md:inline" data-testid="text-signed-in-email">
          {user.email}
        </span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        onClick={() => void signOut()}
        data-testid="button-sign-out"
        aria-label="Sign out"
      >
        <LogOut className="h-3.5 w-3.5" aria-hidden />
        <span className="ml-1.5 hidden text-xs sm:inline">Sign out</span>
      </Button>
    </span>
  );
}

function Header() {
  const { data: snapshot } = useSnapshot();
  const words = snapshot ? manuscriptWords(snapshot.scenes) : 0;

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:px-8">
      <SidebarTrigger data-testid="button-sidebar-toggle" className="md:hidden" />
      <div className="min-w-0 flex-1">
        <BookSwitcher testId="select-project" />
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden font-mono text-xs text-muted-foreground sm:inline" data-testid="text-header-wordcount">
          {words.toLocaleString()} words
        </span>
        <span className="hidden rounded-sm border border-border px-2 py-1 text-xs text-muted-foreground lg:inline">
          Your account · nothing shared
        </span>
        <AccountStrip />
        <ThemeToggle />
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  // Each workspace starts at the top rather than inheriting the last scroll position.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location]);

  return (
    <SidebarProvider style={{ "--sidebar-width": "17rem" } as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <NavSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main id="main" className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-10">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
