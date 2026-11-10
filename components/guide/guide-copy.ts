/**
 * The GUIDE's own words that the founder's words page does not carry — the tab's name, the two labels on
 * a card, the scroller's spoken name — and the pure helpers that hand a card its words in the shaper's
 * system (Phase 18, D-09, D-22; UI-SPEC Copywriting Contract). Pure: no React.
 *
 * Every card's name, sentences and notes live in `words/` and are held line for line to
 * `18-GUIDE-WORDS.md`. The words page is written the Imperial way; a Metric shaper reads each card's few
 * Imperial phrases replaced by its Metric sayings (`words/metric-sayings.ts`), two pieces of copy and
 * nothing converted.
 */
import type { GuidePage } from "@/lib/geometry/guide-card";
import type { UnitsSystem } from "@/lib/geometry/units";
import { screenWord } from "@/lib/screen-steps";
import { GUIDE_METRIC_SAYINGS, type GuideMetricSaying } from "./words/metric-sayings";

/** The page labels, as the top bar names the five pages. */
const PAGE_LABELS: Record<GuidePage, string> = {
  template: "TEMPLATE",
  rocker: "ROCKER",
  rails: "RAILS",
  volume: "VOLUME",
  fins: "FINS",
};

export const GUIDE_COPY = {
  /** The tab's word, last on every page's strip. */
  tab: "GUIDE",
  /** The tag on the option or ticked box this board has. */
  onThisBoard: "On this board",
  /** The label over a card's shaping note. */
  howToShape: "How to shape",
  /** The label over a FINS card's Model info note (the fourteen notes that live on FINS' GUIDE cards). */
  modelInfo: "Model info",
  /** The scroller's spoken name: `Guide to Volume`. */
  regionLabel(page: GuidePage): string {
    return `Guide to ${screenWord(PAGE_LABELS[page])}`;
  },
} as const;

/** One card's words, exactly as the words page has them. */
export type GuideWordsCard = {
  id: string;
  page: GuidePage;
  group: string;
  name: string;
  is: string;
  does: string;
  /** The Model info note on fourteen of FINS' GUIDE cards; `null` on every other card. */
  info: string | null;
  how: string;
};

/** A group heading and its qualifier (the words after the dash on the words page), if any. */
export type GuideWordsGroup = { name: string; note: string | null };

/** The board's name as the intro says it: an unsaved or unnamed board is `your board`, never `your
 * Untitled` (Phase 17's rule). */
export function guideBoardName(bandName: string): string {
  const trimmed = bandName.trim();
  return trimmed === "" || trimmed === "Untitled" ? "board" : trimmed;
}

/** Replaces each listed Imperial phrase once, in order — throwing when one is missing, so a changed
 * sentence can never silently keep an inch in Metric. */
function applySayings(text: string, sayings: readonly GuideMetricSaying[], where: string): string {
  let out = text;
  for (const saying of sayings) {
    const at = out.indexOf(saying.imperial);
    if (at < 0) throw new Error(`${where}: the Metric saying's Imperial phrase "${saying.imperial}" is not in "${out}"`);
    out = out.slice(0, at) + saying.metric + out.slice(at + saying.imperial.length);
  }
  return out;
}

/** A card's lines for a system: the page's own in Imperial, its Metric sayings swapped in for Metric. */
export function guideLines(
  card: GuideWordsCard,
  system: UnitsSystem,
): { is: string; does: string; info: string | null; how: string } {
  const lines = { is: card.is, does: card.does, info: card.info, how: card.how };
  if (system !== "metric") return lines;
  const sayings = GUIDE_METRIC_SAYINGS[card.id] ?? [];
  for (const field of ["is", "does", "info", "how"] as const) {
    const mine = sayings.filter((s) => s.field === field);
    if (mine.length === 0) continue;
    const text = lines[field];
    if (text === null) throw new Error(`${card.id}: a Metric saying for its ${field} note, which it does not have`);
    lines[field] = applySayings(text, mine, `${card.id} ${field}`);
  }
  return lines;
}

/**
 * A page's intro for a system, the board's name (and, on ROCKER, its blank's) filled in where the words
 * page says *Shortboard*. A Metric shaper reads the page's own intro sayings, keyed `${page}.intro`.
 */
export function guideIntro(
  template: string,
  system: UnitsSystem,
  fill: { board: string; blank?: string },
  page?: GuidePage,
): string {
  // The sayings first, on the page's own words, so a board's name can never be mistaken for a phrase.
  let text = template;
  if (system === "metric" && page) {
    const sayings = GUIDE_METRIC_SAYINGS[`${page}.intro`] ?? [];
    if (sayings.length > 0) text = applySayings(text, sayings, `${page} intro`);
  }
  // Both names go in in one pass and exactly as typed: a board called `Fish $& Pro` or `{blank}` reads as that.
  return text.replace(/\{board\}|\{blank\}/g, (token) => (token === "{board}" ? fill.board : (fill.blank ?? token)));
}
