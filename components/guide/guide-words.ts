/**
 * Every GUIDE card's words on all five pages, in the app's page order (TEMPLATE, ROCKER, RAILS, VOLUME,
 * FINS) and, inside each page, group by group in the words page's own order (Phase 18, R13). Nothing here is
 * new copy: each page's words module is the founder's `18-GUIDE-WORDS.md`, held line for line by its own
 * test, and this module only lays the five side by side so a check over the whole phase reads them in one
 * place. 84 cards: 22, 14, 17, 8 and 23.
 */
import { GUIDE_PAGES, type GuidePage } from "@/lib/geometry/guide-card";
import type { GuideWordsCard, GuideWordsGroup } from "./guide-copy";
import { FINS_GUIDE_GROUPS, FINS_GUIDE_INTRO, FINS_GUIDE_WORDS } from "./words/fins";
import { RAILS_GUIDE_GROUPS, RAILS_GUIDE_INTRO, RAILS_GUIDE_WORDS } from "./words/rails";
import { ROCKER_GUIDE_GROUPS, ROCKER_GUIDE_INTRO, ROCKER_GUIDE_WORDS } from "./words/rocker";
import { TEMPLATE_GUIDE_GROUPS, TEMPLATE_GUIDE_INTRO, TEMPLATE_GUIDE_WORDS } from "./words/template";
import { VOLUME_GUIDE_GROUPS, VOLUME_GUIDE_INTRO, VOLUME_GUIDE_WORDS } from "./words/volume";

/** One page's words: its intro (`{board}`, and on ROCKER `{blank}`, filled in by the page), its groups and
 * its cards. */
export type GuidePageWords = {
  page: GuidePage;
  intro: string;
  groups: readonly GuideWordsGroup[];
  cards: readonly GuideWordsCard[];
};

const BY_PAGE: Record<GuidePage, GuidePageWords> = {
  template: { page: "template", intro: TEMPLATE_GUIDE_INTRO, groups: TEMPLATE_GUIDE_GROUPS, cards: TEMPLATE_GUIDE_WORDS },
  rocker: { page: "rocker", intro: ROCKER_GUIDE_INTRO, groups: ROCKER_GUIDE_GROUPS, cards: ROCKER_GUIDE_WORDS },
  rails: { page: "rails", intro: RAILS_GUIDE_INTRO, groups: RAILS_GUIDE_GROUPS, cards: RAILS_GUIDE_WORDS },
  volume: { page: "volume", intro: VOLUME_GUIDE_INTRO, groups: VOLUME_GUIDE_GROUPS, cards: VOLUME_GUIDE_WORDS },
  fins: { page: "fins", intro: FINS_GUIDE_INTRO, groups: FINS_GUIDE_GROUPS, cards: FINS_GUIDE_WORDS },
};

/** The five pages' words, in the app's page order. */
export const GUIDE_PAGE_WORDS: readonly GuidePageWords[] = GUIDE_PAGES.map((page) => BY_PAGE[page]);

/** All 84 cards, page by page in the app's order, each page's cards in its words page's order. */
export const GUIDE_WORDS: readonly GuideWordsCard[] = GUIDE_PAGE_WORDS.flatMap((p) => p.cards);

/** Every group heading on all five pages, page by page in the app's order, with the page it is on. */
export const GUIDE_GROUPS: readonly (GuideWordsGroup & { page: GuidePage })[] = GUIDE_PAGE_WORDS.flatMap((p) =>
  p.groups.map((group) => ({ page: p.page, ...group })),
);

/** One page's words. */
export function guidePageWords(page: GuidePage): GuidePageWords {
  return BY_PAGE[page];
}
