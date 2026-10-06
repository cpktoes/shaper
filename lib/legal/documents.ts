/**
 * The legal pages' pure parts (quick 261006-fom, the founder's request of 2026-10-06, D-01): where
 * the Terms of Service and the Privacy Policy live, and the one helper that reads their headings.
 *
 * The WORDS of both pages are not here. They are the founder's own text in
 * `content/legal/terms.md` and `content/legal/privacy.md`, which the founder edits as plain text
 * with no code change; the pages read those files at each visit (`lib/legal/read-document.ts`,
 * `components/legal/legal-page.tsx`). This file only names where each one lives, so the footer,
 * the sign-up consent line and the browser specs all link to the same two addresses.
 *
 * No React, Next, browser API or file-system import anywhere in this file: the footer, the
 * consent line and the Playwright specs import it, and a test reads it in isolation.
 */

import { PRIVACY_ROUTE } from "../privacy/copy";

/** The Terms of Service page's address. The privacy page keeps the existing `PRIVACY_ROUTE`, so
 * one constant stays the one source for each address. */
export const TERMS_ROUTE = "/terms";

/** Each legal page's address, and the founder's markdown file it is drawn from (a path relative to
 * the project root — the same relative path `next.config.ts` names so Vercel ships the file). */
export const LEGAL_DOCUMENTS = {
  terms: { route: TERMS_ROUTE, file: "content/legal/terms.md" },
  privacy: { route: PRIVACY_ROUTE, file: "content/legal/privacy.md" },
} as const;

export type LegalSlug = keyof typeof LEGAL_DOCUMENTS;

export interface LegalOutline {
  /** The document's title: its first `# ` line. */
  title: string;
  /** Every `## ` section heading, in reading order. */
  sections: string[];
}

/**
 * The title and section headings of one of the founder's markdown documents, read straight from
 * the text, so the page's browser tab title and the browser specs never type a heading of their
 * own: change a heading in the file and both follow it.
 */
export function legalOutline(markdown: string): LegalOutline {
  const lines = markdown.split(/\r?\n/);
  const titleLine = lines.find((line) => /^#\s/.test(line));
  const title = titleLine ? titleLine.replace(/^#\s+/, "").trim() : "";
  const sections = lines.filter((line) => /^##\s/.test(line)).map((line) => line.replace(/^##\s+/, "").trim());
  return { title, sections };
}
