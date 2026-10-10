import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site/metadata";

/**
 * The web app manifest (quick 261010-km7, D-03, D-10). It exists for one reason: so Android's
 * "Add to Home screen" puts the founder's circle logo on the shaper's home screen, labelled
 * "Shaper Assistant". (An iPhone or iPad takes its icon from `app/apple-icon.png` and its label
 * from the page's own apple-mobile-web-app-title tag, see `lib/site/metadata.ts`.)
 *
 * `display: "browser"` is the manifest's own default and means "open in an ordinary browser tab":
 * the shortcut opens Chrome exactly as it does today, just carrying the circle. Chrome only offers
 * its Install prompt for standalone, fullscreen or minimal-ui, so with "browser" Android's menu
 * still says Add to Home screen and nothing asks to install. Standalone is the mode that silently
 * breaks Print on an iPhone (the toolbar tip's finding, `components/design/toolbar-tip.tsx`), so it
 * must never be used here.
 *
 * No `theme_color`, which would recolour the browser's own bar.
 *
 * One thing this file cannot change: iOS 26 opens any site added to the Home Screen as a web app
 * by default unless the shaper turns off "Open as Web App" in that sheet (WebKit, "News from
 * WWDC25"), with or without a manifest. This file asks for the browser and does not make that any
 * worse.
 *
 * The 192 and 512 pictures live in `public/`, never as `icon*.png` under `app/`: Next would turn
 * those into the browser tab's icon, and the tab keeps the board drawing (`app/icon.svg`,
 * `app/favicon.ico`).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "browser",
    icons: [
      { src: "/home-screen-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/home-screen-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
