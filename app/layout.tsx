import type { Metadata, Viewport } from "next";
import { geistMono, inter } from "./fonts";
import { SITE_METADATA } from "@/lib/site/metadata";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { SiteNav } from "@/components/site-nav";
import { SiteAnalytics } from "@/components/site-analytics";
import { DesignProvider as Provider } from "@/components/design/design-store";
import { ThemeProvider } from "@/components/theme-provider";
import { UnitsProvider } from "@/components/units-provider";
import { PrintInstructionsProvider } from "@/components/print-instructions-provider";
import { FitDefaultsProvider } from "@/components/fit-defaults-provider";
import { BlankMakersProvider } from "@/components/blank-makers-provider";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { resolveUnitsHandoff } from "@/lib/units-server";
import { resolvePrintRailInstructionsHandoff } from "@/lib/print-instructions-server";
import { resolveFitDefaultsHandoff } from "@/lib/fit-defaults-server";
import { resolveBlankMakersHandoff } from "@/lib/blank-makers-server";
import { PRIVACY_ROUTE } from "@/lib/privacy/copy";

export const metadata: Metadata = SITE_METADATA;

/**
 * The "cover" fit is what lets the safe-area insets (`env(safe-area-inset-*)`) reach the page at
 * all — the top bar's ends, the drawing column's right edge, the menu's sheet and the Undo/Redo
 * pair's corner all read them; the resizing-widget setting keeps the layout height in step with the
 * visible viewport so nothing anchored to the bottom is ever left under the iOS keyboard. No scale-limiting field is added here, ever: removing a shaper's ability to
 * pinch-zoom is a WCAG 2.1 1.4.4 failure, and the 16px touch-input text size is the correct and
 * sufficient cure for iOS zoom-on-focus.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

/**
 * Root layout — mounts the single shared board-state provider and top nav instance that both `/`
 * and every `/design/*` screen share, so a preset applied on `/` (or an edit made in the outline
 * editor) is visible everywhere without a remount. The wrapper div below is layout-critical, not
 * decoration — it passes full-height flex sizing from this file's `body` down to the design
 * screens' own flex-1 panels; dropping it collapses them to content height.
 *
 * `body` is clamped to exactly the viewport's visible height, matching `html`'s own dynamic
 * viewport height class below, with `overflow-hidden`, rather than a minimum-only height. A
 * minimum lets body grow taller than the viewport whenever any descendant's content demands it,
 * which turns the *whole page* into the scroll container instead of just the panel that should
 * scroll (e.g. the outline editor's control sidebar, which already opts into its own
 * `overflow-y-auto`). Clamping here is what makes that descendant-level scrolling possible
 * instead of page-level scrolling swallowing it. Dynamic viewport units, not a static percentage:
 * on a desktop the two resolve to the same number, but on a phone the dynamic unit tracks
 * Safari's toolbar coming and going, so the page itself never clips or traps scroll as the
 * visible viewport changes height (PHON-02).
 *
 * `async` because it calls `resolveUnitsHandoff()` before returning (D-12): the numbers a
 * shaper reads have to be right in the server's own HTML, not corrected after the fact like
 * the theme (CSS, patchable by the pre-hydration script below). Reading a cookie here opts
 * every route into dynamic rendering — a deliberate cost of "never a blink of inches", and
 * `app/page.tsx` already renders dynamically today for the same reason (its own `auth()` +
 * model-list read).
 *
 * Four handoffs are resolved this way — units, the print-instructions tick, the shaper's fit and
 * tip defaults (D-09), and which blank makers they have switched off (quick task 260926-wmf) —
 * awaited together in one `Promise.all` rather than one after the other, so each extra one costs no
 * extra wait; the fit-defaults provider mounts above the design store so a brand-new board's tips
 * can come from it (D-09/D-19), and the blank makers provider sits just inside it so the nav's gear
 * menu, the phone menu and the ROCKER blank list can all read it.
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [unitsHandoff, printInstructionsHandoff, fitDefaultsHandoff, blankMakersHandoff] = await Promise.all([
    resolveUnitsHandoff(),
    resolvePrintRailInstructionsHandoff(),
    resolveFitDefaultsHandoff(),
    resolveBlankMakersHandoff(),
  ]);
  return (
    // ClerkProvider is the outermost app-level provider — it owns nothing about the theme or
    // the board, only the signed-in/signed-out session every screen can read via `useUser()`.
    // It wraps <html> rather than nesting inside <body> so a Clerk-rendered redirect or error
    // boundary (neither of which this phase triggers — D-01 keeps every route open) would still
    // have the full document to work with.
    //
    // `appearance={{ options: { privacyPageUrl } }}` (quick 260930-03d, Task 2, P-4) puts a
    // "Privacy" link in the footer of Clerk's sign-in and sign-up card, which opens /privacy in a
    // new tab. `options` is the key in the installed @clerk/nextjs 7.8.2 types — there is no
    // `layout` key in this version, which is the older SDK's name for the same setting. This isn't
    // asserted in the browser suite, because Clerk never actually renders its hosted UI under this
    // suite's fake keys (see e2e/phone-account.spec.ts's header); lib/privacy/wiring.test.ts guards
    // the source instead, and the founder checks the real footer link live.
    <ClerkProvider appearance={{ options: { privacyPageUrl: PRIVACY_ROUTE } }}>
      <html
        lang="en"
        className={`${geistMono.variable} ${inter.variable} h-dvh antialiased`}
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
        <body className="flex h-dvh flex-col overflow-hidden bg-surf-ground">
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
            <PrintInstructionsProvider handoff={printInstructionsHandoff}>
              {/* Above the design store (and the nav's gear menu, which opens its dialog) so
                  every screen — and a brand-new board's tips — can read the shaper's defaults. */}
              <FitDefaultsProvider handoff={fitDefaultsHandoff}>
                <BlankMakersProvider handoff={blankMakersHandoff}>
                  <ThemeProvider>
                    <Provider>
                      <div className="flex min-h-0 flex-1 flex-col">
                        <SiteNav />
                        {children}
                      </div>
                    </Provider>
                  </ThemeProvider>
                </BlankMakersProvider>
              </FitDefaultsProvider>
            </PrintInstructionsProvider>
          </UnitsProvider>
          {/* The visit counter (quick 260930-03d), which sends the page's address only — see
              components/site-analytics.tsx. Renders no DOM of its own, so the body's flex column
              above is untouched. */}
          <SiteAnalytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
