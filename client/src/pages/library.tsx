/**
 * Library — every book you have open, plus the archive.
 *
 * A book is a project boundary: its scenes, characters, plots, timeline, world
 * entries, notes and links belong to it and to nothing else. Switching books
 * here changes every workspace in the app.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { Archive, ArchiveRestore, BookOpen, FileUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState, ListSkeleton, Panel, StatusPill } from "@/components/fields";
import { useLibrary, useLibraryActions, useWorkspace } from "@/lib/workspace";
import type { ProjectSummary } from "@shared/schema";

const formats = ["Novel", "Novella", "Series book", "Short story collection", "Undecided"];

function BookCard({ book }: { book: ProjectSummary }) {
  const { activeProjectId, setActiveProject } = useWorkspace();
  const actions = useLibraryActions();
  const [, navigate] = useLocation();
  const isActive = book.id === activeProjectId && book.archived === 0;

  return (
    <Panel
      testId={`card-book-${book.id}`}
      className={`flex flex-col gap-3 ${isActive ? "ring-1 ring-primary/40" : ""}`}
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="eyebrow">{book.format || "Novel"}</p>
          {isActive && <StatusPill label="open now" tone="accent" testId={`status-active-${book.id}`} />}
          {book.archived === 1 && (
            <StatusPill label="archived" tone="quiet" testId={`status-archived-${book.id}`} />
          )}
        </div>
        <h2 className="mt-1 font-serif text-base leading-tight" data-testid={`text-booktitle-${book.id}`}>
          {book.title}
        </h2>
        {book.subtitle && <p className="text-sm text-muted-foreground">{book.subtitle}</p>}
        {book.genre && <p className="mt-1 text-xs text-muted-foreground">{book.genre}</p>}
      </div>

      <dl
        className="grid grid-cols-3 gap-2 border-y border-border py-2 font-mono text-xs text-muted-foreground"
        data-testid={`counts-book-${book.id}`}
      >
        <div>
          <dt className="eyebrow">words</dt>
          <dd>{book.counts.words.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="eyebrow">scenes</dt>
          <dd>{book.counts.scenes}</dd>
        </div>
        <div>
          <dt className="eyebrow">people</dt>
          <dd>{book.counts.characters}</dd>
        </div>
        <div>
          <dt className="eyebrow">threads</dt>
          <dd>{book.counts.plots}</dd>
        </div>
        <div>
          <dt className="eyebrow">world</dt>
          <dd>{book.counts.world}</dd>
        </div>
        <div>
          <dt className="eyebrow">notes</dt>
          <dd>{book.counts.notes}</dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-wrap gap-2">
        {book.archived === 0 ? (
          <>
            <Button
              size="sm"
              variant={isActive ? "secondary" : "default"}
              data-testid={`button-open-book-${book.id}`}
              onClick={() => {
                setActiveProject(book.id);
                navigate("/");
              }}
            >
              <BookOpen className="mr-1.5 h-3.5 w-3.5" />
              {isActive ? "Go to this book" : "Open this book"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              data-testid={`button-import-into-${book.id}`}
              onClick={() => {
                setActiveProject(book.id);
                navigate("/import");
              }}
            >
              <FileUp className="mr-1.5 h-3.5 w-3.5" /> Import files
            </Button>
            <ConfirmDialog
              testId={`archive-${book.id}`}
              title={`Archive "${book.title}"?`}
              description="Archiving is a state on the book, not a delete — nothing here removes your words. The book moves off the active shelf, and you can bring it back any time from the archive below."
              confirmLabel="Archive"
              pendingLabel="Archiving…"
              tone="neutral"
              onConfirm={async () => {
                await actions.setArchived(book.id, 1);
              }}
              trigger={
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={actions.pending}
                  data-testid={`button-archive-${book.id}`}
                >
                  <Archive className="mr-1.5 h-3.5 w-3.5" /> Archive
                </Button>
              }
            />
          </>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            disabled={actions.pending}
            data-testid={`button-unarchive-${book.id}`}
            onClick={() => actions.setArchived(book.id, 0)}
          >
            <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" /> Bring back to the shelf
          </Button>
        )}
      </div>
    </Panel>
  );
}

function NewBookForm() {
  const actions = useLibraryActions();
  const { setActiveProject } = useWorkspace();
  const [, navigate] = useLocation();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [genre, setGenre] = useState("");
  const [format, setFormat] = useState("Novel");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  return (
    <Panel
      eyebrow="Library"
      title="Start a new book"
      testId="panel-new-book"
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!title.trim()) {
            setError("A book needs a working title. You can change it later — nothing is final.");
            return;
          }
          setError(null);
          const book = await actions.createBook({
            title: title.trim(),
            subtitle: subtitle.trim() || undefined,
            genre: genre.trim() || undefined,
            format,
          });
          setCreated(book.title);
          setTitle("");
          setSubtitle("");
          setGenre("");
          setActiveProject(book.id);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="newbook-title" className="eyebrow">
              Working title (required)
            </Label>
            <Input
              id="newbook-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled book"
              data-testid="input-newbook-title"
              aria-describedby="newbook-title-hint"
              aria-invalid={Boolean(error)}
            />
            <p id="newbook-title-hint" className="text-xs text-muted-foreground">
              Placeholder titles are normal. Most books change theirs.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newbook-subtitle" className="eyebrow">
              Subtitle (optional)
            </Label>
            <Input
              id="newbook-subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              data-testid="input-newbook-subtitle"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newbook-genre" className="eyebrow">
              Genre (optional)
            </Label>
            <Input
              id="newbook-genre"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="Science fiction, fantasy, anything"
              data-testid="input-newbook-genre"
            />
          </div>
          <div className="space-y-1.5">
            <p className="eyebrow">Format (optional)</p>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger data-testid="select-newbook-format" aria-label="Format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formats.map((f) => (
                  <SelectItem key={f} value={f} data-testid={`option-format-${f.toLowerCase().replace(/\s+/g, "-")}`}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert" data-testid="text-newbook-error">
            {error}
          </p>
        )}
        {created && !error && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-primary" role="status" data-testid="text-newbook-created">
            “{created}” was created and is now the open book. It starts empty on purpose.
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => navigate("/")}
              data-testid="button-goto-newbook"
            >
              Open its dashboard
            </Button>
          </p>
        )}

        <Button type="submit" disabled={actions.pending} data-testid="button-create-book">
          <Plus className="mr-1.5 h-4 w-4" /> Create book
        </Button>
      </form>
    </Panel>
  );
}

export default function LibraryPage() {
  const { data, isLoading } = useLibrary();
  const [, navigate] = useLocation();
  const books = data?.projects ?? [];
  const active = books.filter((b) => b.archived === 0);
  const archived = books.filter((b) => b.archived === 1);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl">
        <ListSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="eyebrow">Library</p>
          <h1 className="font-serif text-xl font-medium leading-tight">Your books</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Several books can be open at once. Everything you write — scenes, people, threads,
            timeline, world, research — belongs to one book and stays there.
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate("/import")} data-testid="button-goto-import">
          <FileUp className="mr-1.5 h-4 w-4" /> Import files into the open book
        </Button>
      </div>

      <section aria-labelledby="shelf-heading" className="space-y-3">
        <h2 id="shelf-heading" className="eyebrow" data-testid="text-shelf-count">
          On the shelf · {active.length} book{active.length === 1 ? "" : "s"}
        </h2>
        {active.length === 0 ? (
          archived.length === 0 ? (
            <EmptyState
              title="Your library is empty"
              body="Start your first book below, or import files you already have. Nothing is pre-filled and nothing is borrowed from another account."
              testId="empty-library-new"
            />
          ) : (
            <EmptyState
              title="No books open"
              body="Everything is archived. Bring one back below, or start a new book."
              testId="empty-active-books"
            />
          )
        ) : (
          <div className="grid gap-4 md:grid-cols-2" data-testid="grid-active-books">
            {active.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </section>

      <NewBookForm />

      <section aria-labelledby="archive-heading" className="space-y-3">
        <h2 id="archive-heading" className="eyebrow">
          Archive · {archived.length} shelved
        </h2>
        {archived.length === 0 ? (
          <EmptyState
            title="Nothing archived"
            body="Archiving a book hides it from the switcher without deleting a single word."
            testId="empty-archived-books"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2" data-testid="grid-archived-books">
            {archived.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </section>

      <Panel eyebrow="How your books are stored" title="Honest limits">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            Your books are saved in this server's database and belong to your account alone. They
            survive a restart. No other account can read or write them, and the app never shows you
            anybody else's material.
          </li>
          <li>
            The browser stores nothing except one sign-in cookie, which exists only so the server can
            recognise your session. There is no localStorage, sessionStorage or IndexedDB.
          </li>
          <li>
            Full local-first sync and at-rest encryption are <em>not</em> delivered yet. Until they
            are, the Exports page is your escape hatch: Markdown and JSON, whole library included,
            whenever you want it.
          </li>
          <li>
            Archiving is a state on the book, not a delete. Nothing here removes your words.
          </li>
        </ul>
      </Panel>
    </div>
  );
}
