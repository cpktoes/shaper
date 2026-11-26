import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BOTTOM_CUT_NAMES, takesRailRoll, type BottomCutName } from "@/lib/geometry/bottom";
import { UNITS_SYSTEMS } from "@/lib/geometry/units";
import { BOTTOM_COPY } from "./bottom-copy";
import { BOTTOM_GUIDE_WORDS, GUIDE_SPACING, guideHow, guideHowOnPaper, RAIL_ROLL_HOW } from "./bottom-guide-words";

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

describe("the one figure in the words reads in the shaper's own system (the founder, 2026-11-09)", () => {
  const SPACED = ["Flat Entry", "Deep Single Concave", "Shallow Single Concave", "Channels"];
  const withSpacing = BOTTOM_GUIDE_WORDS.filter((card) => card.how.includes('6"'));

  it('the spacing is said `6"` in Imperial and the round `15 cm` in Metric — two pieces of copy, nothing converted', () => {
    expect(GUIDE_SPACING).toEqual({ imperial: '6"', metric: "15 cm" });
    const words = readFileSync(new URL("./bottom-guide-words.ts", import.meta.url), "utf8");
    expect(words).not.toMatch(/25\.4|2\.54|Math\.|toFixed/);
  });

  it("four notes carry it — Flat Entry, Deep Single Concave, Shallow Single Concave and Channels — once each", () => {
    expect(withSpacing.map((card) => card.key)).toEqual(SPACED);
    for (const card of withSpacing) expect(card.how.split('6"'), card.key).toHaveLength(2);
  });

  it('an Imperial shaper reads every note exactly as the page writes it, `6"` and all', () => {
    for (const card of BOTTOM_GUIDE_WORDS) expect(guideHow(card, "imperial"), card.key).toBe(card.how);
    for (const card of withSpacing) expect(guideHow(card, "imperial"), card.key).toContain('6"');
  });

  it("a Metric shaper reads `15 cm` in that place and the same words around it", () => {
    for (const card of withSpacing) {
      const [before, after] = card.how.split('6"');
      expect(guideHow(card, "metric"), card.key).toBe(`${before}15 cm${after}`);
    }
    expect(guideHow(BOTTOM_GUIDE_WORDS[0], "metric")).toBe(
      "Nothing to cut: plane the bottom true and check it with a straightedge laid rail to rail every 15 cm.",
    );
    expect(guideHow(BOTTOM_GUIDE_WORDS.at(-1)!, "metric")).toContain("at each 15 cm station from DATA's marks");
    // The fifteen other notes read the same in both systems.
    for (const card of BOTTOM_GUIDE_WORDS) {
      if (!SPACED.includes(card.key)) expect(guideHow(card, "metric"), card.key).toBe(card.how);
    }
  });

  it("no card a Metric shaper reads carries an inch figure anywhere — the name, the two sentences or the note", () => {
    for (const card of BOTTOM_GUIDE_WORDS) {
      for (const line of [card.key, card.is, card.does, guideHow(card, "metric")]) {
        expect(line, card.key).not.toContain('6"');
        expect(line, card.key).not.toMatch(/\d\s*("|''|″|in\b|inch)/);
      }
    }
  });

  it("the founder's page records the rule beside the words", () => {
    const path = findPage(PLANNING);
    if (!path) throw new Error(`${PAGE_NAME} was not found anywhere under .planning/`);
    const text = readFileSync(path, "utf8").replace(/\s+/g, " ");
    expect(text).toContain("**Metric (the founder, 2026-11-09");
    expect(text).toContain('An Imperial shaper reads `6"` exactly as written below; a Metric shaper reads `15 cm` in its place.');
  });

  it("the guide hands each card its note through that one rule, and reads the chosen system from the app", () => {
    const guide = readFileSync(new URL("./bottom-guide.tsx", import.meta.url), "utf8");
    expect(guide).toMatch(/useUnits\(\)/);
    expect(guide).toMatch(/guideHow\(card, system\)/);
    expect(guide).not.toMatch(/card\.how/);
  });
});

describe("the Rail Roll's shaping line (the founder, 2026-11-25, quick 261125-v2j)", () => {
  // The cards that take a Rail Roll are the maths' own rule, never a list typed here alone.
  const ROLLING = BOTTOM_CUT_NAMES.nose.filter((name) => takesRailRoll("nose", name));
  const rolls = (card: (typeof BOTTOM_GUIDE_WORDS)[number]) => card.section === "nose" && ROLLING.includes(card.key as BottomCutName);

  it("is the founder's line, word for word", () => {
    expect(RAIL_ROLL_HOW).toBe(
      "Cut the concave first. Then plane from its edge out to the rail, taking the Rail Roll off at the rail, and blend it smooth.",
    );
  });

  it("ends the How to shape of exactly the three nose concaves that take a Rail Roll, once each, and appears on no other card", () => {
    expect(ROLLING).toEqual(["Teardrop Nose Concave", "Blended Nose Concave", "Slight Single Concave Entry"]);
    const ending = BOTTOM_GUIDE_WORDS.filter((card) => card.how.endsWith(` ${RAIL_ROLL_HOW}`)).map((card) => card.key);
    expect(ending).toEqual(ROLLING);
    for (const card of BOTTOM_GUIDE_WORDS) {
      expect(card.how.split(RAIL_ROLL_HOW).length - 1, card.key).toBe(rolls(card) ? 1 : 0);
      for (const line of [card.is, card.does]) expect(line, card.key).not.toContain(RAIL_ROLL_HOW);
    }
  });

  it("carries no figure and no unit, so a Metric shaper reads it the same", () => {
    expect(RAIL_ROLL_HOW).not.toMatch(/\d/);
    expect(RAIL_ROLL_HOW).not.toMatch(/"|\b(cm|mm|in|inch|inches)\b/);
    for (const card of BOTTOM_GUIDE_WORDS.filter(rolls)) {
      for (const system of UNITS_SYSTEMS) expect(guideHow(card, system).endsWith(` ${RAIL_ROLL_HOW}`), card.key).toBe(true);
    }
  });

  it("paper carries it only with a Rail Roll above 0: the GUIDE's own note then, and the same words without it at 0", () => {
    for (const card of BOTTOM_GUIDE_WORDS) {
      for (const system of UNITS_SYSTEMS) {
        for (const roll of [3.175, 0.001]) expect(guideHowOnPaper(card, system, roll), card.key).toBe(guideHow(card, system));
        for (const roll of [0, -1]) {
          const atZero = guideHowOnPaper(card, system, roll);
          if (rolls(card)) {
            expect(atZero, card.key).toBe(guideHow(card, system).slice(0, -(RAIL_ROLL_HOW.length + 1)));
            expect(atZero, card.key).not.toContain(RAIL_ROLL_HOW);
            expect(atZero, card.key).toBe(atZero.trim());
          } else {
            expect(atZero, card.key).toBe(guideHow(card, system));
          }
        }
      }
    }
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
