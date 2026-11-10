/**
 * ROCKER's GUIDE cards, worked out from the open board (Phase 18, D-04 to D-08, D-16, D-26; UI-SPEC §4,
 * "Figures: Rule 2, card by card").
 *
 * Every card draws the board the way VIEWER does: from the side, nose left, inside its blank with the foam
 * to come off shaded, over the dashed line its rocker is measured up from, with a short dashed mark where
 * each tip's thinning starts. The whole board sits in a strip at the top with a dash-dot window on the part
 * the control touches; that part is drawn again closer underneath — one window, or two side by side for a
 * pair the page shows together (*Nose Tip · Tail Tip*, the two 12" fine-tunes). A card that pushes its one
 * setting draws the board (and, where the push bends the blank, the blank) with that setting changed, in
 * muted dashes over the board as it is, every pushed profile worked out by `designSideProfile` — the one
 * recipe every screen reads — with that one field changed.
 *
 * Where the app's own limits leave a push no room (a blank too short to slide the board, a rocker change
 * already at its 2", a Thinning Start at the end of its reach) the push is drawn the other way when that has
 * room, and its caption says which way; with no room either way the board is drawn as it is with no caption.
 *
 * Every figure is printed by the page's own formatter; the maker's rocker note stays in inches in both
 * systems, the one inch figure a Metric shaper reads (CLAUDE.md Rule 2). Pure; no React, browser or
 * database (CLAUDE.md Rule 1).
 */
import { FIT_DEFAULTS_RANGE_IN } from "../fit-defaults-preference";
import type { OutlineSpec } from "./board";
import type { BoardBlank, TipStyle } from "./blank";
import { placementRange } from "./blank-fit";
import { formatDeckSkin, formatPlacement, formatThinningStart } from "./blank-reasons";
import type { BlankSideView, BoardSideProfile } from "./board-profile";
import {
  formatRockerNote,
  isNaturalSpec,
  MAX_CHANGES_PER_END,
  normalizeSpec,
  ROCKER_CHANGE_MAX_MM,
  type BlankRockerSpec,
  type RockerChange,
} from "./custom-rocker";
import { designSideProfile, LIVE_DESIGN_RULES } from "./design";
import type { FoilSpec } from "./foil";
import {
  GUIDE_MIN_FIT,
  GUIDE_NO_CAPTION,
  GUIDE_NO_TAG,
  guideCardId,
  guideFigure,
  guideText,
  type GuideBox,
  type GuideCaption,
  type GuideCardModel,
  type GuideFigure,
  type GuidePageBuild,
  type GuidePrim,
  type GuideTag,
  type GuideTextPart,
  type GuideWindow,
} from "./guide-card";
import {
  GUIDE_DETAIL_GAP,
  GUIDE_STRIP_BAND,
  GUIDE_STRIP_MARGIN,
  GUIDE_TEXT_UNITS_MAX,
  guideStripInset,
  guideTextBox,
  guideWindowName,
} from "./guide-draw";
import { GUIDE_FRAME, guidePush } from "./guide-push";
import { formatMark, formatSignedMark, measureSlider, stationLabel } from "./measure-display";
import type { FiveStationRocker } from "./rocker";
import { thinningStartRange, type TipEnd } from "./tip-taper";
import { mm, type Mm, type UnitsSystem } from "./units";

/** The page's four groups, as the words page names them. */
const INPUTS = "Inputs";
const BLANK = "Blank";
const ROCKER = "Rocker";
const FOIL = "Foil";

/** ROCKER's fourteen cards, in the words page's order. */
export const ROCKER_GUIDE_CARD_IDS = {
  centerThickness: guideCardId("rocker", INPUTS, "Center Thickness"),
  tips: guideCardId("rocker", INPUTS, "Nose Tip · Tail Tip"),
  blank: guideCardId("rocker", BLANK, "Blank"),
  placement: guideCardId("rocker", BLANK, "Placement"),
  deckSkin: guideCardId("rocker", BLANK, "Deck Skin"),
  customizeRocker: guideCardId("rocker", BLANK, "Customize Rocker"),
  noseRocker: guideCardId("rocker", ROCKER, "Nose Rocker"),
  tailRocker: guideCardId("rocker", ROCKER, "Tail Rocker"),
  pinDeck: guideCardId("rocker", FOIL, "Pin tips to · Deck"),
  pinBottom: guideCardId("rocker", FOIL, "Pin tips to · Bottom"),
  noseThinningStarts: guideCardId("rocker", FOIL, "Nose Thinning Starts"),
  tailThinningStarts: guideCardId("rocker", FOIL, "Tail Thinning Starts"),
  fineTunes: guideCardId("rocker", FOIL, 'Nose @ 12" · Tail @ 12"'),
  fineTuneFrom: guideCardId("rocker", FOIL, "Fine tune from"),
} as const;

/** The fourteen ids in order. */
export const ROCKER_GUIDE_CARD_ORDER: readonly string[] = Object.values(ROCKER_GUIDE_CARD_IDS);

/**
 * Which of the board's fields each card changes, as `group.field` paths into `{ outline, rocker, foil,
 * blank }` — everything else in a card's variant is the open board's own. A card with none draws the board
 * as it is. The two Pin tips to cards change the Tip Style to draw the board that way, not to push it.
 */
export const ROCKER_GUIDE_PUSH_FIELDS: Readonly<Record<string, readonly string[]>> = {
  [ROCKER_GUIDE_CARD_IDS.centerThickness]: ["foil.center"],
  [ROCKER_GUIDE_CARD_IDS.tips]: ["foil.noseTip", "foil.tailTip"],
  [ROCKER_GUIDE_CARD_IDS.blank]: [],
  [ROCKER_GUIDE_CARD_IDS.placement]: ["blank.placement"],
  [ROCKER_GUIDE_CARD_IDS.deckSkin]: ["blank.deckSkin"],
  [ROCKER_GUIDE_CARD_IDS.customizeRocker]: ["blank.rocker"],
  // A hand-set board (no blank) pushes its typed tip lift instead of ordering a change.
  [ROCKER_GUIDE_CARD_IDS.noseRocker]: ["blank.rocker", "rocker.noseTip"],
  [ROCKER_GUIDE_CARD_IDS.tailRocker]: ["blank.rocker", "rocker.tailTip"],
  [ROCKER_GUIDE_CARD_IDS.pinDeck]: ["blank.tipStyle"],
  [ROCKER_GUIDE_CARD_IDS.pinBottom]: ["blank.tipStyle"],
  [ROCKER_GUIDE_CARD_IDS.noseThinningStarts]: ["blank.noseThinningStart"],
  [ROCKER_GUIDE_CARD_IDS.tailThinningStarts]: ["blank.tailThinningStart"],
  [ROCKER_GUIDE_CARD_IDS.fineTunes]: ["blank.nose12Offset", "blank.tail12Offset"],
  [ROCKER_GUIDE_CARD_IDS.fineTuneFrom]: ["blank.tail12Offset", "blank.fineTuneSurface"],
};

/** The board's fields a side profile is built from, exactly as the design store holds them. */
export interface RockerGuideFields {
  outline: OutlineSpec;
  rocker: FiveStationRocker;
  foil: FoilSpec;
  blank: BoardBlank | null;
}

/** What ROCKER's GUIDE reads from the design store — the store's own objects, read only, and the store's
 * own side profile for the board as it is, so it is never worked out twice. */
export interface RockerGuideInput extends RockerGuideFields {
  sideProfile: BoardSideProfile;
}

/** One card's push: the boards it draws in muted dashes (one per window, or one for all), the board it
 * draws as itself when that is not the open board (the two Pin tips to cards), and its caption. */
export interface RockerGuidePush {
  pushes: readonly RockerGuideFields[];
  drawnAs: RockerGuideFields | null;
  caption: GuideCaption;
}

/** Below this a slide or a move is no room at all (the sketch's half millimetre). */
const NO_ROOM_MM = 0.5;
const SAME_MM = 1e-6;

const dashed = (...parts: GuideTextPart[]): GuideCaption => ({ kind: "dashed", parts });
const none = (): RockerGuidePush => ({ pushes: [], drawnAs: null, caption: GUIDE_NO_CAPTION });

function fieldsOf(input: RockerGuideFields): RockerGuideFields {
  return { outline: input.outline, rocker: input.rocker, foil: input.foil, blank: input.blank };
}

function withBlank(input: RockerGuideFields, blank: BoardBlank, patch: Partial<BoardBlank>): RockerGuideFields {
  return { ...fieldsOf(input), blank: { ...blank, ...patch } };
}

/**
 * The blank's ordered rocker with one change pushed at an end (D-26, Pitfall 8): added to the change the
 * end already orders from the same point (the centre, or `fromTip` in), or to its last change when it
 * already holds `MAX_CHANGES_PER_END`, else a new change. A change already at `ROCKER_CHANGE_MAX_MM` takes
 * the amount off instead; `null` when neither way fits. The spec is the one the app would have written
 * (`normalizeSpec`), and `delta` is what was added.
 */
function pushRockerChange(
  spec: BlankRockerSpec | undefined,
  end: TipEnd,
  amount: number,
  fromTip: Mm | undefined,
  length: Mm,
): { spec: BlankRockerSpec; delta: number } | null {
  const changes: RockerChange[] = (spec?.changes ?? []).map((change) => ({ ...change }));
  const atEnd = changes.filter((change) => change.end === end);
  const samePoint = (change: RockerChange) =>
    change.end === end &&
    (fromTip === undefined ? change.fromTip === undefined : change.fromTip !== undefined && Math.abs(change.fromTip - fromTip) < NO_ROOM_MM);
  const target = changes.find(samePoint) ?? (atEnd.length >= MAX_CHANGES_PER_END ? atEnd[atEnd.length - 1] : undefined);
  if (!target) {
    changes.push(fromTip === undefined ? { end, amount: mm(amount) } : { end, amount: mm(amount), fromTip });
    return { spec: normalizeSpec({ changes }, length), delta: amount };
  }
  for (const delta of [amount, -amount]) {
    const next = target.amount + delta;
    if (Math.abs(next) <= ROCKER_CHANGE_MAX_MM + SAME_MM) {
      target.amount = mm(next);
      return { spec: normalizeSpec({ changes }, length), delta };
    }
  }
  return null;
}

/** A Thinning Start pushed in (24" in, or 8" past the automatic start, whichever is further in), clamped
 * by `thinningStartRange`; toward the tip when it already sits at the range's end; `null` with no room. */
function pushedThinningStart(view: BlankSideView, end: TipEnd, length: Mm, system: UnitsSystem): Mm | null {
  const push = guidePush(system).rocker;
  const tip = view.tips[end];
  const range = thinningStartRange(length);
  const clamp = (v: number) => mm(Math.min(range.max, Math.max(range.min, v)));
  const target = clamp(Math.max(push.startIn, tip.automaticStart + push.startPastAutomatic));
  if (Math.abs(target - tip.fromTip) > SAME_MM) return target;
  const back = clamp(tip.fromTip - push.startPastAutomatic);
  return Math.abs(back - tip.fromTip) > SAME_MM ? back : null;
}

/** A 12" fine-tune's push at one station: up, unless the board already tweaks it up, then down — so the
 * push always stays inside the slider's quarter inch either way. */
function finePush(offset: Mm, fine: Mm): number {
  return offset > 0 ? -fine : fine;
}

/**
 * Each card's push for the open board: the variant fields it draws, each the open board with only the
 * card's `ROCKER_GUIDE_PUSH_FIELDS` changed, and its caption.
 */
export function rockerGuideVariants(input: RockerGuideInput, system: UnitsSystem): Record<string, RockerGuidePush> {
  const ids = ROCKER_GUIDE_CARD_IDS;
  const push = guidePush(system).rocker;
  const L = input.outline.length;
  const base = fieldsOf(input);
  const blank = input.blank;
  const view = input.sideProfile.blank;
  const out: Record<string, RockerGuidePush> = {};

  out[ids.centerThickness] = {
    pushes: [{ ...base, foil: { ...input.foil, center: mm(input.foil.center + push.center) } }],
    drawnAs: null,
    caption: dashed(guideFigure(formatSignedMark(push.center, system)), guideText(" at the center")),
  };
  out[ids.tips] = {
    pushes: [{ ...base, foil: { ...input.foil, noseTip: mm(input.foil.noseTip + push.tips), tailTip: mm(input.foil.tailTip + push.tips) } }],
    drawnAs: null,
    caption: dashed(guideFigure(formatSignedMark(push.tips, system)), guideText(" at each tip")),
  };
  out[ids.blank] = none();

  // Placement: slid to the nose end of its reach, else to the tail end, else not at all (D-26).
  out[ids.placement] = none();
  if (blank && view) {
    const range = placementRange(blank.copy.lengthMm, L);
    const toNose = range.max - view.placement;
    const toTail = view.placement - range.min;
    if (toNose > NO_ROOM_MM || toTail > NO_ROOM_MM) {
      const nose = toNose > NO_ROOM_MM;
      out[ids.placement] = {
        pushes: [withBlank(base, blank, { placement: nose ? range.max : range.min })],
        drawnAs: null,
        caption: dashed(
          guideText("slid "),
          guideFigure(formatMark(mm(nose ? toNose : toTail), system)),
          guideText(nose ? " to the nose" : " to the tail"),
        ),
      };
    }
  }

  // Deck Skin: set to the push, or the push deeper where the skin already reaches it, inside the slider.
  out[ids.deckSkin] = none();
  if (blank && view) {
    const range = FIT_DEFAULTS_RANGE_IN.deckSkin;
    const slider = measureSlider(view.cut.deckSkin, range, range.step, 1, system);
    const max = slider.toMm(slider.max);
    const skin = view.cut.deckSkin;
    const deeper = skin < push.skin - SAME_MM ? push.skin : mm(Math.min(max, skin + push.skin));
    const next = Math.abs(deeper - skin) > SAME_MM ? deeper : mm(Math.max(0, skin - push.skin));
    if (Math.abs(next - skin) > SAME_MM) {
      out[ids.deckSkin] = {
        pushes: [withBlank(base, blank, { deckSkin: next })],
        drawnAs: null,
        caption: dashed(guideFigure(formatMark(next, system)), guideText(" skin")),
      };
    }
  }

  // Customize Rocker: a nose bend from 18", added to what the board already orders.
  out[ids.customizeRocker] = none();
  if (blank) {
    const bent = pushRockerChange(blank.rocker, "nose", push.bend, push.bendFrom, L);
    if (bent) {
      out[ids.customizeRocker] = {
        pushes: [withBlank(base, blank, { rocker: bent.spec })],
        drawnAs: null,
        // The maker's own inch order code, in both systems (CLAUDE.md Rule 2).
        caption: dashed(guideFigure(formatRockerNote(bent.spec))),
      };
    }
  }

  // Nose and Tail Rocker: an inch more at that end — ordered from the blank's maker when there is a blank,
  // the typed tip lift when the board is hand-set.
  for (const [id, end] of [
    [ids.noseRocker, "nose"],
    [ids.tailRocker, "tail"],
  ] as const) {
    const word = end === "nose" ? " nose rocker" : " tail rocker";
    out[id] = none();
    if (blank) {
      const ordered = pushRockerChange(blank.rocker, end, push.rocker, undefined, L);
      if (ordered) {
        out[id] = {
          pushes: [withBlank(base, blank, { rocker: ordered.spec })],
          drawnAs: null,
          caption: dashed(guideFigure(formatSignedMark(mm(ordered.delta), system)), guideText(word)),
        };
      }
    } else {
      const key = end === "nose" ? "noseTip" : "tailTip";
      out[id] = {
        pushes: [{ ...base, rocker: { ...input.rocker, [key]: mm(input.rocker[key] + push.rocker) } }],
        drawnAs: null,
        caption: dashed(guideFigure(formatSignedMark(push.rocker, system)), guideText(word)),
      };
    }
  }

  // Pin tips to: the board drawn with each Tip Style, nothing pushed and no caption.
  for (const [id, style] of [
    [ids.pinDeck, "pinDeck"],
    [ids.pinBottom, "bottom"],
  ] as const satisfies readonly (readonly [string, TipStyle])[]) {
    out[id] = { pushes: [], drawnAs: blank && blank.tipStyle !== style ? withBlank(base, blank, { tipStyle: style }) : null, caption: GUIDE_NO_CAPTION };
  }

  for (const [id, end] of [
    [ids.noseThinningStarts, "nose"],
    [ids.tailThinningStarts, "tail"],
  ] as const) {
    out[id] = none();
    const start = blank && view ? pushedThinningStart(view, end, L, system) : null;
    if (blank && start !== null) {
      out[id] = {
        pushes: [withBlank(base, blank, end === "nose" ? { noseThinningStart: start } : { tailThinningStart: start })],
        drawnAs: null,
        caption: dashed(guideText("starts "), guideFigure(formatThinningStart(start, system)), guideText(" in")),
      };
    }
  }

  out[ids.fineTunes] = none();
  out[ids.fineTuneFrom] = none();
  if (blank) {
    const nose = finePush(blank.nose12Offset, push.fine);
    const tail = finePush(blank.tail12Offset, push.fine);
    out[ids.fineTunes] = {
      pushes: [withBlank(base, blank, { nose12Offset: mm(blank.nose12Offset + nose), tail12Offset: mm(blank.tail12Offset + tail) })],
      drawnAs: null,
      caption:
        nose === tail
          ? dashed(guideFigure(formatSignedMark(mm(nose), system)), guideText(" at both"))
          : dashed(
              guideFigure(formatSignedMark(mm(nose), system)),
              guideText(" at the nose · "),
              guideFigure(formatSignedMark(mm(tail), system)),
              guideText(" at the tail"),
            ),
    };
    // Fine tune from: the same tail 12" tweak taken off the Deck, then the Bottom.
    const down = -finePush(mm(-blank.tail12Offset), push.fine);
    out[ids.fineTuneFrom] = {
      pushes: (["deck", "bottom"] as const).map((surface) =>
        withBlank(base, blank, { tail12Offset: mm(blank.tail12Offset + down), fineTuneSurface: surface }),
      ),
      drawnAs: null,
      caption: dashed(guideFigure(formatSignedMark(mm(down), system)), guideText(` at the tail ${stationLabel(system)}`)),
    };
  }
  return out;
}

/* ---------------------------------------------------------------- drawing */

/** UI-SPEC §4: ROCKER's strip 50, its detail 84, the viewBox 140 tall. */
const STRIP_H = 50;
const DETAIL_H = 84;
const FIGURE_H = STRIP_H + GUIDE_DETAIL_GAP + DETAIL_H;
/** The strip's baseline, 8 units above its foot (the sketch's `hTop − 8`). */
const STRIP_BASE = STRIP_H - 8;
/** A window's name band at the top of a detail, and the room under its baseline. */
const NAME_BAND = 3 + GUIDE_TEXT_UNITS_MAX + 2;
const DETAIL_FOOT = 6;
/** How far beyond a tip a dimension stands, with its extension lines. */
const DIM_OUT = 9;
/** Points along a path: the whole board in the strip, a window's span in a detail. */
const STRIP_SAMPLES = 110;
const DETAIL_SAMPLES = 120;

const f1 = (v: number) => Math.round(v * 10) / 10;

type Frame = { X: (s: number) => number; Y: (h: number) => number };

function boardPath(p: BoardSideProfile, f: Frame, s0: number, s1: number, n: number): string {
  const a = Math.max(0, s0);
  const b = Math.min(p.length, s1);
  if (b <= a) return "";
  let d = "";
  for (let j = 0; j <= n; j++) {
    const s = mm(a + ((b - a) * j) / n);
    d += `${j ? "L" : "M"}${f1(f.X(s))} ${f1(f.Y(p.rockerAt(s)))}`;
  }
  for (let j = n; j >= 0; j--) {
    const s = mm(a + ((b - a) * j) / n);
    d += `L${f1(f.X(s))} ${f1(f.Y(p.deckAt(s)))}`;
  }
  return `${d}Z`;
}

function blankPath(view: BlankSideView, f: Frame, s0: number, s1: number, n: number): string {
  const a = Math.max(view.start, s0);
  const b = Math.min(view.end, s1);
  if (b <= a) return "";
  let d = "";
  for (let j = 0; j <= n; j++) {
    const s = mm(a + ((b - a) * j) / n);
    d += `${j ? "L" : "M"}${f1(f.X(s))} ${f1(f.Y(view.bottomAt(s)))}`;
  }
  for (let j = n; j >= 0; j--) {
    const s = mm(a + ((b - a) * j) / n);
    d += `L${f1(f.X(s))} ${f1(f.Y(view.deckAt(s)))}`;
  }
  return `${d}Z`;
}

/** The thinning marks: a short dashed line across the board at each tip's start, `reach` beyond it. */
function thinningMarks(p: BoardSideProfile, f: Frame, reach: number, within?: (s: number) => boolean): GuidePrim[] {
  if (!p.blank) return [];
  const out: GuidePrim[] = [];
  for (const end of ["nose", "tail"] as const) {
    const s = p.blank.tips[end].station;
    if (within && !within(s)) continue;
    const x = f1(f.X(s));
    out.push({ kind: "line", role: "thinning", x1: x, y1: f1(f.Y(p.rockerAt(s)) + reach), x2: x, y2: f1(f.Y(p.deckAt(s)) - reach) });
  }
  return out;
}

/** Where a window sits along the board: the centre, a tip (its tip `tipInset` in from the window's tip
 * side), or a station; its span and its name. */
export type WindowAt = { at: "center" | TipEnd | Mm; span: Mm; name: string };

/** A window's reach along the board, millimetres from the tail: a tip window runs `tipInset` past its tip. */
export function rockerWindowRange(w: WindowAt, length: Mm): { s0: number; s1: number } {
  const inset = GUIDE_FRAME.rocker.tipInset;
  const mid =
    w.at === "center" ? length / 2 : w.at === "nose" ? length - w.span / 2 + inset : w.at === "tail" ? w.span / 2 - inset : w.at;
  return { s0: mid - w.span / 2, s1: mid + w.span / 2 };
}

/** The tallest thing a window draws: the board's deck, the blank's deck, every push's. */
function tallestIn(profiles: readonly BoardSideProfile[], s0: number, s1: number, blanks: readonly BlankSideView[]): number {
  let hi = 0;
  for (let j = 0; j <= 40; j++) {
    const s = mm(s0 + ((s1 - s0) * j) / 40);
    for (const p of profiles) if (s >= 0 && s <= p.length) hi = Math.max(hi, p.deckAt(s));
    for (const b of blanks) if (s >= b.start && s <= b.end) hi = Math.max(hi, b.deckAt(s));
  }
  return hi;
}

/* Labels: a dimension's value goes beside it, above it or below it, wherever the first of its places keeps
   it inside its window and clear of every label already set (checked at the narrowest card's text size). */

function boxInside(a: GuideBox, b: GuideBox): boolean {
  return a.x >= b.x + 1 && a.y >= b.y + 1 && a.x + a.w <= b.x + b.w - 1 && a.y + a.h <= b.y + b.h - 1;
}
function boxesMeet(a: GuideBox, b: GuideBox): boolean {
  return a.x < b.x + b.w + 1 && b.x < a.x + a.w + 1 && a.y < b.y + b.h + 1 && b.y < a.y + a.h + 1;
}

class LabelRoom {
  private placed: GuideBox[] = [];
  constructor(private readonly box: GuideBox) {}
  fits(prim: GuidePrim): boolean {
    const b = guideTextBox(prim, GUIDE_MIN_FIT);
    return b !== null && boxInside(b, this.box) && !this.placed.some((p) => boxesMeet(b, p));
  }
  take(prim: GuidePrim): GuidePrim {
    const b = guideTextBox(prim, GUIDE_MIN_FIT);
    if (b) this.placed.push(b);
    return prim;
  }
  /** The first candidate that fits, or the first when none does (the overlap test then names it). */
  place(candidates: readonly GuidePrim[]): GuidePrim {
    return this.take(candidates.find((c) => this.fits(c)) ?? candidates[0]);
  }
}

type LabelSide = "right" | "left" | "above" | "aboveRight" | "aboveLeft" | "below";
/** Every place a label may go: a dimension's own preferred places first, then these. */
const ALL_SIDES: readonly LabelSide[] = ["right", "left", "above", "aboveRight", "aboveLeft", "below"];

/** A vertical dimension at `x` from `ya` to `yb`, its label on the first side in `sides` that fits. */
function vDim(room: LabelRoom, x: number, ya: number, yb: number, parts: readonly GuideTextPart[], sides: readonly LabelSide[]): GuidePrim {
  const t = f1(Math.min(ya, yb));
  const b = f1(Math.max(ya, yb));
  const line = { kind: "dim" as const, x1: f1(x), y1: t, x2: f1(x), y2: b, parts };
  const at = (side: LabelSide): GuidePrim => {
    switch (side) {
      case "right":
        return { ...line, lx: f1(x + 5), ly: f1((t + b) / 2), dy: 0.35, anchor: "start" };
      case "left":
        return { ...line, lx: f1(x - 5), ly: f1((t + b) / 2), dy: 0.35, anchor: "end" };
      case "above":
        return { ...line, lx: f1(x), ly: f1(t - 4), anchor: "middle" };
      case "aboveRight":
        return { ...line, lx: f1(x + 2), ly: f1(t - 4), anchor: "start" };
      case "aboveLeft":
        return { ...line, lx: f1(x - 2), ly: f1(t - 4), anchor: "end" };
      case "below":
        return { ...line, lx: f1(x), ly: f1(b + 3), dy: 0.85, anchor: "middle" };
    }
  };
  return room.place([...sides, ...ALL_SIDES.filter((side) => !sides.includes(side))].map(at));
}

/** A horizontal dimension at `y` from `xa` to `xb`, its label above it, or below it when that is all that fits. */
function hDim(room: LabelRoom, xa: number, xb: number, y: number, parts: readonly GuideTextPart[]): GuidePrim {
  const l = f1(Math.min(xa, xb));
  const r = f1(Math.max(xa, xb));
  const line = { kind: "dim" as const, x1: l, y1: f1(y), x2: r, y2: f1(y), parts };
  const mid = f1((l + r) / 2);
  return room.place([
    { ...line, lx: mid, ly: f1(y - 3), anchor: "middle" },
    { ...line, lx: l, ly: f1(y - 3), anchor: "start" },
    { ...line, lx: r, ly: f1(y - 3), anchor: "end" },
    { ...line, lx: mid, ly: f1(y + 3), dy: 0.85, anchor: "middle" },
  ]);
}

const extension = (x1: number, y: number, x2: number): GuidePrim => ({ kind: "line", role: "extension", x1: f1(x1), y1: f1(y), x2: f1(x2), y2: f1(y) });

/** What a detail window holds beyond the board in its blank: the pushes drawn there, and its dimensions. */
interface DetailSpec {
  where: WindowAt;
  /** The pushed profiles this window draws in muted dashes. */
  pushes: readonly BoardSideProfile[];
  /** Whether the push bends or moves the blank too, so its blank is drawn in dashes as well. */
  pushBlank: boolean;
  /** The room under the window's baseline, for a label that hangs below it (default `DETAIL_FOOT`). */
  foot?: number;
  /** The window's dimensions and any marks, given the window's frame, its labels and its box. */
  dims: (ctx: DetailContext) => GuidePrim[];
}

interface DetailContext {
  base: BoardSideProfile;
  pushes: readonly BoardSideProfile[];
  f: Frame;
  room: LabelRoom;
  box: GuideBox;
  /** The window's baseline. */
  yb: number;
  where: WindowAt;
}

/**
 * A card's whole drawing: the board in its blank from the side across the strip, a dash-dot window for each
 * detail, then each detail closer, side by side, all at one scale so a pair reads together.
 */
function rockerFigure(base: BoardSideProfile, details: readonly DetailSpec[]): GuideFigure {
  const L = base.length;
  const view = base.blank;
  const sMin = Math.min(0, view?.start ?? 0);
  const sMax = Math.max(L, view?.end ?? L);
  const ranges = details.map((d) => rockerWindowRange(d.where, L));

  // Every window's tallest point, so a pair is drawn at one height scale and its strip windows match.
  const blanksOf = (d: DetailSpec) => [
    ...(view ? [view] : []),
    ...(d.pushBlank ? d.pushes.flatMap((p) => (p.blank ? [p.blank] : [])) : []),
  ];
  let hiAll = 0;
  details.forEach((d, i) => {
    hiAll = Math.max(hiAll, tallestIn([base, ...d.pushes], ranges[i].s0, ranges[i].s1, blanksOf(d)));
  });
  const hiStrip = Math.max(hiAll, tallestIn([base], sMin, sMax, view ? [view] : []));

  // The strip: the whole board in its blank, nose left, standing on its baseline.
  const k = Math.min(GUIDE_STRIP_BAND / (sMax - sMin), (STRIP_BASE - 8) / (hiStrip || 1));
  const stripOx = GUIDE_STRIP_MARGIN + (GUIDE_STRIP_BAND - (sMax - sMin) * k) / 2;
  const strip: Frame = { X: (s) => stripOx + (sMax - s) * k, Y: (h) => STRIP_BASE - h * k };
  const stripPrims: GuidePrim[] = [{ kind: "line", role: "baseline", x1: 2, y1: STRIP_BASE, x2: 298, y2: STRIP_BASE }];
  if (view) stripPrims.push({ kind: "path", role: "foam", d: blankPath(view, strip, sMin, sMax, STRIP_SAMPLES + 30) });
  stripPrims.push({ kind: "path", role: "board", d: boardPath(base, strip, 0, L, STRIP_SAMPLES) });
  stripPrims.push(...thinningMarks(base, strip, 3));
  const inset = guideStripInset(STRIP_H);
  const seen = new Set<string>();
  for (const { s0, s1 } of ranges) {
    const x0 = Math.max(inset.x, strip.X(s1));
    const x1 = Math.min(inset.x + inset.w, strip.X(s0));
    const y0 = Math.max(inset.y, Math.min(strip.Y(hiAll), STRIP_BASE) - 3);
    const y1 = Math.min(inset.y + inset.h, STRIP_BASE + 3);
    const rect = { kind: "rect" as const, role: "window" as const, x: f1(x0), y: f1(y0), w: f1(Math.max(0, x1 - x0)), h: f1(Math.max(0, y1 - y0)) };
    const key = `${rect.x} ${rect.w}`;
    if (seen.has(key)) continue;
    seen.add(key);
    stripPrims.push(rect);
  }

  // The details, side by side under the strip.
  const n = details.length;
  const wBox = n === 1 ? GUIDE_STRIP_BAND : (GUIDE_STRIP_BAND - 8 * (n - 1)) / n;
  const top = STRIP_H + GUIDE_DETAIL_GAP;
  const windows: GuideWindow[] = details.map((d, i) => {
    const { s0, s1 } = ranges[i];
    const box: GuideBox = { x: GUIDE_STRIP_MARGIN + i * (wBox + 8), y: top, w: wBox, h: DETAIL_H };
    const foot = d.foot ?? DETAIL_FOOT;
    const kz = Math.min(box.w / d.where.span, (DETAIL_H - NAME_BAND - foot) / (hiAll || 1));
    const yb = top + DETAIL_H - foot;
    const mid = (s0 + s1) / 2;
    const f: Frame = { X: (s) => box.x + box.w / 2 + (mid - s) * kz, Y: (h) => yb - h * kz };
    // The span the box actually shows (wider than the window when the height decides the scale), a little
    // beyond each side so a path's closing line falls outside the clip.
    const half = box.w / 2 / kz + 1;
    const a = mid - half;
    const b = mid + half;
    const prims: GuidePrim[] = [{ kind: "line", role: "baseline", x1: box.x, y1: yb, x2: box.x + box.w, y2: yb }];
    if (view) prims.push({ kind: "path", role: "foam", d: blankPath(view, f, a, b, DETAIL_SAMPLES + 40) });
    prims.push({ kind: "path", role: "board", d: boardPath(base, f, a, b, DETAIL_SAMPLES) });
    const reach = GUIDE_FRAME.rocker.markReach;
    prims.push(...thinningMarks(base, f, 5, (s) => s > s0 - reach && s < s1 + reach));
    for (const p of d.pushes) {
      if (d.pushBlank && p.blank) prims.push({ kind: "path", role: "push", d: blankPath(p.blank, f, a, b, DETAIL_SAMPLES + 40) });
      prims.push({ kind: "path", role: "push", d: boardPath(p, f, a, b, DETAIL_SAMPLES) });
    }
    const room = new LabelRoom(box);
    const name = room.take(guideWindowName(box, [guideText(d.where.name)]));
    prims.push(...d.dims({ base, pushes: d.pushes, f, room, box, yb, where: d.where }), name);
    return { box, prims };
  });
  return { height: FIGURE_H, strip: stripPrims, windows };
}

/* The dimensions each card reads, the way VIEWER reads them. */

const markParts = (v: Mm, system: UnitsSystem, after = "") =>
  after ? [guideFigure(formatMark(v, system)), guideText(after)] : [guideFigure(formatMark(v, system))];

/** The thickness at a station, deck to bottom, its label clear of the board's other side. */
function thicknessDim(ctx: DetailContext, s: Mm, system: UnitsSystem, sides: readonly LabelSide[]): GuidePrim[] {
  const p = ctx.base;
  return [vDim(ctx.room, ctx.f.X(s), ctx.f.Y(p.rockerAt(s)), ctx.f.Y(p.deckAt(s)), markParts(mm(p.deckAt(s) - p.rockerAt(s)), system), sides)];
}

/** A tip's thickness, stood just beyond the tip on extension lines. */
function tipThicknessDim(ctx: DetailContext, end: TipEnd, system: UnitsSystem): GuidePrim[] {
  const p = ctx.base;
  const s = end === "nose" ? p.length : mm(0);
  const xTip = ctx.f.X(s);
  const x = xTip + (end === "nose" ? -DIM_OUT : DIM_OUT);
  const lo = ctx.f.Y(p.rockerAt(s));
  const hi = ctx.f.Y(p.deckAt(s));
  const sides: LabelSide[] = end === "nose" ? ["left", "aboveLeft", "above", "aboveRight"] : ["right", "aboveRight", "above", "aboveLeft"];
  return [
    extension(xTip, lo, x - (end === "nose" ? 3 : -3)),
    extension(xTip, hi, x - (end === "nose" ? 3 : -3)),
    vDim(ctx.room, x, lo, hi, markParts(mm(p.deckAt(s) - p.rockerAt(s)), system), sides),
  ];
}

/** A tip's rocker: from the baseline up to the tip's bottom, just beyond the tip. */
function tipRockerDim(ctx: DetailContext, end: TipEnd, system: UnitsSystem): GuidePrim[] {
  const p = ctx.base;
  const s = end === "nose" ? p.length : mm(0);
  const xTip = ctx.f.X(s);
  const x = xTip + (end === "nose" ? -DIM_OUT : DIM_OUT);
  const y = ctx.f.Y(p.rockerAt(s));
  const sides: LabelSide[] = end === "nose" ? ["left", "aboveLeft", "above", "right"] : ["right", "aboveRight", "above", "left"];
  return [
    extension(xTip, y, x - (end === "nose" ? 3 : -3)),
    vDim(ctx.room, x, ctx.yb, y, markParts(p.blank ? rockerAtTip(p, end) : mm(p.rockerAt(s)), system), sides),
  ];
}

/** The rocker the page reads at a tip (the DATASHEET's own station figure). */
function rockerAtTip(p: BoardSideProfile, end: TipEnd): Mm {
  return end === "nose" ? p.stationRocker.noseTip : p.stationRocker.tailTip;
}

/** How far the blank runs past the board's tip, dimensioned over it. */
function spareDim(ctx: DetailContext, end: TipEnd, system: UnitsSystem): GuidePrim[] {
  const p = ctx.base;
  const view = p.blank;
  if (!view) return [];
  const s = end === "nose" ? p.length : mm(0);
  const blankEnd = end === "nose" ? view.end : view.start;
  const spare = Math.abs(blankEnd - s);
  if (formatMark(mm(spare), system) === formatMark(mm(0), system)) return [];
  const y = ctx.f.Y(Math.max(view.deckAt(mm(Math.min(Math.max(s, view.start), view.end))), p.deckAt(s))) - 6;
  return [hDim(ctx.room, ctx.f.X(s), ctx.f.X(blankEnd), y, markParts(mm(spare), system))];
}

/** The foam off at a station: `which` the deck (blank's deck down to the board's) or the bottom. */
function foamOffDim(ctx: DetailContext, s: Mm, which: "deck" | "bottom", system: UnitsSystem, after: string, sides: readonly LabelSide[]): GuidePrim[] {
  const p = ctx.base;
  const view = p.blank;
  if (!view || s < view.start || s > view.end) return [];
  const [a, b] = which === "deck" ? [view.deckAt(s), p.deckAt(s)] : [p.rockerAt(s), view.bottomAt(s)];
  const off = mm(Math.max(0, a - b));
  if (formatMark(off, system) === formatMark(mm(0), system)) return [];
  return [vDim(ctx.room, ctx.f.X(s), ctx.f.Y(a), ctx.f.Y(b), markParts(off, system, after), sides)];
}

/** A Thinning Start: the tip to its mark along the board, a dim, under the board near the baseline, with
 * the pushed start's mark in dashes. */
function startDims(ctx: DetailContext, end: TipEnd, system: UnitsSystem): GuidePrim[] {
  const p = ctx.base;
  if (!p.blank) return [];
  const tip = p.blank.tips[end];
  const s = end === "nose" ? p.length : mm(0);
  const out: GuidePrim[] = [];
  for (const q of ctx.pushes) {
    if (!q.blank) continue;
    const st = q.blank.tips[end].station;
    const x = f1(ctx.f.X(st));
    out.push({ kind: "line", role: "push", x1: x, y1: f1(ctx.f.Y(q.rockerAt(st)) + 5), x2: x, y2: f1(ctx.f.Y(q.deckAt(st)) - 5) });
  }
  out.push(hDim(ctx.room, ctx.f.X(s), ctx.f.X(tip.station), ctx.yb - 3, [guideFigure(formatThinningStart(tip.fromTip, system))]));
  return out;
}

/** The maker's bend: how much the tip rises, and where the bend starts. */
function bendDims(ctx: DetailContext, fromTip: Mm | undefined, system: UnitsSystem): GuidePrim[] {
  const p = ctx.base;
  const q = ctx.pushes[0];
  if (!q) return [];
  const s = p.length;
  const out: GuidePrim[] = [];
  if (fromTip !== undefined && q.blank) {
    const st = mm(s - fromTip);
    const x = f1(ctx.f.X(st));
    out.push({ kind: "line", role: "push", x1: x, y1: f1(ctx.f.Y(q.blank.bottomAt(st)) + 6), x2: x, y2: f1(ctx.f.Y(q.blank.deckAt(st)) - 6) });
  }
  const xTip = ctx.f.X(s);
  const x = xTip - DIM_OUT;
  const ya = ctx.f.Y(p.rockerAt(s));
  const yq = ctx.f.Y(q.rockerAt(s));
  out.push(extension(xTip, ya, x - 3), extension(xTip, yq, x - 3));
  out.push(vDim(ctx.room, x, ya, yq, [guideFigure(formatSignedMark(mm(q.rockerAt(s) - p.rockerAt(s)), system))], ["left", "aboveLeft", "above", "right"]));
  return out;
}

const valueTag = (text: string): GuideTag => ({ kind: "value", text });
const onTag: GuideTag = { kind: "on", text: "On this board" };

/** A profile for a variant, the open board's own when the variant is the board as it is. */
function profileOf(fields: RockerGuideFields): BoardSideProfile {
  return designSideProfile(fields, LIVE_DESIGN_RULES);
}

/** ROCKER's fourteen cards for the open board, in the words page's order. */
export function buildRockerGuide(input: RockerGuideInput, system: UnitsSystem): GuidePageBuild {
  const ids = ROCKER_GUIDE_CARD_IDS;
  const frame = GUIDE_FRAME.rocker;
  const pushPlan = rockerGuideVariants(input, system);
  const base = input.sideProfile;
  const blank = input.blank;
  const view = base.blank;
  const L = base.length;
  const station = (key: "nose12" | "tail12") => base.stations.find((st) => st.key === key)?.station ?? mm(0);
  const at = stationLabel(system);
  const pushesOf = (id: string) => pushPlan[id].pushes.map(profileOf);

  const centre: WindowAt = { at: "center", span: frame.centerSpan, name: "Center" };
  const tipWin = (end: TipEnd, span: Mm = frame.tipSpan): WindowAt => ({ at: end, span, name: end === "nose" ? "Nose" : "Tail" });
  const pairTip = (end: TipEnd) => tipWin(end, frame.pairSpan);
  const one = (where: WindowAt, pushes: readonly BoardSideProfile[], dims: DetailSpec["dims"], pushBlank = false): DetailSpec => ({
    where,
    pushes,
    pushBlank,
    dims,
  });
  const figure = (b: BoardSideProfile, details: readonly DetailSpec[]) => rockerFigure(b, details);

  const cards: GuideCardModel[] = [];

  // Inputs
  {
    const pushes = pushesOf(ids.centerThickness);
    cards.push({
      id: ids.centerThickness,
      tag: valueTag(formatMark(input.foil.center, system)),
      caption: pushPlan[ids.centerThickness].caption,
      figure: figure(base, [one(centre, pushes, (ctx) => thicknessDim(ctx, mm(L / 2), system, ["right", "left", "aboveRight"]))]),
    });
  }
  {
    const pushes = pushesOf(ids.tips);
    cards.push({
      id: ids.tips,
      tag: valueTag(`${formatMark(input.foil.noseTip, system)} · ${formatMark(input.foil.tailTip, system)}`),
      caption: pushPlan[ids.tips].caption,
      figure: figure(base, [
        one(pairTip("nose"), pushes, (ctx) => tipThicknessDim(ctx, "nose", system)),
        one(pairTip("tail"), pushes, (ctx) => tipThicknessDim(ctx, "tail", system)),
      ]),
    });
  }

  // Blank
  cards.push({
    id: ids.blank,
    tag: blank ? valueTag(`${blank.copy.vendor} ${blank.copy.name}`) : GUIDE_NO_TAG,
    caption: GUIDE_NO_CAPTION,
    figure: figure(base, [
      {
        ...one(centre, [], (ctx) => [
          ...foamOffDim(ctx, mm(L / 2), "deck", system, " skin", ["aboveRight", "right", "above"]),
          ...foamOffDim(ctx, mm(L / 2 - frame.gapAt), "bottom", system, " off the bottom", ["below", "left", "right"]),
        ]),
        // Room under the baseline for the foam off the bottom's label; the centre window is drawn to its
        // width, not its height, so the board draws no smaller for it.
        foot: DETAIL_FOOT + 3 + GUIDE_TEXT_UNITS_MAX + 2,
      },
    ]),
  });
  {
    const pushes = pushesOf(ids.placement);
    cards.push({
      id: ids.placement,
      tag: view ? valueTag(formatPlacement(view.placement, system)) : GUIDE_NO_TAG,
      caption: pushPlan[ids.placement].caption,
      figure: figure(base, [
        one(pairTip("nose"), pushes, (ctx) => spareDim(ctx, "nose", system), true),
        one(pairTip("tail"), pushes, (ctx) => spareDim(ctx, "tail", system), true),
      ]),
    });
  }
  {
    const pushes = pushesOf(ids.deckSkin);
    cards.push({
      id: ids.deckSkin,
      tag: view ? valueTag(formatDeckSkin(view.cut.deckSkin, system)) : GUIDE_NO_TAG,
      caption: pushPlan[ids.deckSkin].caption,
      figure: figure(base, [one(centre, pushes, (ctx) => foamOffDim(ctx, mm(L / 2), "deck", system, " skin", ["aboveRight", "right", "above"]))]),
    });
  }
  {
    const pushes = pushesOf(ids.customizeRocker);
    const custom = blank ? !isNaturalSpec(blank.rocker) : false;
    cards.push({
      id: ids.customizeRocker,
      // The sidebar's own button: Edit Custom Rocker once the board orders a rocker.
      name: custom ? "Edit Custom Rocker" : "Customize Rocker",
      tag: !blank ? GUIDE_NO_TAG : custom ? valueTag(formatRockerNote(blank.rocker)) : valueTag("Natural rocker"),
      caption: pushPlan[ids.customizeRocker].caption,
      figure: figure(base, [
        one(tipWin("nose", mm(Math.max(frame.tipSpan, guidePush(system).rocker.bendFrom + frame.tipInset + frame.beyondTip))), pushes, (ctx) =>
          bendDims(ctx, guidePush(system).rocker.bendFrom, system),
        true),
      ]),
    });
  }

  // Rocker
  for (const [id, end] of [
    [ids.noseRocker, "nose"],
    [ids.tailRocker, "tail"],
  ] as const) {
    const pushes = pushesOf(id);
    cards.push({
      id,
      tag: valueTag(formatMark(rockerAtTip(base, end), system)),
      caption: pushPlan[id].caption,
      figure: figure(base, [one(tipWin(end), pushes, (ctx) => tipRockerDim(ctx, end, system), true)]),
    });
  }

  // Foil
  for (const [id, style] of [
    [ids.pinDeck, "pinDeck"],
    [ids.pinBottom, "bottom"],
  ] as const) {
    const drawn = pushPlan[id].drawnAs ? profileOf(pushPlan[id].drawnAs!) : base;
    // Pin deck takes the tips' foam off the bottom, Pin bottom off the deck: the foam off 3" in from each
    // tip, as a bare mark — a pair's window is too narrow for "off the bottom" at the narrowest card.
    const which = style === "pinDeck" ? "bottom" : "deck";
    const offAt = (end: TipEnd) => mm(end === "nose" ? L - frame.beyondTip : frame.beyondTip);
    const dims = (end: TipEnd) => (ctx: DetailContext) =>
      foamOffDim(ctx, offAt(end), which, system, "", end === "nose" ? ["right", "aboveRight", "above", "left"] : ["left", "aboveLeft", "above", "right"]);
    cards.push({
      id,
      tag: blank && blank.tipStyle === style ? onTag : GUIDE_NO_TAG,
      caption: GUIDE_NO_CAPTION,
      figure: figure(drawn, [one(pairTip("nose"), [], dims("nose")), one(pairTip("tail"), [], dims("tail"))]),
    });
  }
  for (const [id, end] of [
    [ids.noseThinningStarts, "nose"],
    [ids.tailThinningStarts, "tail"],
  ] as const) {
    const pushes = pushesOf(id);
    const tip = view?.tips[end];
    const reachIn = Math.max(tip?.fromTip ?? 0, ...pushes.map((p) => p.blank?.tips[end].fromTip ?? 0));
    cards.push({
      id,
      tag: tip ? valueTag(`${formatThinningStart(tip.fromTip, system)}${tip.automatic ? " · Automatic" : ""}`) : GUIDE_NO_TAG,
      caption: pushPlan[id].caption,
      figure: figure(base, [one(tipWin(end, mm(Math.max(frame.tipSpan, reachIn + frame.tipInset + frame.beyondTip))), pushes, (ctx) => startDims(ctx, end, system))]),
    });
  }
  {
    const pushes = pushesOf(ids.fineTunes);
    const tweak =
      blank && (blank.nose12Offset !== 0 || blank.tail12Offset !== 0)
        ? `${formatSignedMark(blank.nose12Offset, system)} · ${formatSignedMark(blank.tail12Offset, system)}`
        : "No tweak";
    const stationWin = (key: "nose12" | "tail12"): WindowAt => ({
      at: station(key),
      span: frame.pairSpan,
      name: `${key === "nose12" ? "Nose" : "Tail"} ${at}`,
    });
    cards.push({
      id: ids.fineTunes,
      // The page's name with the station as the page reads it (`Nose @ 30.5 cm · Tail @ 30.5 cm` in Metric).
      name: `Nose @ ${at} · Tail @ ${at}`,
      tag: blank ? valueTag(tweak) : GUIDE_NO_TAG,
      caption: pushPlan[ids.fineTunes].caption,
      figure: figure(base, [
        one(stationWin("nose12"), pushes, (ctx) => thicknessDim(ctx, station("nose12"), system, ["left", "right", "aboveLeft"])),
        one(stationWin("tail12"), pushes, (ctx) => thicknessDim(ctx, station("tail12"), system, ["right", "left", "aboveRight"])),
      ]),
    });
  }
  {
    const pushes = pushesOf(ids.fineTuneFrom);
    const surfaceWin = (name: string): WindowAt => ({ at: station("tail12"), span: frame.pairSpan, name });
    const dims = (ctx: DetailContext) => thicknessDim(ctx, station("tail12"), system, ["right", "left", "aboveRight"]);
    cards.push({
      id: ids.fineTuneFrom,
      tag: view ? valueTag(view.cut.fineTuneSurface === "deck" ? "Deck" : "Bottom") : GUIDE_NO_TAG,
      caption: pushPlan[ids.fineTuneFrom].caption,
      figure: figure(base, [
        one(surfaceWin("Deck"), pushes.slice(0, 1), dims),
        one(surfaceWin("Bottom"), pushes.slice(1, 2), dims),
      ]),
    });
  }
  return new Map(cards.map((card) => [card.id, card]));
}
