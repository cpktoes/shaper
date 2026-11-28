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
  railsGuideDomeTop,
  railsGuideVariants,
  railsGuideX0,
  railsThicknessName,
  type RailsGuideInput,
} from "./guide-rails";
import { designSideProfile, LIVE_DESIGN_RULES, railAnchorStations } from "./design";
import { formatDim, formatMark, formatSignedMark, measureSlider, stationLabel } from "./measure-display";
import { foamHalfWidth } from "./outline";
import {
  computeRailSectionOutput,
  hardEdgeBlendsFrom,
  hardEdgeEndsAt,
  noseBlendsFrom,
  noseEndsAt,
  railFamilyLabel,
  RAIL_NUDGE_KEYS,
  RAIL_NUDGE_LIMIT_IN,
  RAIL_NUDGE_STEP_IN,
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
  it("gives the eighteen cards in the words page's order, the nose's blend card just before the tail's", () => {
    expect(RAILS_GUIDE_CARD_ORDER).toHaveLength(18);
    expect([...buildRailsGuide(shortboard, "imperial").keys()]).toEqual(RAILS_GUIDE_CARD_ORDER);
    expect(RAILS_GUIDE_CARD_ORDER.slice(-2)).toEqual([ids.noseBlends, ids.blends]);
    expect(RAILS_GUIDE_PUSH_FIELDS[ids.noseBlends]).toBe("noseRailBlends");
    expect(RAILS_GUIDE_PUSH_FIELDS[ids.blends]).toBe("tailHardEdgeBlends");
  });

  it("draws every card at the center, at the tail only for the controls the tail alone has (D-04), and at the nose only for the nose's own blend", () => {
    const tail = RAILS_GUIDE_CARD_ORDER.filter((id) => RAILS_GUIDE_SECTION[id] === "tail");
    expect(tail).toEqual([ids.hardEdge, ids.scaled, ids.blends]);
    const nose = RAILS_GUIDE_CARD_ORDER.filter((id) => RAILS_GUIDE_SECTION[id] === "nose");
    expect(nose).toEqual([ids.noseBlends]);
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
    expect(read(ids.domedDeckBand)).toEqual(['5 3/8"', 'dashed · to the stringer']);
    expect(read(ids.singleTuck)).toEqual(["", "dashed · one tuck"]);
    expect(read(ids.bottomTuck1)).toEqual(['5/16"', 'dashed · +1/4"']);
    expect(read(ids.bottomTuck3)).toEqual(['9/16"', 'dashed · +3/4"']);
    expect(read(ids.sharpBottomTuck)).toEqual(["", "dashed · sharp"]);
  });

  it("reads Tail Rail Blends From · Ends At as RAILS' own sliders do — the new default, 12\" and the Shortboard's centre, 37\"", () => {
    const from = hardEdgeBlendsFrom(shortboard.effectiveRails, shortboard.boardLength);
    const ends = hardEdgeEndsAt(shortboard.effectiveRails, shortboard.boardLength);
    expect(tagOf(shortboard, ids.blends).text).toBe(`${formatDim(from, "imperial")} · ${formatDim(ends, "imperial")}`);
    // The founder, 2026-11-13 (quick 261113-psx): 12" and the top of Ends At's slider (the 6'2"'s centre). The dashed
    // "what if" can only move Blends From, 6" toward the nose: both marks sit at their ends, so the pair cannot move.
    expect(tagOf(shortboard, ids.blends).text).toBe('12" · 37"');
    expect(captionOf(shortboard, ids.blends)).toBe('dashed · 18" · 37"');
    expect(buildRailsGuide(shortboard, "metric").get(ids.blends)!.tag.text).toBe(`${formatDim(from, "metric")} · ${formatDim(ends, "metric")}`);
  });

  it("reads Nose Rail Blends From · Ends At as RAILS' own nose sliders show it — 12\" and the top of Ends At's slider, 37\" on the Shortboard", () => {
    const from = noseBlendsFrom(shortboard.effectiveRails, shortboard.boardLength);
    const ends = noseEndsAt(shortboard.effectiveRails, shortboard.boardLength);
    expect(tagOf(shortboard, ids.noseBlends).text).toBe(`${formatDim(from, "imperial")} · ${formatDim(ends, "imperial")}`);
    // As the words page says. The dashed "what if" can only move Blends From, 6" toward the centre: both marks sit at
    // their slider's ends, so the pair cannot move together.
    expect(tagOf(shortboard, ids.noseBlends).text).toBe('12" · 37"');
    expect(captionOf(shortboard, ids.noseBlends)).toBe('dashed · 18" · 37"');
    expect(buildRailsGuide(shortboard, "metric").get(ids.noseBlends)!.tag.text).toBe(`${formatDim(from, "metric")} · ${formatDim(ends, "metric")}`);
    // A stored pair is read as stored, and the tail's card is not moved by it.
    const stored = guideRailsInput("shortboard", (r) => ({ ...r, noseRailBlendsFrom: inchesToMm(20), noseRailEndsAt: inchesToMm(26) }));
    expect(tagOf(stored, ids.noseBlends).text).toBe(`${formatDim(inchesToMm(20), "imperial")} · ${formatDim(inchesToMm(26), "imperial")}`);
    expect(tagOf(stored, ids.blends)).toEqual(tagOf(shortboard, ids.blends));
    expect(captionOf(stored, ids.blends)).toBe(captionOf(shortboard, ids.blends));
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
            expect([ids.noseBlends, ids.blends]).toContain(id);
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
      // The Domed Deck Band is pushed to its slider's top, not by `push.domedBand` (quick 261116-tqs; its own describe below).
      expect(spec(ids.domedDeckBand).nudges.domedDeckBand).toBe(railsGuideDomeTop(shortboard, "center", system));
      expect(spec(ids.bottomTuck1).nudges.bottomTuck1).toBeCloseTo(push.tuck1, 9);
      expect(spec(ids.bottomTuck3).nudges.bottomTuck3).toBeCloseTo(push.tuck3, 9);
      // On the default Shortboard both marks sit at their slider's ends, so the pair cannot move together: Blends From
      // alone moves by the push toward the nose and Ends At stays (quick 261113-psx).
      const blends = v[ids.blends] as { blendsFrom: number; endsAt: number };
      expect(blends.blendsFrom).toBeCloseTo(hardEdgeBlendsFrom(shortboard.effectiveRails, shortboard.boardLength) + push.blends, 9);
      expect(blends.endsAt).toBeCloseTo(hardEdgeEndsAt(shortboard.effectiveRails, shortboard.boardLength), 9);
      // The nose's pair the same way, from the nose: both at their slider's ends, so Blends From alone moves.
      const noseBlends = v[ids.noseBlends] as { blendsFrom: number; endsAt: number };
      expect(noseBlends.blendsFrom).toBeCloseTo(noseBlendsFrom(shortboard.effectiveRails, shortboard.boardLength) + push.blends, 9);
      expect(noseBlends.endsAt).toBeCloseTo(noseEndsAt(shortboard.effectiveRails, shortboard.boardLength), 9);
    }
  });

  it("pushes a stored mid nose pair as a pair, the push toward the centre, and leaves the tail's push alone", () => {
    const fields = presetDesignFields(BOARD_PRESETS.find((p) => p.id === "shortboard")!);
    const stored = railsGuideInputFromFields({
      ...fields,
      rails: { ...fields.rails, noseRailBlendsFrom: inchesToMm(20), noseRailEndsAt: inchesToMm(26) },
    });
    for (const system of UNITS_SYSTEMS) {
      const push = guidePush(system).rails;
      const noseBlends = railsGuideVariants(stored, system)[ids.noseBlends] as { blendsFrom: number; endsAt: number };
      expect(noseBlends.blendsFrom).toBeCloseTo(inchesToMm(20) + push.blends, 9);
      expect(noseBlends.endsAt).toBeCloseTo(inchesToMm(26) + push.blends, 9);
      expect(railsGuideVariants(stored, system)[ids.blends]).toEqual(railsGuideVariants(shortboard, system)[ids.blends]);
    }
  });

  it("pushes a stored mid pair as a pair, the push toward the centre, as before the new default", () => {
    const fields = presetDesignFields(BOARD_PRESETS.find((p) => p.id === "shortboard")!);
    const stored = railsGuideInputFromFields({
      ...fields,
      rails: { ...fields.rails, tailHardEdgeBlendsFrom: inchesToMm(20), tailHardEdgeEndsAt: inchesToMm(26) },
    });
    for (const system of UNITS_SYSTEMS) {
      const push = guidePush(system).rails;
      const blends = railsGuideVariants(stored, system)[ids.blends] as { blendsFrom: number; endsAt: number };
      expect(blends.blendsFrom).toBeCloseTo(inchesToMm(20) + push.blends, 9);
      expect(blends.endsAt).toBeCloseTo(inchesToMm(26) + push.blends, 9);
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
      else if (card.id === ids.blends || card.id === ids.noseBlends) expect(pushes, card.id).toHaveLength(2);
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
    // The Domed Deck Band is not one of these: its push runs to the stringer, and has its own test below.
    for (const key of RAIL_NUDGE_KEYS.filter((k) => k !== "domedDeckBand")) {
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

describe("buildRailsGuide — the Domed Deck Band card pushes the dome to the stringer (quick 261116-tqs)", () => {
  const dome = (input: RailsGuideInput, system: "imperial" | "metric" = "imperial") =>
    (railsGuideVariants(input, system)[ids.domedDeckBand] as { key: "center"; spec: RailSectionSpec }).spec.nudges.domedDeckBand;
  const fieldsOf = (id: (typeof PRESETS)[number]) => presetDesignFields(BOARD_PRESETS.find((p) => p.id === id)!);

  it("draws the pushed dome at exactly the section's slider top, in both systems, on every preset", () => {
    for (const id of PRESETS) {
      const input = guideRailsInput(id);
      const top = input.domeNudgeTop.center;
      for (const system of UNITS_SYSTEMS) {
        const slider = measureSlider(mm(0), { min: -RAIL_NUDGE_LIMIT_IN.domedDeckBand, max: top }, RAIL_NUDGE_STEP_IN, 1, system);
        expect(dome(input, system), `${id} ${system}`).toBe(slider.toMm(slider.max));
        expect(railsGuideDomeTop(input, "center", system), `${id} ${system}`).toBe(slider.toMm(slider.max));
        expect(captionOf(input, ids.domedDeckBand, system), `${id} ${system}`).toBe("dashed · to the stringer");
      }
    }
  });

  it("works that top from the foam's half-width at the rail anchor, so the pushed dome ends at the stringer and never past it", () => {
    for (const id of PRESETS) {
      const fields = fieldsOf(id);
      const input = guideRailsInput(id);
      const anchors = railAnchorStations(designSideProfile(fields, LIVE_DESIGN_RULES).effectiveFoil, fields.outline.length);
      const stringer = foamHalfWidth(input.outlineGeometry, anchors.center);
      const v = railsGuideVariants(input, "imperial")[ids.domedDeckBand] as { kind: "section"; key: "center"; spec: RailSectionSpec; hardEdge: boolean };
      const mark = railsGuidePushedOutput(v).result.domedDeckBand;
      // The slider's top is the nudge that puts the mark at the stringer, floored onto its 1/16" steps.
      expect(mark, id).toBeLessThanOrEqual(stringer + 1e-6);
      expect(stringer - mark, id).toBeLessThan(inchesToMm(1 / 16) + 1e-6);
    }
  });

  it("is further in than the old +2\" push wherever the board is wide enough, and never past the slider's top", () => {
    const input = guideRailsInput("longboard");
    expect(dome(input)).toBeGreaterThan(guidePush("imperial").rails.domedBand);
    expect(dome(shortboard)).toBeLessThanOrEqual(inchesToMm(shortboard.domeNudgeTop.center) + 1e-6);
  });

  it("turns the other way, by the old 2\", on a board whose dome already sits at the stringer, and says the signed amount", () => {
    const top = railsGuideDomeTop(shortboard, "center", "imperial");
    const atTop = guideRailsInput("shortboard", (r) => ({ ...r, center: { ...r.center, nudges: { ...r.center.nudges, domedDeckBand: top } } }));
    expect(dome(atTop)).toBeCloseTo(top - guidePush("imperial").rails.domedBand, 9);
    expect(captionOf(atTop, ids.domedDeckBand)).toBe(`dashed · ${formatSignedMark(mm(-guidePush("imperial").rails.domedBand), "imperial")}`);
  });

  it("turns the other way too when a saved dome is already past the slider's top", () => {
    const past = guideRailsInput("shortboard", (r) => ({
      ...r,
      center: { ...r.center, nudges: { ...r.center.nudges, domedDeckBand: mm(inchesToMm(shortboard.domeNudgeTop.center) + 20) } },
    }));
    expect(dome(past)).toBeLessThan(inchesToMm(shortboard.domeNudgeTop.center));
    expect(captionOf(past, ids.domedDeckBand)).toMatch(/^dashed · -/);
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
      // The Domed Deck Band's caption is words, "to the stringer", not a figure (quick 261116-tqs).
      if (id === ids.domedDeckBand) expect(guideCaptionText(cards.get(id)!.caption), id).toBe("dashed · to the stringer");
      else expect(guideCaptionText(cards.get(id)!.caption), id).toMatch(/^dashed · [+-]?\d+ mm( thick)?$/);
    }
    expect(cards.get(ids.deckProfile)!.tag.text).toMatch(/^\d+ mm · Flat$/);
    for (const id of [ids.blends, ids.noseBlends]) {
      expect(cards.get(id)!.tag.text, id).toMatch(/^\d+\.\d cm · \d+\.\d cm$/);
      expect(guideCaptionText(cards.get(id)!.caption), id).toMatch(/^dashed · \d+\.\d cm · \d+\.\d cm$/);
    }
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
      if (card.id === ids.noseBlends) {
        // The nose from above: no band colours, the nose's rail in ink to Blends From and faint dashes to Ends At,
        // always drawn (a nose always has a rail), and two marks across the rail.
        expect(bands).toEqual([]);
        expect(all.filter((p) => p.kind === "path" && p.role === "rail"), card.id).toHaveLength(1);
        expect(all.filter((p) => p.kind === "path" && p.role === "thinning"), card.id).toHaveLength(1);
        expect(all.filter((p) => p.kind === "line" && p.role === "mark"), card.id).toHaveLength(2);
        expect(all.filter((p) => p.kind === "line" && p.role === "apex"), card.id).toHaveLength(0);
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

  it("draws a section card 186 tall and a tip from above 176 (UI-SPEC §4)", () => {
    for (const card of buildRailsGuide(shortboard, "imperial").values()) {
      expect(card.figure.height, card.id).toBe(card.id === ids.blends || card.id === ids.noseBlends ? 176 : 186);
    }
  });

  it("the nose's blend card is the one card drawn at the nose: its window sits over the nose end of the strip, the tail's over the tail end", () => {
    const cards = buildRailsGuide(shortboard, "imperial");
    const windowOf = (id: string) => cards.get(id)!.figure.strip.find((p): p is Extract<GuidePrim, { kind: "rect" }> => p.kind === "rect" && p.role === "window")!;
    const noseWindow = windowOf(ids.noseBlends);
    const tailWindow = windowOf(ids.blends);
    // Nose left on every strip: the nose's window starts left of the tail's and ends left of it.
    expect(noseWindow.x).toBeLessThan(tailWindow.x);
    expect(noseWindow.x + noseWindow.w).toBeLessThan(tailWindow.x + tailWindow.w);
    const names = (id: string) =>
      prims(cards.get(id)!.figure).flatMap((p) => (p.kind === "text" && p.role === "name" ? p.parts.map((part) => part.text) : []));
    expect(names(ids.noseBlends)).toEqual(["Nose, from above"]);
    expect(names(ids.blends)).toEqual(["Tail, from above"]);
    // The station the strip cuts dash-dot is the nose's on the nose's card and the tail's on the tail's.
    const cutX = (id: string) => cards.get(id)!.figure.strip.find((p): p is Extract<GuidePrim, { kind: "line" }> => p.kind === "line" && p.role === "cut")!.x1;
    expect(cutX(ids.noseBlends)).toBeLessThan(cutX(ids.blends));
  });
});

describe("buildRailsGuide — the new default's labels stay inside their box (quick 261113-psx)", () => {
  // Blends From now starts at the 12" station, a hand from the window's tail edge: its figure (`30.5 cm` runs longest) would
  // pass that edge, so it slides back under its own mark. Every preset, both systems, at the card's three text fits.
  it("keeps both figures whole and inside the window on every preset in both systems", () => {
    for (const preset of PRESETS) {
      const input = guideRailsInput(preset);
      for (const system of UNITS_SYSTEMS) {
        for (const id of [ids.blends, ids.noseBlends]) {
          const card = buildRailsGuide(input, system).get(id)!;
          for (const fit of [0.7, 0.79, 1.26]) {
            expect(guideLabelOverlaps(card.figure, fit), `${preset} ${system} ${id} at ${fit}`).toEqual([]);
          }
        }
      }
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
          for (const id of [ids.blends, ids.noseBlends]) {
            const card = buildRailsGuide(input, system).get(id)!;
            for (const fit of [0.7, 0.79, 1.26]) {
              expect(guideLabelOverlaps(card.figure, fit), `${inches}" x ${wide}" ${system} ${id} at ${fit}`).toEqual([]);
            }
          }
        }
      }
    }
  });
});

describe("buildRailsGuide — the nose's blend card on the shortest board and with a stored pair (quick 261127-kkw)", () => {
  const fields = presetDesignFields(BOARD_PRESETS.find((p) => p.id === "shortboard")!);

  it("keeps both figures whole, inside the box and clear of each other from 4'0\" to 5'0\", and both marks and both pushed marks drawn", () => {
    for (let inches = 48; inches <= 60; inches += 2) {
      for (const wide of [16, 18, 20]) {
        const outline = { ...fields.outline, length: inchesToMm(inches), widePointWidth: inchesToMm(wide) };
        const input = railsGuideInputFromFields({ ...fields, outline });
        for (const system of UNITS_SYSTEMS) {
          const card = buildRailsGuide(input, system).get(ids.noseBlends)!;
          for (const fit of [0.7, 0.79, 1.26]) {
            expect(guideLabelOverlaps(card.figure, fit), `${inches}" x ${wide}" ${system} at ${fit}`).toEqual([]);
          }
          const b = guideFigureBounds(card.figure);
          expect(b.x, `${inches}" x ${wide}"`).toBeGreaterThanOrEqual(0);
          expect(b.x + b.w, `${inches}" x ${wide}"`).toBeLessThanOrEqual(GUIDE_VIEWBOX_WIDTH);
          expect(b.y + b.h, `${inches}" x ${wide}"`).toBeLessThanOrEqual(card.figure.height);
          const all = prims(card.figure);
          expect(all.filter((p) => p.kind === "line" && p.role === "mark")).toHaveLength(2);
          const pushed = railsGuideVariants(input, system)[ids.noseBlends];
          expect(all.filter((p) => p.kind === "line" && p.role === "push")).toHaveLength(pushed ? 2 : 0);
        }
      }
    }
  });

  it("with a stored pair, on every preset, stays in its box in both systems and reads the pair as stored", () => {
    for (const preset of PRESETS) {
      const input = guideRailsInput(preset, (r) => ({ ...r, noseRailBlendsFrom: inchesToMm(18), noseRailEndsAt: inchesToMm(30) }));
      for (const system of UNITS_SYSTEMS) {
        const card = buildRailsGuide(input, system).get(ids.noseBlends)!;
        expect(card.tag.text).toBe(`${formatDim(inchesToMm(18), system)} · ${formatDim(inchesToMm(30), system)}`);
        for (const fit of [0.7, 0.79, 1.26]) expect(guideLabelOverlaps(card.figure, fit), `${preset} ${system} at ${fit}`).toEqual([]);
        const b = guideFigureBounds(card.figure);
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.w).toBeLessThanOrEqual(GUIDE_VIEWBOX_WIDTH);
      }
    }
  });
});
