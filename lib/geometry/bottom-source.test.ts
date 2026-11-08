import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Source rules for the bottom contours (Phase 17, D-05, SPEC prohibitions "No reader may compute foam off itself" and
 * "`volume.ts` must NOT import outlines, wings, fins or bottom.ts"):
 *
 * - the bottom's one number lives in `lib/geometry/bottom.ts` alone — no file under `components/` or `lib/export/`
 *   defines the sketch's section curves (`sec`, `rise`, `chan`) or a `cutOff` of its own;
 * - `lib/geometry/volume.ts` takes the bottom as one sampler (`foamOffAt`) and imports none of `./outline`, `./wings`,
 *   `./fins` or `./bottom`;
 * - the founder's sketch, copied byte for byte into `reference/sketches/`, is never imported or named by the app.
 *
 * It reads every non-test `.ts`/`.tsx` file, comments stripped (a comment may say where the maths came from). Test
 * files are skipped: their own strings name what they look for (this file among them). The names it looks for are put
 * together at run time, so this file's own source can never match.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SKETCH = "021-" + "bottom-maths";

/** Strips `//` line comments and `/* *\/` block comments, the same helper as three-source.test.ts. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

/** Every non-test source file under the given folders, repo-relative. */
function sourceFiles(dirs: readonly string[]): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) && !name.endsWith(".d.ts")) {
        found.push(relative(REPO_ROOT, path));
      }
    }
  };
  for (const dir of dirs) walk(join(REPO_ROOT, dir));
  return found.sort();
}

const sourceOf = (file: string) => stripComments(readFileSync(join(REPO_ROOT, file), "utf8"));

/** The module names a source imports: `from "m"`, a bare `import "m"`, `require("m")`, `import("m")`. */
function importedModules(source: string): string[] {
  const names: string[] = [];
  const patterns = [
    /\bfrom\s*["'`]([^"'`]+)["'`]/g,
    /\bimport\s*["'`]([^"'`]+)["'`]/g,
    /\brequire\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
    /\bimport\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
  ];
  for (const pattern of patterns) for (const match of source.matchAll(pattern)) names.push(match[1]);
  return names;
}

/** The sketch's section curves and its one cut, defined as a function in any of the usual forms. */
const CURVES = ["s" + "ec", "ri" + "se", "ch" + "an"];
function definesBottomMaths(source: string): string[] {
  const found: string[] = [];
  for (const name of CURVES) {
    const defined = [
      new RegExp(`\\bfunction\\s+${name}\\s*\\(`),
      new RegExp(`\\b(const|let|var)\\s+${name}\\s*=\\s*(\\([^)]*\\)|[A-Za-z_$][\\w$]*)\\s*(:[^=]+)?=>`),
      new RegExp(`\\b(const|let|var)\\s+${name}\\s*=\\s*function\\b`),
    ];
    if (defined.some((pattern) => pattern.test(source))) found.push(`${name}(`);
  }
  if (new RegExp(`\\b${"cut" + "Off"}\\b`).test(source)) found.push("cut" + "Off");
  return found;
}

describe("the bottom's one number lives in bottom.ts alone (D-05)", () => {
  const readers = sourceFiles(["components", "lib/export"]);

  it("walks the screens and the CNC files", () => {
    expect(readers.length).toBeGreaterThan(50);
    expect(readers.some((file) => file.startsWith("lib/export/"))).toBe(true);
  });

  it("no file under components/ or lib/export/ defines the sketch's curves or a cut of its own", () => {
    const offenders = readers.flatMap((file) => definesBottomMaths(sourceOf(file)).map((what) => `${file}: ${what}`));
    expect(offenders).toEqual([]);
  });

  it("the rule catches a reader that would: its own fixture strings fail it, the app's file passes", () => {
    expect(definesBottomMaths(`function ${CURVES[0]}(u, r) { return u; }`)).toEqual([`${CURVES[0]}(`]);
    expect(definesBottomMaths(`const ${CURVES[1]} = (u: number, r: number): number => u * r;`)).toEqual([`${CURVES[1]}(`]);
    expect(definesBottomMaths(`const v = ${"cut" + "Off"}(c, b, s, y);`)).toEqual(["cut" + "Off"]);
    expect(definesBottomMaths(`import { foamOff } from "@/lib/geometry/bottom"; foamOff(r, b, s, y);`)).toEqual([]);
    // bottom.ts is where they belong, so the rule does find them there
    expect(definesBottomMaths(sourceOf("lib/geometry/bottom.ts"))).toEqual(expect.arrayContaining([`${CURVES[0]}(`, `${CURVES[1]}(`]));
  });
});

describe("volume.ts takes the bottom as one sampler (D-21, R11)", () => {
  const source = sourceOf("lib/geometry/volume.ts");

  it("imports none of the outline, the wings, the fins or the bottom", () => {
    const imported = importedModules(source);
    expect(imported.length).toBeGreaterThan(0);
    for (const forbidden of ["./outline", "./wings", "./fins", "./bottom"]) {
      expect(imported, forbidden).not.toContain(forbidden);
    }
  });

  it("reads the bottom only through its input's foamOffAt", () => {
    expect(source).toContain("foamOffAt?: (station: Mm, across: Mm) => Mm");
  });
});

describe("the founder's sketch is never imported or named by the app (Rule 1)", () => {
  it("no file under app/, components/ or lib/ imports or names the reference copy", () => {
    const files = sourceFiles(["app", "components", "lib"]);
    expect(files.length).toBeGreaterThan(100);
    const offenders = files.filter((file) => {
      const source = sourceOf(file);
      return source.includes(SKETCH) || importedModules(source).some((name) => name.includes("reference/"));
    });
    expect(offenders).toEqual([]);
  });
});
