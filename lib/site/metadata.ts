import type { Metadata } from "next";

/**
 * The root layout's metadata block (quick 260930-fjm, Phase 13 item 12, Task 1). Every page
 * inherits this — `app/layout.tsx` sets `export const metadata: Metadata = SITE_METADATA`, so a
 * link to any screen of the app, texted or posted, shows the same card: the app's name, the
 * founder's approved description (F-3), and the Template-screen picture (P-10).
 *
 * The picture is the static `app/opengraph-image.png` file convention, not an `images` key here —
 * Next reads the file's own bytes for width/height and copies the same picture into the Twitter
 * card automatically (P-9), so neither `openGraph` nor `twitter` below names an image.
 *
 * Where the picture's address points differs by where the page is served (P-11, measured against
 * the installed Next 16.3.6 `getSocialImageMetadataBaseFallback`): on the live deploy and on a
 * local `next start`, `metadataBase` below makes it the absolute
 * `https://www.shaperassistant.com/opengraph-image.png?…`; on a Vercel preview it is that
 * preview's own address; on the dev server it deliberately points at the dev server itself
 * (e.g. `http://localhost:3111/opengraph-image.png?…`).
 *
 * No React, browser API or database import here — this is the Contact/Privacy pattern (P-12):
 * the words are the product, so they are verifiable in isolation and pinned by
 * `metadata.test.ts`.
 */

export const SITE_URL = "https://www.shaperassistant.com";

export const SITE_NAME = "Shaper Assistant";

export const SITE_TITLE = "Shaper Assistant — Surfboard Shaping and Design";

/** The founder's approved line (F-3, 2026-09-30), 137 characters — replaces the app's original
 * "Design custom surfboards with calculated rail bands, fin placement, and volume." */
export const SITE_DESCRIPTION =
  "Design your surfboard — outline, rocker, foil and fins — with rail bands, fin placement and volume calculated from real shaping formulas.";

export const SITE_METADATA: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  // The label under the Home Screen icon on an iPhone or iPad (quick 261010-km7, D-15): Safari's
  // Add to Home Screen suggests this rather than the page's long tab title. Written through
  // `other`, NEVER through Next's `appleWebApp` option: that option treats the site as "capable"
  // unless told otherwise and then writes mobile-web-app-capable "yes", which would open the icon
  // as a standalone app, the mode that breaks Print on an iPhone (components/design/toolbar-tip.tsx).
  // Android's label comes from the manifest's own name (app/manifest.ts).
  other: {
    "apple-mobile-web-app-title": SITE_NAME,
  },
};
