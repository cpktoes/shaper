/**
 * Reads the founder's GUIDE words page, `18-GUIDE-WORDS.md`, for the words tests (Phase 18, D-09, D-22, R6).
 * The page is found by name anywhere under `.planning/`, because a finished phase moves to the archive.
 *
 * Test-only: it reads a file, so no screen imports it. It never normalises a character — every line is
 * exactly as written, trimmed of its ends and nothing else — so a non-breaking space or a stray mark on the
 * page shows up as a failed comparison rather than being quietly smoothed over.
 *
 * The page's shape:
 *
 * - `## TEMPLATE` … `## FINS`: the five pages, in order. Any other `##` heading (the pushes, the Metric
 *   sayings) ends the cards.
 * - `*Intro under the GUIDE heading (the board's name filled in):* …`: the page's intro.
 * - `### Group — qualifier`: a group; the qualifier is everything after the first ` — `.
 * - `**Name** · tag on the Shortboard: \`…\` · caption: \`…\``: a card, its tag and caption optional.
 * - `- is: …`, `- does: …`, `- info: …` (FINS only), `- how: …`: the card's lines.
 * - Under `## Metric sayings`, a `### PAGE` subheading, then `- {Group} › {Card name} · {field}:
 *   \`{imperial}\` → \`{metric}\`` per saying, or `- intro: \`{imperial}\` → \`{metric}\`` for the page's intro.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { GuidePage } from "@/lib/geometry/guide-card";

export const GUIDE_WORDS_PAGE_NAME = "18-GUIDE-WORDS.md";

const PAGE_HEADINGS: Record<string, GuidePage> = {
  TEMPLATE: "template",
  ROCKER: "rocker",
  RAILS: "rails",
  VOLUME: "volume",
  FINS: "fins",
};

export type GuideWordsPageCard = {
  page: GuidePage;
  group: string;
  name: string;
  /** The tag the page shows for the Shortboard, or `null` when it shows none. */
  tag: string | null;
  /** The caption the page shows for the Shortboard, or `null` when it shows none. */
  caption: string | null;
  is: string;
  does: string;
  info: string | null;
  how: string;
};

export type GuideWordsPageSection = {
  page: GuidePage;
  intro: string;
  groups: { name: string; note: string | null }[];
  cards: GuideWordsPageCard[];
};

export type GuideWordsPageSaying = {
  page: GuidePage;
  /** `null` for the page's intro. */
  group: string | null;
  name: string | null;
  field: "is" | "does" | "info" | "how" | "intro";
  imperial: string;
  metric: string;
};

export type GuideWordsPage = {
  /** The page's whole text, as written. */
  raw: string;
  pages: GuideWordsPageSection[];
  cards: GuideWordsPageCard[];
  metricSayings: GuideWordsPageSaying[];
};

const PLANNING = fileURLToPath(new URL("../../../.planning/", import.meta.url));

function findPage(dir: string): string | null {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isFile() && entry.name === GUIDE_WORDS_PAGE_NAME) return path;
    if (entry.isDirectory()) {
      const found = findPage(path);
      if (found) return found;
    }
  }
  return null;
}

/** Splits a group heading at its first ` — `: the name, then the qualifier. */
function splitGroup(heading: string): { name: string; note: string | null } {
  const at = heading.indexOf(" — ");
  return at < 0 ? { name: heading.trim(), note: null } : { name: heading.slice(0, at).trim(), note: heading.slice(at + 3).trim() };
}

export function readGuideWordsPage(): GuideWordsPage {
  const path = findPage(PLANNING);
  if (!path) throw new Error(`${GUIDE_WORDS_PAGE_NAME} was not found under .planning`);
  const raw = readFileSync(path, "utf8");

  const pages: GuideWordsPageSection[] = [];
  const metricSayings: GuideWordsPageSaying[] = [];
  let section: GuideWordsPageSection | null = null;
  let group = "";
  let inSayings = false;
  let sayingsPage: GuidePage | null = null;

  for (const line of raw.split("\n")) {
    let m: RegExpExecArray | null;
    if ((m = /^## (.+)$/.exec(line))) {
      const heading = m[1].trim();
      const page = PAGE_HEADINGS[heading];
      inSayings = /^Metric sayings\b/.test(heading);
      sayingsPage = null;
      section = page ? { page, intro: "", groups: [], cards: [] } : null;
      if (section) pages.push(section);
      group = "";
      continue;
    }
    if (inSayings) {
      if ((m = /^### (.+)$/.exec(line))) {
        sayingsPage = PAGE_HEADINGS[m[1].trim()] ?? null;
        continue;
      }
      if (!sayingsPage) continue;
      if ((m = /^- intro: `(.+?)` → `(.+?)`\s*$/.exec(line))) {
        metricSayings.push({ page: sayingsPage, group: null, name: null, field: "intro", imperial: m[1], metric: m[2] });
        continue;
      }
      if ((m = /^- (.+?) › (.+?) · (is|does|info|how): `(.+?)` → `(.+?)`\s*$/.exec(line))) {
        metricSayings.push({
          page: sayingsPage,
          group: m[1].trim(),
          name: m[2].trim(),
          field: m[3] as GuideWordsPageSaying["field"],
          imperial: m[4],
          metric: m[5],
        });
      }
      continue;
    }
    if (!section) continue;
    if ((m = /^\*Intro under the GUIDE heading \(the board's name filled in\):\* (.+)$/.exec(line))) {
      section.intro = m[1].trim();
      continue;
    }
    if ((m = /^### (.+)$/.exec(line))) {
      const split = splitGroup(m[1]);
      section.groups.push(split);
      group = split.name;
      continue;
    }
    if ((m = /^\*\*(.+?)\*\*(.*)$/.exec(line))) {
      const tag = /tag on the Shortboard: `(.*?)`/.exec(m[2]);
      const caption = /caption: `(.*?)`/.exec(m[2]);
      section.cards.push({
        page: section.page,
        group,
        name: m[1].trim(),
        tag: tag ? tag[1] : null,
        caption: caption ? caption[1] : null,
        is: "",
        does: "",
        info: null,
        how: "",
      });
      continue;
    }
    if ((m = /^- (is|does|info|how): (.+)$/.exec(line)) && section.cards.length > 0) {
      const card = section.cards[section.cards.length - 1];
      card[m[1] as "is" | "does" | "info" | "how"] = m[2].trim();
    }
  }

  return { raw, pages, cards: pages.flatMap((p) => p.cards), metricSayings };
}
