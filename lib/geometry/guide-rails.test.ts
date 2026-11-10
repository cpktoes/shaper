import { describe, expect, it } from "vitest";
import { presetDesignFields } from "../blanks/preset-blanks";
import { guideRailsInput, railsGuideInputFromFields } from "./__fixtures__/guide-rails-input";
import { finishedRail } from "./finished-rail";
import { guideCaptionText, GUIDE_VIEWBOX_WIDTH, type GuidePrim } from "./guide-card";
import { guideFigureBounds, guideLabelOverlaps } from "./guide-draw";
import { guidePush } from "./guide-push";
import {
  buildRailsGuide,
  RAILS_GUIDE_CARD_IDS,
  RAILS_GUIDE_CARD_ORDER,
  RAILS_GUIDE_PUSH_FIELDS,
  RAILS_GUIDE_SECTION,
  railsGuideFinishedRail,
  railsGuidePushedOutput,
  railsGuideVariants,
  railsGuideX0,
  railsThicknessName,
  type RailsGuideInput,
} from "./guide-rails";
import { formatDim, formatMark, formatSignedMark, stationLabel } from "./measure-display";
import {
  computeRailSectionOutput,
  hardEdgeBlendsFrom,
  hardEdgeEndsAt,
  railFamilyLabel,
  RAIL_NUDGE_KEYS,
  type RailSectionSpec,
} from "./rail-bands";
import { BOARD_PRESETS } from "./presets";
import { inchesToMm, mm, UNITS_SYSTEMS } from "./units";

const ids = RAILS_GUIDE_CARD_IDS;
const shortboard = guideRailsInput("shortboard");
const longboard = guideRailsInput("longboard");
const PRESETS = ["shortboard", "fish", "midlength", "longboard"] as const;

const prims = (figure: { strip: readonly GuidePrim[]; windows: readonly { prims: readonly GuidePrim[] }[] }) => [
  ...figure.strip,
  ...figure.windows.flatMap((w) => w.prims),
];
const tagOf = (input: RailsGuideInput, id: string, system = "imperial" as const) => buildRailsGuide(input, system).get(id)!.tag;
const captionOf = (input: RailsGuideInput, id: string, system: "imperial" | "metric" = "imperial") =>
  guideCaptionText(buildRailsGuide(input, system).get(id)!.caption);

/** The one field a card changes, read off a spec (a nudge as `nudges.<key>`). */
function fieldOf(spec: RailSectionSpec, field: string): unknown {
  return field.startsWith("nudges.") ? spec.nudges[field.slice(7) as keyof RailSectionSpec["nudges"]] : spec[field as keyof RailSectionSpec];
}
function withField(spec: RailSectionSpec, field: string, value: unknown): RailSectionSpec {
  if (field.startsWith("nudges.")) return { ...spec, nudges: { ...spec.nudges, [field.slice(7)]: value } };
  return { ...spec, [field]: value };
}

describe("buildRailsGuide — the Shortboard as its card opens it", () => {
  it("gives the seventeen cards in the words page's order", () => {
    expect(RAILS_GUIDE_CARD_ORDER).toHaveLength(17);
    expect([...buildRailsGuide(shortboard, "imperial").keys()]).toEqual(RAILS_GUIDE_CARD_ORDER);
  });

  it("draws every card at the center, and at the tail only for the controls the tail alone has (D-04)", () => {
    const tail = RAILS_GUIDE_CARD_ORDER.filter((id) => RAILS_GUIDE_SECTION[id] === "tail");
    expect(tail).toEqual([ids.hardEdge, ids.scaled, ids.blends]);
  });

  it("tags and captions each card in Imperial as the founder's page reads it", () => {
    const cards = buildRailsGuide(shortboard, "imperial");
    const read = (id: string) => [cards.get(id)!.tag.text, guideCaptionText(cards.get(id)!.caption)];
    expect(read(ids.importFoil)).toEqual(["On this board", ""]);
    expect(read(ids.thickness)).toEqual(['2 1/4"', 'dashed · 2 1/2" thick']);
    expect(read(ids.deckProfile)).toEqual(['2 1/4" · Flat', 'dashed · domed to 1 15/16"']);
    expect(read(ids.family)).toEqual(["med/knifey", "dashed · boxy"]);
    expect(read(ids.ratio)).toEqual(["60/40", "dashed · 35/65"]);
    expect(read(ids.symmetrical)).toEqual(["", "dashed · symmetrical"]);
    expect(read(ids.hardEdge)).toEqual(["On this board", "dashed · tucked"]);
    expect(read(ids.scaled)).toEqual(["1.00", "dashed · 0.70"]);
    expect(read(ids.apexThickness)).toEqual(['11/16"', 'dashed · +1/4"']);
    expect(read(ids.deckMark1)).toEqual(['2 1/4"', 'dashed · +1/2"']);
    expect(read(ids.deckMark3)).toEqual(['4 1/16"', 'dashed · +1/2"']);
    expect(read(ids.domedDeckBand)).toEqual(['5 3/8"', 'dashed · +2"']);
    expect(read(ids.singleTuck)).toEqual(["", "dashed · one tuck"]);
    expect(read(ids.bottomTuck1)).toEqual(['5/16"', 'dashed · +1/4"']);
    expect(read(ids.bottomTuck3)).toEqual(['9/16"', 'dashed · +3/4"']);
    expect(read(ids.sharpBottomTuck)).toEqual(["", "dashed · sharp"]);
  });

  it("reads Tail Rail Blends From · Ends At as RAILS' own sliders do — the app's 30 1/2\", where the words page says 30 5/16\"", () => {
    const from = hardEdgeBlendsFrom(shortboard.effectiveRails, shortboard.boardLength);
    const ends = hardEdgeEndsAt(shortboard.effectiveRails, shortboard.boardLength);
    expect(tagOf(shortboard, ids.blends).text).toBe(`${formatDim(from, "imperial")} · ${formatDim(ends, "imperial")}`);
    expect(tagOf(shortboard, ids.blends).text).toBe('18" · 30 1/2"');
    expect(captionOf(shortboard, ids.blends)).toBe('dashed · 24" · 36 1/2"');
  });

  it("tags a toggle On this board only while it is ticked", () => {
    const cards = buildRailsGuide(shortboard, "imperial");
    for (const id of [ids.importFoil, ids.hardEdge]) expect(cards.get(id)!.tag, id).toEqual({ kind: "on", text: "On this board" });
    for (const id of [ids.symmetrical, ids.singleTuck, ids.sharpBottomTuck]) expect(cards.get(id)!.tag.kind, id).toBe("none");
    const unticked = guideRailsInput("shortboard", (r) => r, false);
    expect(tagOf(unticked, ids.importFoil).kind).toBe("none");
  });

  it("names the thickness card as the sidebar does, its station through stationLabel in both systems", () => {
    expect(buildRailsGuide(shortboard, "imperial").get(ids.thickness)!.name).toBe(`Board Thickness · Thickness @${stationLabel("imperial")}`);
    expect(buildRailsGuide(shortboard, "metric").get(ids.thickness)!.name).toBe(`Board Thickness · Thickness @ ${stationLabel("metric")}`);
    for (const system of UNITS_SYSTEMS) expect(railsThicknessName(system)).toContain(stationLabel(system));
  });
});

describe("railsGuideVariants — every push is the board with one field changed, through RAILS' own maths", () => {
  it("changes exactly the card's one field of the section it draws, and nothing on the Import card", () => {
    for (const input of [shortboard, longboard]) {
      for (const system of UNITS_SYSTEMS) {
        const variants = railsGuideVariants(input, system);
        expect(variants[ids.importFoil]).toBeNull();
        for (const id of RAILS_GUIDE_CARD_ORDER) {
          const field = RAILS_GUIDE_PUSH_FIELDS[id];
          const v = variants[id];
          if (id === ids.importFoil) continue;
          expect(v, id).not.toBeNull();
          if (v!.kind === "blends") {
            expect(id).toBe(ids.blends);
            continue;
          }
          const base = input.effectiveRails[v!.key];
          expect(v!.key, id).toBe(RAILS_GUIDE_SECTION[id]);
          if (field === "tailHardEdge") {
            expect(v!.hardEdge, id).toBe(!input.effectiveRails.tailHardEdge);
            // Coming on, Hard Edge turns the tail's Symmetrical off, as the page's own tick box does (R21).
            expect({ ...v!.spec, symmetrical: base.symmetrical }, id).toEqual(base);
            if (v!.hardEdge) expect(v!.spec.symmetrical).toBe(false);
            continue;
          }
          expect(v!.hardEdge, id).toBe(v!.key === "tail" && input.effectiveRails.tailHardEdge);
          expect(fieldOf(v!.spec, field), id).not.toEqual(fieldOf(base, field));
          expect(withField(v!.spec, field, fieldOf(base, field)), id).toEqual(base);
        }
      }
    }
  });

  it("pushes by the page's push amounts in each system", () => {
    for (const system of UNITS_SYSTEMS) {
      const push = guidePush(system).rails;
      const v = railsGuideVariants(shortboard, system);
      const spec = (id: string) => (v[id] as { spec: RailSectionSpec }).spec;
      expect(spec(ids.thickness).boardThickness).toBeCloseTo(shortboard.effectiveRails.center.boardThickness + push.thick, 9);
      expect(spec(ids.deckProfile).deckPercent).toBe(push.deckPercent);
      expect(spec(ids.ratio).ratioTopPercent).toBe(push.ratioTop);
      expect(spec(ids.scaled).scaleFromCenter).toBe(push.scale);
      expect(spec(ids.apexThickness).nudges.apexThickness).toBeCloseTo(push.apex, 9);
      expect(spec(ids.domedDeckBand).nudges.domedDeckBand).toBeCloseTo(push.domedBand, 9);
      expect(spec(ids.bottomTuck1).nudges.bottomTuck1).toBeCloseTo(push.tuck1, 9);
      expect(spec(ids.bottomTuck3).nudges.bottomTuck3).toBeCloseTo(push.tuck3, 9);
      const blends = v[ids.blends] as { blendsFrom: number; endsAt: number };
      expect(blends.blendsFrom).toBeCloseTo(hardEdgeBlendsFrom(shortboard.effectiveRails, shortboard.boardLength) + push.blends, 9);
      expect(blends.endsAt).toBeCloseTo(hardEdgeEndsAt(shortboard.effectiveRails, shortboard.boardLength) + push.blends, 9);
    }
  });

  it("holds a deck mark's push at the slider's own end: 1/2\" in Imperial, the Metric slider's 12 mm", () => {
    expect((railsGuideVariants(shortboard, "imperial")[ids.deckMark1] as { spec: RailSectionSpec }).spec.nudges.deckMark1).toBeCloseTo(
      guidePush("imperial").rails.deckMark,
      9,
    );
    expect((railsGuideVariants(shortboard, "metric")[ids.deckMark1] as { spec: RailSectionSpec }).spec.nudges.deckMark1).toBe(12);
    expect(captionOf(shortboard, ids.deckMark1, "metric")).toBe(`dashed · ${formatSignedMark(mm(12), "metric")}`);
  });

  it("draws each pushed rail as finishedRail(computeRailSectionOutput(key, spec, hardEdge)) from the base board's own edge", () => {
    const b = shortboard.railBands;
    expect(railsGuideX0(shortboard)).toBe(Math.min(b.nose.bounds.xAxisMin, b.center.bounds.xAxisMin, b.tail.bounds.xAxisMin));
    for (const [id, v] of Object.entries(railsGuideVariants(shortboard, "imperial"))) {
      if (!v || v.kind !== "section") continue;
      const output = computeRailSectionOutput(v.key, v.spec, v.hardEdge);
      expect(railsGuidePushedOutput(v), id).toEqual(output);
      expect(railsGuideFinishedRail(shortboard, output), id).toEqual(
        finishedRail(output, mm(Math.min(railsGuideX0(shortboard), output.bounds.xAxisMin))),
      );
    }
  });

  it("draws one push in muted dashes on every pushed section card and none on the Import card", () => {
    for (const card of buildRailsGuide(shortboard, "imperial").values()) {
      const pushes = prims(card.figure).filter((p) => (p.kind === "path" || p.kind === "line") && p.role === "push");
      if (card.id === ids.importFoil) expect(pushes, card.id).toHaveLength(0);
      else if (card.id === ids.blends) expect(pushes, card.id).toHaveLength(2);
      else expect(pushes, card.id).toHaveLength(1);
    }
  });
});

describe("buildRailsGuide — the other state drawn on the Longboard, and pushes that turn back", () => {
  it("names the other state on the Longboard's toggles (no hard edge, symmetrical, 50/50)", () => {
    expect(longboard.effectiveRails.tailHardEdge).toBe(false);
    expect(longboard.effectiveRails.center.symmetrical).toBe(true);
    expect(tagOf(longboard, ids.hardEdge).kind).toBe("none");
    expect(captionOf(longboard, ids.hardEdge)).toBe("dashed · hard edge");
    expect(tagOf(longboard, ids.symmetrical)).toEqual({ kind: "on", text: "On this board" });
    expect(captionOf(longboard, ids.symmetrical)).toBe("dashed · not symmetrical");
    expect(tagOf(longboard, ids.ratio).text).toBe("50/50");
    expect(captionOf(longboard, ids.ratio)).toBe("dashed · 35/65");
  });

  it("pushes Family toward knifey from the boxy end, and the scale back to 1.00 from 0.70", () => {
    const boxy = guideRailsInput("longboard", (r) => ({ ...r, center: { ...r.center, family: 1 } }));
    expect(tagOf(boxy, ids.family).text).toBe("boxy");
    expect(captionOf(boxy, ids.family)).toBe(`dashed · ${railFamilyLabel(5)}`);
    const scaled = guideRailsInput("longboard", (r) => ({ ...r, tail: { ...r.tail, scaleFromCenter: 0.7 } }));
    expect(tagOf(scaled, ids.scaled).text).toBe("0.70");
    expect(captionOf(scaled, ids.scaled)).toBe("dashed · 1.00");
  });

  it("turns a nudge already at its slider's end the other way", () => {
    for (const key of RAIL_NUDGE_KEYS) {
      const id = RAILS_GUIDE_CARD_ORDER.find((cardId) => RAILS_GUIDE_PUSH_FIELDS[cardId] === `nudges.${key}`)!;
      // The Shortboard's own push lands each slider exactly on its Imperial end; start a board there.
      const top = (railsGuideVariants(shortboard, "imperial")[id] as { spec: RailSectionSpec }).spec.nudges[key];
      const atTop = guideRailsInput("shortboard", (r) => ({ ...r, center: { ...r.center, nudges: { ...r.center.nudges, [key]: top } } }));
      expect(captionOf(atTop, id), key).toBe(`dashed · ${formatSignedMark(mm(-top), "imperial")}`);
    }
  });

  it("draws a Domed deck's push back to Flat", () => {
    const domed = guideRailsInput("shortboard", (r) => ({ ...r, center: { ...r.center, deckPercent: guidePush("imperial").rails.deckPercent } }));
    expect(tagOf(domed, ids.deckProfile).text).not.toContain("Flat");
    expect(captionOf(domed, ids.deckProfile)).toBe("dashed · flat");
  });
});

describe("buildRailsGuide — Rule 2, the page's colours, and every drawing in its box", () => {
  it("reads every mark in whole millimetres in Metric, and Blends From · Ends At as centimetres to one decimal", () => {
    const cards = buildRailsGuide(shortboard, "metric");
    expect(cards.get(ids.thickness)!.tag.text).toBe("57 mm");
    expect(cards.get(ids.thickness)!.tag.text).toBe(formatMark(shortboard.effectiveRails.center.boardThickness, "metric"));
    const marks = [ids.thickness, ids.apexThickness, ids.deckMark1, ids.deckMark3, ids.domedDeckBand, ids.bottomTuck1, ids.bottomTuck3];
    for (const id of marks) {
      expect(cards.get(id)!.tag.text, id).toMatch(/^\d+ mm$/);
      expect(guideCaptionText(cards.get(id)!.caption), id).toMatch(/^dashed · [+-]?\d+ mm( thick)?$/);
    }
    expect(cards.get(ids.deckProfile)!.tag.text).toMatch(/^\d+ mm · Flat$/);
    expect(cards.get(ids.blends)!.tag.text).toMatch(/^\d+\.\d cm · \d+\.\d cm$/);
    expect(guideCaptionText(cards.get(ids.blends)!.caption)).toMatch(/^dashed · \d+\.\d cm · \d+\.\d cm$/);
    for (const card of cards.values()) {
      const text = `${card.name ?? ""} ${card.tag.text} ${guideCaptionText(card.caption)} ${prims(card.figure)
        .flatMap((p) => (p.kind === "text" || p.kind === "dim" ? p.parts.map((part) => part.text) : []))
        .join(" ")}`;
      expect(text, card.id).not.toMatch(/["″]|\d'/);
    }
  });

  it("keys every band by one of its own section's segments, the apex and the finished rail in their own roles", () => {
    for (const card of buildRailsGuide(shortboard, "imperial").values()) {
      const all = prims(card.figure);
      const bands = all.filter((p): p is Extract<GuidePrim, { kind: "path" }> => p.kind === "path" && p.role === "band");
      if (card.id === ids.blends) {
        expect(bands.map((b) => b.band)).toEqual(["hardEdge"]);
        continue;
      }
      const own = new Set(shortboard.railBands[RAILS_GUIDE_SECTION[card.id]].segments.map((s) => s.key));
      expect(bands.length, card.id).toBe(own.size === 0 ? 0 : shortboard.railBands[RAILS_GUIDE_SECTION[card.id]].segments.length);
      for (const band of bands) expect(own.has(band.band!), card.id).toBe(true);
      expect(all.filter((p) => p.kind === "line" && p.role === "apex"), card.id).toHaveLength(1);
      expect(all.filter((p) => p.kind === "path" && p.role === "rail"), card.id).toHaveLength(1);
    }
  });

  it("keeps every label clear of the others and inside its window, and every drawing inside its box, on all four presets", () => {
    for (const id of PRESETS) {
      const input = guideRailsInput(id);
      for (const system of UNITS_SYSTEMS) {
        for (const card of buildRailsGuide(input, system).values()) {
          for (const fit of [0.7, 0.79, 1.26]) expect(guideLabelOverlaps(card.figure, fit), `${id} ${system} ${card.id} ${fit}`).toEqual([]);
          const b = guideFigureBounds(card.figure);
          for (const n of [b.x, b.y, b.w, b.h]) expect(Number.isFinite(n), card.id).toBe(true);
          expect(b.x, `${id} ${card.id}`).toBeGreaterThanOrEqual(0);
          expect(b.y, `${id} ${card.id}`).toBeGreaterThanOrEqual(0);
          expect(b.x + b.w, `${id} ${card.id}`).toBeLessThanOrEqual(GUIDE_VIEWBOX_WIDTH);
          expect(b.y + b.h, `${id} ${card.id}`).toBeLessThanOrEqual(card.figure.height);
        }
      }
    }
  });

  it("draws a section card 186 tall and the tail from above 176 (UI-SPEC §4)", () => {
    for (const card of buildRailsGuide(shortboard, "imperial").values()) {
      expect(card.figure.height, card.id).toBe(card.id === ids.blends ? 176 : 186);
    }
  });
});

describe("buildRailsGuide — a short board", () => {
  // The four presets are all 5'10" or longer where it matters; a 5'0" to 5'11" board puts Ends At close to the
  // nose edge of the tail's window, where its figure once ran off the edge and lost its first digit.
  it("keeps both of Tail Rail Blends From · Ends At's figures whole, inside the window and clear of each other", () => {
    const fields = presetDesignFields(BOARD_PRESETS.find((p) => p.id === "shortboard")!);
    for (let inches = 60; inches <= 72; inches++) {
      for (const wide of [16, 18, 20]) {
        const outline = { ...fields.outline, length: inchesToMm(inches), widePointWidth: inchesToMm(wide) };
        const input = railsGuideInputFromFields({ ...fields, outline });
        for (const system of UNITS_SYSTEMS) {
          const card = buildRailsGuide(input, system).get(ids.blends)!;
          for (const fit of [0.7, 0.79, 1.26]) {
            expect(guideLabelOverlaps(card.figure, fit), `${inches}" x ${wide}" ${system} at ${fit}`).toEqual([]);
          }
        }
      }
    }
  });
});
