import { describe, expect, it } from "vitest";
import { readGuideWordsPage } from "@/components/guide/words/read-words-page";
import { readSeedCatalog } from "../blanks/seed-files";
import { DEFAULT_BOARD_SPEC } from "./board";
import { guideRockerInput, rockerGuideInputFromFields } from "./__fixtures__/guide-rocker-input";
import { BLANK_PLACEMENT_BUFFER_MM, placementRange } from "./blank-fit";
import { formatThinningStart } from "./blank-reasons";
import { formatRockerNote, MAX_CHANGES_PER_END, ROCKER_CHANGE_MAX_MM } from "./custom-rocker";
import { designSideProfile, LIVE_DESIGN_RULES } from "./design";
import { guideCaptionText, guideCardId, GUIDE_MIN_FIT, GUIDE_VIEWBOX_WIDTH, type GuideCardModel, type GuidePrim } from "./guide-card";
import { guideFigureBounds, guideLabelOverlaps } from "./guide-draw";
import { GUIDE_FRAME, guidePush } from "./guide-push";
import {
  buildRockerGuide,
  ROCKER_GUIDE_CARD_IDS,
  ROCKER_GUIDE_CARD_ORDER,
  ROCKER_GUIDE_PUSH_FIELDS,
  rockerGuideVariants,
  rockerWindowRange,
  type RockerGuideFields,
  type RockerGuideInput,
} from "./guide-rocker";
import { formatDim, formatMark, formatSignedMark, stationLabel } from "./measure-display";
import { thinningStartRange } from "./tip-taper";
import { inchesToMm, mm, UNITS_SYSTEMS } from "./units";

const ids = ROCKER_GUIDE_CARD_IDS;
const shortboard = guideRockerInput("shortboard");
const L = shortboard.outline.length;
const rocker = readGuideWordsPage().pages.find((p) => p.page === "rocker")!;

/** The Shortboard in a longer US Blanks blank, so Placement has room to slide either way. */
function inLongerBlank(): RockerGuideInput {
  const copy = readSeedCatalog().find((r) => r.vendor === "US Blanks" && r.name === `6'8"A`);
  if (!copy) throw new Error(`no US Blanks 6'8"A in the seed catalogue`);
  return rockerGuideInputFromFields({ ...shortboard, blank: { ...shortboard.blank!, copy, placement: mm(0) } });
}
/** The Shortboard with an ordered rocker: half an inch more nose rocker from the centre, a quarter less tail from 18". */
const customRocker = guideRockerInput("shortboard", {
  rocker: {
    changes: [
      { end: "nose", amount: inchesToMm(1 / 2) },
      { end: "tail", amount: inchesToMm(-1 / 4), fromTip: inchesToMm(18) },
    ],
  },
});

const BOARDS: [string, RockerGuideInput][] = [
  ["shortboard", shortboard],
  ["fish", guideRockerInput("fish")],
  ["midlength", guideRockerInput("midlength")],
  ["longboard", guideRockerInput("longboard")],
  [`shortboard in a 6'8"A`, inLongerBlank()],
  ["custom rocker", customRocker],
];

/** A copy of the board's fields with the listed `group.field` paths removed, for comparing everything else. */
function without(fields: RockerGuideFields, paths: readonly string[]): unknown {
  const copy = JSON.parse(JSON.stringify({ outline: fields.outline, rocker: fields.rocker, foil: fields.foil, blank: fields.blank }));
  for (const path of paths) {
    const [group, field] = path.split(".");
    if (copy[group]) delete copy[group][field];
  }
  return copy;
}

const allPrims = (card: GuideCardModel): GuidePrim[] => [...card.figure.strip, ...card.figure.windows.flatMap((w) => w.prims)];

describe("buildRockerGuide — the Shortboard as its card opens it", () => {
  it("gives the fourteen cards in the words page's order", () => {
    expect(ROCKER_GUIDE_CARD_ORDER).toHaveLength(14);
    expect([...buildRockerGuide(shortboard, "imperial").keys()]).toEqual(ROCKER_GUIDE_CARD_ORDER);
    expect(ROCKER_GUIDE_CARD_ORDER).toEqual(rocker.cards.map((card) => guideCardId("rocker", card.group, card.name)));
  });

  it("tags and captions every card exactly as the words page does, in Imperial", () => {
    const built = buildRockerGuide(shortboard, "imperial");
    let captions = 0;
    for (const card of rocker.cards) {
      const model = built.get(guideCardId("rocker", card.group, card.name))!;
      if (card.tag === null) expect(model.tag.kind, card.name).toBe("none");
      else expect(model.tag.text, card.name).toBe(card.tag);
      expect(guideCaptionText(model.caption), card.name).toBe(card.caption ?? "");
      if (card.caption !== null) captions++;
    }
    expect(captions).toBe(11);
    expect(built.get(ids.pinDeck)!.tag.kind).toBe("on");
  });

  // Six boards, two systems, fourteen cards each: a few seconds' work, more on a busy machine.
  it("changes only each card's own fields in its variants, and works every push through designSideProfile", { timeout: 60000 }, () => {
    for (const [name, input] of BOARDS) {
      for (const system of UNITS_SYSTEMS) {
        const plan = rockerGuideVariants(input, system);
        const built = buildRockerGuide(input, system);
        for (const id of ROCKER_GUIDE_CARD_ORDER) {
          const fields = ROCKER_GUIDE_PUSH_FIELDS[id];
          for (const variant of [...plan[id].pushes, ...(plan[id].drawnAs ? [plan[id].drawnAs!] : [])]) {
            expect(without(variant, fields), `${name} ${id}`).toEqual(without(input, fields));
            expect(() => designSideProfile(variant, LIVE_DESIGN_RULES)).not.toThrow();
          }
          // A card that pushes draws its pushed board in muted dashes in every detail window.
          const pushPaths = allPrims(built.get(id)!).filter((p) => p.kind === "path" && p.role === "push").length;
          if (plan[id].pushes.length > 0) expect(pushPaths, `${name} ${id}`).toBeGreaterThan(0);
          else expect(pushPaths, `${name} ${id}`).toBe(0);
        }
      }
    }
  });

  it("pushes the Shortboard by the page's own amounts", () => {
    const push = guidePush("imperial").rocker;
    const plan = rockerGuideVariants(shortboard, "imperial");
    expect(plan[ids.centerThickness].pushes[0].foil.center).toBeCloseTo(shortboard.foil.center + push.center, 9);
    expect(plan[ids.tips].pushes[0].foil.noseTip).toBeCloseTo(shortboard.foil.noseTip + push.tips, 9);
    expect(plan[ids.tips].pushes[0].foil.tailTip).toBeCloseTo(shortboard.foil.tailTip + push.tips, 9);
    expect(plan[ids.placement].pushes[0].blank!.placement).toBe(placementRange(shortboard.blank!.copy.lengthMm, L).max);
    expect(plan[ids.deckSkin].pushes[0].blank!.deckSkin).toBe(push.skin);
    expect(plan[ids.customizeRocker].pushes[0].blank!.rocker).toEqual({
      changes: [{ end: "nose", amount: push.bend, fromTip: push.bendFrom }],
    });
    expect(plan[ids.noseRocker].pushes[0].blank!.rocker).toEqual({ changes: [{ end: "nose", amount: push.rocker }] });
    expect(plan[ids.tailRocker].pushes[0].blank!.rocker).toEqual({ changes: [{ end: "tail", amount: push.rocker }] });
    expect(plan[ids.noseThinningStarts].pushes[0].blank!.noseThinningStart).toBe(push.startIn);
    expect(plan[ids.fineTunes].pushes[0].blank!.nose12Offset).toBe(push.fine);
    expect(plan[ids.fineTuneFrom].pushes.map((v) => [v.blank!.tail12Offset, v.blank!.fineTuneSurface])).toEqual([
      [-push.fine, "deck"],
      [-push.fine, "bottom"],
    ]);
    // The Pin tips to card the board does not use draws the board that way; the one it uses draws the board itself.
    expect(plan[ids.pinDeck].drawnAs).toBeNull();
    expect(plan[ids.pinBottom].drawnAs!.blank!.tipStyle).toBe("bottom");
    expect(plan[ids.pinDeck].pushes).toHaveLength(0);
    expect(plan[ids.blank].pushes).toHaveLength(0);
  });

  it("names the fine-tune card's station through stationLabel and the custom card as the sidebar's button does", () => {
    for (const system of UNITS_SYSTEMS) {
      const at = stationLabel(system);
      expect(buildRockerGuide(shortboard, system).get(ids.fineTunes)!.name).toBe(`Nose @ ${at} · Tail @ ${at}`);
    }
    expect(buildRockerGuide(shortboard, "imperial").get(ids.customizeRocker)!.name).toBe("Customize Rocker");
    const custom = buildRockerGuide(customRocker, "imperial").get(ids.customizeRocker)!;
    expect(custom.name).toBe("Edit Custom Rocker");
    expect(custom.tag.text).toBe(formatRockerNote(customRocker.blank!.rocker));
  });
});

describe("buildRockerGuide — in Metric", () => {
  const metric = buildRockerGuide(shortboard, "metric");

  it("reads a Thinning Start as a dim and the 12\" station as the page reads it", () => {
    const tip = shortboard.sideProfile.blank!.tips.nose;
    expect(metric.get(ids.noseThinningStarts)!.tag.text).toBe(`${formatThinningStart(tip.fromTip, "metric")} · Automatic`);
    expect(metric.get(ids.noseThinningStarts)!.tag.text).toBe("30.5 cm · Automatic");
    expect(metric.get(ids.tailThinningStarts)!.tag.text).toBe("30.5 cm · Automatic");
    expect(metric.get(ids.fineTunes)!.name).toBe("Nose @ 30.5 cm · Tail @ 30.5 cm");
  });

  it("pushes by whole millimetres: 13, 10, 13, 25, 6", () => {
    const push = guidePush("metric").rocker;
    expect(guideCaptionText(metric.get(ids.centerThickness)!.caption)).toBe(`dashed · ${formatSignedMark(push.center, "metric")} at the center`);
    expect(guideCaptionText(metric.get(ids.centerThickness)!.caption)).toBe("dashed · +13 mm at the center");
    expect(guideCaptionText(metric.get(ids.tips)!.caption)).toBe("dashed · +10 mm at each tip");
    expect(guideCaptionText(metric.get(ids.deckSkin)!.caption)).toBe("dashed · 13 mm skin");
    expect(guideCaptionText(metric.get(ids.noseRocker)!.caption)).toBe("dashed · +25 mm nose rocker");
    expect(guideCaptionText(metric.get(ids.fineTunes)!.caption)).toBe("dashed · +6 mm at both");
    expect(guideCaptionText(metric.get(ids.noseThinningStarts)!.caption)).toBe(`dashed · starts ${formatDim(push.startIn, "metric")} in`);
  });

  it("carries an inch mark only on the blank's name and the maker's rocker note", { timeout: 60000 }, () => {
    for (const [name, input] of BOARDS) {
      for (const card of buildRockerGuide(input, "metric").values()) {
        const labels = [...card.figure.strip, ...card.figure.windows.flatMap((w) => w.prims)]
          .flatMap((p) => (p.kind === "dim" || p.kind === "text" ? [p.parts.map((part) => part.text).join("")] : []))
          .join(" ");
        // The blank's name, and the maker's note on the Customize Rocker card (its tag once the board orders
        // a rocker, its caption always), are order codes and stay in inches (CLAUDE.md Rule 2).
        const maker = card.id === ids.blank || card.id === ids.customizeRocker;
        const text = `${card.name ?? ""} ${maker ? "" : card.tag.text} ${card.id === ids.customizeRocker ? "" : guideCaptionText(card.caption)} ${labels}`;
        expect(text, `${name} ${card.id}`).not.toMatch(/["″]|\d'/);
      }
    }
    expect(metric.get(ids.blank)!.tag.text).toBe(`US Blanks 6'3"RP`);
    expect(guideCaptionText(metric.get(ids.customizeRocker)!.caption)).toBe(`dashed · +1/2"N18"`);
  });
});

describe("buildRockerGuide — where the app's own limits leave no room (D-26)", () => {
  it("Placement: a blank with no room either way draws the board as it is with no caption", () => {
    const copy = { ...shortboard.blank!.copy, lengthMm: mm(L + 2 * BLANK_PLACEMENT_BUFFER_MM + 0.5) };
    const input = rockerGuideInputFromFields({ ...shortboard, blank: { ...shortboard.blank!, copy } });
    expect(placementRange(copy.lengthMm, L).max).toBeLessThanOrEqual(0.5);
    const card = buildRockerGuide(input, "imperial").get(ids.placement)!;
    expect(card.caption.kind).toBe("none");
    expect(rockerGuideVariants(input, "imperial")[ids.placement].pushes).toHaveLength(0);
  });

  it("Placement: a board already slid to the nose end of its blank is slid the other way, and says so", () => {
    const long = inLongerBlank();
    const range = placementRange(long.blank!.copy.lengthMm, L);
    const atNose = rockerGuideInputFromFields({ ...long, blank: { ...long.blank!, placement: range.max } });
    const plan = rockerGuideVariants(atNose, "imperial")[ids.placement];
    expect(plan.pushes[0].blank!.placement).toBe(range.min);
    expect(guideCaptionText(plan.caption)).toBe(`dashed · slid ${formatMark(mm(range.max - range.min), "imperial")} to the tail`);
  });

  it("Nose Rocker adds an inch to the nose change the board already orders", () => {
    const plan = rockerGuideVariants(customRocker, "imperial")[ids.noseRocker];
    const nose = plan.pushes[0].blank!.rocker!.changes.filter((c) => c.end === "nose");
    expect(nose).toHaveLength(1);
    expect(nose[0].amount).toBeCloseTo(inchesToMm(1 / 2) + inchesToMm(1), 9);
    expect(guideCaptionText(plan.caption)).toBe(`dashed · +1" nose rocker`);
    // The tail change is the board's own, untouched.
    expect(plan.pushes[0].blank!.rocker!.changes.filter((c) => c.end === "tail")).toEqual(customRocker.blank!.rocker!.changes.filter((c) => c.end === "tail"));
  });

  it("Nose Rocker at its 2\" limit is drawn an inch less, and the caption says so", () => {
    const input = guideRockerInput("shortboard", { rocker: { changes: [{ end: "nose", amount: ROCKER_CHANGE_MAX_MM }] } });
    const plan = rockerGuideVariants(input, "imperial")[ids.noseRocker];
    expect(plan.pushes[0].blank!.rocker!.changes[0].amount).toBeCloseTo(ROCKER_CHANGE_MAX_MM - inchesToMm(1), 9);
    expect(guideCaptionText(plan.caption)).toBe(`dashed · -1" nose rocker`);
  });

  it("never orders more than MAX_CHANGES_PER_END changes at an end", () => {
    const input = guideRockerInput("shortboard", {
      rocker: {
        changes: [
          { end: "nose", amount: inchesToMm(1 / 4), fromTip: inchesToMm(24) },
          { end: "nose", amount: inchesToMm(1 / 4), fromTip: inchesToMm(12) },
        ],
      },
    });
    const plan = rockerGuideVariants(input, "imperial");
    for (const id of [ids.noseRocker, ids.customizeRocker]) {
      const nose = plan[id].pushes[0].blank!.rocker!.changes.filter((c) => c.end === "nose");
      expect(nose.length, id).toBeLessThanOrEqual(MAX_CHANGES_PER_END);
      for (const change of nose) expect(Math.abs(change.amount), id).toBeLessThanOrEqual(ROCKER_CHANGE_MAX_MM + 1e-9);
    }
  });

  it("a Thinning Start already at the end of its reach is drawn the other way, never outside the range", () => {
    const range = thinningStartRange(L);
    const input = guideRockerInput("shortboard", { noseThinningStart: range.max });
    const plan = rockerGuideVariants(input, "imperial")[ids.noseThinningStarts];
    const start = plan.pushes[0].blank!.noseThinningStart!;
    expect(start).toBeLessThan(range.max);
    expect(start).toBeGreaterThanOrEqual(range.min);
    expect(guideCaptionText(plan.caption)).toBe(`dashed · starts ${formatThinningStart(start, "imperial")} in`);
    for (const [name, board] of BOARDS) {
      const r = thinningStartRange(board.outline.length);
      for (const id of [ids.noseThinningStarts, ids.tailThinningStarts]) {
        for (const v of rockerGuideVariants(board, "metric")[id].pushes) {
          const s = v.blank!.noseThinningStart ?? v.blank!.tailThinningStart!;
          expect(s, `${name} ${id}`).toBeGreaterThanOrEqual(r.min);
          expect(s, `${name} ${id}`).toBeLessThanOrEqual(r.max);
        }
      }
    }
  });
});

describe("buildRockerGuide — the drawings", () => {
  it("sets each tip window's tip at least 5 1/2\" inside it", () => {
    const frame = GUIDE_FRAME.rocker;
    for (const span of [frame.tipSpan, frame.pairSpan]) {
      const nose = rockerWindowRange({ at: "nose", span, name: "Nose" }, L);
      const tail = rockerWindowRange({ at: "tail", span, name: "Tail" }, L);
      expect(nose.s1 - L).toBeCloseTo(frame.tipInset, 9);
      expect(0 - tail.s0).toBeCloseTo(frame.tipInset, 9);
    }
  });

  it("keeps every label clear of the others and inside its window on six boards, in both systems", { timeout: 60000 }, () => {
    for (const [name, input] of BOARDS) {
      for (const system of UNITS_SYSTEMS) {
        for (const card of buildRockerGuide(input, system).values()) {
          for (const fit of [GUIDE_MIN_FIT, 0.79, 1.26]) expect(guideLabelOverlaps(card.figure, fit), `${name} ${system} ${fit} ${card.id}`).toEqual([]);
          const b = guideFigureBounds(card.figure);
          for (const n of [b.x, b.y, b.w, b.h]) expect(Number.isFinite(n), card.id).toBe(true);
          expect(b.x, card.id).toBeGreaterThanOrEqual(0);
          expect(b.x + b.w, card.id).toBeLessThanOrEqual(GUIDE_VIEWBOX_WIDTH);
          expect(b.y + b.h, card.id).toBeLessThanOrEqual(card.figure.height);
          expect(card.figure.height).toBe(140);
        }
      }
    }
  });

  it("draws the board in its blank: foam, baseline and both thinning marks on the strip of every card", () => {
    for (const card of buildRockerGuide(shortboard, "imperial").values()) {
      const roles = card.figure.strip.map((p) => (p.kind === "path" || p.kind === "line" ? p.role : p.kind));
      expect(roles, card.id).toContain("foam");
      expect(roles, card.id).toContain("baseline");
      expect(roles.filter((r) => r === "thinning"), card.id).toHaveLength(2);
      expect(card.figure.windows.length, card.id).toBe(
        [ids.tips, ids.placement, ids.pinDeck, ids.pinBottom, ids.fineTunes, ids.fineTuneFrom].includes(card.id as never) ? 2 : 1,
      );
    }
  });
});

describe("buildRockerGuide — a hand-set board, with no blank picked (a fresh ROCKER)", () => {
  const handSet = rockerGuideInputFromFields({
    outline: DEFAULT_BOARD_SPEC.outline,
    rocker: DEFAULT_BOARD_SPEC.rocker,
    foil: DEFAULT_BOARD_SPEC.foil,
    blank: null,
  });

  it("draws all fourteen cards with no collision; the blank's cards push nothing and say nothing", () => {
    for (const system of UNITS_SYSTEMS) {
      const built = buildRockerGuide(handSet, system);
      expect([...built.keys()]).toEqual(ROCKER_GUIDE_CARD_ORDER);
      for (const card of built.values()) expect(guideLabelOverlaps(card.figure, GUIDE_MIN_FIT), `${system} ${card.id}`).toEqual([]);
      for (const id of [ids.blank, ids.placement, ids.deckSkin, ids.customizeRocker, ids.pinDeck, ids.pinBottom, ids.noseThinningStarts, ids.tailThinningStarts, ids.fineTunes, ids.fineTuneFrom]) {
        expect(built.get(id)!.caption.kind, id).toBe("none");
        expect(built.get(id)!.tag.kind, id).toBe("none");
      }
    }
  });

  it("pushes the typed tip lifts on Nose Rocker and Tail Rocker, and tags them with the hand-set rocker", () => {
    const push = guidePush("imperial").rocker;
    const plan = rockerGuideVariants(handSet, "imperial");
    expect(plan[ids.noseRocker].pushes[0].rocker.noseTip).toBeCloseTo(handSet.rocker.noseTip + push.rocker, 9);
    expect(plan[ids.tailRocker].pushes[0].rocker.tailTip).toBeCloseTo(handSet.rocker.tailTip + push.rocker, 9);
    const built = buildRockerGuide(handSet, "imperial");
    expect(built.get(ids.noseRocker)!.tag.text).toBe(formatMark(handSet.sideProfile.stationRocker.noseTip, "imperial"));
    expect(guideCaptionText(built.get(ids.noseRocker)!.caption)).toBe(`dashed · +1" nose rocker`);
  });
});
