import { SITE_NAME } from "@/lib/site/metadata";
import { cn } from "@/lib/utils";
import { WORDMARK_PATH } from "./wordmark-path";

/**
 * The founder's logo, "shaperassistant.com" ("shaper" bold, "assistant" light, ".com" small),
 * drawn as one shape in whatever text colour surrounds it (quick 261010-km7). That is the whole
 * colour story: the fill is `currentColor`, so on the top bar it is each theme's own ink
 * (`text-surf-ink` — near-black on Daylight and Chalk, near-white on Slate, green on Phosphor),
 * under a mouse it turns the accent ink the way the old name did, and on the printed order form
 * it is the sheet's print ink. Nothing in here names a colour.
 *
 * Why an inline shape and not a picture file or a CSS mask: measured at plan time, a plain CSS
 * mask VANISHES when Chromium prints with the browser's "Background graphics" option off (the
 * print dialog's default), and a picture file needs a second request and cannot take the theme's
 * ink. An inline shape prints with nothing extra, is how the app already draws every icon and
 * board, and behaves on the founder's older iPad. The outline itself is `WORDMARK_PATH`, a
 * verbatim copy of `brand/wordmark.svg`; `brand/README.md` says how it was made.
 *
 * Every caller sizes it by WIDTH, with a block, full-width, auto-height shape (`block h-auto
 * w-full`) inside a wrapper that carries the width: the height then follows from the logo's own
 * proportions (806.1 to 100). The `baseline` form cuts the box at the letters' baseline (79.6 of
 * 100) and lets the p's tail paint below it, so a caller can set the logo on a line of text and
 * have the letters stand on that line, as page 2 of the order form does.
 *
 * No hooks and no "use client", so client and server files alike can draw it.
 */
export function Wordmark({ className, baseline = false }: { className?: string; baseline?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={SITE_NAME}
      fill="currentColor"
      viewBox={baseline ? "0 0 806.1 79.6" : "0 0 806.1 100"}
      className={cn(baseline && "overflow-visible", className)}
    >
      <path fillRule="evenodd" d={WORDMARK_PATH} />
    </svg>
  );
}
