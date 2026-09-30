"use client";

/**
 * The one place the app touches `@vercel/analytics` (quick 260930-03d, Task 2). It has to be a
 * client wrapper rather than something the root layout renders directly: `beforeSend` is a
 * function prop, and a Server Component cannot pass a function down to a Client Component —
 * Next's own analytics guide (node_modules/next/dist/docs/01-app/02-guides/analytics.md)
 * recommends exactly this "a separate component that the root layout imports" shape.
 *
 * `beforeSend={pageAddressOnlyVisit}` is what keeps the page's promise that only its own address
 * is recorded, never anything added to the end of a link (P-2).
 *
 * In development (and in this project's test runs) the package loads Vercel's own debug script
 * and sends nothing — see the package's README. In production, nothing is actually counted until
 * the founder switches Web Analytics on for this project in Vercel's dashboard; the package reads
 * that setting at build time.
 *
 * Renders nothing on screen — it injects one script tag into `<head>` and otherwise returns null.
 */

import { Analytics } from "@vercel/analytics/next";
import { pageAddressOnlyVisit } from "@/lib/analytics/page-address";

export function SiteAnalytics() {
  return <Analytics beforeSend={pageAddressOnlyVisit} />;
}
