/**
 * The GUIDE's card contract (Phase 18, D-04 to D-08, D-27; UI-SPEC §3 and §4): what every page's GUIDE
 * card is made of, so the five pages build to one shape and one painter draws them all.
 *
 * A card is a name, a tag beside it (the board's own value, or a word such as `On this board`), a
 * small drawing of the open board, and a caption under the drawing saying what the muted dashes in it
 * show. The words a shaper reads under the drawing live in `components/guide/words/`; this file holds
 * only the parts worked out from the board. Pure: no React, no browser, no database (CLAUDE.md Rule 1).
 *
 * Every figure inside a tag, a caption or a drawing label arrives already formatted by the page's own
 * formatter (`measure-display.ts`), marked `figure: true` so the painter keeps its units in their own
 * case (`13 mm`, never `13 MM`). Nothing here rounds a number: rounding is for what is shown, never for
 * what is drawn or counted.
 */
import type { RailSegmentKey } from "./rail-bands";

/** The five design pages that carry a GUIDE, in the app's own order. */
export type GuidePage = "template" | "rocker" | "rails" | "volume" | "fins";

/** The five pages in the order a board is shaped: TEMPLATE, ROCKER, RAILS, VOLUME, FINS. */
export const GUIDE_PAGES: readonly GuidePage[] = ["template", "rocker", "rails", "volume", "fins"];

/** A name as an id piece: lower case, every run of anything but a letter or a digit one `-`, no `-` at
 * either end. `Nose Rail · Center Rail · Tail Rail` becomes `nose-rail-center-rail-tail-rail`. */
export function guideSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * A card's id: its page, its group and its name together (D-27). A name alone repeats — TEMPLATE has
 * two *Fullness* cards and two *Depth* cards, one in Nose Controls and one in Tail Controls — so the
 * words module, the tests and the page's `data-guide-card` all key on the three.
 */
export function guideCardId(page: GuidePage, group: string, name: string): string {
  return `${page}.${guideSlug(group)}.${guideSlug(name)}`;
}

/**
 * The tag beside a card's name (D-05). `on`: the option or the ticked box on this board, which also
 * gives the card its stronger edge. `value`: the control's own value, read exactly as the page's own
 * control reads it. `na`: a word saying the control does not apply to this board (`Diamond & swallow
 * only`, `—`, `Needs 8'0"`). `none`: no tag; the name stands alone.
 */
export type GuideTag = { kind: "on" | "value" | "na" | "none"; text: string };

/** No tag at all. */
export const GUIDE_NO_TAG: GuideTag = { kind: "none", text: "" };

/** A run of text in a tag, caption or drawing label. A `figure` part is a formatted number with its
 * unit; the painter keeps it out of the label's capitals. */
export type GuideTextPart = { text: string; figure: boolean };

/**
 * The line under a drawing (D-06). `dashed`: what the muted dashes show (`dashed · 6'8" → 31.8 L quick
 * estimate`). `drawnAs`: a setup or model drawn on this board with nothing pushed (`drawn as · Thruster
 * — McKee Gun`). `none`: nothing pushed and nothing drawn as; the drawing stands alone. The parts are
 * what follows the word and its dot.
 */
export type GuideCaption = { kind: "dashed" | "drawnAs" | "none"; parts: readonly GuideTextPart[] };

/** No caption line at all. */
export const GUIDE_NO_CAPTION: GuideCaption = { kind: "none", parts: [] };

/** The caption as one line of text: `""` when there is none, `dashed · …` or `drawn as · …`. */
export function guideCaptionText(caption: GuideCaption): string {
  if (caption.kind === "none") return "";
  const lead = caption.kind === "dashed" ? "dashed" : "drawn as";
  return `${lead} · ${caption.parts.map((part) => part.text).join("")}`;
}

/** A run of plain words in a tag, caption or label. */
export function guideText(text: string): GuideTextPart {
  return { text, figure: false };
}

/** A formatted figure, kept in its own case by the painter. */
export function guideFigure(text: string): GuideTextPart {
  return { text, figure: true };
}

/**
 * What a drawn line or shape is, so the painter can give it the app's own token and dash (D-18; UI-SPEC
 * Color). The whole vocabulary every page needs, from the sketch's own classes:
 *
 * - `board` the board's own edge over its fill; `shade` a shaded board (an area the card reads);
 *   `foam` a blank's foam; `railFill` the finished rail's fill.
 * - `baseline`, `station`, `frame`, `stringer`, `widepoint`, `thinning`, `reference`, `extension`: the
 *   faint reference lines, each with its own dash.
 * - `window` and `cut`: the drafting dash-dot — the part of the board a detail shows, and where a section
 *   is cut.
 * - `mark`: a derived line a card reads (the weighted thickness, a mark on the rail).
 * - `push`: the one setting pushed, in muted dashes beside the board as it is.
 * - `fin`: a fin, trailing edge to leading edge. `rail`: the finished rail's own curve. `band`: a rail
 *   band in its RAILS colour. `apex`: the apex centre.
 */
export type GuideRole =
  | "board"
  | "shade"
  | "foam"
  | "baseline"
  | "station"
  | "frame"
  | "stringer"
  | "widepoint"
  | "window"
  | "cut"
  | "mark"
  | "thinning"
  | "push"
  | "extension"
  | "reference"
  | "fin"
  | "rail"
  | "railFill"
  | "band"
  | "apex";

/** A box in the drawing's own units (the viewBox is 300 wide). */
export type GuideBox = { x: number; y: number; w: number; h: number };

/**
 * One thing the painter draws, in the drawing's own units. A `dim` is a dimension line with its end
 * ticks and its label at `(lx, ly)`; a `text` is a label (`name` the muted capitals of a window's name,
 * `value` an ink figure, `valueMuted` a quieter figure, `note` a muted word set beside a drawing).
 */
export type GuidePrim =
  | { kind: "path"; role: GuideRole; d: string; band?: RailSegmentKey }
  | { kind: "line"; role: GuideRole; x1: number; y1: number; x2: number; y2: number }
  | { kind: "rect"; role: "window" | "frame"; x: number; y: number; w: number; h: number }
  | {
      kind: "dim";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      parts: readonly GuideTextPart[];
      lx: number;
      ly: number;
      /** The label's baseline shift in ems, so a label below a line clears it at any text size. */
      dy?: number;
      anchor: "start" | "middle" | "end";
    }
  | {
      kind: "text";
      role: "name" | "value" | "valueMuted" | "note";
      x: number;
      y: number;
      parts: readonly GuideTextPart[];
      /** The baseline shift in ems (a name hung under its frame's top edge). */
      dy?: number;
      anchor: "start" | "middle" | "end";
    }
  | { kind: "dot"; role: "finDot" | "markDot" | "pushDot"; x: number; y: number; r: number };

/** A detail under the strip: its frame box and what it draws, clipped to the box. */
export type GuideWindow = { box: GuideBox; prims: readonly GuidePrim[] };

/** A card's whole drawing: its height in the 300-wide viewBox, the strip's prims, and its details. */
export type GuideFigure = { height: number; strip: readonly GuidePrim[]; windows: readonly GuideWindow[] };

/** What a page's builder hands a card: its id, a name when the name follows the board (FINS' *Fin Base
 * Length*), the tag, the caption and the drawing. */
export type GuideCardModel = { id: string; name?: string; tag: GuideTag; caption: GuideCaption; figure: GuideFigure };

/** A page's cards, keyed by card id. */
export type GuidePageBuild = ReadonlyMap<string, GuideCardModel>;

/** Every drawing is this many units wide. */
export const GUIDE_VIEWBOX_WIDTH = 300;
/** The narrowest card draws its 300 units at about this many dots each (a 210-dot inner width). */
export const GUIDE_MIN_FIT = 0.7;
/** Drawing text is pinned at this many screen dots, however wide the card draws. */
export const GUIDE_TEXT_PX = 10;
