import { describe, expect, it } from "vitest";
import { memoGuide } from "@/components/guide/guide-memo";
import { GUIDE_WORDS } from "@/components/guide/guide-words";
import { guideImperialFigures } from "@/components/guide/words/metric-sayings";
import { guideFixtureBoards, type GuideFixtureBoard } from "./__fixtures__/guide-fixture-boards";
import { formatRockerNote } from "./custom-rocker";
import {
  guideCaptionText,
  GUIDE_MIN_FIT,
  GUIDE_PAGES,
  GUIDE_VIEWBOX_WIDTH,
  type GuideCardModel,
  type GuideFigure,
  type GuidePage,
  type GuidePageBuild,
  type GuidePrim,
} from "./guide-card";
import { guideFigureBounds, guideLabelOverlaps } from "./guide-draw";
import { buildFinsGuide, FINS_GUIDE_CARD_ORDER, FINS_GUIDE_PUSH_FIELDS, finsGuideVariants } from "./guide-fins";
import { buildTemplateGuide, TEMPLATE_GUIDE_CARD_ORDER, TEMPLATE_GUIDE_PUSH_FIELDS, templateGuideVariants } from "./guide-outline";
import {
  buildRailsGuide,
  RAILS_GUIDE_CARD_ORDER,
  RAILS_GUIDE_PUSH_FIELDS,
  RAILS_GUIDE_SECTION,
  railsGuideVariants,
} from "./guide-rails";
import { buildRockerGuide, ROCKER_GUIDE_CARD_ORDER, ROCKER_GUIDE_PUSH_FIELDS, rockerGuideVariants, type RockerGuideFields } from "./guide-rocker";
import { buildVolumeGuide, VOLUME_GUIDE_CARD_ORDER, VOLUME_GUIDE_PUSH_FIELDS, volumeGuideVariants } from "./guide-volume";
import type { RailSectionSpec } from "./rail-bands";
import { UNITS_SYSTEMS, type UnitsSystem } from "./units";

/**
 * All five GUIDEs held to the same rules on every kind of board the app can hold, in both systems (Phase 18,
 * plan 18-08, R13). Each page's own test proved its page on its own boards; this one runs all five builders
 * over one shared set — the four presets, the Shortboard on each other tail, a custom rocker, a board too
 * short for McKee Longboard rears, two wings, the unsaved stock board — and asks the same questions of every
 * card: the right cards in the right order, nothing thrown, the board never written, the same cards twice,
 * `dashed` only where something is dashed, every figure finite and inside its drawing, no label on another,
 * each push changing only its own control's fields, and no inch figure in Metric outside the two exempt
 * strings.
 */

// Twelve boards, two systems, five pages: every builder runs several times over. Seconds on a quiet machine.
const SLOW = { timeout: 300_000 };

const BOARDS: Record<UnitsSystem, GuideFixtureBoard[]> = { imperial: guideFixtureBoards("imperial"), metric: guideFixtureBoards("metric") };

type PageRun = {
  page: GuidePage;
  order: readonly string[];
  input: (board: GuideFixtureBoard) => object;
  build: (input: never, system: UnitsSystem) => GuidePageBuild;
  /** Every way a card's variant differs from the open board that its declared push fields do not allow. */
  strayFields: (board: GuideFixtureBoard, system: UnitsSystem) => string[];
};

const allPrims = (figure: GuideFigure): GuidePrim[] => [...figure.strip, ...figure.windows.flatMap((w) => w.prims)];
const pushPrims = (figure: GuideFigure) => allPrims(figure).filter((p) => (p.kind === "path" || p.kind === "line") && p.role === "push");

/** A plain copy with the listed keys (dotted paths) taken out, for comparing everything else. */
function without(value: object, paths: readonly string[]): unknown {
  const copy = JSON.parse(JSON.stringify(value));
  for (const path of paths) {
    const keys = path.split(".");
    let at = copy;
    for (const key of keys.slice(0, -1)) at = at?.[key];
    if (at && typeof at === "object") delete at[keys[keys.length - 1]];
  }
  return copy;
}
/** A value written out with every object's keys sorted, functions and typed arrays included, so two values
 * compare by what they hold, never by the order their keys were set in. */
function canon(value: unknown, seen = new Set<unknown>()): unknown {
  if (typeof value === "function") return "[function]";
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[seen]";
  seen.add(value);
  if (ArrayBuffer.isView(value)) return Array.from(value as unknown as ArrayLike<number>);
  if (Array.isArray(value)) return value.map((v) => canon(v, seen));
  if (value instanceof Map) return [...value.entries()].map(([k, v]) => [canon(k, seen), canon(v, seen)]);
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((k) => [k, canon((value as Record<string, unknown>)[k], seen)]),
  );
}
const same = (a: unknown, b: unknown) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

function railField(spec: RailSectionSpec, field: string): unknown {
  return field.startsWith("nudges.") ? spec.nudges[field.slice(7) as keyof RailSectionSpec["nudges"]] : spec[field as keyof RailSectionSpec];
}

const PAGES: readonly PageRun[] = [
  {
    page: "template",
    order: TEMPLATE_GUIDE_CARD_ORDER,
    input: (b) => b.template,
    build: buildTemplateGuide as PageRun["build"],
    strayFields: (b, system) => {
      const out: string[] = [];
      const variants = templateGuideVariants(b.template, system);
      for (const id of TEMPLATE_GUIDE_CARD_ORDER) {
        const fields = TEMPLATE_GUIDE_PUSH_FIELDS[id] ?? [];
        const { base, push } = variants[id];
        for (const spec of push ? [base, push] : [base]) {
          if (!same(without(spec, fields), without(b.template.outline, fields))) out.push(id);
        }
      }
      return out;
    },
  },
  {
    page: "rocker",
    order: ROCKER_GUIDE_CARD_ORDER,
    input: (b) => b.rocker,
    build: buildRockerGuide as PageRun["build"],
    strayFields: (b, system) => {
      const out: string[] = [];
      const plan = rockerGuideVariants(b.rocker, system);
      const fieldsOf = (f: RockerGuideFields) => ({ outline: f.outline, rocker: f.rocker, foil: f.foil, blank: f.blank });
      for (const id of ROCKER_GUIDE_CARD_ORDER) {
        const fields = ROCKER_GUIDE_PUSH_FIELDS[id] ?? [];
        for (const variant of [...plan[id].pushes, ...(plan[id].drawnAs ? [plan[id].drawnAs!] : [])]) {
          if (!same(without(fieldsOf(variant), fields), without(fieldsOf(b.rocker), fields))) out.push(id);
        }
      }
      return out;
    },
  },
  {
    page: "rails",
    order: RAILS_GUIDE_CARD_ORDER,
    input: (b) => b.rails,
    build: buildRailsGuide as PageRun["build"],
    strayFields: (b, system) => {
      const out: string[] = [];
      const variants = railsGuideVariants(b.rails, system);
      for (const id of RAILS_GUIDE_CARD_ORDER) {
        const v = variants[id];
        const field = RAILS_GUIDE_PUSH_FIELDS[id];
        if (!v) continue;
        if (!field) {
          out.push(`${id} pushes with no declared field`);
          continue;
        }
        if (v.kind === "blends") {
          if (field !== "tailHardEdgeBlends") out.push(id);
          continue;
        }
        const base = b.rails.effectiveRails[v.key];
        if (v.key !== RAILS_GUIDE_SECTION[id]) out.push(`${id} draws the ${v.key}`);
        if (field === "tailHardEdge") {
          // Coming on, Hard Edge turns the tail's Symmetrical off, as the page's own tick box does.
          if (!same(without(v.spec, ["symmetrical"]), without(base, ["symmetrical"]))) out.push(id);
          continue;
        }
        if (v.hardEdge !== (v.key === "tail" && b.rails.effectiveRails.tailHardEdge)) out.push(`${id} flips the hard edge`);
        const reset = field.startsWith("nudges.")
          ? { ...v.spec, nudges: { ...v.spec.nudges, [field.slice(7)]: railField(base, field) } }
          : { ...v.spec, [field]: railField(base, field) };
        if (!same(reset, base)) out.push(id);
      }
      return out;
    },
  },
  {
    page: "volume",
    order: VOLUME_GUIDE_CARD_ORDER,
    input: (b) => b.volume,
    build: buildVolumeGuide as PageRun["build"],
    strayFields: (b, system) => {
      const out: string[] = [];
      const variants = volumeGuideVariants(b.volume, system);
      // A push is the quick estimate's: the board's own settings read as the quick calculator reads them,
      // nothing imported, with the one slider moved.
      const base = { ...b.volume.effectiveVolume, importTemplateDimensions: false, importRailThickness: false };
      for (const id of VOLUME_GUIDE_CARD_ORDER) {
        const v = variants[id];
        const field = VOLUME_GUIDE_PUSH_FIELDS[id];
        if (!v) continue;
        if (!field || !same({ ...v, [field]: base[field] }, base)) out.push(id);
      }
      return out;
    },
  },
  {
    page: "fins",
    order: FINS_GUIDE_CARD_ORDER,
    input: (b) => b.fins,
    build: buildFinsGuide as PageRun["build"],
    strayFields: (b, system) => {
      const out: string[] = [];
      const variants = finsGuideVariants(b.fins, system);
      const base = b.fins.effectiveFins;
      // The setup and model cards draw the board with that setup picked (a `drawn as` card, not a push);
      // the four Advanced cards push, each only its declared fields.
      for (const [id, fields] of Object.entries(FINS_GUIDE_PUSH_FIELDS)) {
        const v = variants[id];
        if (!v) continue;
        const advanced = fields.map((f) => `advanced.${f}`);
        if (!same(without(v, advanced), without(base, advanced))) out.push(id);
      }
      return out;
    },
  },
];

function run(page: PageRun, board: GuideFixtureBoard, system: UnitsSystem): GuidePageBuild {
  return page.build(page.input(board) as never, system);
}

/**
 * The figure as the painter shows it: the strip whole, and each window's frame with everything in it but its
 * paths and lines, which the painter clips to that window's frame (a detail is the board drawn closer, so the
 * board's outline runs on past the window's edge, unseen). Labels, dimensions, dots and marks are never
 * clipped away, so each must lie inside the drawing itself.
 */
function drawnFigure(figure: GuideFigure): GuideFigure {
  return {
    ...figure,
    windows: figure.windows.map((w) => ({ ...w, prims: w.prims.filter((p) => p.kind !== "path" && p.kind !== "line") })),
  };
}

/** Freezes an object and everything it holds (a typed array's contents cannot be frozen, so it is left). */
function deepFreeze<T>(value: T, seen = new Set<unknown>()): T {
  if (value === null || typeof value !== "object" || seen.has(value) || ArrayBuffer.isView(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) deepFreeze((value as Record<PropertyKey, unknown>)[key], seen);
  return Object.freeze(value);
}

/** Every string a card shows: its name, its tag, its caption and every label in its drawing. */
function cardStrings(card: GuideCardModel, wordsName: string): { what: string; text: string }[] {
  const out = [
    { what: "name", text: card.name ?? wordsName },
    { what: "tag", text: card.tag.text },
    { what: "caption", text: guideCaptionText(card.caption) },
  ];
  for (const prim of allPrims(card.figure)) {
    if (prim.kind === "text" || prim.kind === "dim") out.push({ what: `${prim.kind} label`, text: prim.parts.map((p) => p.text).join("") });
  }
  return out;
}

/** The two strings a Metric shaper may read an inch in: this board's blank's own name, and every rocker
 * order code a ROCKER card can show (its own, and each pushed one). */
function metricExempt(board: GuideFixtureBoard): string[] {
  const blank = board.fields.blank;
  if (!blank) return [];
  const out = [`${blank.copy.vendor} ${blank.copy.name}`];
  if (blank.rocker && blank.rocker.changes.length > 0) out.push(formatRockerNote(blank.rocker));
  for (const system of UNITS_SYSTEMS) {
    for (const plan of Object.values(rockerGuideVariants(board.rocker, system))) {
      for (const push of plan.pushes) if (push.blank?.rocker && push.blank.rocker.changes.length > 0) out.push(formatRockerNote(push.blank.rocker));
    }
  }
  return out;
}

const WORDS_NAME = new Map(GUIDE_WORDS.map((card) => [card.id, card.name]));

describe("the fixture boards", () => {
  it("are at least twelve kinds of board, the same set in both systems", () => {
    for (const system of UNITS_SYSTEMS) expect(BOARDS[system].length).toBeGreaterThanOrEqual(12);
    expect(BOARDS.imperial.map((b) => b.label)).toEqual(BOARDS.metric.map((b) => b.label));
  });

  it("include every tail, a custom rocker, a board too short for McKee Longboard rears, two wings and a board with no blank", () => {
    const boards = BOARDS.imperial;
    expect(new Set(boards.map((b) => b.fields.outline.tail.kind))).toEqual(new Set(["pin", "round", "diamond", "squash", "swallow"]));
    expect(boards.some((b) => (b.fields.blank?.rocker?.changes.length ?? 0) > 0)).toBe(true);
    expect(boards.some((b) => b.fields.fins.quadRearModel === "mckeeLB" && b.fields.fins.finSetup === "quad")).toBe(true);
    expect(boards.some((b) => (b.template.outline.wings ?? []).length === 2)).toBe(true);
    expect(boards.some((b) => b.fields.blank === null)).toBe(true);
  });
});

for (const page of PAGES) {
  describe(`${page.page.toUpperCase()}'s GUIDE on every fixture board, in both systems`, () => {
    it("gives the page's own cards, in the words page's order, and throws for no board", SLOW, () => {
      const words = GUIDE_WORDS.filter((card) => card.page === page.page).map((card) => card.id);
      expect(page.order).toEqual(words);
      for (const system of UNITS_SYSTEMS) {
        for (const board of BOARDS[system]) {
          let built: GuidePageBuild | undefined;
          expect(() => (built = run(page, board, system)), `${board.label} ${system}`).not.toThrow();
          expect([...built!.keys()], `${board.label} ${system}`).toEqual(words);
          for (const [id, card] of built!) expect(card.id, `${board.label} ${system}`).toBe(id);
        }
      }
    });

    it("never writes the board it is given: a deep-frozen board builds, and is left exactly as it was", SLOW, () => {
      for (const system of UNITS_SYSTEMS) {
        for (const board of guideFixtureBoards(system)) {
          const input = page.input(board);
          const before = JSON.stringify(canon(input));
          deepFreeze(input);
          expect(() => run(page, board, system), `${board.label} ${system}`).not.toThrow();
          expect(JSON.stringify(canon(input)), `${board.label} ${system}`).toBe(before);
        }
      }
    });

    it("gives the same cards twice from the same board and system, and the memo hands back the very same cards", SLOW, () => {
      for (const system of UNITS_SYSTEMS) {
        for (const board of BOARDS[system]) {
          expect(run(page, board, system), `${board.label} ${system}`).toEqual(run(page, board, system));
          const cache = new WeakMap<object, Map<string, GuidePageBuild>>();
          const key = page.input(board);
          const first = memoGuide(cache, key, system, () => run(page, board, system));
          expect(memoGuide(cache, key, system, () => run(page, board, system)), `${board.label} ${system}`).toBe(first);
        }
      }
    });

    it("says dashed exactly when something is dashed: none and drawn as draw no push, dashed at least one (D-26)", SLOW, () => {
      for (const system of UNITS_SYSTEMS) {
        for (const board of BOARDS[system]) {
          for (const card of run(page, board, system).values()) {
            const pushes = pushPrims(card.figure).length;
            if (card.caption.kind === "dashed") expect(pushes, `${board.label} ${system} ${card.id}`).toBeGreaterThan(0);
            else expect(pushes, `${board.label} ${system} ${card.id} (${card.caption.kind})`).toBe(0);
          }
        }
      }
    });

    it("draws every figure with finite numbers, inside its 300-wide drawing", SLOW, () => {
      for (const system of UNITS_SYSTEMS) {
        for (const board of BOARDS[system]) {
          for (const card of run(page, board, system).values()) {
            const where = `${board.label} ${system} ${card.id}`;
            for (const prim of allPrims(card.figure)) {
              for (const [key, value] of Object.entries(prim)) {
                if (typeof value === "number") expect(Number.isFinite(value), `${where} ${prim.kind}.${key}`).toBe(true);
              }
              if (prim.kind === "path") expect(prim.d, where).not.toMatch(/NaN|Infinity|undefined/);
            }
            expect(Number.isFinite(card.figure.height) && card.figure.height > 0, where).toBe(true);
            const b = guideFigureBounds(drawnFigure(card.figure));
            for (const n of [b.x, b.y, b.w, b.h]) expect(Number.isFinite(n), where).toBe(true);
            expect(b.x, where).toBeGreaterThanOrEqual(0);
            expect(b.y, where).toBeGreaterThanOrEqual(0);
            expect(b.x + b.w, where).toBeLessThanOrEqual(GUIDE_VIEWBOX_WIDTH);
            expect(b.y + b.h, where).toBeLessThanOrEqual(card.figure.height);
          }
        }
      }
    });

    it("keeps every label clear of every other and of each window's name, and inside its window, from the narrowest card to a phone", SLOW, () => {
      for (const system of UNITS_SYSTEMS) {
        for (const board of BOARDS[system]) {
          for (const card of run(page, board, system).values()) {
            for (const fit of [GUIDE_MIN_FIT, 0.79, 1.26]) {
              expect(guideLabelOverlaps(card.figure, fit), `${board.label} ${system} ${card.id} at ${fit}`).toEqual([]);
            }
          }
        }
      }
    });

    it("changes only the fields each card's own control sets, in every variant it draws", SLOW, () => {
      for (const system of UNITS_SYSTEMS) {
        for (const board of BOARDS[system]) expect(page.strayFields(board, system), `${board.label} ${system}`).toEqual([]);
      }
    });

    it("shows no inch or foot figure in Metric on any card's name, tag, caption or drawing label, the blank's name and rocker code aside", SLOW, () => {
      for (const board of BOARDS.metric) {
        const exempt = metricExempt(board);
        for (const card of run(page, board, "metric").values()) {
          for (const { what, text } of cardStrings(card, WORDS_NAME.get(card.id)!)) {
            expect(guideImperialFigures(text, exempt), `${board.label} ${card.id} ${what}: ${text}`).toEqual([]);
          }
        }
      }
    });
  });
}

describe("the five pages together", () => {
  it("are the five pages in the app's order, 84 cards, the same count on every board", SLOW, () => {
    expect(PAGES.map((p) => p.page)).toEqual([...GUIDE_PAGES]);
    for (const system of UNITS_SYSTEMS) {
      for (const board of BOARDS[system]) {
        expect(PAGES.map((p) => run(p, board, system).size), `${board.label} ${system}`).toEqual([22, 14, 17, 8, 23]);
      }
    }
  });
});
