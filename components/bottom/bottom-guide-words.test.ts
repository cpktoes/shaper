import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BOTTOM_CUT_NAMES } from "@/lib/geometry/bottom";
import { BOTTOM_COPY } from "./bottom-copy";
import { BOTTOM_GUIDE_WORDS } from "./bottom-guide-words";

/*
 * The GUIDE's words are the founder's (Phase 17, D-18): `17-GUIDE-WORDS.md` is the page he marks up, and the module the
 * screen reads has to say exactly what that page says. This test reads the page itself and compares line for line, so a
 * correction made in one file and forgotten in the other fails here rather than reaching a shaper.
 *
 * The page is found by searching `.planning/` for its name, because a finished phase's folder moves to the milestone
 * archive and the page moves with it.
 */

const PAGE_NAME = "17-GUIDE-WORDS.md";
const PLANNING = fileURLToPath(new URL("../../.planning/", import.meta.url));

function findPage(dir: string): string | null {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isFile() && entry.name === PAGE_NAME) return path;
    if (entry.isDirectory()) {
      const found = findPage(path);
      if (found) return found;
    }
  }
  return null;
}

interface PageCard {
  number: number;
  name: string;
  group: string;
  labels: string[];
  lines: string[];
}

/** The page as it is written: `## Group`, `### N. Name`, then three `- **Label:** line` bullets. */
function readPage(): PageCard[] {
  const path = findPage(PLANNING);
  if (!path) throw new Error(`${PAGE_NAME} was not found anywhere under .planning/`);
  const cards: PageCard[] = [];
  let group = "";
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const heading = /^## (.+)$/.exec(line);
    if (heading) {
      group = heading[1];
      continue;
    }
    const card = /^### (\d+)\. (.+)$/.exec(line);
    if (card) {
      cards.push({ number: Number(card[1]), name: card[2], group, labels: [], lines: [] });
      continue;
    }
    const bullet = /^- \*\*(.+?):\*\* (.+)$/.exec(line);
    const open = cards.at(-1);
    if (bullet && open) {
      open.labels.push(bullet[1]);
      open.lines.push(bullet[2]);
    }
  }
  return cards;
}

describe("the GUIDE's words are the founder's page, line for line (D-18)", () => {
  const page = readPage();

  it("the page holds nineteen cards of three lines each: fifty-seven lines, numbered 1 to 19", () => {
    expect(page).toHaveLength(19);
    expect(page.map((card) => card.number)).toEqual(Array.from({ length: 19 }, (_, i) => i + 1));
    expect(page.flatMap((card) => card.lines)).toHaveLength(57);
    for (const card of page) {
      expect(card.labels, card.name).toEqual(["What it is and looks like", "What it does", "How to shape"]);
    }
  });

  it("every card the screen draws says exactly what the page says", () => {
    expect(BOTTOM_GUIDE_WORDS).toHaveLength(page.length);
    expect(BOTTOM_GUIDE_WORDS.map((card) => [card.key, card.is, card.does, card.how])).toEqual(
      page.map((card) => [card.name, ...card.lines]),
    );
    // No line arrives empty, padded, or carrying the page's own markup.
    for (const card of BOTTOM_GUIDE_WORDS) {
      for (const line of [card.is, card.does, card.how]) {
        expect(line, card.key).toBe(line.trim());
        expect(line.length, card.key).toBeGreaterThan(0);
        expect(line, card.key).not.toMatch(/\*\*|<|>/);
      }
    }
  });

  it("the cards are every cut the panel offers, in the panel's own order — Nose, Center, Tail — then Channels", () => {
    expect(BOTTOM_GUIDE_WORDS.map((card) => card.key)).toEqual([
      ...BOTTOM_CUT_NAMES.nose,
      ...BOTTOM_CUT_NAMES.center,
      ...BOTTOM_CUT_NAMES.tail,
      "Channels",
    ]);
    expect(BOTTOM_GUIDE_WORDS.map((card) => card.section)).toEqual([
      ...BOTTOM_CUT_NAMES.nose.map(() => "nose"),
      ...BOTTOM_CUT_NAMES.center.map(() => "center"),
      ...BOTTOM_CUT_NAMES.tail.map(() => "tail"),
      "channels",
    ]);
  });

  it("each card sits under the page's own group, and the screen's four headings name the same four groups", () => {
    const groupOf = { nose: "Nose", center: "Center", tail: "Tail", channels: "Channels (inside TAIL, cut last)" } as const;
    BOTTOM_GUIDE_WORDS.forEach((card, i) => expect(page[i].group, card.key).toBe(groupOf[card.section]));
    expect(BOTTOM_COPY.guideGroups).toEqual({
      nose: "Nose",
      center: "Center",
      tail: "Tail",
      channels: "Channels · cut last, inside TAIL",
    });
  });
});

describe("the GUIDE's own words around the cards (UI-SPEC § Copywriting)", () => {
  it("the tab, the tag and the note's label", () => {
    expect(BOTTOM_COPY.guideTab).toBe("GUIDE");
    expect(BOTTOM_COPY.guideOnThisBoard).toBe("On this board");
    expect(BOTTOM_COPY.guideHowToShape).toBe("How to shape");
  });

  it("the intro names the open board, and an unnamed one is 'your board' — never 'your Untitled'", () => {
    expect(BOTTOM_COPY.guideIntro("Twin Pin")).toBe(
      "What each cut is, what it does, and how it is shaped. Every cut is drawn on your Twin Pin at its starting numbers — from above with its shade, and across where it is deepest, Height ×8 — the way VIEWER draws it.",
    );
    for (const unnamed of [null, "", "   "]) {
      const intro = BOTTOM_COPY.guideIntro(unnamed);
      expect(intro).toContain("drawn on your board at its starting numbers");
      expect(intro).not.toContain("Untitled");
    }
  });
});

describe("the GUIDE draws words and pictures only (threats T-17-10, T-17-11; Rule 1)", () => {
  const read = (file: string) => readFileSync(new URL(`./${file}`, import.meta.url), "utf8");

  it("nothing under components/bottom writes raw HTML: the words are drawn as plain text", () => {
    const here = fileURLToPath(new URL("./", import.meta.url));
    const files = readdirSync(here).filter((name) => /\.tsx?$/.test(name) && !name.endsWith(".test.ts"));
    expect(files).toContain("bottom-guide.tsx");
    for (const file of files) expect(read(file), file).not.toMatch(/dangerouslySetInnerHTML|innerHTML/);
  });

  it("the cartoon is the maths' own drawing, worked out once per board and cut, and asks nothing of the window", () => {
    const cartoon = read("bottom-cartoon.tsx");
    expect(cartoon).toMatch(/guideCartoon\(/);
    expect(cartoon).toMatch(/useMemo\(/);
    expect(cartoon).toMatch(/memo\(/);
    for (const file of ["bottom-cartoon.tsx", "bottom-guide.tsx"]) {
      expect(read(file), file).not.toMatch(/\binnerWidth\b|\bmatchMedia\b|\bouterWidth\b|\bdevicePixelRatio\b|\bwindow\.|\bdocument\./);
      // No formula in a component: the only arithmetic allowed near the drawing is the maths module's own.
      expect(read(file), file).not.toMatch(/Math\.(sin|cos|tan|atan2?|sqrt|pow|hypot)\b/);
    }
  });

  it("a card is words and a picture, never a control: no button, no handler", () => {
    const guide = read("bottom-guide.tsx");
    expect(guide).not.toMatch(/<button|role="button"|onClick|onPointer|tabIndex/);
  });
});
