import { Link } from "wouter";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Wordsmithery has no dead ends: an unknown route explains itself in plain
 * language and hands the writer a way back to the workshop.
 */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl space-y-4" data-testid="panel-not-found">
      <p className="eyebrow">Nothing filed here</p>
      <h1 className="font-serif text-xl font-medium leading-tight">
        That page isn&apos;t part of the workshop
      </h1>
      <p className="text-sm text-muted-foreground">
        The address you followed doesn&apos;t match any room in Wordsmithery. Nothing has been lost
        — your project is still loaded exactly as you left it.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" data-testid="link-notfound-home">
          <Link href="/">
            <Compass className="mr-1.5 h-3.5 w-3.5" /> Back to the project
          </Link>
        </Button>
        <Button asChild size="sm" variant="secondary" data-testid="link-notfound-manuscript">
          <Link href="/manuscript">Go to the manuscript</Link>
        </Button>
      </div>
    </div>
  );
}
