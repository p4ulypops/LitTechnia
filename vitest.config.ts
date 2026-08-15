import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Deliberately separate from vite.config.ts: that config sets `root:
 * "client"` and a client-only build output, neither of which the test
 * runner should inherit, since these tests cover server/ and shared/ too.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: [path.resolve(import.meta.dirname, "vitest.setup.ts")],
    include: [
      "client/src/**/*.test.{ts,tsx}",
      "server/**/*.test.{ts,tsx}",
      "shared/**/*.test.{ts,tsx}",
    ],
  },
});
