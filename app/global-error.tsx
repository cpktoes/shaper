"use client";

import "./globals.css";
import { geistMono, inter } from "./fonts";
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
 * The standalone root-layout error screen (quick 260930-fjm, Phase 13 item 12, Task 3, P-6). This
 * replaces the ENTIRE root layout when the app's own frame fails — so it must render its own
 * `<html>` and `<body>`, has no providers, no SiteNav and no tab bar, and follows the device's
 * light/dark setting rather than the app's own theme class (Next's docs: an app's theme class
 * never reaches this screen).
 *
 * Home screen and Tell us what happened are plain anchors, meaning full page loads, on purpose:
 * the app's own frame just failed, so a fresh load is the surest way back — never a
 * `next/link` client-side navigation through the very frame that broke.
 *
 * `metadata` exports are not supported here — `<title>` (React 19 hoists it) stands in for it.
 *
 * Shares `app/fonts.ts` with the root layout (Next's "Using a font definitions file"), so this
 * last-resort screen and the ordinary app look the same typeface. Proven by a server-render unit
 * test (`lib/error-pages/wiring.test.ts`); not proven in a browser, because forcing it would mean
 * putting a test switch into the root layout itself, which this plan refuses to do.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const reference = errorReference(error.digest);

  return (
    <html lang="en" className={`${geistMono.variable} ${inter.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col bg-surf-ground text-surf-ink">
        <title>{ERROR_COPY.documentTitle}</title>
        <header className="flex flex-none items-center border-b border-surf-line-faint bg-surf-ground px-6 py-6 max-shell:px-4 max-shell:py-4">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full page load on purpose: the app's own frame just failed */}
          <a href="/" className="text-sm font-extrabold tracking-architectural text-surf-ink">
            SHAPER ASSISTANT
          </a>
        </header>
        <main data-global-error-screen className={RECOVERY_MAIN}>
          <div className={RECOVERY_COLUMN}>
            <h1 className={RECOVERY_HEADING}>{ERROR_COPY.heading}</h1>
            <p className={RECOVERY_LEAD}>{ERROR_COPY.lead}</p>
            <p className={RECOVERY_HINT}>{ERROR_COPY.hint}</p>
            <div className={RECOVERY_ACTIONS}>
              <button type="button" onClick={() => retry()} className={RECOVERY_PRIMARY_ACTION}>
                {ERROR_COPY.tryAgain}
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full page load on purpose: the app's own frame just failed */}
              <a href="/" className={RECOVERY_SECONDARY_ACTION}>
                {ERROR_COPY.home}
              </a>
              {/* No eslint-disable here: the rule only flags a literal string href, and this one
                  is the CONTACT_ROUTE constant — still a full page load on purpose, same as the
                  other two anchors on this screen. */}
              <a href={CONTACT_ROUTE} className={RECOVERY_SECONDARY_ACTION}>
                {ERROR_COPY.contact}
              </a>
            </div>
            {reference !== null && (
              <p className={RECOVERY_REFERENCE}>
                {ERROR_COPY.referenceLead} <code data-error-reference className={RECOVERY_REFERENCE_CODE}>{reference}</code>
              </p>
            )}
          </div>
        </main>
      </body>
    </html>
  );
}
