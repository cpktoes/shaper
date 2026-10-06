---
phase: quick-261006-fom
plan: 01
subsystem: site-wide pages, menus and sign-up
tags: [legal, terms, privacy, footer, consent, share, rocker, markdown]
status: complete
requires: []
provides:
  - /terms (new) and /privacy (rebuilt) drawn from content/legal/*.md at each visit
  - SiteFooter on every page and at the end of every design screen's controls
  - The sign-up consent line under Clerk's card, and Terms in Clerk's card footer
  - The blank-picker catalog note on ROCKER
  - A Share row in the gear menu and the phone's ☰ sheet
affects: [app/privacy, app/layout, design screens, ROCKER blank picker, both menus]
tech-stack:
  added: [react-markdown 10.1.0 (exact), remark-gfm 4.0.1 (exact)]
  patterns:
    - "Legal words live in markdown the founder edits; the page reads the file after await connection()"
    - "Footer is always the last child of a page's own scroller, never pinned; the phone end-room moves onto it"
key-files:
  created:
    - content/legal/terms.md
    - content/legal/privacy.md
    - lib/legal/documents.ts
    - lib/legal/read-document.ts
    - lib/legal/documents.test.ts
    - lib/legal/wiring.test.ts
    - components/legal/legal-document.tsx
    - components/legal/legal-document.test.ts
    - components/legal/legal-page.tsx
    - app/terms/page.tsx
    - lib/site/footer.ts
    - lib/site/footer.test.ts
    - components/site-footer.tsx
    - components/site-footer.test.ts
    - components/auth/sign-up-consent.tsx
    - components/auth/sign-up-consent.test.ts
    - lib/site/share.ts
    - lib/site/share.test.ts
    - components/share-menu-item.tsx
    - e2e/legal-pages.spec.ts
    - e2e/site-footer.spec.ts
    - e2e/share.spec.ts
  modified:
    - package.json
    - package-lock.json
    - next.config.ts
    - app/privacy/page.tsx
    - lib/privacy/copy.ts
    - lib/privacy/copy.test.ts
    - lib/auth/open-access.test.ts
    - e2e/privacy.spec.ts
    - app/contact/page.tsx
    - app/not-found.tsx
    - app/error.tsx
    - components/setup/setup-screen.tsx
    - components/design/design-screen-shell.tsx
    - components/summary/order-form.tsx
    - lib/blanks/vendors.ts
    - lib/blanks/vendors.test.ts
    - components/rocker/blank-picker.tsx
    - e2e/step-nav.spec.ts
    - e2e/rocker-blanks.spec.ts
    - e2e/error-pages.spec.ts
    - components/auth/sign-in-dialog.tsx
    - app/layout.tsx
    - components/settings-menu.tsx
    - components/design/phone-menu.tsx
decisions:
  - "The legal pages' scroller-and-column footer frame is one shared constant, PAGE_FOOTER_FRAME, exported beside SiteFooter (used by Contact, Terms, Privacy, not-found and error)"
  - "The Share row keeps the accessible name Share throughout; its visible text changes and a hidden live region announces the confirmation"
metrics:
  duration: "about 26 minutes (11:36 to 12:02 local, 2026-10-06)"
  completed: 2026-10-06
actuals:
  tokens: 22000   # chars/4 over the realized diff, the generated package-lock.json left out (~87k chars added)
  tasks: 3
  commits: 3
---

# Quick 261006-fom: legal pages from markdown, a site footer, the consent line, the catalog note and Share

The founder's own Terms of Service and Privacy Policy are now real pages at /terms and /privacy, drawn
straight from the two text files in `content/legal/` so the founder can change a word with no code change.
Every page ends with "© 2026 Shaper Assistant. All rights reserved." and links to Terms and Privacy. The
sign-up box says what an account agrees to. ROCKER's blank list ends with the founder's catalog note. And
both menus have a Share row that passes on the site's address.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | e4d816e | Terms and Privacy pages now show the founder's own text |
| 2 | 2dd98b5 | Every page now ends with a copyright line, and ROCKER's blank list a catalog note |
| 3 | d9eb132 | The sign-up box now says what an account agrees to, and both menus can share the site |

Nothing is pushed or merged (D-07).

## What a shaper sees

- **/terms and /privacy**: the founder's words, every heading, bullet, bold phrase and the privacy
  table of services, in the app's own type and colours. The table scrolls sideways inside its own box, so
  the page itself never scrolls sideways on a phone. Email addresses are mailto links. The line breaks the
  founder typed are kept: "(shaperassistant.com)" sits above "Effective date", and the address under
  "Contact" reads as three lines. The browser tab reads "Shaper Assistant — Terms of Service" or
  "— Privacy Policy", taken from each file's own first heading.
- **The footer**: small grey type under a faint rule at the end of the home page, Contact, Terms, Privacy,
  a wrong address, the error screen, and the end of the controls on all five design screens and SUMMARY.
  On a design screen it comes after Back and Next, in the sidebar on a computer and in the controls under
  the drawing on a phone. It's never pinned and never over the drawing. In the 320-dot sidebar it wraps to
  two short lines (P-6). It never prints.
- **ROCKER**: "Blank dimensions are from manufacturers' published catalogs and may vary in production.
  Verify before you cut. US Blanks, Arctic Foam and Marko Foam are trademarks of their owners." This shows
  once at the end of the picker, whether or not a blank is picked.
- **Sign-in / sign-up box**: "By creating an account you agree to our Terms of Service and Privacy
  Policy." sits under Clerk's card, both names linked and opening in a new tab. Clerk's own small footer
  links now show Terms beside Privacy.
- **Share**: the row comes after Privacy in both menus. On a phone it opens the phone's own share sheet
  with https://www.shaperassistant.com and the title "Shaper Assistant". Where there's no share sheet it
  copies the address and the row reads "Copied" for two seconds. If copying fails, the row shows the
  address for four seconds.

## Verification

- `content/legal/terms.md` and `privacy.md` were committed byte for byte. Their SHA-256 sums were the
  same on disk before the commit and in the commit: privacy `7ee14bae…961fe`, terms `cb6b01b9…48e8a`.
  The founder made no edits while I worked.
- `npx vitest run`: 122 files, 4409 passed, 2 skipped (the same skips as before).
- `npx tsc --noEmit`: clean. `npm run lint`: clean.
- Playwright, all three projects (`PW_PORT=3131`, Turbopack on the main checkout):
  - Task 1: legal-pages and privacy: 39 passed.
  - Task 2: site-footer, rocker-blanks and step-nav: 130 passed, 5 skipped. Then phone-chrome,
    phone-home, keyboard-focus, blank-makers, contact, error-pages and legal-pages: 163 passed, 113 skipped.
  - Task 3: share, app-settings, privacy and contact: 104 passed after one fix to the share test (below).
    Share again: 3 passed. Then phone-screen-tiles, phone-sideways-top-bar, site-nav-width, phone-account
    and touch-sizing: 102 passed, 99 skipped.
  - All skips are each spec's own skips for the other devices.
- `e2e/desktop-baseline.spec.ts --project=desktop`: TEMPLATE, ROCKER, RAILS and FINS unchanged. **VOLUME
  moved, as the plan expected**: 780 pixels, all inside x 40–358 and y 573–618, which is the sidebar's lower
  part under Back and Next where the footer now draws. No snapshot was updated.
- Port 3131 is free; Playwright stopped its own dev server.

Not run here, per the orchestrator's rulings: `npm run build` (check that the route table shows /terms and
/privacy as ƒ and that each `page.js.nft.json` lists its `content/legal/*.md`) and `npm run test:e2e:prod`
(including `e2e/prod/phone-controls-clear-undo.spec.ts`, which measures the footer's links against
Undo/Redo).

## Pictures (VOLUME desktop baseline, for the founder to decide)

In `.planning/quick/261006-fom-legal-pages-from-markdown-a-site-footer-/pictures/`:

- `volume-desktop-expected.png`: the saved baseline (before).
- `volume-desktop-actual.png`: now, with the footer under Back and Next.
- `volume-desktop-diff.png`: Playwright's diff.

Only on the founder's word: `npx playwright test e2e/desktop-baseline.spec.ts --project=desktop -g volume --update-snapshots`.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 - Blocking] `e2e/error-pages.spec.ts` measured the footer's small links as buttons**
- **Found during:** Task 2
- **Issue:** On the phone projects that spec's shared check requires every `a` and `button` in the
  not-found and error screens to be at least 44 dots tall. The footer's two links are deliberately small
  and get their 44-dot finger box from an invisible block over the line (the plan's idiom), so they'd
  have failed it.
- **Fix:** the check skips links inside `[data-site-footer]` and instead asserts that each footer link's
  invisible finger box is at least 44 dots tall. The not-found and error screens' own controls are still
  measured exactly as before. This file wasn't in the plan's list.
- **Commit:** 2dd98b5

**2. [Rule 1 - Bug, in my own new test] The Share row read "CopiedCopied"**
- **Found during:** Task 3
- **Issue:** the row's visible label and its hidden screen-reader message both hold "Copied", and
  Playwright's `toHaveText` reads both.
- **Fix:** the visible label carries `data-share-label`. The test reads that label, and separately
  checks that the screen-reader message says "Copied".
- **Commit:** d9eb132

### Small choices within the plan's room

- **The footer's frame on the column pages.** `PAGE_FOOTER_FRAME` (`mx-auto max-w-xl px-8 pb-8
  max-shell:px-4 max-shell:pb-6`) is exported from `components/site-footer.tsx` and shared by Contact,
  Terms, Privacy, not-found and error. Those pages pass `mt-0` to the footer, because the column's own
  bottom padding already separates the two. The home page uses the same frame at `max-w-5xl`, plus the
  short-screen 16-dot gutter its column already has.
- **The Share row's screen-reader name.** It keeps the accessible name "Share" (`aria-label`) the whole
  time, so it can always be found by name.
- **No-blank picker wrapper.** With no blank picked, the picker now wraps the list and the note in one
  `flex flex-col gap-2` column, the same spacing as the picked-blank state.
- **Footer test.** The SiteFooter server-render test lives in `components/site-footer.test.ts`, which the
  plan allowed.
- **Executor environment.** The plan was written for a worktree. This run was on the main checkout, per
  the orchestrator: no copying of the markdown, no `typegen`, and Turbopack Playwright on port 3131.
- **Commit trailer.** Commits carry `Co-Authored-By: Claude Opus 5.5` (the orchestrator's ruling) rather
  than the plan's Sonnet line.

## Content in the founder's markdown to point out, NOT changed (their text, their call)

- privacy.md's table still reads "[PAYMENT PROVIDER]".
- Both documents say designs on a free account are public and copyable. Today no board is public.
- privacy.md gives chris@shaperassistant.com as the contact (sections 1 and 11). Section 6 uses
  support@shaperassistant.com, the site's mailbox.
- privacy.md's table lists Zoho as "Sends account email". Clerk sends account emails, Zoho runs the
  support inbox, and Resend, which delivers Contact-form messages, isn't listed.
- terms.md section 3 says "Back up designs you care about by exporting them". There's no export yet (a
  separate quick task folder, 261006-g4u, has appeared for it).
- Raw HTML typed into either file is shown as plain text, never drawn. A `javascript:` link is dropped,
  leaving its words as an empty link.

## Founder review list (from the plan's `<founder_review>`)

Show each on a computer (1440×900) and an iPhone (390×664), with the real development Clerk keys:

1. /terms: the top of the page, and the end with the footer.
2. /privacy: the top, the "4. Who else sees it" table, and the end with the footer.
3. The footer on the home page, scrolled to the end.
4. The footer on a design screen: ROCKER on the computer (the end of the sidebar) and on the iPhone (the
   end of the controls, with Undo/Redo showing after an edit). VOLUME's desktop picture before and after
   (the three PNGs above).
5. The sign-in / sign-up dialog with the consent line under Clerk's card, and Clerk's own footer showing
   Terms beside Privacy. **Note:** the dialog only opens signed out, and only with real Clerk keys. The
   consent line shows on every step of the combined card, sign-in included, because the sentence is
   conditional.
6. The catalog note on ROCKER's blank picker, with no blank picked and with one picked.
7. Share: the gear menu's Share row on the computer, before and after "Copied". **Note:** a desktop Chrome
   or Safari that has a share sheet opens it instead of copying, so "Copied" appears only where there's no
   share sheet or the sheet fails. On the iPhone, the ☰ sheet's Share row; the real share sheet on the
   founder's own phone is their check.

## Known Stubs

None.

## Threat Flags

None beyond the plan's register. T-261006-01/02/03/04/05/SC are mitigated as planned and pinned by
`components/legal/legal-document.test.ts`, `lib/legal/wiring.test.ts`,
`components/auth/sign-up-consent.test.ts` and `lib/site/share.test.ts`. T-261006-05's built-trace check is
the orchestrator's, after `npm run build`.

## Self-Check: PASSED

- Every created file listed above exists on disk.
- Commits e4d816e, 2dd98b5 and d9eb132 are in `git log`.
- The pictures (`volume-desktop-{expected,actual,diff}.png`) exist in `pictures/`. They're uncommitted, for
  the orchestrator's docs commit.
