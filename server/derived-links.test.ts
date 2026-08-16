/**
 * Derived links rejection tests (Sub-PRD B).
 *
 * Derived `links` rows with `origin = "derived"` are rejected on the
 * client-facing write path. Only the server-side tag resolver creates them.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { storage, DerivedLinkRejectedError } from "./storage";
import { clearAll, seedProject } from "./test-helpers";

beforeEach(() => clearAll());

describe("Derived links — rejected on client write path", () => {
  it("throws DerivedLinkRejectedError when creating a link with origin = derived", () => {
    const pid = seedProject();
    expect(() =>
      storage.create("owner-test", pid, "links", {
        fromKind: "scene",
        fromId: "sc-1",
        toKind: "character",
        toId: "ch-1",
        origin: "derived",
      }),
    ).toThrow(DerivedLinkRejectedError);
  });

  it("throws when updating a link to origin = derived", () => {
    const pid = seedProject();
    // First create an authored link (allowed).
    const link = storage.create("owner-test", pid, "links", {
      fromKind: "scene",
      fromId: "sc-1",
      toKind: "character",
      toId: "ch-1",
      origin: "authored",
    });
    expect(link).toBeDefined();
    // Attempt to change it to derived — rejected.
    expect(() =>
      storage.update("owner-test", pid, "links", (link as { id: string }).id, {
        origin: "derived",
      }),
    ).toThrow(DerivedLinkRejectedError);
  });

  it("allows creating authored links", () => {
    const pid = seedProject();
    const link = storage.create("owner-test", pid, "links", {
      fromKind: "scene",
      fromId: "sc-1",
      toKind: "character",
      toId: "ch-1",
      origin: "authored",
    });
    expect(link).toBeDefined();
    expect((link as { origin: string }).origin).toBe("authored");
  });
});
