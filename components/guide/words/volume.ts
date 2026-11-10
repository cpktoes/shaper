/**
 * VOLUME's GUIDE words (Phase 18, D-09): the intro, the two groups and the eight cards, copied character
 * for character from `## VOLUME` on `18-GUIDE-WORDS.md` — the founder's page, and the source of truth.
 * `volume.test.ts` holds every line here to that page; a correction lands on the page and here in one
 * change. Every sentence is a first draft for the founder's pen.
 */
import { guideCardId } from "@/lib/geometry/guide-card";
import type { GuideWordsCard, GuideWordsGroup } from "../guide-copy";

/** The intro under the GUIDE heading; `{board}` is the open board's name (the page's *Shortboard*). */
export const VOLUME_GUIDE_INTRO =
  "What each control and figure on this page is, what it does, and how it is checked on a board. Every card is your {board} — the plan from above and the center cross-section from RAILS — with the quick estimate's number pushed in muted dashes and the litres it would give. The accurate figure the page quotes is the 51 cross-sections; the three sliders and Board Type belong to the quick estimate.";

const INPUTS = "Inputs";
const READS = "What the ESTIMATE card reads";

export const VOLUME_GUIDE_GROUPS: readonly GuideWordsGroup[] = [
  { name: INPUTS, note: "the three sliders and Board Type show only when Import Designed Board is unticked" },
  { name: READS, note: null },
];

function card(group: string, name: string, lines: Omit<GuideWordsCard, "id" | "page" | "group" | "name" | "info">): GuideWordsCard {
  return { id: guideCardId("volume", group, name), page: "volume", group, name, info: null, ...lines };
}

export const VOLUME_GUIDE_WORDS: readonly GuideWordsCard[] = [
  card(INPUTS, "Import Designed Board", {
    is: "Measures the board you drew — its template area and 51 real cross-sections with the RAILS rails — instead of the quick estimate from a board type.",
    does: "The accurate litres, quoted everywhere the app shows volume; unticked, the page becomes a quick calculator for a board you know only by length, width and thickness.",
    how: "Finish TEMPLATE, ROCKER and RAILS first; the litres here follow them. Compare the figure with a blank's catalogue volume before you cut — the foam off should be the difference.",
  }),
  card(INPUTS, "Board Length", {
    is: "The board's length for the quick estimate — one of the three numbers the quick figure multiplies.",
    does: "Longer means more area and more litres at the same width and thickness; an inch of length is worth less than an inch of width.",
    how: "Measure tip to tip along the stringer; for a board already glassed, the length on the sticker is usually the blank's, so check it.",
  }),
  card(INPUTS, "Board Width", {
    is: "The board's width for the quick estimate.",
    does: "Width is the quickest way to add litres: a wider board carries more area along its whole length.",
    how: "Measure the widest point with a straightedge across the deck, not around the rail.",
  }),
  card(INPUTS, "Center Thickness", {
    is: "The centre thickness for the quick estimate — the foil's one number.",
    does: "Thickness adds litres everywhere at once: a quarter inch at the centre is about two litres on a shortboard.",
    how: "Calipers at the centre, deck to bottom, at the wide point.",
  }),
  card(INPUTS, "Board Type", {
    is: "How full the outline and foil are for the quick estimate, from a pulled-in performance shape to a beefy one.",
    does: "The same length, width and thickness give six litres more on a beefy board than a performance one; tune it against a board whose litres you know.",
    how: "Find a board you know the litres of, enter its three numbers and slide the type until the estimate matches; keep that setting for boards of the same family.",
  }),
  card(READS, "Estimated Volume", {
    is: "The board's volume in litres — how much foam is in it.",
    does: "More litres float you higher for paddling and glide and forgive a flat section; fewer sink into the wave face for hold and let the board turn off the rail. Shapers quote it against your weight and fitness.",
    how: "Volume is read, not shaped: once the template, foil and rails are set it is what they add up to. To change it, go back to thickness and width first.",
  }),
  card(READS, "Template Area", {
    is: "The board's plan area — the area of the template seen from above.",
    does: "The area the board planes on: more area, more lift and earlier planing; the litres are this area times the effective thickness.",
    how: "Trace the finished template onto paper to check it against the board; the area follows the outline and nothing else.",
  }),
  card(READS, "Length-Weighted Effective Thickness", {
    is: "The thickness the board averages along its length once the rails and the thin tips are counted — the number the area is multiplied by.",
    does: "Two boards with the same centre thickness differ here by their foil and rails: fuller rails and a thicker tail and nose carry more litres.",
    how: 'Nothing to mark: it falls out of the foil and the rail bands. A thicker tail 12" or fuller rails raise it; a thinner nose lowers it.',
  }),
];
