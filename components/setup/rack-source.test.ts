import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Source contracts for the Board Rack (Phase 15), in the `lib/theme.test.ts` / `lib/db/ownership.test.ts`
 * idiom: each reads a rack file and fails loudly if it takes a shape the brief forbids — the
 * machine-checkable form of its must-nots. This file starts with D-04; 15-12 adds the rest.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));

/** Every file that draws or chooses the rack. */
const RACK_FILES = [
  "components/setup/board-rack.tsx",
  "components/setup/hover-rack.tsx",
  "components/setup/swipe-rack.tsx",
  "components/setup/rack-caption.tsx",
  "components/setup/use-rack-boards.ts",
] as const;

/** Strips `//` line comments and `/* *\/` block comments (JSX `{/* *\/}` included), the same helper
 * as lib/db/ownership.test.ts, so a comment that mentions a forbidden shape never trips a check. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

function code(path: string): string {
  return stripComments(readFileSync(join(REPO_ROOT, path), "utf8"));
}

describe("D-04: which rack is chosen by the pointer, never by width", () => {
  const boardRack = code("components/setup/board-rack.tsx");

  it("board-rack.tsx asks the pointer exactly once", () => {
    expect(boardRack.match(/useCoarsePointer\(\)/g) ?? []).toHaveLength(1);
  });

  it("board-rack.tsx picks the rack kind in one statement: a coarse pointer swipes, anything else hovers", () => {
    const statements = boardRack.match(/\bkind\b[^;]*;/g) ?? [];
    const choosing = statements.filter((statement) => /useCoarsePointer\(\)/.test(statement));
    expect(choosing).toHaveLength(1);
    expect(choosing[0]).toMatch(/\bkind\b[^;]*useCoarsePointer\(\)[^;]*"swipe"[^;]*"hover"/);
    // Nothing but the pointer in that statement: no width, no screen, no media query.
    expect(choosing[0]).not.toMatch(/width|innerWidth|screen\.|matchMedia|clientWidth|max-shell|shell/i);
  });

  it.each(RACK_FILES)("%s never reads the window's width or a media query to choose", (path) => {
    const source = code(path);
    expect(source).not.toMatch(/innerWidth/);
    expect(source).not.toMatch(/matchMedia\(/);
    expect(source).not.toMatch(/screen\.width/);
  });

  it.each(["components/setup/hover-rack.tsx", "components/setup/swipe-rack.tsx"])(
    "%s never asks the pointer itself — board-rack.tsx decides which rack draws",
    (path) => {
      expect(code(path)).not.toMatch(/useCoarsePointer/);
    },
  );
});
