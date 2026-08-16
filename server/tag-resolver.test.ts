/**
 * Tag resolver tests (Sub-PRD B).
 *
 * Covers:
 *   - #S:slug resolves to correct entity, creates derived link
 *   - Slug collision: deterministic disambiguation, never silent re-pointing
 *   - Rename: lists affected references, applies only after confirmation
 *   - Retired alias: still resolves as redirect
 *   - Derived links: rejected on client write path, only server-side resolver creates them
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  parseTags,
  slugify,
  resolveTag,
  findAlias,
  detectCollision,
  rebuildDerivedLinks,
  listReferences,
  applyRename,
  retireAlias,
} from "./tag-resolver";
import {
  clearAll,
  seedAlias,
  seedCharacter,
  seedNote,
  seedProject,
  seedScene,
} from "./test-helpers";
import { sqlite } from "./db";

beforeEach(() => clearAll());

describe("parseTags", () => {
  it("extracts #S:slug references from Markdown", () => {
    const tags = parseTags("Hello #S:rebecca and #S:the-furnace world.");
    expect(tags).toHaveLength(2);
    expect(tags[0].slug).toBe("rebecca");
    expect(tags[0].raw).toBe("#S:rebecca");
    expect(tags[1].slug).toBe("the-furnace");
  });

  it("does not match #s: (lowercase) or #S without colon", () => {
    expect(parseTags("#s:rebecca #S rebecca")).toHaveLength(0);
  });

  it("handles multiple occurrences of the same slug", () => {
    const tags = parseTags("#S:rebecca said hi to #S:rebecca");
    expect(tags).toHaveLength(2);
    expect(tags.every((t) => t.slug === "rebecca")).toBe(true);
  });
});

describe("slugify", () => {
  it("normalises free-form names into slugs", () => {
    expect(slugify("Rebecca Stone")).toBe("rebecca-stone");
    expect(slugify("The Furnace!")).toBe("the-furnace");
  });
});

describe("resolveTag — #S:slug resolves to correct entity", () => {
  it("resolves a slug to its target entity via the aliases table", () => {
    const pid = seedProject();
    seedCharacter(pid, "ch-1", "Rebecca");
    seedAlias(pid, "rebecca", "character", "ch-1");
    const resolved = resolveTag(pid, "rebecca");
    expect(resolved.unresolved).toBe(false);
    expect(resolved.targetKind).toBe("character");
    expect(resolved.targetId).toBe("ch-1");
    expect(resolved.isRedirect).toBe(false);
  });

  it("reports unresolved when no alias matches", () => {
    const pid = seedProject();
    const resolved = resolveTag(pid, "nonexistent");
    expect(resolved.unresolved).toBe(true);
    expect(resolved.alias).toBeNull();
  });
});

describe("rebuildDerivedLinks — creates derived links", () => {
  it("creates derived links from #S: tags in scene content", () => {
    const pid = seedProject();
    seedCharacter(pid, "ch-1", "Rebecca");
    seedAlias(pid, "rebecca", "character", "ch-1");
    seedScene(pid, "sc-1", "Ilva met #S:rebecca at the furnace.");
    const created = rebuildDerivedLinks(pid);
    expect(created).toBe(1);
    const links = sqlite
      .prepare(`SELECT * FROM links WHERE project_id = ? AND origin = 'derived'`)
      .all(pid);
    expect(links).toHaveLength(1);
    expect((links[0] as { from_kind: string }).from_kind).toBe("scene");
    expect((links[0] as { from_id: string }).from_id).toBe("sc-1");
    expect((links[0] as { to_kind: string }).to_kind).toBe("character");
    expect((links[0] as { to_id: string }).to_id).toBe("ch-1");
  });

  it("creates derived links from #S: tags in note bodies too", () => {
    const pid = seedProject();
    seedCharacter(pid, "ch-1", "Rebecca");
    seedAlias(pid, "rebecca", "character", "ch-1");
    seedNote(pid, "nt-1", "See #S:rebecca for details.");
    const created = rebuildDerivedLinks(pid);
    expect(created).toBe(1);
    const links = sqlite
      .prepare(`SELECT * FROM links WHERE project_id = ? AND origin = 'derived'`)
      .all(pid);
    expect(links).toHaveLength(1);
    expect((links[0] as { from_kind: string }).from_kind).toBe("note");
  });

  it("does not create derived links for unresolved slugs", () => {
    const pid = seedProject();
    seedScene(pid, "sc-1", "Ilva met #S:nonexistent.");
    const created = rebuildDerivedLinks(pid);
    expect(created).toBe(0);
  });

  it("does not self-link when an entity references its own slug", () => {
    const pid = seedProject();
    seedScene(pid, "sc-1", "This scene is #S:self-ref");
    seedAlias(pid, "self-ref", "scene", "sc-1");
    const created = rebuildDerivedLinks(pid);
    expect(created).toBe(0);
  });

  it("replaces old derived links on rebuild (idempotent)", () => {
    const pid = seedProject();
    seedCharacter(pid, "ch-1", "Rebecca");
    seedAlias(pid, "rebecca", "character", "ch-1");
    seedScene(pid, "sc-1", "#S:rebecca");
    rebuildDerivedLinks(pid);
    rebuildDerivedLinks(pid);
    const links = sqlite
      .prepare(`SELECT * FROM links WHERE project_id = ? AND origin = 'derived'`)
      .all(pid);
    expect(links).toHaveLength(1);
  });

  it("never creates authored links — only derived", () => {
    const pid = seedProject();
    seedCharacter(pid, "ch-1", "Rebecca");
    seedAlias(pid, "rebecca", "character", "ch-1");
    seedScene(pid, "sc-1", "#S:rebecca");
    rebuildDerivedLinks(pid);
    const authored = sqlite
      .prepare(`SELECT * FROM links WHERE project_id = ? AND origin = 'authored'`)
      .all(pid);
    expect(authored).toHaveLength(0);
  });
});

describe("detectCollision — slug collision disambiguation", () => {
  it("returns null when the slug is free", () => {
    const pid = seedProject();
    expect(detectCollision(pid, "rebecca", "character", "ch-1")).toBeNull();
  });

  it("returns null when the slug already points at the same entity", () => {
    const pid = seedProject();
    seedCharacter(pid, "ch-1", "Rebecca");
    seedAlias(pid, "rebecca", "character", "ch-1");
    expect(detectCollision(pid, "rebecca", "character", "ch-1")).toBeNull();
  });

  it("detects a collision when the slug points at a different entity", () => {
    const pid = seedProject();
    seedCharacter(pid, "ch-1", "Rebecca");
    seedAlias(pid, "rebecca", "character", "ch-1");
    const collision = detectCollision(pid, "rebecca", "character", "ch-2");
    expect(collision).not.toBeNull();
    expect(collision!.existingId).toBe("ch-1");
    expect(collision!.requestedId).toBe("ch-2");
    expect(collision!.message).toMatch(/already points at a different/);
  });

  it("never silently re-points — the caller must disambiguate", () => {
    const pid = seedProject();
    seedCharacter(pid, "ch-1", "Rebecca");
    seedCharacter(pid, "ch-2", "Rebecca Stone");
    seedAlias(pid, "rebecca", "character", "ch-1");
    // Attempting to create another alias with the same slug for a different
    // entity is detected as a collision — it does not silently overwrite.
    const collision = detectCollision(pid, "rebecca", "character", "ch-2");
    expect(collision).not.toBeNull();
  });
});

describe("Retired alias — still resolves as redirect", () => {
  it("resolves a retired alias as a redirect", () => {
    const pid = seedProject();
    seedCharacter(pid, "ch-1", "Rebecca");
    const aliasId = seedAlias(pid, "becky", "character", "ch-1");
    retireAlias(pid, aliasId);
    const resolved = resolveTag(pid, "becky");
    expect(resolved.unresolved).toBe(false);
    expect(resolved.isRedirect).toBe(true);
    expect(resolved.targetId).toBe("ch-1");
  });

  it("findAlias returns the retired alias row so old text still resolves", () => {
    const pid = seedProject();
    seedCharacter(pid, "ch-1", "Rebecca");
    const aliasId = seedAlias(pid, "old-name", "character", "ch-1");
    retireAlias(pid, aliasId);
    const alias = findAlias(pid, "old-name");
    expect(alias).not.toBeNull();
    expect(alias!.retiredAt).not.toBe("");
  });
});

describe("Rename — lists references, applies only after confirmation", () => {
  it("lists every #S:slug reference in authored Markdown", () => {
    const pid = seedProject();
    seedCharacter(pid, "ch-1", "Rebecca");
    seedAlias(pid, "rebecca", "character", "ch-1");
    seedScene(pid, "sc-1", "Ilva met #S:rebecca. #S:rebecca smiled.");
    seedNote(pid, "nt-1", "Notes about #S:rebecca.");
    const refs = listReferences(pid, "rebecca");
    expect(refs).toHaveLength(3); // two in scene, one in note
    expect(refs.every((r) => r.raw === "#S:rebecca")).toBe(true);
  });

  it("does not rewrite prose until applyRename is called", () => {
    const pid = seedProject();
    seedCharacter(pid, "ch-1", "Rebecca");
    seedAlias(pid, "rebecca", "character", "ch-1");
    seedScene(pid, "sc-1", "Ilva met #S:rebecca.");
    // Listing references does not change the prose.
    listReferences(pid, "rebecca");
    const scene = sqlite
      .prepare(`SELECT content FROM scenes WHERE id = ?`)
      .get("sc-1") as { content: string };
    expect(scene.content).toContain("#S:rebecca");
  });

  it("applies the rename only after applyRename is called", () => {
    const pid = seedProject();
    seedCharacter(pid, "ch-1", "Rebecca");
    seedAlias(pid, "rebecca", "character", "ch-1");
    seedScene(pid, "sc-1", "Ilva met #S:rebecca.");
    const rewritten = applyRename(pid, "rebecca", "becky");
    expect(rewritten).toBeGreaterThan(0);
    const scene = sqlite
      .prepare(`SELECT content FROM scenes WHERE id = ?`)
      .get("sc-1") as { content: string };
    expect(scene.content).toContain("#S:becky");
    expect(scene.content).not.toContain("#S:rebecca");
  });

  it("rebuilds derived links after rename so they follow the new slug", () => {
    const pid = seedProject();
    seedCharacter(pid, "ch-1", "Rebecca");
    seedAlias(pid, "rebecca", "character", "ch-1");
    seedScene(pid, "sc-1", "#S:rebecca");
    rebuildDerivedLinks(pid);
    applyRename(pid, "rebecca", "becky");
    // After rename + rebuild, derived links should reflect the new slug.
    // The old alias is retired, the new slug has no alias yet, so no derived link.
    const links = sqlite
      .prepare(`SELECT * FROM links WHERE project_id = ? AND origin = 'derived'`)
      .all(pid);
    expect(links).toHaveLength(0);
    // Now create the new alias and rebuild.
    seedAlias(pid, "becky", "character", "ch-1");
    rebuildDerivedLinks(pid);
    const newLinks = sqlite
      .prepare(`SELECT * FROM links WHERE project_id = ? AND origin = 'derived'`)
      .all(pid);
    expect(newLinks).toHaveLength(1);
  });
});
