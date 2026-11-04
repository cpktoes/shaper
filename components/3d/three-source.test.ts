import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Source contract for the 3D drawing code (Phase 16, D-28, research Pitfall 5): three.js is about 130 KB
 * compressed, so it must reach the browser on the 3D screen alone. One file imports it,
 * `components/3d/board-scene.ts`; the screen reaches that file only through `import()`; and nothing in `lib/`
 * (the maths the CNC export reads with no drawing at all) ever imports it. `e2e/prod/three-d.spec.ts` proves the
 * same on a production build: no other route fetches the scene.
 *
 * It reads every non-test `.ts`/`.tsx` file under app/, components/ and lib/, comments stripped, and matches only
 * real import forms — `import … from`, a bare `import`, `export … from`, `require(…)` and `import(…)` — never the
 * bare word. Test files are skipped: their own strings and patterns name the package (this file, and 16-05's
 * export tests). The package's name is put together at run time so this file's own source can never match.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PACKAGE = "th" + "ree";
const SCENE = "components/3d/board-scene.ts";

/** Strips `//` line comments and `/* *\/` block comments, the same helper as rack-source.test.ts. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

/** Every non-test source file under the three folders, repo-relative. */
function sourceFiles(): string[] {
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
  for (const dir of ["app", "components", "lib"]) walk(join(REPO_ROOT, dir));
  return found.sort();
}

const quoted = (name: string) => `["'\`]${name}["'\`]`;

/** A real import of a module: `from "m"`, a bare `import "m"`, `require("m")` or `import("m")`. */
function importsModule(source: string, name: string): boolean {
  const q = quoted(name);
  return [
    new RegExp(`\\bfrom\\s*${q}`),
    new RegExp(`\\bimport\\s*${q}`),
    new RegExp(`\\brequire\\s*\\(\\s*${q}\\s*\\)`),
    new RegExp(`\\bimport\\s*\\(\\s*${q}\\s*\\)`),
  ].some((pattern) => pattern.test(source));
}

/** The package or any of its sub-paths. */
const PACKAGE_NAME = `${PACKAGE}(?:/[^"'\`]*)?`;

/** A static import of the scene's values: `import { … } from` / `export … from` it, but not `import type`. */
function staticallyImportsScene(source: string): boolean {
  const scene = `(?:\\./board-scene|@/components/3d/board-scene)`;
  const statements = source.match(new RegExp(`\\b(?:import|export)\\b[^;]*?\\bfrom\\s*${quoted(scene)}`, "g")) ?? [];
  const bare = new RegExp(`\\bimport\\s*${quoted(scene)}`).test(source);
  return bare || statements.some((statement) => !/^import\s+type\b/.test(statement.trim()) && !/^export\s+type\b/.test(statement.trim()));
}

const files = sourceFiles();
const code = new Map(files.map((path) => [path, stripComments(readFileSync(join(REPO_ROOT, path), "utf8"))]));

describe("three.js stays on the 3D screen", () => {
  it("the matcher sees every real import form and never the bare word", () => {
    for (const source of [
      `import { Mesh } from "${PACKAGE}";`,
      `import * as T from '${PACKAGE}';`,
      `import "${PACKAGE}";`,
      `export { Mesh } from "${PACKAGE}";`,
      `const t = require("${PACKAGE}");`,
      `const t = await import("${PACKAGE}");`,
      `import { OrbitControls } from "${PACKAGE}/addons/controls/OrbitControls.js";`,
    ]) {
      expect(importsModule(source, PACKAGE_NAME), source).toBe(true);
    }
    for (const source of [`const word = "${PACKAGE} fins";`, `// import { Mesh } from "${PACKAGE}"`, `import { x } from "${PACKAGE}-stdlib";`]) {
      expect(importsModule(stripComments(source), PACKAGE_NAME), source).toBe(false);
    }
  });

  it("the scene is the only file that imports the package", () => {
    expect(files).toContain(SCENE);
    const importers = files.filter((path) => importsModule(code.get(path)!, PACKAGE_NAME));
    expect(importers).toEqual([SCENE]);
  });

  it("no file imports the scene's values statically — `import()` is the one way in", () => {
    expect(staticallyImportsScene(`import { mountBoardScene } from "./board-scene";`)).toBe(true);
    expect(staticallyImportsScene(`import type { BoardSceneHandle } from "./board-scene";`)).toBe(false);
    const offenders = files.filter((path) => path !== SCENE && staticallyImportsScene(code.get(path)!));
    expect(offenders).toEqual([]);
    expect(code.get("components/3d/three-d-screen.tsx")).toMatch(/\bimport\(\s*"\.\/board-scene"\s*\)/);
  });

  it("nothing in lib/ imports the package", () => {
    const inLib = files.filter((path) => path.startsWith("lib/") && importsModule(code.get(path)!, PACKAGE_NAME));
    expect(inLib).toEqual([]);
  });
});
