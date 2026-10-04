"use client";

import Link from "next/link";
import {
  RECOVERY_ACTIONS,
  RECOVERY_COLUMN,
  RECOVERY_HEADING,
  RECOVERY_HINT,
  RECOVERY_LEAD,
  RECOVERY_MAIN,
  RECOVERY_PRIMARY_ACTION,
  RECOVERY_REFERENCE,
  RECOVERY_REFERENCE_CODE,
  RECOVERY_SECONDARY_ACTION,
} from "@/components/error-pages/recovery-styles";
import { CONTACT_ROUTE } from "@/lib/contact/message";
import { ERROR_COPY, errorReference } from "@/lib/error-pages/copy";

/**
 * The in-app error screen (quick 260930-fjm, Phase 13 item 12, Task 3). Catches a failure in any
 * page or nested layout under the root layout, so the nav, the design store and the in-progress
 * board all survive — a design-screen failure keeps the board a shaper was mid-edit on, because
 * the design store lives above this boundary (P-5).
 *
 * Renders only the copy module's words and Next's own opaque digest (through `errorReference`) —
 * never the error object's own message or stack; `lib/error-pages/wiring.test.ts` pins that.
 *
 * `retry` (not `reset`) re-fetches and re-renders the failed segment from the server (measured,
 * P-5) — clicking "Try again" sends a fresh request for the same screen rather than merely
 * clearing React's error boundary state.
 *
 * The screen is its `<main>` alone: the old bottom tab bar it used to mount as its own last child
 * was removed in quick 261003-q2f — on a phone the top bar's menu reaches every design screen.
 */
export default function ErrorScreen({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const reference = errorReference(error.digest);

  return (
    <main data-error-screen className={RECOVERY_MAIN}>
      <div className={RECOVERY_COLUMN}>
        <h1 className={RECOVERY_HEADING}>{ERROR_COPY.heading}</h1>
        <p className={RECOVERY_LEAD}>{ERROR_COPY.lead}</p>
        <p className={RECOVERY_HINT}>{ERROR_COPY.hint}</p>
        <div className={RECOVERY_ACTIONS}>
          <button type="button" onClick={() => retry()} className={RECOVERY_PRIMARY_ACTION}>
            {ERROR_COPY.tryAgain}
          </button>
          <Link href="/" className={RECOVERY_SECONDARY_ACTION}>
            {ERROR_COPY.home}
          </Link>
          <Link href={CONTACT_ROUTE} className={RECOVERY_SECONDARY_ACTION}>
            {ERROR_COPY.contact}
          </Link>
        </div>
        {reference !== null && (
          <p className={RECOVERY_REFERENCE}>
            {ERROR_COPY.referenceLead} <code data-error-reference className={RECOVERY_REFERENCE_CODE}>{reference}</code>
          </p>
        )}
      </div>
    </main>
  );
}
