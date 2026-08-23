import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";
import { DesignProvider as Provider } from "@/components/design/design-store";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * The face of the surf design language (see the `@theme` block in app/globals.css). Both
 * `font-display` and `font-body` resolve to it: headings are set apart by weight, wide
 * tracking and ALL CAPS rather than by a second family. Space Grotesk was the source
 * config's display face and was dropped when the founder chose the wordmark's Inter.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shaper — Surfboard Design",
  description: "Design custom surfboards with calculated rail bands, fin placement, and volume.",
};

/**
 * Root layout — mounts the single shared board-state provider and top nav instance that both `/`
 * and every `/design/*` screen share, so a preset applied on `/` (or an edit made in the outline
 * editor) is visible everywhere without a remount. The wrapper div below is layout-critical, not
 * decoration — it passes full-height flex sizing from this file's `body` down to the design
 * screens' own flex-1 panels; dropping it collapses them to content height.
 *
 * `body` is clamped to exactly the viewport height (`h-full` against `html`'s own `h-full`, which
 * resolves against the viewport) with `overflow-hidden`, rather than `min-h-full` (a minimum
 * only). A min-height lets body grow taller than the viewport whenever any descendant's content
 * demands it, which turns the *whole page* into the scroll container instead of just the panel
 * that should scroll (e.g. the outline editor's control sidebar, which already opts into its own
 * `overflow-y-auto`). Clamping here is what makes that descendant-level scrolling possible instead
 * of page-level scrolling swallowing it.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex h-full flex-col overflow-hidden bg-surf-base">
        <Provider>
          <div className="flex min-h-0 flex-1 flex-col">
            <SiteNav />
            {children}
          </div>
        </Provider>
      </body>
    </html>
  );
}
