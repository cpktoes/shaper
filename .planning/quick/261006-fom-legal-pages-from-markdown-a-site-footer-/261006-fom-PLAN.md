---
phase: quick-261006-fom
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  # Task 1 — the legal pages from the founder's markdown
  - package.json
  - package-lock.json
  - content/legal/terms.md
  - content/legal/privacy.md
  - next.config.ts
  - lib/legal/documents.ts
  - lib/legal/documents.test.ts
  - lib/legal/read-document.ts
  - lib/legal/wiring.test.ts
  - components/legal/legal-document.tsx
  - components/legal/legal-document.test.ts
  - components/legal/legal-page.tsx
  - app/terms/page.tsx
  - app/privacy/page.tsx
  - lib/privacy/copy.ts
  - lib/privacy/copy.test.ts
  - lib/auth/open-access.test.ts
  - e2e/legal-pages.spec.ts
  - e2e/privacy.spec.ts
  # Task 2 — the footer everywhere + the blank-picker note
  - lib/site/footer.ts
  - lib/site/footer.test.ts
  - components/site-footer.tsx
  - app/contact/page.tsx
  - app/not-found.tsx
  - app/error.tsx
  - components/setup/setup-screen.tsx
  - components/design/design-screen-shell.tsx
  - components/summary/order-form.tsx
  - lib/blanks/vendors.ts
  - lib/blanks/vendors.test.ts
  - components/rocker/blank-picker.tsx
  - e2e/site-footer.spec.ts
  - e2e/step-nav.spec.ts
  - e2e/rocker-blanks.spec.ts
  # Task 3 — the sign-up consent line + Share
  - components/auth/sign-up-consent.tsx
  - components/auth/sign-up-consent.test.ts
  - components/auth/sign-in-dialog.tsx
  - app/layout.tsx
  - lib/site/share.ts
  - lib/site/share.test.ts
  - components/share-menu-item.tsx
  - components/settings-menu.tsx
  - components/design/phone-menu.tsx
  - e2e/share.spec.ts
  - .planning/quick/261006-fom-legal-pages-from-markdown-a-site-footer-/261006-fom-SUMMARY.md
autonomous: true
requirements: [QT-261006-fom]
estimate:
  # One executor in its own worktree, three tasks: two pinned packages, about twelve new files and
  # ten edited ones, four new unit-test files, three new browser specs plus three edited ones, each
  # run on all three device projects, then the unit suite, tsc and lint. No calibration samples yet,
  # so the factor is 1 and confidence is low (estimate-calibration: sample_count 0).
  tokens: 190000
  raw_tokens: 190000
  tasks: 3
  confidence: low
must_haves:
  truths:
    - "/terms and /privacy show the founder's own words from content/legal/terms.md and content/legal/privacy.md — every heading, paragraph, bullet, bold phrase and the privacy table — in the app's own type and colours, open to a signed-out visitor, with no sideways scroll on a phone; changing a word in either file changes the page with no code change (D-01)."
    - "The two markdown files are committed byte-for-byte as the founder wrote them; nothing in this plan edits them (D-01)."
    - "Every page — home, Contact, Terms, Privacy, the not-found and error screens, the five design screens and SUMMARY — ends with '© <this year> Shaper Assistant. All rights reserved.' and links to Terms and Privacy; the year is read from the date at each visit, with no hydration warning, and the footer never prints (D-02)."
    - "On the design screens the footer is the last thing in the scrolling controls — the sidebar on a computer, the controls under the drawing on a phone — never pinned and never in the drawing column; on a phone it stays clear of the floating Undo/Redo pair and the phone's bands around the drawing do not move (D-03)."
    - "ROCKER's blank picker ends with the founder's exact sentence 'Blank dimensions are from manufacturers' published catalogs and may vary in production. Verify before you cut. US Blanks, Arctic Foam and Marko Foam are trademarks of their owners.' in small muted type, once, whether or not a blank is picked (D-05)."
    - "The sign-in / sign-up dialog shows 'By creating an account you agree to our Terms of Service and Privacy Policy.' directly under Clerk's card, both phrases linked (opening in a new tab so a half-finished sign-up is never lost), and Clerk's own card footer links Terms beside Privacy (D-04, P-3)."
    - "Share sits in both menus (the gear menu on a computer, the ☰ sheet on a phone): where the device has a share sheet it opens it with the site's address https://www.shaperassistant.com and the title Shaper Assistant; otherwise it copies that address and the row reads 'Copied' for about two seconds (D-06, P-4)."
  artifacts:
    - path: "components/legal/legal-document.tsx"
      provides: "LegalDocument — the founder's markdown drawn as React elements in the app's own classes (react-markdown + remark-gfm, no raw HTML)"
      contains: "remarkGfm"
    - path: "lib/legal/documents.ts"
      provides: "TERMS_ROUTE, LEGAL_DOCUMENTS (route + file for each), legalOutline(markdown), SIGN_UP_CONSENT words"
      exports: ["TERMS_ROUTE", "LEGAL_DOCUMENTS", "legalOutline", "SIGN_UP_CONSENT"]
    - path: "lib/legal/read-document.ts"
      provides: "readLegalDocument(slug) — reads the markdown from disk at request time, from a fixed two-entry map only"
    - path: "app/terms/page.tsx"
      provides: "the new /terms page"
    - path: "components/site-footer.tsx"
      provides: "SiteFooter — the copyright line with Terms and Privacy links, data-site-footer, never printed"
      contains: "data-site-footer"
    - path: "lib/site/footer.ts"
      provides: "copyrightNotice(now = new Date())"
    - path: "lib/blanks/vendors.ts"
      provides: "BLANK_CATALOG_NOTE — the founder's sentence, the one source"
      contains: "BLANK_CATALOG_NOTE"
    - path: "components/auth/sign-up-consent.tsx"
      provides: "SignUpConsent — the consent sentence with both links"
    - path: "lib/site/share.ts"
      provides: "shareSite(env) — share sheet, else clipboard; returns shared | dismissed | copied | failed"
      exports: ["shareSite", "SHARE_COPY"]
    - path: "components/share-menu-item.tsx"
      provides: "ShareMenuItem — the one Share row both menus mount"
  key_links:
    - from: "components/legal/legal-page.tsx"
      to: "content/legal/*.md"
      via: "readLegalDocument(slug) after await connection()"
      pattern: "readLegalDocument"
    - from: "next.config.ts"
      to: "content/legal/*.md"
      via: "outputFileTracingIncludes for /terms and /privacy, so Vercel ships the files"
      pattern: "outputFileTracingIncludes"
    - from: "components/design/design-screen-shell.tsx"
      to: "components/site-footer.tsx"
      via: "SiteFooter after StepNav inside the controls scroller (and inside VOLUME's aside)"
      pattern: "<SiteFooter"
    - from: "app/layout.tsx"
      to: "lib/legal/documents.ts"
      via: "appearance.options.termsPageUrl: TERMS_ROUTE beside privacyPageUrl"
      pattern: "termsPageUrl: TERMS_ROUTE"
    - from: "components/settings-menu.tsx and components/design/phone-menu.tsx"
      to: "components/share-menu-item.tsx"
      via: "<ShareMenuItem /> in both menus"
      pattern: "<ShareMenuItem"
---

<objective>
Batch A of the founder's request of 2026-10-06: legal pages read from the founder's own markdown, a footer on every
page, the sign-up consent line, the blank-picker catalog note, and a Share row that sends the site's address.

Purpose: the app goes in front of many shapers on Sat 2026-10-10 and goes public after that. It needs Terms and a
Privacy Policy the founder can edit as plain text, a footer that links to them, a clear consent line where accounts
are made, an honest note that blank dimensions come from the makers' catalogs, and an easy way to pass the site on.

Output: /terms (new) and /privacy (rebuilt) drawn from `content/legal/*.md`; `SiteFooter` on every page; the consent
line under Clerk's card; the catalog note on ROCKER; Share in both menus. One worktree, three commits, a SUMMARY, and
nothing pushed: the founder sees every page before anything reaches main (D-07).
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<decisions>
The founder's request (2026-10-06), numbered as decisions. Locked: implement exactly.

- **D-01 — Legal pages from the markdown.** `content/legal/terms.md` renders at /terms and `content/legal/privacy.md`
  at /privacy, as readable pages in the app's styling. The markdown is the single source of truth; the founder edits
  the text without touching code. The text is not rewritten, and the files are never edited by this plan.
- **D-02 — A site footer on every page.** "© 2026 Shaper Assistant. All rights reserved." with links to Terms and
  Privacy. The year comes from the current date so it never goes stale.
- **D-03 — Where the footer sits (the founder's decision, the orchestrator's default as stated to them).** It follows
  the page on the home, Contact, legal and not-found pages (inside each page's scroller, at the end). On the design
  screens it sits at the very end of the scrolling controls (the sidebar on a computer, the controls panel on a
  phone), never pinned and never in the drawing column. On a phone its links stay clear of the floating Undo/Redo
  pair, like every other last control, and it costs as few dots as possible: small muted type.
- **D-04 — The sign-up consent line.** Under the button: "By creating an account you agree to our Terms of Service
  and Privacy Policy," both linked, using Clerk's appearance options rather than hacking the form.
- **D-05 — The blank-picker note.** "Blank dimensions are from manufacturers' published catalogs and may vary in
  production. Verify before you cut. US Blanks, Arctic Foam and Marko Foam are trademarks of their owners."
- **D-06 — Share.** Shares the SITE's address, https://www.shaperassistant.com (its link-preview card already
  exists), through the device's share sheet where one exists (Messages, Mail, AirDrop), otherwise by copying the
  address with a brief "Copied". Boards have no public page yet, so this is never a board link.
- **D-07 — "Show me each page before committing."** Executors commit only inside their worktree; nothing is merged
  to main, pushed or deployed until the orchestrator has shown the founder the pages listed at the end of this plan.

The planner's choices where the request left room (each one the founder can overrule at the review):

- **P-1 — Markdown approach: `react-markdown` 10.1.0 + `remark-gfm` 4.0.1, pinned exactly.** One well-known
  renderer that turns the markdown into React elements (no HTML string is ever injected; raw HTML in the file is not
  rendered), with a `components` map that applies the app's own classes. `remark-gfm` is needed for the privacy
  table (and turns the plain email addresses into mailto links). Chosen over a home-made renderer because the
  founder's promise is "edit the text without touching code": a real parser keeps that promise for any markdown the
  founder later types (a link, a sub-heading, a numbered list), where a renderer built for today's features alone
  would show the new markup as raw symbols. The page is a Server Component, so the renderer sends nothing to the
  browser. Legitimacy checked on the npm registry at plan time — see the audit table under `<context>`.
- **P-2 — Line breaks kept as typed.** Markdown joins consecutive lines into one paragraph, which would run the
  founder's "**Shaper Assistant** (shaperassistant.com)" and "Effective date: …" lines together, and the three-line
  address under Privacy's "11. Contact". Paragraphs carry `whitespace-pre-line`, so a single line break in the file
  shows as a line break on the page. No third package.
- **P-3 — How the consent line is drawn.** Clerk 7.8.2's appearance options (`appearance.options.termsPageUrl` /
  `privacyPageUrl`) only put small "Terms" and "Privacy" links in the card's own footer; no appearance option draws a
  sentence. The one consent wording Clerk has (`signUp.legalConsent.checkbox.label__termsOfServiceAndPrivacyPolicy`)
  labels a must-tick checkbox that only appears when "require express consent" is switched on in the Clerk
  Dashboard, with its links set there. So: `termsPageUrl` is added beside `privacyPageUrl` (Clerk's card footer then
  links both), and the founder's exact sentence is drawn by the app's own sign-in dialog directly under Clerk's card,
  with both phrases linked: the app's own frame around the card, like the dialog's title, never inside Clerk's form.
  Its links open in a new tab, as Clerk's own footer links do, so a half-finished sign-up is never lost. If the
  founder would rather have Clerk's tick-box, that is one Dashboard switch later; it is not built here.
- **P-4 — Share lives as a row in both menus, not as a fourth icon in the computer's top row.** Measured fact in
  `components/site-nav.tsx`: at 1024 wide (an iPad held sideways) the row has 38 dots to spare beyond its 40-dot gap,
  and a fourth icon needs 40 (a 24-dot icon plus its 20-dot gap, less the gear's −4 margin), so SHAPER ASSISTANT
  would wrap. That fails `e2e/site-nav-width.spec.ts`'s iPad cases (the founder's 2026-10-04 decision) and would move
  all five desktop baseline pictures. The gear menu on a computer and the ☰ sheet on a phone already share their
  Contact and Privacy rows, so Share joins them as one shared row component. If the founder wants an icon in the
  computer's top row too, it fits from 1280 wide up only.
- **P-5 — The catalog note shows once, at the end of the picker, in every state** (no blank picked, list open, a
  blank picked): the picked blank's numbers come from the same catalogs. The sentence is fixed, the same whatever
  makers a shaper has switched off: it is a notice about trademarks, not a list of what is shown.
- **P-6 — The footer may wrap to two short lines on a narrow column.** At a 358-dot phone column (and in the
  computer's 320-dot sidebar) the founder's notice plus two links does not fit one line at a readable size, so the
  links wrap under the notice. One line wherever it fits.
- **P-7 — Share text.** `navigator.share` gets title `SITE_NAME` ("Shaper Assistant"), text `SITE_TITLE`
  ("Shaper Assistant — Surfboard Shaping and Design", already approved words), url `SITE_URL`. The clipboard gets the
  address alone, so pasting it shows the link-preview card.
</decisions>

<context>
@.planning/STATE.md
@CLAUDE.md
@AGENTS.md
@.claude/skills/sketch-findings-shaper/SKILL.md
@.claude/skills/sketch-findings-shaper/references/phone-chrome.md

Source files the tasks change or copy patterns from (read each once; use Grep for anything more):
@app/privacy/page.tsx
@lib/privacy/copy.ts
@lib/privacy/wiring.test.ts
@e2e/privacy.spec.ts
@app/layout.tsx
@components/design/design-screen-shell.tsx
@components/settings-menu.tsx
@components/design/phone-menu.tsx
@components/auth/sign-in-dialog.tsx
@components/rocker/blank-picker.tsx
@lib/blanks/vendors.ts
@lib/site/metadata.ts
@components/error-pages/recovery-styles.ts
@components/design/slider-row.test.ts

<interfaces>
Facts read from the code at plan time (2026-10-06):

- `lib/privacy/copy.ts`: `PRIVACY_ROUTE = "/privacy"`; `PRIVACY_COPY` holds the old page's words plus `menuLabel:
  "Privacy"` (used by `components/settings-menu.tsx`'s `PrivacyMenuItem`, and by `e2e/privacy.spec.ts`'s menu row
  finder) and `contactLineLinkLabel: "Privacy"` (used by `components/contact/contact-form.tsx`). `privacyPageText()`
  is used only by `lib/privacy/copy.test.ts`. `app/layout.tsx` imports `PRIVACY_ROUTE` from here.
- `lib/privacy/wiring.test.ts` pins `@vercel/analytics` 2.0.1 with its lockfile integrity and
  `privacyPageUrl: PRIVACY_ROUTE` in `app/layout.tsx`. It stays; its `stripComments` helper is the idiom to copy.
- `lib/auth/open-access.test.ts` has "the Privacy page is a public route" (reads `app/privacy/page.tsx`, forbids
  redirect / notFound / protect / RedirectToSignIn).
- `lib/site/metadata.ts`: `SITE_URL = "https://www.shaperassistant.com"`, `SITE_NAME = "Shaper Assistant"`,
  `SITE_TITLE = "Shaper Assistant — Surfboard Shaping and Design"`, `SITE_DESCRIPTION`. Its only import is
  `import type { Metadata } from "next"` (erased at build), so a client component may import these constants.
- `components/error-pages/recovery-styles.ts`: `RECOVERY_MAIN = "min-h-0 flex-1 overflow-y-auto bg-surf-ground"`,
  `RECOVERY_COLUMN = "mx-auto max-w-xl px-8 pt-16 pb-16 max-shell:px-4 max-shell:pt-6 max-shell:pb-8"`. `app/error.tsx`
  and `app/not-found.tsx` are each one `<main className={RECOVERY_MAIN}>` around a `RECOVERY_COLUMN` div.
- The old privacy page's classes (the app's text classes to reuse): h1 `text-3xl max-shell:text-xl leading-[1.2]
  font-display text-surf-ink uppercase tracking-architectural font-extrabold`; h2 `mt-10 max-shell:mt-8 text-xs
  font-bold tracking-architectural uppercase text-surf-ink`; paragraph `mt-3 text-sm leading-relaxed text-surf-ink`;
  list `mt-3 flex flex-col gap-1.5 text-sm leading-relaxed text-surf-ink`; muted small line `text-xs
  text-surf-ink-muted`; link `font-bold text-surf-accent-ink underline-offset-4 hover:underline focus-ring-accent`.
  Border tokens in use: `border-surf-line`, `border-surf-line-faint`.
- `components/design/design-screen-shell.tsx`: the non-simple aside's scroller is the div with
  `data-design-controls-scroll` (`controlsScrollClassName`), which already ends with `<StepNav />` and, on a phone,
  an empty `::after` block 52 dots plus the home-bar inset tall: the room that keeps the last row clear of the
  Undo/Redo pair. VOLUME's `simpleSidebar` aside instead puts that room on its StepNav as
  `max-shell:pb-[calc(1.75rem+env(safe-area-inset-bottom))]`. `components/summary/order-form.tsx` line ~993 does the
  same with `<StepNav className="w-full max-w-80 max-shell:pb-[calc(2.25rem+env(safe-area-inset-bottom))]" />`
  inside the `data-order-form-page` scroller (`py-8`). No test pins either padding class. When the footer goes after
  StepNav in those two places, the padding moves from StepNav to the footer, unchanged, so the last thing on the
  screen still ends 68 dots plus the inset above the window's bottom.
- `e2e/prod/phone-controls-clear-undo.spec.ts` (production build only, the orchestrator runs it) already measures
  every `a[href]` against the Undo/Redo pair, so it covers the footer's links with no change.
- `e2e/step-nav.spec.ts` "on each of the five design screens the pair sits below the last of the screen's own
  controls" walks every box in the `aside` and requires none to reach below Back + Next. The footer is meant to sit
  there, so that test must skip anything inside `[data-site-footer]`.
- Print: `app/design/summary/order-form.css`'s `@media print` hides `[data-print-hide]`; Tailwind's `print:hidden`
  covers every other page.
- Clerk (installed `@clerk/nextjs` 7.8.2, `@clerk/react` 6.14.7): `appearance.options` carries `termsPageUrl?`,
  `privacyPageUrl?`, `helpPageUrl?` (`node_modules/@clerk/react/dist/types-Dd22QRBT.d.mts` ~line 10692), each drawn
  as a footer link in the card that opens in a new tab. Legal-consent wording exists only as
  `signUp.legalConsent.checkbox.*` in `node_modules/@clerk/shared/dist/types/localization.d.ts` ~line 394, shown only
  when the Dashboard's `legal_consent_enabled` is on. Under this suite's fake keys Clerk never loads
  (`useUser().isLoaded` never settles; see `e2e/phone-account.spec.ts`'s header), so neither the card nor the
  dialog's Sign in entry points render in Playwright. That is why the consent line is proven by a server render of
  the component plus a source contract on the dialog.
- Base UI (`@base-ui/react` 1.7): `Menu.Item` accepts `closeOnClick?: boolean`
  (`node_modules/@base-ui/react/menu/item/MenuItem.d.ts`). Menu rows use the shared row classes in
  `settings-menu.tsx` (`coarse:min-h-11` for a 44-dot finger box).
- lucide-react has `ShareIcon` (`share.mjs`, the box-with-arrow a phone shows).
- Next 16.3.6: `connection()` from `next/server` (docs: `node_modules/next/dist/docs/01-app/03-api-reference/
  04-functions/connection.md`) marks a render as request-time; `generateMetadata` is documented beside it;
  `outputFileTracingIncludes` (docs: `.../05-config/01-next-config-js/output.md` line ~80) takes route globs to
  project-root globs and makes Vercel ship files a page reads with `fs`.
- Vitest runs `lib/**/*.test.ts` and `components/**/*.test.ts` in node; render tests use
  `renderToStaticMarkup(createElement(Component, props))` from `react-dom/server` (see `slider-row.test.ts`), with no
  JSX in the test file.
- `e2e/desktop-baseline.spec.ts` takes 1280×800 pictures of TEMPLATE, ROCKER, RAILS, VOLUME and FINS. VOLUME's
  sidebar ends with Back + Next at about y=533 with empty sidebar beneath it, so the footer WILL appear in
  `volume-desktop.png`. FINS's controls run past the bottom of the window, so its footer is out of the picture; the
  other three are expected to be the same.

Package legitimacy audit (npm registry, read 2026-10-06 with `npm view` and api.npmjs.org):

| Package | Version | Published | Repository | Maintainers | Weekly downloads | dist.integrity | Verdict |
|---|---|---|---|---|---|---|---|
| react-markdown | 10.1.0 (latest) | 2025-03-07 | github.com/remarkjs/react-markdown | wooorm, remcohaszing, johno | 44,072,828 | sha512-qKxVopLT/TyA6BX3Ue5NwabOsAzm0Q7kAPwq6L+wWDwisYs7R8vZ0nRXqq6rkueboxpkjvLGU9fWifiX/ZZFxQ== | [VERIFIED: npm registry] |
| remark-gfm | 4.0.1 (latest) | 2025-02-10 | github.com/remarkjs/remark-gfm | wooorm, remcohaszing, johno | 52,058,295 | sha512-1quofZ2RQ9EWdeN34S79+KExV1764+wCUGop5CPL1WGdD0ocPpu91lzPGbwWMECpEpd42kJGQwzRfyov9j4yNg== | [VERIFIED: npm registry] |

Both are on the registry for 18+ months at these versions, under the unified/remark collective's long-standing
maintainers, so no human checkpoint is needed. `react-markdown`'s peer is `react >=18` (installed 19.2.8). A third
option, `markdown-to-jsx` 9.10.3, was published 2026-09-15 (three weeks ago, a "too new" flag) and was not chosen.
</interfaces>
</context>

<execution_notes>
- **Environment.** You run in your own git worktree forked from main. If it has no `node_modules`, clone the main
  checkout's: `cp -Rc /Users/kontoes/Code/shaper/node_modules ./node_modules` (APFS clone, instant). Before any
  `npx tsc --noEmit`, run `npx next typegen` once. Never `npm run build` and never `npm run test:e2e:prod` in a
  worktree. The orchestrator builds and runs the production specs on main after the merge.
- **Browser tests.** Always `IS_WEBPACK_TEST=1 PW_PORT=3131 npx playwright test …` (the suite starts its own dev
  server on 3131). Port 3100 belongs to another project's server on this Mac: never use it, never kill it. Never
  `cd` into the main checkout, never start `next dev` there, never touch its `.next/`. Long runs go in the
  background (`run_in_background`) or split across commands, to stay under the 10-minute limit. If one test on an
  untouched screen fails under a cold webpack server, re-run that file alone before blaming the change.
- **Next 16 is not the Next you know** (AGENTS.md). Before writing the pages, read
  `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/connection.md`, `generate-metadata.md` beside it,
  and the `outputFileTracingIncludes` section of
  `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md`. Follow what they say
  over memory.
- **The founder's files.** `content/legal/terms.md` and `content/legal/privacy.md` are untracked in the main checkout,
  so the worktree does not have them. Task 1 copies them in from `/Users/kontoes/Code/shaper/content/legal/` and
  proves them byte-identical with `cmp`. Never edit, reformat, re-wrap or "fix" either file. Not a trailing newline,
  not the `[PAYMENT PROVIDER]` placeholder, not an email address. If something in them looks wrong, say so in the
  SUMMARY and leave it.
- **Installing.** `npm install --save-exact react-markdown@10.1.0 remark-gfm@4.0.1` in the worktree (it writes
  package.json + package-lock.json and installs into the worktree's own cloned node_modules). No other package.
- **Commits.** One commit per task, tests and code together (write the tests first and watch them fail before
  writing the code, but commit once). Subjects are for a shaper: what changed on the screen, in plain English, no
  component or function names. Every message ends with the trailer line
  `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- **Comments** match the surrounding files: long explanatory comments citing the decision (D-NN / P-N), the quick id
  `261006-fom` and the date 2026-10-06; refer to the founder as they/them.
- **Never** `--update-snapshots`. Never touch `.planning/` except the SUMMARY. Never read, copy or name environment
  files.
- **Last:** write `.planning/quick/261006-fom-legal-pages-from-markdown-a-site-footer-/261006-fom-SUMMARY.md`
  (frontmatter `status: complete`) at that path inside your worktree, with any baseline diff pictures beside it in
  `pictures/`, and commit them as the final commit. The worktree is force-removed after the merge, so anything
  uncommitted is lost.
</execution_notes>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: /terms and /privacy drawn from the founder's markdown, and the old hand-typed privacy page retired</name>
  <files>package.json, package-lock.json, content/legal/terms.md, content/legal/privacy.md, next.config.ts, lib/legal/documents.ts, lib/legal/documents.test.ts, lib/legal/read-document.ts, lib/legal/wiring.test.ts, components/legal/legal-document.tsx, components/legal/legal-document.test.ts, components/legal/legal-page.tsx, app/terms/page.tsx, app/privacy/page.tsx, lib/privacy/copy.ts, lib/privacy/copy.test.ts, lib/auth/open-access.test.ts, e2e/legal-pages.spec.ts, e2e/privacy.spec.ts</files>
  <read_first>app/privacy/page.tsx, lib/privacy/copy.ts, lib/privacy/copy.test.ts, lib/privacy/wiring.test.ts, e2e/privacy.spec.ts, lib/auth/open-access.test.ts (the Privacy case near line 90), components/design/slider-row.test.ts (render-test idiom), next.config.ts, the three Next docs named in execution_notes</read_first>
  <behavior>
    - legalOutline(terms.md) gives title "Terms of Service" and 15 section headings, the first "1. What the Service is", the last "15. Contact"; legalOutline(privacy.md) gives "Privacy Policy" and 11, the first "1. Who we are", the last "11. Contact".
    - LegalDocument rendered from privacy.md: exactly one h1 (the app's heading classes), 11 h2s in order, one table inside a sideways-scrolling wrapper with a header row (Service / What it does / What it sees) and 5 body rows, every bold phrase as strong, and the paragraph after the h1 keeps its line break before "Effective date".
    - LegalDocument rendered from terms.md: one h1, 15 h2s, 13 list items across its bullet lists.
    - The plain email addresses in privacy.md come out as mailto links.
    - Synthetic markdown holding a script tag, a raw HTML element and a link to a javascript: address renders no script element, no raw HTML element and no javascript: href.
    - No element in either render carries a style attribute, and the component source holds no hex colour.
    - LEGAL_DOCUMENTS maps terms to /terms + content/legal/terms.md and privacy to /privacy + content/legal/privacy.md; TERMS_ROUTE is /terms; the privacy route is the existing PRIVACY_ROUTE.
    - package.json pins react-markdown 10.1.0 and remark-gfm 4.0.1 with no caret, and the lockfile entries carry the integrities in the audit table.
    - next.config.ts lists the two markdown files under outputFileTracingIncludes for /terms and /privacy.
  </behavior>
  <action>
Implements D-01 with P-1 and P-2.

1. Copy the founder's two files into the worktree: `mkdir -p content/legal`, copy both from
`/Users/kontoes/Code/shaper/content/legal/`, then `cmp` each against its original. They must be identical. They are
added to git as they are, in this task's commit.

2. Install the two packages exactly as in execution_notes (P-1).

3. `lib/legal/documents.ts`, pure, no React, no Next, no fs (the footer, the consent line and the browser specs
import it). `TERMS_ROUTE = "/terms"`. `LEGAL_DOCUMENTS`, keyed `terms` and `privacy`, each with `route` (privacy
reuses `PRIVACY_ROUTE` from `lib/privacy/copy.ts`, so one constant stays the one source) and `file` (the project-root
relative path). Export a `LegalSlug` type. `legalOutline(markdown)` returns `{ title, sections }` read from the
first `# ` line and every `## ` line, trimmed. It is what the page title and the browser specs use, so neither ever
types a heading. Tests in `lib/legal/documents.test.ts` read the real files from disk and check the counts and the
first/last headings in `<behavior>`.

4. `lib/legal/read-document.ts`, server-only by use (it imports `node:fs/promises` and `node:path`; do not add the
`server-only` package, it is not a direct dependency). `readLegalDocument(slug)` reads
`path.join(process.cwd(), LEGAL_DOCUMENTS[slug].file)` as UTF-8. The path only ever comes from that fixed two-entry
map, never from a URL or a parameter a visitor controls (T-261006-02).

5. `components/legal/legal-document.tsx`, no "use client". `LegalDocument({ markdown })` renders react-markdown's
default `Markdown` export (synchronous, hook-free, so it runs in a Server Component) with `remarkPlugins` set to
`[remarkGfm]` and a `components` map that gives every element the app's own classes from `<interfaces>`, theme tokens
(`surf-*`) only, never a hex colour, never an inline style:
- h1: the heading classes.
- h2: the section classes. h3: the same small uppercase style with a smaller top margin, for any sub-heading the
  founder adds later.
- p: the paragraph classes plus `whitespace-pre-line` (P-2).
- strong: `font-bold`. em: italic.
- ul / ol: the list classes plus `list-disc` / `list-decimal`, `pl-5` and muted markers.
- a: the link classes; an `http`/`https` address opens in a new tab with `rel="noopener noreferrer"`. Leave
  react-markdown's default URL check in place, which drops `javascript:` and other unsafe addresses.
- table: wrapped in a `mt-4 overflow-x-auto` div so the page itself never scrolls sideways on a phone, `w-full
  border-collapse text-sm`. th: `scope="col"`, small bold uppercase tracked, `border-b border-surf-line`. td: top
  aligned, `border-b border-surf-line-faint`, right padding.
- hr and blockquote: plain styles in the same tokens.

Do not add `rehype-raw` or any other plugin: raw HTML in the file is not rendered (T-261006-01). The render tests go
in `components/legal/legal-document.test.ts` (the `.ts` + `createElement` + `renderToStaticMarkup` idiom), covering
every behavior bullet about rendering, safety and classes. Count elements by parsing the static markup with simple
regexes. Read the two real files with `fs` in the test.

6. `components/legal/legal-page.tsx`, an async Server Component `LegalPage({ slug })`: first `await connection()`
(so the file is read at each request, and an edit shows on the next visit with no code change), then
`readLegalDocument(slug)`, then a `<main data-legal-page={slug}>` with `RECOVERY_MAIN`'s scroller classes around a
`RECOVERY_COLUMN`-classed column holding `<LegalDocument>`. Import both constants from
`components/error-pages/recovery-styles.ts`; they are exactly the old privacy page's scroller and column. Export a
helper `legalPageMetadata(slug)` that reads the file and returns `{ title: SITE_NAME + " — " + legalOutline(...).title }`
(for example "Shaper Assistant — Privacy Policy"). Give no description, so the site's approved description carries
over and no new words are invented.

7. `app/terms/page.tsx` (new) and `app/privacy/page.tsx` (rewritten): each a few lines, `generateMetadata` calling
`legalPageMetadata`, and the default export rendering `<LegalPage slug=… />`. Keep a short doc comment saying the
words live in `content/legal/*.md` (D-01, quick 261006-fom) and the page stays open signed out (D-01 of Phase 2, "no
route gating").

8. `next.config.ts`: add `outputFileTracingIncludes` mapping `/terms` to `./content/legal/terms.md` and `/privacy` to
`./content/legal/privacy.md`, with a comment: Vercel only ships files the build can see a page needs, and a file read
with `fs` at request time must be named here, or the live page fails (T-261006-05). `lib/legal/wiring.test.ts` (new,
the `stripComments` idiom from `lib/privacy/wiring.test.ts`) pins this mapping, the two exact package versions and
both lockfile integrities from the audit table, and that `legal-page.tsx` calls `connection(` before
`readLegalDocument(`.

9. Retire the old page's words honestly. `lib/privacy/copy.ts` keeps `PRIVACY_ROUTE` and a `PRIVACY_COPY` holding
only `menuLabel` and `contactLineLinkLabel` (both still used by the menus, the Contact form and `e2e/privacy.spec.ts`).
Delete the page's paragraphs and `privacyPageText()`, and rewrite the doc comment to say the page's words now live in
`content/legal/privacy.md` (quick 261006-fom, the founder's own text). Trim `lib/privacy/copy.test.ts` to the route,
the two labels, string hygiene for what is left, and the untouched "the Contact form's approved note" case. In
`lib/auth/open-access.test.ts` add "the Terms page is a public route (quick 261006-fom)", mirroring the Privacy case
against `app/terms/page.tsx`.

10. Browser proof. New `e2e/legal-pages.spec.ts`: for each of terms and privacy, on all three projects, it reads the
markdown with `fs` and `legalOutline`, opens the route signed out (dismiss the banner and tip as `privacy.spec.ts`
does), and expects the h1 to match the outline title, every h2 visible in order, and on privacy a table with 5 body
rows and a mailto link for every email address found in the markdown. On the phone projects it also expects
`[data-legal-page]` to have `scrollWidth <= clientWidth + 1` and the phone's Menu button with no Settings gear; on
desktop the reverse. In `e2e/privacy.spec.ts` delete the old "opens signed out and reads the whole page" test (moved
and rewritten above), and change every remaining `PRIVACY_COPY.heading` to the outline title of privacy.md read the
same way. Keep the visit-counter, the two-taps-from-every-screen, the left-out-on-its-own-page and the Contact-note
tests as they are. Update the file's header to say so.
  </action>
  <verify>
    <automated>cmp content/legal/terms.md /Users/kontoes/Code/shaper/content/legal/terms.md && cmp content/legal/privacy.md /Users/kontoes/Code/shaper/content/legal/privacy.md && npx vitest run lib/legal components/legal lib/privacy lib/auth/open-access.test.ts && npx next typegen && npx tsc --noEmit && IS_WEBPACK_TEST=1 PW_PORT=3131 npx playwright test e2e/legal-pages.spec.ts e2e/privacy.spec.ts</automated>
  </verify>
  <done>A shaper who opens /terms or /privacy, signed in or not, on a phone or a computer, reads the founder's own Terms of Service and Privacy Policy, every section, list and the table of services, in the app's own type, and the founder can change a word in the text file without anyone touching code.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: the copyright footer at the end of every page, and the catalog note under ROCKER's blank list</name>
  <files>lib/site/footer.ts, lib/site/footer.test.ts, components/site-footer.tsx, components/legal/legal-page.tsx, app/contact/page.tsx, app/not-found.tsx, app/error.tsx, components/setup/setup-screen.tsx, components/design/design-screen-shell.tsx, components/summary/order-form.tsx, lib/blanks/vendors.ts, lib/blanks/vendors.test.ts, components/rocker/blank-picker.tsx, e2e/site-footer.spec.ts, e2e/step-nav.spec.ts, e2e/rocker-blanks.spec.ts</files>
  <read_first>components/design/design-screen-shell.tsx (the whole file: the end-room comment and both aside branches), components/summary/order-form.tsx (the scroller near line 278 and StepNav near line 993), components/setup/setup-screen.tsx (the scroller near line 109), app/contact/page.tsx, app/not-found.tsx, app/error.tsx, e2e/step-nav.spec.ts (the test near line 155 and the scroll-to-end helper near line 240), components/rocker/blank-picker.tsx (BlankBrowser and BlankPicker), lib/blanks/vendors.ts, lib/blanks/vendors.test.ts</read_first>
  <behavior>
    - copyrightNotice(new Date("2026-10-06T12:00:00Z")) is "© 2026 Shaper Assistant. All rights reserved."; a 2027 date gives "© 2027 …"; called with no argument it uses today's year (compare with new Date().getFullYear() in the test).
    - SiteFooter's server render holds the notice, a link to /terms reading "Terms", a link to /privacy reading "Privacy", data-site-footer, data-print-hide and print:hidden.
    - BLANK_CATALOG_NOTE equals the founder's sentence exactly and names every maker in KNOWN_BLANK_VENDORS, so a fourth maker added later fails this test until the note is updated.
    - In the browser: the footer appears exactly once on /, /contact, /terms, /privacy, a missing address, /design/outline, /design/rocker, /design/rails, /design/volume, /design/fins and /design/summary, with this year in it, and can be scrolled into view at the end of each page on all three projects.
    - On desktop, on a design screen, the footer is inside the aside and not inside main; on a phone it comes after Back + Next in the controls' scroller.
    - Visiting those pages logs no console message about hydration.
    - With print media emulated on /design/summary and /privacy, the footer is hidden.
    - On ROCKER the catalog note shows once with no blank picked, and still once after a blank is picked.
  </behavior>
  <action>
Implements D-02, D-03 and D-05, with P-5 and P-6.

1. `lib/site/footer.ts`, pure. `copyrightNotice(now: Date = new Date())` returns the founder's notice with
`now.getFullYear()` in place of the year, built from `SITE_NAME`. The default argument is how the footer reads today's
date at every render without a call-time date in a component body (the React hooks purity lint flags one; there is no
React Compiler in this app, so nothing caches the value). Tests in `lib/site/footer.test.ts` per `<behavior>`.

2. `components/site-footer.tsx`, no "use client" (it holds no state, so it works inside server pages and inside the
client shells alike). `SiteFooter({ className })` renders a `<footer data-site-footer data-print-hide>` with
`print:hidden`, small muted type (`text-[11px] leading-snug text-surf-ink-muted`), a faint rule above it
(`border-t border-surf-line-faint`, a little top padding and margin), laid out
`flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1` so it is one line where it fits and wraps the two links
under the notice on a narrow column (P-6).

The notice sits in a span with `suppressHydrationWarning`. The server and the browser can disagree about the year in
the minutes around New Year across time zones, and the span keeps the server's text instead of warning. The two links
are next/link `Link`s to `TERMS_ROUTE` ("Terms") and `PRIVACY_ROUTE` ("Privacy") in muted ink, `hover:text-surf-ink
hover:underline underline-offset-4 focus-ring-accent`. On a touch screen give each link a 44-dot finger box without
growing the line: `relative` plus the codebase's invisible-box idiom (`coarse:after:absolute coarse:after:inset-x-0
coarse:after:top-1/2 coarse:after:h-11 coarse:after:-translate-y-1/2 coarse:after:content-['']`, as
`components/viewer/tabbed-panel.tsx` does). `className` merges per-placement extras with `cn`. Add a server-render
test of it to `lib/site/footer.test.ts`, or a `components/site-footer.test.ts` if importing the component from `lib/`
reads wrong.

3. Place it (D-03), always as the LAST thing inside that page's scroller, never pinned:
- `components/legal/legal-page.tsx`: inside `<main>`, after the column.
- `app/contact/page.tsx`, `app/not-found.tsx`, `app/error.tsx`: inside `<main>`, after the column.
- `components/setup/setup-screen.tsx` (home): inside the scrolling root div, after the `data-setup-content` div and
  before the dialog.
- In those five, give it the column's width and side padding (`mx-auto max-w-5xl` on home, `max-w-xl` elsewhere, with
  the same `px-8 max-shell:px-4`) and bottom room (`pb-8 max-shell:pb-6`).
- `components/design/design-screen-shell.tsx`, non-simple aside: inside the `data-design-controls-scroll` div, after
  `<StepNav />`, so the scroller's existing end block still follows it and keeps its links clear of Undo/Redo on an
  upright phone.
- `components/design/design-screen-shell.tsx`, VOLUME's simple aside: after its StepNav. MOVE
  `max-shell:pb-[calc(1.75rem+env(safe-area-inset-bottom))]` from that StepNav onto the footer, unchanged.
- `components/summary/order-form.tsx`: after its StepNav inside the `data-order-form-page` scroller, `w-full max-w-80`.
  MOVE `max-shell:pb-[calc(2.25rem+env(safe-area-inset-bottom))]` from StepNav onto the footer, unchanged.
- Rewrite the end-room comments in both files to say the footer is now the last row and carries the room (quick
  261006-fom, D-03), with the arithmetic unchanged. Never put the footer in `sidebarFooter`, in `<main>` (the drawing)
  or anywhere `position: fixed`/`sticky`. Do not change any padding of the drawing column or the top bar: the phone's
  bands stay where `e2e/phone-chrome.spec.ts` pins them. `app/global-error.tsx` is left alone (it stands in for the
  whole root layout when that layout itself fails), as are the test-only `/test-rack` and `/test-error`.

4. `e2e/step-nav.spec.ts`: in "the pair sits below the last of the screen's own controls", skip elements inside
`[data-site-footer]`, with a one-line comment that the footer is meant to follow Back + Next (D-03, quick 261006-fom).
Change nothing else there.

5. D-05, P-5: in `lib/blanks/vendors.ts` export `BLANK_CATALOG_NOTE`, the founder's sentence exactly as quoted in
must_haves (straight apostrophe in "manufacturers'", as the founder typed it), with a doc comment citing the founder,
2026-10-06, quick 261006-fom, and that it is deliberately the same whatever makers a shaper has switched off. Tests in
`lib/blanks/vendors.test.ts` per `<behavior>`. In `components/rocker/blank-picker.tsx` render it ONCE at the end of
`BlankPicker` in both branches (after the `BlankBrowser` when no blank is picked; after the remove-note and the
optional browser when one is), as `<p data-blank-catalog-note className="text-[11px] leading-snug
text-surf-ink-muted">`. Leave `blankMakersNote`/`catalogsPhrase` and their tests exactly as they are. Add a test to
`e2e/rocker-blanks.spec.ts`: on ROCKER the note reads exactly `BLANK_CATALOG_NOTE` with `toHaveCount(1)`, and still
once after picking a blank the way that file's existing tests pick one.

6. New `e2e/site-footer.spec.ts` covering the browser bullets in `<behavior>`. To reach the end, scroll every
scrolling box and the page to its end, as `e2e/step-nav.spec.ts`'s helper does. Compute the year in the test with
`new Date().getFullYear()`. Collect `page.on("console")` text and expect nothing matching /hydrat/i. For the missing
address use any path that does not exist.

7. The desktop pictures. Run `e2e/desktop-baseline.spec.ts --project=desktop`. Expected: TEMPLATE, ROCKER, RAILS and
FINS unchanged, and VOLUME's picture moved only by the footer appearing under Back + Next in the sidebar. Do NOT update
any snapshot. Copy VOLUME's actual and diff images from `test-results/` into
`.planning/quick/261006-fom-legal-pages-from-markdown-a-site-footer-/pictures/` and name them in the SUMMARY, so the
orchestrator and the founder decide. If any other picture moves, or VOLUME's diff reaches beyond the sidebar's lower
part, stop and report it with the pictures instead of adjusting the layout to hide it.
  </action>
  <verify>
    <automated>npx vitest run && npx next typegen && npx tsc --noEmit && IS_WEBPACK_TEST=1 PW_PORT=3131 npx playwright test e2e/site-footer.spec.ts e2e/rocker-blanks.spec.ts e2e/step-nav.spec.ts e2e/phone-chrome.spec.ts e2e/phone-home.spec.ts e2e/keyboard-focus.spec.ts e2e/blank-makers.spec.ts e2e/contact.spec.ts e2e/error-pages.spec.ts e2e/legal-pages.spec.ts && (IS_WEBPACK_TEST=1 PW_PORT=3131 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop || echo "desktop-baseline: VOLUME is expected to move; check that nothing else did")</automated>
  </verify>
  <done>Scroll to the bottom of any page (the home page, Contact, Terms, Privacy, a wrong address, or the controls of any design screen on a phone or a computer) and the last line reads "© 2026 Shaper Assistant. All rights reserved." with Terms and Privacy beside it. It never prints, never covers the drawing, and stays clear of the Undo/Redo buttons. ROCKER's blank list ends with the founder's note that catalog dimensions can vary and should be checked before cutting.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: the consent line under the sign-up card, and a Share row in both menus</name>
  <files>lib/legal/documents.ts, lib/legal/documents.test.ts, components/auth/sign-up-consent.tsx, components/auth/sign-up-consent.test.ts, components/auth/sign-in-dialog.tsx, app/layout.tsx, lib/legal/wiring.test.ts, lib/site/share.ts, lib/site/share.test.ts, components/share-menu-item.tsx, components/settings-menu.tsx, components/design/phone-menu.tsx, e2e/share.spec.ts</files>
  <read_first>components/auth/sign-in-dialog.tsx, app/layout.tsx (the ClerkProvider comment and prop), components/settings-menu.tsx (PageMenuItem's row classes and SettingsMenu), components/design/phone-menu.tsx (the sheet's rows), lib/site/metadata.ts, e2e/privacy.spec.ts (menuTrigger and openMenuTo, to copy)</read_first>
  <behavior>
    - SIGN_UP_CONSENT's words join to "By creating an account you agree to our Terms of Service and Privacy Policy."
    - SignUpConsent's server render, with its tags stripped, reads exactly that sentence, holds an a href="/terms" reading "Terms of Service" and an a href="/privacy" reading "Privacy Policy", both target="_blank" rel="noopener noreferrer", and data-sign-up-consent.
    - Source contract: sign-in-dialog.tsx renders SignUpConsent exactly once, after the SignIn element; app/layout.tsx carries termsPageUrl: TERMS_ROUTE beside privacyPageUrl: PRIVACY_ROUTE and imports TERMS_ROUTE from lib/legal/documents.
    - shareSite with a share function calls it once with { title: "Shaper Assistant", text: SITE_TITLE, url: "https://www.shaperassistant.com" } and returns "shared".
    - share rejecting with an AbortError returns "dismissed" and never touches the clipboard.
    - share rejecting with any other error falls back to the clipboard and returns "copied".
    - No share, a clipboard: writeText receives exactly the site address, and the result is "copied".
    - A clipboard that rejects, or neither present, returns "failed".
    - In the browser, desktop: navigator.share removed and clipboard permissions granted; the gear menu's Share row copies https://www.shaperassistant.com (read back from the clipboard), and the row reads "Copied", then "Share" again after about two seconds.
    - In the browser, iPhone and Android: a stubbed navigator.share records one call with that url and title from the ☰ sheet's Share row, and the row is at least 44 dots tall.
  </behavior>
  <action>
Implements D-04 with P-3, and D-06 with P-4 and P-7.

1. Consent words. Add `SIGN_UP_CONSENT` to `lib/legal/documents.ts`: `lead` ("By creating an account you agree to
our"), `terms` ("Terms of Service"), `joiner` ("and"), `privacy` ("Privacy Policy"), `end` ("."), plus a
`signUpConsentText()` that joins them. These are the founder's words; the comma that ended their quotation becomes the
sentence's full stop. Test it in `lib/legal/documents.test.ts`.

2. `components/auth/sign-up-consent.tsx`, no "use client". A `<p data-sign-up-consent>` centred, `text-xs
leading-relaxed text-surf-ink-muted`, `max-w-[400px] mx-auto` to line up with Clerk's 400-dot card. Its two phrases
are plain `<a>` elements (a new tab needs no client routing) to `TERMS_ROUTE` and `PRIVACY_ROUTE`, with
`target="_blank" rel="noopener noreferrer"` (T-261006-03) and the app's link classes. Server-render test in
`components/auth/sign-up-consent.test.ts` per `<behavior>`.

3. `components/auth/sign-in-dialog.tsx`: render `<SignUpConsent />` directly after `<SignIn routing="hash" withSignUp />`
inside `DialogContent`. Extend the file's doc comment: why the line is the app's own frame under Clerk's card and not
inside Clerk's form (P-3, with the Clerk 7.8.2 facts from `<interfaces>`), and that it shows on every step of the
combined sign-in/sign-up card because the sentence is conditional ("By creating an account …"). Keep a single
`<SignIn withSignUp>`; never add a separate `<SignUp>` (the existing comment explains why).

4. `app/layout.tsx`: `appearance={{ options: { privacyPageUrl: PRIVACY_ROUTE, termsPageUrl: TERMS_ROUTE } }}`, importing
`TERMS_ROUTE` from `@/lib/legal/documents`. Extend the existing comment: Clerk's card footer now links Terms beside
Privacy, each opening in a new tab, and this is the "appearance options" half of D-04. Add the source-contract cases
from `<behavior>` to `lib/legal/wiring.test.ts`, stripping comments first. This is the honest proof here: the dialog
cannot open in the suite because Clerk never loads on its fake keys. The founder sees the real dialog at the review.

5. `lib/site/share.ts`, pure and browser-free by injection. Export `SHARE_COPY` (`label: "Share"`, `copied: "Copied"`,
`failed`: a short line that shows the address so it can be copied by hand, e.g. "Couldn't copy — www.shaperassistant.com").
Export `shareSite(env)`, where `env` holds an optional `share(data)` and an optional `clipboard.writeText(text)`
(mirroring the browser's `navigator`). The behaviour is in `<behavior>`; data is `{ title: SITE_NAME, text: SITE_TITLE,
url: SITE_URL }` (P-7), all imported from `lib/site/metadata.ts`, never a second copy of the address and never
`location.href` (T-261006-04).

Call `share` FIRST, before any `await`, because a phone only opens its share sheet straight from the tap. Tests in
`lib/site/share.test.ts` with plain fakes per `<behavior>` (an AbortError is any error whose `name` is
"AbortError").

6. `components/share-menu-item.tsx` ("use client"): `ShareMenuItem` is a Base UI `Menu.Item` with
`closeOnClick={false}` (so the confirmation can be read in the row), lucide `ShareIcon` and the shared row classes
copied verbatim from `PageMenuItem` in `settings-menu.tsx` (44 dots tall under a touch pointer).

On click it calls `shareSite(navigator)`. On "copied" it shows `SHARE_COPY.copied` in place of the label for 2000 ms;
on "failed" it shows `SHARE_COPY.failed` for 4000 ms; on "shared" or "dismissed" the label stays. Clear the timer on
unmount. A visually hidden `role="status" aria-live="polite"` span inside the row carries the same confirmation for a
screen reader.

7. Mount it (P-4): in `components/settings-menu.tsx`'s gear menu directly after `<PrivacyMenuItem />`, and in
`components/design/phone-menu.tsx`'s sheet directly after its `<PrivacyMenuItem />`, so both menus read Contact,
Privacy, Share, then App Default Settings. Do not add anything to the computer's top row (`components/site-nav.tsx`
is untouched; see P-4 for the measured reason).

8. New `e2e/share.spec.ts` per the browser bullets. Open the menus with the `menuTrigger` / `openMenuTo` helpers
copied from `e2e/privacy.spec.ts`. On desktop: an init script deletes `navigator.share` from the Navigator
prototype, `context.grantPermissions(["clipboard-read", "clipboard-write"])`, then
`page.evaluate(() => navigator.clipboard.readText())` after the click. On the phone projects: an init script defines
`navigator.share` as a function that pushes its argument onto `window.__shareCalls` and resolves.
  </action>
  <verify>
    <automated>npx vitest run && npx next typegen && npx tsc --noEmit && npm run lint && IS_WEBPACK_TEST=1 PW_PORT=3131 npx playwright test e2e/share.spec.ts e2e/app-settings.spec.ts e2e/privacy.spec.ts e2e/contact.spec.ts e2e/phone-screen-tiles.spec.ts e2e/phone-sideways-top-bar.spec.ts e2e/site-nav-width.spec.ts e2e/phone-account.spec.ts</automated>
  </verify>
  <done>Anyone opening the sign-in / sign-up box sees "By creating an account you agree to our Terms of Service and Privacy Policy." under the form, with both phrases linked, and Clerk's own small links now include Terms. Both menus have a Share row: on a phone it opens the phone's own share sheet with the site's address and its preview card (Messages, Mail, AirDrop); on a computer without a share sheet it copies the address and says "Copied".</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| repository file → server render | `content/legal/*.md` is turned into page markup on the server at each request |
| visitor's browser → legal page | the page is public; a visitor controls only the URL |
| app → device share sheet / clipboard | the app hands an address to the operating system |
| app dialog → new tab | the consent links open the legal pages in a new tab |
| npm registry → build | two new packages and their dependencies enter the lockfile |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-261006-01 | Tampering (script injection) | components/legal/legal-document.tsx | medium | mitigate | react-markdown renders React elements (text is escaped by React); no rehype-raw, so raw HTML in the file is not rendered; the default URL check drops `javascript:` addresses; a render test feeds a script tag, raw HTML and a `javascript:` link and asserts none survive |
| T-261006-02 | Information disclosure (path traversal) | lib/legal/read-document.ts | low | mitigate | the path comes only from the fixed two-entry `LEGAL_DOCUMENTS` map keyed by a typed slug; no URL segment or query reaches the filesystem |
| T-261006-03 | Tampering (reverse tabnabbing) | components/auth/sign-up-consent.tsx, legal-document.tsx external links | low | mitigate | every new-tab link carries `rel="noopener noreferrer"`, pinned by the render test |
| T-261006-04 | Information disclosure | lib/site/share.ts | low | mitigate | only the constant `SITE_URL` is ever shared or copied, never the current address (which could carry a page's state); pinned by the share tests |
| T-261006-05 | Denial of service | /terms and /privacy on Vercel | medium | mitigate | `outputFileTracingIncludes` names both files for both routes (pinned by `lib/legal/wiring.test.ts`); the orchestrator checks the built trace lists them before anything ships |
| T-261006-06 | Repudiation | the consent line | low | accept | the line is a notice, not a recorded tick; the founder asked for a sentence under the button. Clerk's must-tick consent is one Dashboard switch away if they ever want a record (P-3) |
| T-261006-SC | Tampering (supply chain) | react-markdown 10.1.0, remark-gfm 4.0.1 | medium | mitigate | registry-verified at plan time (audit table: 18+ months old at these versions, remarkjs maintainers, 44M/52M weekly downloads); installed with `--save-exact`; `lib/legal/wiring.test.ts` pins both versions and their lockfile integrities; server-only use, nothing shipped to the browser |
</threat_model>

<verification>
Executor (in the worktree):
- Both markdown files byte-identical to the founder's (`cmp`), committed unchanged.
- `npx vitest run` (all files), `npx next typegen && npx tsc --noEmit`, `npm run lint`: green.
- On all three projects: `e2e/legal-pages.spec.ts`, `e2e/privacy.spec.ts`, `e2e/site-footer.spec.ts`,
  `e2e/rocker-blanks.spec.ts`, `e2e/step-nav.spec.ts`, `e2e/phone-chrome.spec.ts`, `e2e/phone-home.spec.ts`,
  `e2e/keyboard-focus.spec.ts`, `e2e/blank-makers.spec.ts`, `e2e/contact.spec.ts`, `e2e/error-pages.spec.ts`,
  `e2e/share.spec.ts`, `e2e/app-settings.spec.ts`, `e2e/phone-screen-tiles.spec.ts`,
  `e2e/phone-sideways-top-bar.spec.ts`, `e2e/site-nav-width.spec.ts`, `e2e/phone-account.spec.ts` pass.
- `e2e/desktop-baseline.spec.ts`: only `volume-desktop.png` moves, by the footer under Back + Next. Pictures in the
  quick folder's `pictures/`, no snapshot updated.

Orchestrator (on main, after the founder has seen the pages and said go):
- The main checkout has the same two files untracked, so git will refuse a merge that adds them. Move them aside
  first (they are identical, which Task 1's `cmp` proves), merge, then confirm `git status` is clean for
  `content/legal/`.
- `npm install` on main (two new packages), then `npm run build`. The route table must show /terms and /privacy as
  dynamic (ƒ), and `.next/server/app/terms/page.js.nft.json` and `.next/server/app/privacy/page.js.nft.json` must each
  list their `content/legal/*.md`.
- `npm run test:e2e:prod`, including `e2e/prod/phone-controls-clear-undo.spec.ts` (it measures every link, so it
  covers the footer's), and the full `npm run test:e2e` in the background.
- The founder decides on VOLUME's moved baseline; only on their word run
  `npx playwright test e2e/desktop-baseline.spec.ts --project=desktop -g volume --update-snapshots`.
</verification>

<success_criteria>
The seven truths under must_haves hold, proven by the unit tests (outline, render, safety, footer notice, catalog
note, consent sentence, share logic, wiring and package pins) and the browser specs on all three device projects, with
the consent line proven by a server render plus a source contract (Clerk never loads on the suite's fake keys) and the
founder's own look at the real dialog. The founder's markdown is committed untouched. Three task commits plus the
SUMMARY commit sit in the worktree, and nothing is pushed or merged until the founder has seen the pages below (D-07).
</success_criteria>

<output>
Write `.planning/quick/261006-fom-legal-pages-from-markdown-a-site-footer-/261006-fom-SUMMARY.md` (frontmatter
`status: complete`) inside the worktree and commit it, with the VOLUME baseline pictures, as the final commit.
</output>

<founder_review>
Before anything is merged, pushed or deployed (D-07), the orchestrator shows the founder each of these on a computer
(1440×900) and an iPhone (390×664), from the worktree's or main's dev server with the real development Clerk keys:

1. /terms: top of the page, and the end with the footer.
2. /privacy: top, the "4. Who else sees it" table, and the end with the footer.
3. The footer on the home page (scrolled to the end).
4. The footer on a design screen: ROCKER on the computer (the end of the sidebar) and on the iPhone (the end of the
   controls, with the Undo/Redo pair showing after an edit); VOLUME's desktop picture before and after.
5. The sign-in / sign-up dialog with the consent line under Clerk's card, and Clerk's own footer showing Terms beside
   Privacy.
6. The catalog note on ROCKER's blank picker: no blank picked, and with a blank picked.
7. Share: the gear menu's Share row on the computer, before and after "Copied"; the ☰ sheet's Share row on the iPhone
   (the real share sheet on the founder's own phone is their check).

Content in the founder's markdown to point out, NOT to change. It is their text, and they decide:
- privacy.md's table still reads "[PAYMENT PROVIDER]".
- Both documents say designs on a free account are public and copyable. Today no board is public.
- privacy.md gives chris@shaperassistant.com as the contact. The site's mailbox is support@shaperassistant.com.
- privacy.md's table lists Zoho as "Sends account email". Clerk sends account emails; Zoho runs the support inbox; and
  Resend, which delivers Contact-form messages, is not listed.
</founder_review>
