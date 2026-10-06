import type { Metadata } from "next";
import { connection } from "next/server";
import { RECOVERY_COLUMN, RECOVERY_MAIN } from "@/components/error-pages/recovery-styles";
import { legalOutline, type LegalSlug } from "@/lib/legal/documents";
import { readLegalDocument } from "@/lib/legal/read-document";
import { SITE_NAME } from "@/lib/site/metadata";
import { PAGE_FOOTER_FRAME, SiteFooter } from "@/components/site-footer";
import { LegalDocument } from "./legal-document";

/**
 * One legal page — `/terms` or `/privacy` — drawn from the founder's own markdown (quick
 * 261006-fom, D-01). An async Server Component.
 *
 * `await connection()` comes first, so the page is rendered at each visit rather than once at
 * build time: the markdown file is read on every request, and a word the founder changes in
 * `content/legal/*.md` shows on the next visit with no code change.
 *
 * The scroller and the column are exactly the old hand-typed privacy page's, shared through
 * `RECOVERY_MAIN` / `RECOVERY_COLUMN` with the Contact and recovery screens, so all of them keep
 * the same width and margins on a phone and a computer. The site footer follows the column, the
 * last thing in the page's scroller (D-03).
 */
export async function LegalPage({ slug }: { slug: LegalSlug }) {
  await connection();
  const markdown = await readLegalDocument(slug);

  return (
    <main data-legal-page={slug} className={RECOVERY_MAIN}>
      <div className={RECOVERY_COLUMN}>
        <LegalDocument markdown={markdown} />
      </div>
      <div className={PAGE_FOOTER_FRAME}>
        <SiteFooter className="mt-0" />
      </div>
    </main>
  );
}

/**
 * The page's browser-tab title — "Shaper Assistant — Privacy Policy" — read from the document's
 * own first heading, so it follows the founder's text. No description: the site's approved
 * description (lib/site/metadata.ts) carries over from the root layout, and no new words are
 * invented here.
 */
export async function legalPageMetadata(slug: LegalSlug): Promise<Metadata> {
  const markdown = await readLegalDocument(slug);
  return { title: `${SITE_NAME} — ${legalOutline(markdown).title}` };
}
