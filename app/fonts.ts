import { Geist_Mono, Inter } from "next/font/google";

/**
 * Shared font definitions (quick 260930-fjm, Phase 13 item 12, Task 3, P-6), following Next's
 * "Using a font definitions file" guidance — moved out of `app/layout.tsx` unchanged so the root
 * layout and the frame-failure screen (`app/global-error.tsx`) can each mount the SAME font
 * instance rather than declaring their own and risking the two drift apart.
 */

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * The face of the surf design language (see the `@theme` block in app/globals.css). Both
 * `font-display` and `font-body` resolve to it: headings are set apart by weight, wide
 * tracking and ALL CAPS rather than by a second family. Space Grotesk was the source
 * config's display face and was dropped when the founder chose the wordmark's Inter.
 */
export const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});
