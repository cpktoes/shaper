import type { Metadata } from "next";
import Link from "next/link";
import {
  RECOVERY_ACTIONS,
  RECOVERY_COLUMN,
  RECOVERY_HEADING,
  RECOVERY_HINT,
  RECOVERY_LEAD,
  RECOVERY_MAIN,
  RECOVERY_PRIMARY_ACTION,
  RECOVERY_SECONDARY_ACTION,
} from "@/components/error-pages/recovery-styles";
import { CONTACT_ROUTE } from "@/lib/contact/message";
import { NOT_FOUND_COPY } from "@/lib/error-pages/copy";

export const metadata: Metadata = { title: NOT_FOUND_COPY.pageTitle };

/**
 * The not-found page (quick 260930-fjm, Phase 13 item 12, Task 2). Next answers EVERY unmatched
 * address with this — including ones under `/design/` — with a 404 status and a `noindex` tag, so
 * a mistyped or old link never quietly serves a 200.
 *
 * Only Home screen and Contact are offered (P-1): the six design screens are already one tap away
 * on the same page (the desktop nav row on a tall window 820 dots and wider, the top bar's menu
 * and its six screen tiles everywhere else), so a second list of them here would only repeat
 * what's already there.
 *
 * The page is its `<main>` alone: the old bottom tab bar it used to mount as its own last child was
 * removed in quick 261003-q2f. The top bar comes from the root layout, so it reaches every address
 * this page can render at, including ones with no layout of their own.
 */
export default function NotFound() {
  return (
    <main data-not-found-page className={RECOVERY_MAIN}>
      <div className={RECOVERY_COLUMN}>
        <h1 className={RECOVERY_HEADING}>{NOT_FOUND_COPY.heading}</h1>
        <p className={RECOVERY_LEAD}>{NOT_FOUND_COPY.lead}</p>
        <p className={RECOVERY_HINT}>{NOT_FOUND_COPY.hint}</p>
        <div className={RECOVERY_ACTIONS}>
          <Link href="/" className={RECOVERY_PRIMARY_ACTION}>
            {NOT_FOUND_COPY.home}
          </Link>
          <Link href={CONTACT_ROUTE} className={RECOVERY_SECONDARY_ACTION}>
            {NOT_FOUND_COPY.contact}
          </Link>
        </div>
      </div>
    </main>
  );
}
