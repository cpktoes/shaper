import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { SiteNav } from "@/components/site-nav";
import { DesignProvider as Provider } from "@/components/design/design-store";
import { ThemeProvider } from "@/components/theme-provider";
import { UnitsProvider } from "@/components/units-provider";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { resolveUnitsHandoff } from "@/lib/units-server";

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
 *
 * `async` because it calls `resolveUnitsHandoff()` before returning (D-12): the numbers a
 * shaper reads have to be right in the server's own HTML, not corrected after the fact like
 * the theme (CSS, patchable by the pre-hydration script below). Reading a cookie here opts
 * every route into dynamic rendering — a deliberate cost of "never a blink of inches", and
 * `app/page.tsx` already renders dynamically today for the same reason (its own `auth()` +
 * model-list read).
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const unitsHandoff = await resolveUnitsHandoff();
  return (
    // ClerkProvider is the outermost app-level provider — it owns nothing about the theme or
    // the board, only the signed-in/signed-out session every screen can read via `useUser()`.
    // It wraps <html> rather than nesting inside <body> so a Clerk-rendered redirect or error
    // boundary (neither of which this phase triggers — D-01 keeps every route open) would still
    // have the full document to work with.
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistMono.variable} ${inter.variable} h-full antialiased`}
        // The init script below adds `light`/`dark` to this element's class list before React
        // hydrates, so the server's markup and the client's first render disagree by design.
        suppressHydrationWarning
      >
        <head>
          {/*
           * Restores a saved theme override before the first paint.
           *
           * This is the one place the theming system needs JavaScript, and only for an
           * *explicit* override — with no stored preference the CSS alone is already correct,
           * because bare `:root` is the light theme and a `prefers-color-scheme` block covers
           * OS dark (see app/globals.css).
           *
           * It must be a raw inline <script>, not next/script: the browser runs this
           * synchronously while parsing <head>, before anything is painted, which is what makes
           * the restore flash-free. A deferred or bundled script runs after first paint, so a
           * shaper who chose Dark would see a white flash on every reload. Per
           * node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md.
           *
           * The script's source lives in lib/theme.ts beside the function it duplicates, and
           * lib/theme.test.ts runs it against a fake DOM to prove the two agree.
           */}
          <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        </head>
        <body className="flex h-full flex-col overflow-hidden bg-surf-ground">
          {/* Outside ThemeProvider, not nested inside it — the units value has to be available
              to everything the nav renders, including the settings menu's Units group beside
              its Theme group. No pre-hydration script counterpart: units renders text, and the
              server snapshot above is already correct for first paint, so there is nothing to
              patch before paint the way THEME_INIT_SCRIPT patches a stale dark-theme class.
              First paint is not the whole story, though: the client's own snapshot can disagree
              with the server's right after mount (a signed-in shaper's browser still holding an
              older cached value from another device) — UnitsProvider's `reconciledRef` is what
              keeps that disagreement from ever reaching the screen as a flash; see its own
              doc comment (WR-02). */}
          <UnitsProvider handoff={unitsHandoff}>
            <ThemeProvider>
              <Provider>
                <div className="flex min-h-0 flex-1 flex-col">
                  <SiteNav />
                  {children}
                </div>
              </Provider>
            </ThemeProvider>
          </UnitsProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
