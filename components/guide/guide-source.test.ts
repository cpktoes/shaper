import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The GUIDE's source contract (Phase 18, D-10, R7; threats T-18-01 and T-18-03): a card is words and a
 * picture, never a control, and never a way to change the board. Read from the real source with comments
 * stripped first (the way `lib/units-isolation.test.ts` reads its files), so a comment explaining a ban
 * never trips it.
 */

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const GUIDE_DIR = join(REPO_ROOT, "components", "guide");

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

/** Every source file under components/guide, tests left out, relative to the repo root. */
function guideSources(dir = GUIDE_DIR): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...guideSources(full));
    else if (/\.tsx?$/.test(entry) && !entry.endsWith(".test.ts")) out.push(relative(REPO_ROOT, full));
  }
  return out;
}

const read = (file: string) => stripComments(readFileSync(join(REPO_ROOT, file), "utf8"));

describe("the GUIDE's source", () => {
  const files = guideSources();

  it("is walked: the tab, the card, the painter and VOLUME's page are all there", () => {
    for (const name of ["guide-tab.tsx", "guide-card.tsx", "guide-cartoon.tsx", "volume-guide.tsx"]) {
      expect(files.map((file) => file.split("/").pop())).toContain(name);
    }
  });

  it("writes no raw HTML anywhere: every word is a React text child", () => {
    for (const file of files) expect(read(file), file).not.toMatch(/dangerouslySetInnerHTML|innerHTML/);
  });

  it("does no drawing arithmetic and reads nothing about the device — that is lib/geometry's and the layout's", () => {
    for (const file of files) {
      expect(read(file), file).not.toMatch(/Math\.(sin|cos|tan|atan2?|sqrt|pow|hypot)\b/);
      expect(read(file), file).not.toMatch(/\binnerWidth\b|\bmatchMedia\b|\bouterWidth\b|\bdevicePixelRatio\b|\bwindow\.|\bdocument\./);
    }
  });

  it("puts nothing pressable or focusable on a card or in its drawing", () => {
    for (const name of ["guide-card.tsx", "guide-cartoon.tsx"]) {
      const source = read(`components/guide/${name}`);
      expect(source, name).not.toMatch(/<button|<a\s|<input|role="button"|onClick|onPointer|onKey|onMouse|onTouch|tabIndex/);
    }
  });

  it("has exactly one keyboard stop: the scroller, so the arrow keys can scroll it", () => {
    const stops = files.flatMap((file) => (read(file).match(/tabIndex=\{0\}/g) ?? []).map(() => file));
    expect(stops).toEqual(["components/guide/guide-tab.tsx"]);
    for (const file of files) expect(read(file), file).not.toMatch(/tabIndex=\{(?!0\})/);
  });

  it("reads the board and never writes it: a page's GUIDE takes no action from the design store", () => {
    const store = readFileSync(join(REPO_ROOT, "components/design/design-store.tsx"), "utf8");
    const body = /interface DesignContextValue \{([\s\S]*?)\n\}/.exec(store)?.[1] ?? "";
    expect(body.length).toBeGreaterThan(1000);
    const values = new Set<string>();
    const actions = new Set<string>();
    for (const line of body.split("\n")) {
      const m = /^ {2}(\w+)(\??):\s*(.*)$/.exec(line) ?? /^ {2}(\w+)(\()/.exec(line);
      if (!m) continue;
      const type = m[3] ?? "";
      if (m[2] === "(" || type.startsWith("(") || type.includes("=>")) actions.add(m[1]);
      else values.add(m[1]);
    }
    expect(actions.has("updateVolume")).toBe(true);
    expect(values.has("effectiveVolume")).toBe(true);

    const pages = files.filter((file) => file.endsWith("-guide.tsx"));
    expect(pages.length).toBeGreaterThan(0);
    for (const file of pages) {
      const source = read(file);
      const reads = [...source.matchAll(/const \{([^}]*)\} = useDesign\(\)/g)].flatMap((m) =>
        m[1]
          .split(",")
          .map((name) => name.trim().split(":")[0].trim())
          .filter(Boolean),
      );
      expect(reads.length, file).toBeGreaterThan(0);
      for (const name of reads) {
        expect(actions.has(name), `${file} takes the store's action ${name}`).toBe(false);
        expect(values.has(name), `${file} reads ${name}, which the store does not hand out as a value`).toBe(true);
      }
      // And nothing else reaches into the store.
      expect(source.match(/useDesign\(\)/g)?.length, file).toBe(1);
    }
  });
});
