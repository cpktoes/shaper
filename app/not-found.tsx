import type { Metadata } from "next";
import Link from "next/link";
import { PhoneTabBar } from "@/components/design/phone-tab-bar";
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
 * on the same page (the desktop nav row at 820 dots and wider, the phone's bottom tab bar below),
 * so a second list of them here would only repeat what's already on screen.
 *
 * `PhoneTabBar` is mounted here as this page's own last child (P-3) — this page can render at any
 * address, including ones with no layout of their own (e.g. `/design/no-such-screen` renders this
 * WITHOUT `app/design/layout.tsx`, so it needs its own copy to avoid zero tab bars there).
 */
export default function NotFound() {
  return (
    <>
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
      <PhoneTabBar />
    </>
  );
}
