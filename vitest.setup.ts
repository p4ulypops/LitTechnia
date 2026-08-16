import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Sub-PRD B tests need an in-memory SQLite database. Set this before any
// module that imports server/db.ts is loaded, so the singleton is created
// against :memory: rather than a file on disk.
process.env.DATABASE_PATH = ":memory:";
process.env.NODE_ENV = "test";

// vitest runs with globals: false, which disables Testing Library's
// automatic cleanup -- register it explicitly so renders never leak
// between tests.
afterEach(() => {
  cleanup();
});

// jsdom lacks a few browser APIs that Radix UI primitives touch on mount.
if (!("ResizeObserver" in globalThis)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as Record<string, unknown>).ResizeObserver = ResizeObserverStub;
}

if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}
