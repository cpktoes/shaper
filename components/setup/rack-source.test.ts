import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Source contracts for the Board Rack (Phase 15), in the `lib/theme.test.ts` / `lib/db/ownership.test.ts`
 * idiom: each reads a rack file and fails loudly if it takes a shape the brief forbids — the
 * machine-checkable form of its must-nots. 15-07 wrote D-04's; 15-12 added the rest: the theme's own
 * colours only (R4), no warning ink on the unsaved board (the SPEC's prohibition), every number through
 * the units rules (Rule 2), nothing older Safari can't draw (SPEC constraint 6), no stored picture and no
 * markup built from a string (SPEC constraint 3), and one D-11 switch.
 *
 * Every rack file is listed once, in the arrays just below, so a new rack file is added in one place —
 * and the "every rack file is listed" check fails until it is.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));

/** Every file that draws part of the rack: the chooser, the two racks, the caption under the turned board,
 * the polite note at the bottom, and a board's ⋯ menu. */
const RACK_DISPLAY_FILES = [
  "components/setup/board-rack.tsx",
  "components/setup/hover-rack.tsx",
  "components/setup/swipe-rack.tsx",
  "components/setup/rack-caption.tsx",
  "components/setup/rack-status.tsx",
  "components/setup/rack-card-menu.tsx",
] as const;

/** The rack's hooks and its one settings-and-words file: no drawing, but each could still store or build
 * something it shouldn't. */
const RACK_SUPPORT_FILES = [
  "components/setup/use-rack-boards.ts",
  "components/setup/use-rack-order.ts",
  "components/setup/use-fonts-ready.ts",
  "components/setup/rack-config.ts",
] as const;

/** Every component-side rack file. */
const RACK_FILES = [...RACK_DISPLAY_FILES, ...RACK_SUPPORT_FILES] as const;

/** The rack's maths and model files, found by name so a new one is covered with no edit here:
 * `lib/geometry/rack-*.ts`, `lib/models/rack-*.ts` (tests aside), and the server's stand-in reader. */
function rackLibFiles(): string[] {
  const found: string[] = [];
  for (const dir of ["lib/geometry", "lib/models"]) {
    for (const name of readdirSync(join(REPO_ROOT, dir))) {
      if (/^rack-.*\.ts$/.test(name) && !name.endsWith(".test.ts")) found.push(`${dir}/${name}`);
    }
  }
  found.push("lib/rack-stand-in-server.ts");
  return found.sort();
}

/** Every rack file in the app, components and lib alike. */
const EVERY_RACK_FILE = [...RACK_FILES, ...rackLibFiles()];

/** Strips `//` line comments and `/* *\/` block comments (JSX `{/* *\/}` included), the same helper
 * as lib/db/ownership.test.ts, so a comment that mentions a forbidden shape never trips a check. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

const cache = new Map<string, string>();

/** A file's source with comments stripped, read once per run. */
function code(path: string): string {
  let source = cache.get(path);
  if (source === undefined) {
    source = stripComments(readFileSync(join(REPO_ROOT, path), "utf8"));
    cache.set(path, source);
  }
  return source;
}

/** Every `.ts` / `.tsx` file under a folder, test files and specs aside. */
function appSourceFiles(dir: string): string[] {
  return (readdirSync(join(REPO_ROOT, dir), { recursive: true }) as string[])
    .filter((name) => /\.tsx?$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name))
    .map((name) => `${dir}/${name.split("\\").join("/")}`);
}

describe("every rack file is listed in this file's arrays", () => {
  it("each component file whose name says rack is in RACK_FILES, so every contract below reaches it", () => {
    const onDisk = readdirSync(join(REPO_ROOT, "components/setup"))
      .filter((name) => /rack/.test(name) && /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
      .map((name) => `components/setup/${name}`);
    const listed: readonly string[] = RACK_FILES;
    for (const path of onDisk) expect(listed, `${path} is a rack file missing from RACK_FILES`).toContain(path);
  });

  it("the lib scan finds the rack's maths and model files", () => {
    const lib = rackLibFiles();
    expect(lib).toContain("lib/geometry/rack-art.ts");
    expect(lib).toContain("lib/geometry/rack-layout.ts");
    expect(lib).toContain("lib/models/rack-order.ts");
  });
});

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

describe("R4 / SPEC constraint 2: the rack draws in the theme's own colours only", () => {
  const globals = readFileSync(join(REPO_ROOT, "app/globals.css"), "utf8");

  it.each(RACK_DISPLAY_FILES)("every var(--…) %s names is declared in app/globals.css", (path) => {
    const names = new Set([...code(path).matchAll(/var\(\s*--([A-Za-z0-9_-]+)/g)].map((match) => match[1]));
    for (const name of names) {
      const declared = new RegExp(`--${name.replace(/[-]/g, "\\-")}\\s*:`);
      expect(globals, `--${name} (named in ${path}) is not declared in app/globals.css`).toMatch(declared);
    }
  });

  it.each(RACK_DISPLAY_FILES)("%s holds no hex or rgb() colour of its own", (path) => {
    expect(code(path)).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgba?\(/);
  });

  it.each(["components/setup/hover-rack.tsx", "components/setup/swipe-rack.tsx"])(
    "%s draws the stringer the way every viewer does — the station line colour and the stringer dash",
    (path) => {
      const source = code(path);
      expect(source).toMatch(/var\(--outline-station-line\)/);
      expect(source).toMatch(/var\(--outline-stringer-dash\)/);
    },
  );
});

describe("SPEC prohibition (R9): the unsaved board never takes the warning colour", () => {
  const WARNING = /surf-warning-ink/g;

  it("rack-caption.tsx uses the warning ink exactly once, on the duplicate-failed line", () => {
    const source = code("components/setup/rack-caption.tsx");
    expect(source.match(WARNING) ?? []).toHaveLength(1);
    const lines = source.split("\n").filter((line) => line.includes("surf-warning-ink"));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/\bduplicateError\b/);
  });

  it("board-rack.tsx hands the caption a duplicate error only for a saved board", () => {
    // The unsaved board has no model, so its caption is always given null — it can never show the line.
    expect(code("components/setup/board-rack.tsx")).toMatch(/duplicateError=\{\s*model\s*\?[^}]*:\s*null\s*\}/);
  });

  it.each([
    "components/setup/board-rack.tsx",
    "components/setup/hover-rack.tsx",
    "components/setup/swipe-rack.tsx",
    "components/setup/rack-status.tsx",
  ])("%s never uses the warning ink", (path) => {
    expect(code(path).match(WARNING) ?? []).toHaveLength(0);
  });

  it("the ⋯ menu keeps its warning ink on the Delete row and nowhere else", () => {
    const lines = code("components/setup/rack-card-menu.tsx")
      .split("\n")
      .filter((line) => line.includes("surf-warning-ink"));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/onClick=\{onDelete\}/);
  });
});

describe("Rule 2: every number on the rack goes through the units rules", () => {
  it.each(["components/setup/hover-rack.tsx", "components/setup/swipe-rack.tsx"])(
    "%s formats each board's line with formatSummaryLine from the units boundary, in the shaper's system",
    (path) => {
      const source = code(path);
      expect(source).toMatch(/import\s*\{[^}]*\bformatSummaryLine\b[^}]*\}\s*from\s*["']@\/lib\/geometry\/summary-line["']/);
      expect(source).toMatch(/\buseUnits\(\)/);
      expect(source).toMatch(/\bformatSummaryLine\(/);
    },
  );

  it("rack-caption.tsx prints the board's line through CardMetadataLine", () => {
    const source = code("components/setup/rack-caption.tsx");
    expect(source).toMatch(/import\s*\{\s*CardMetadataLine\s*\}\s*from\s*["']@\/components\/setup\/card-metadata-line["']/);
    expect(source).toMatch(/<CardMetadataLine\b/);
  });

  it.each(EVERY_RACK_FILE)("%s holds no hand-typed inch or foot factor", (path) => {
    // 25.4 mm an inch, 304.8 a foot, 2133.6 seven feet — conversions live in lib/geometry/units.ts.
    expect(code(path)).not.toMatch(/25\.4|304\.8|2133\.6/);
  });
});

describe("SPEC constraint 6: nothing older Safari can't draw", () => {
  it.each(RACK_DISPLAY_FILES)("%s uses no CSS 3D, scroll-driven animation or scroll-end event", (path) => {
    expect(code(path)).not.toMatch(
      /perspective|rotateX|rotateY|preserve-3d|animation-timeline|scroll-timeline|scrollend/,
    );
  });
});

describe("SPEC constraint 3 (R1): no picture is stored and no markup is built from a string", () => {
  it.each(EVERY_RACK_FILE)("%s sets no markup from a string, uses no browser storage and exports no image", (path) => {
    expect(code(path)).not.toMatch(
      /dangerouslySetInnerHTML|innerHTML|outerHTML|insertAdjacentHTML|localStorage|sessionStorage|indexedDB|toDataURL|toBlob|createObjectURL/,
    );
  });
});

describe("D-11: the phone's way of moving a board is one switch", () => {
  const SWITCH = /\bPHONE_MOVE_VIA_MENU\b/;

  it("PHONE_MOVE_VIA_MENU is declared once, in rack-config.ts", () => {
    const source = code("components/setup/rack-config.ts");
    expect(source.match(/\bconst\s+PHONE_MOVE_VIA_MENU\b/g) ?? []).toHaveLength(1);
  });

  it("no other app file names it — components call holdToMoveEnabled / movesOffered instead", () => {
    const offenders = [...appSourceFiles("components"), ...appSourceFiles("app")].filter(
      (path) => path !== "components/setup/rack-config.ts" && SWITCH.test(code(path)),
    );
    expect(offenders).toEqual([]);
  });
});
