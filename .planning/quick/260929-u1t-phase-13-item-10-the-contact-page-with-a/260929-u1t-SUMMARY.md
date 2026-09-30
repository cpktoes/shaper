---
phase: quick-260929-u1t
plan: 01
subsystem: ui
tags: [contact-form, server-actions, smtp2go, playwright, useActionState, menus]

requires:
  - phase: 13-SPEC item 10
    provides: the founder's locked decisions (C-1..C-6) and the coordinator's SMTP2GO planning
provides:
  - "A /contact page reachable in two taps from the setup screen and every design screen, signed
    in or out, with the phone's compact top bar and six-tab bottom bar"
  - "A small form (message, email to reply to, optional name) that emails the founder through
    SMTP2GO's HTTP API, server-side only, with a honeypot and plain server-side checks"
  - "The page shows only the support@shaperassistant.com address until the founder adds the
    SMTP2GO key in Vercel — it never offers a form that can't deliver"
  - "A test-only stand-in (SHAPER_CONTACT_STAND_IN + a cookie) that proves all three page states
    in a real browser without ever reaching the real mail service, and can't switch on in a
    production build"
affects: [phase-13-item-11, phase-13-item-12, phase-13-item-13]

actuals:
  tokens: 23964
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A form on React 19's useActionState, keyed on a bumped `attempt` counter (P-4) — every
      non-sent answer remounts the fields with the typed text as their new defaultValue, so a
      shaper's message survives a sibling field's mistake"
    - "A production-guarded test stand-in (nodeEnv !== 'production' AND a literal env flag) that
      lets a cookie pick a delivery outcome in Playwright without ever touching a real external
      API — mirrors SHAPER_BLANKS_SOURCE's precedent"

key-files:
  created:
    - lib/contact/message.ts
    - lib/contact/message.test.ts
    - lib/contact/delivery.ts
    - lib/contact/delivery.test.ts
    - lib/contact-server.ts
    - app/actions/contact.ts
    - app/contact/page.tsx
    - components/contact/contact-form.tsx
    - e2e/contact.spec.ts
  modified:
    - components/ui/input.css.test.ts
    - components/design/phone-tab-bar.tsx
    - components/settings-menu.tsx
    - components/design/phone-menu.tsx
    - components/site-nav.tsx
    - lib/auth/open-access.test.ts
    - playwright.config.ts

key-decisions:
  - "ContactMenuItem lives once in settings-menu.tsx and is rendered by both menus (C-1/P-1), so
    the row can never drift between the desktop gear and the phone's one menu"
  - "submitContact's order is fixed: attempt, then honeypot, then validation, then delivery
    availability, then the actual deliver call inside try/catch — a filled honeypot answers
    'sent' without ever touching validation or delivery"
  - "The page only ever holds a boolean (contactFormAvailableForRequest) and the shaper's own
    prefill — it never imports resolveContactDeliveryForRequest or the delivery object itself,
    so the SMTP2GO key can never be one accidental prop away from the client bundle"

requirements-completed: [QT-260929-u1t, 13-SPEC-item-10]

coverage:
  - id: D1
    description: "The Contact form's checks, honeypot, subject/body builders and the exact
      SMTP2GO request body are pure and unit-tested, including CRLF/header-injection and
      production-guard cases"
    requirement: 13-SPEC-item-10
    verification:
      - kind: unit
        ref: "lib/contact/message.test.ts (53 cases)"
        status: pass
      - kind: unit
        ref: "lib/contact/delivery.test.ts (46 cases, incl. the boundary source-reading block)"
        status: pass
    human_judgment: false
  - id: D2
    description: "/contact renders the heading, the founder's wording, and either the form or the
      address-only panel depending on whether a send path exists; the form covers required/
      optional fields, kept-on-error values, and the sent/failed/honeypot answers"
    requirement: 13-SPEC-item-10
    verification:
      - kind: e2e
        ref: "e2e/contact.spec.ts (11 tests x 3 projects = 33 tests, all passing)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Contact is the first row of both the desktop gear menu and the phone menu on
      every screen except /contact itself, reachable in two taps; a phone on /contact gets the
      compact top bar and six-tab bottom bar"
    requirement: 13-SPEC-item-10
    verification:
      - kind: e2e
        ref: "e2e/contact.spec.ts#two taps from every screen (7 routes x 3 projects)"
        status: pass
    human_judgment: false
  - id: D4
    description: "A real message actually reaching the founder's inbox, a Gmail Reply landing on
      the shaper's address, and a signed-in shaper's own name/email showing in the form"
    verification: []
    human_judgment: true
    rationale: "These need the founder's own SMTP2GO key in Vercel and a live send — no stand-in
      or unit test can prove an external mail service actually delivered."

duration: 50min
completed: 2026-09-29
status: complete
---

# Quick 260929-u1t: Phase 13 item 10 — the Contact page Summary

**A `/contact` page, reachable in two taps from every screen, that emails the founder through
SMTP2GO — showing only the support address until the founder switches sending on in Vercel.**

## Performance

- **Duration:** ~50 min
- **Started:** 2026-09-29T21:32 (previous commit c3fd2b0)
- **Completed:** 2026-09-29T22:21:25-07:00
- **Tasks:** 3
- **Files created/modified:** 16 (9 created, 7 modified)

## What a shaper sees

- **A "Contact" row** now sits at the very top of the gear menu (desktop) and the phone's one
  Menu button — visible the instant either opens, not scrolled below the fold. It's left off the
  Contact page itself, the same way the phone menu already hides its own Home row on `/`.
- **Two taps get there from anywhere:** the setup screen and all six design screens (TEMPLATE,
  ROCKER, RAILS, VOLUME, FINS, SUMMARY), signed in or signed out.
- **The page says "Contact"**, then the founder's own sentence word for word, then either:
  - **a small form** — Message (required), Email to reply to (required, pre-filled for a signed-in
    shaper), Name (optional, also pre-filled) — or
  - **just the address**, `support@shaperassistant.com` as a tappable link, until the founder adds
    the SMTP2GO key.
- **Mistakes** show a friendly note right beside the field that needs fixing, and everything else
  typed stays exactly as typed.
- **A successful send** says "Sent — thanks for writing" and names the address the founder will
  reply to.
- **A failed send** points back to the support address and keeps the message in the box so it can
  be copied and emailed by hand.
- **A phone on `/contact`** gets the same compact top bar and six-tab bottom bar as every other
  screen — before this it would have gotten the full desktop link row squeezed into a phone-width
  screen.

## Which screens were checked

Browser tests (`e2e/contact.spec.ts`) ran on all three Playwright profiles — iPhone, Android
(Pixel 7), and desktop Chrome — covering:
- the address-only page for a signed-out shaper, with the right menu/nav chrome per device;
- two taps from `/` and all six `/design/*` routes;
- the Contact row disappearing on `/contact` itself;
- a successful send naming the reply address, with 44px fields/button on phones;
- validation errors beside the right field with the typed message kept;
- a failed send pointing to the address with the message kept;
- the hidden anti-spam field answering "sent" without ever attempting delivery.

`e2e/blank-makers.spec.ts`, `e2e/fit-defaults.spec.ts`, `e2e/phone-layout.spec.ts` and
`e2e/phone-home.spec.ts` were re-run alongside it (all three projects) to confirm nothing about
the phone-shell routing or the shared menu content regressed.

## `npm test` counts before and after each task

| point | passed | skipped | total |
|---|---|---|---|
| before Task 1 | 3341 | 2 | 3343 |
| after Task 1 (+99 new tests: message.test.ts, delivery.test.ts) | 3440 | 2 | 3442 |
| after Task 2 (no vitest count change — page/action/form, Playwright only) | 3440 | 2 | 3442 |
| after Task 3 (+1 new test: open-access.test.ts's Contact-page case) | 3441 | 2 | 3443 |

`npm run lint -- --max-warnings 0` and `npx tsc --noEmit` were clean after every task.

## Playwright result — e2e/contact.spec.ts plus the four touched specs, all three projects

First run: **4 failed** (all in this plan's own new test file, none in application code):
- `getByRole("alert")` on the failed-send test matched two elements — the form's own alert AND
  Next's client-side route announcer, which also carries `role="alert"`.
- The desktop "two taps" test for `/design/fins` matched two "Settings"-named buttons — the gear
  and FINS' own "Settings ▸" model-picker button.

Both fixed by scoping the test's own locators (`page.locator("main").getByRole("alert")` and
`{ name: "Settings", exact: true }`) — not by touching application code, since the behavior itself
was already correct.

**Second run: 134 passed, 49 skipped (pre-existing project-scoped skips), 0 failed**, across
`iphone`, `android` and `desktop`.

## Commits

1. `c5bd888` — **Task 1:** `feat: the Contact form's checks and the email it becomes, ready for
   the page (quick 260929-u1t)` — `lib/contact/message.ts`, `lib/contact/message.test.ts`,
   `lib/contact/delivery.ts`, `lib/contact/delivery.test.ts`, `lib/contact-server.ts`
2. `a5a8ddc` — **Task 2:** `feat: a Contact page — a short note to the founder, or the support
   address until sending is switched on (quick 260929-u1t)` — `app/actions/contact.ts`,
   `app/contact/page.tsx`, `components/contact/contact-form.tsx`, plus the Input consumers list
   and the phone tab bar's doc comment
3. `20e172a` — **Task 3:** `feat: Contact in the gear menu and the phone menu — two taps from any
   screen (quick 260929-u1t)` — `components/settings-menu.tsx`, `components/design/phone-menu.tsx`,
   `components/site-nav.tsx`, `lib/auth/open-access.test.ts`, `playwright.config.ts`,
   `e2e/contact.spec.ts`

## Files Created/Modified

- `lib/contact/message.ts` — the page's copy, limits, field checks, honeypot rule, subject/body
  builders, the exact SMTP2GO request shape, and the Clerk prefill
- `lib/contact/message.test.ts` — 53 cases covering every rule above, incl. CRLF/header-injection
- `lib/contact/delivery.ts` — the production-guarded stand-in switch, the SMTP2GO HTTP call, and
  `submitContact`'s fixed ordering
- `lib/contact/delivery.test.ts` — 46 cases, incl. the boundary block that source-reads the key's
  isolation (no public-prefixed name anywhere, no `components/` import of the server-only files)
- `lib/contact-server.ts` — request-time glue: reads env + cookies, resolves Clerk's prefill,
  degrades to the safe answer on any failure
- `app/actions/contact.ts` — the one Server Action, `sendContactMessage`
- `app/contact/page.tsx` — the page itself: heading, intro, and either the form or the address
- `components/contact/contact-form.tsx` — the client form on `useActionState`, plus the address
  link shared by every page state
- `e2e/contact.spec.ts` — 11 tests x 3 projects proving the page end to end
- `components/ui/input.css.test.ts` — added the Contact form to the five known `Input` consumers
- `components/design/phone-tab-bar.tsx` — doc comment: now mounted in three places
- `components/settings-menu.tsx` — new exported `ContactMenuItem`, rendered first in the gear menu
- `components/design/phone-menu.tsx` — Home and Contact grouped, one shared divider before Blanks
- `components/site-nav.tsx` — `onPhoneShellRoute` now includes `/contact`
- `lib/auth/open-access.test.ts` — a case pinning the Contact page as a public route
- `playwright.config.ts` — `SHAPER_CONTACT_STAND_IN: "1"` in `webServer.env`, test-only

## Decisions Made

See `key-decisions` in the frontmatter above. All of them were already locked by the plan's own
`<locked_decisions>` (C-1..C-6) and `<decisions>` (P-1..P-10) — none required a fresh decision
during execution.

## Deviations from Plan

None beyond the two test-locator fixes described above (both are fixes to this plan's own new
`e2e/contact.spec.ts`, not to application code, so they don't rise to a formal Rule 1/2/3 entry —
the application behavior they were testing was already correct in both cases).

## Issues Encountered

None beyond the Playwright locator ambiguities described above.

## Known Stubs

None.

## Threat Flags

None beyond what the plan's own `<threat_model>` already registers (T-u1t-01 through T-u1t-10).
No new attack surface was added outside the files this plan declared.

## User Setup Required

**The founder needs to switch sending on** — until then the page correctly shows the address
only:

1. **Add `SMTP2GO_API_KEY` in Vercel**, for the **Production** environment (and **Preview**, if
   wanted for testing before a real deploy) — **not Development**, so a local `next dev` or a
   Playwright run never carries a real key.
2. **Give that key SMTP2GO's email-send permission** in the SMTP2GO dashboard.
3. **Redeploy** — an environment variable change only takes effect on the next deployment; it
   won't apply retroactively to a server that's already running.

## Next Phase Readiness

- Phase 13 item 10 (the Contact page half) is code-complete. Per STATE.md, item 10 also includes
  the domain email setup (ImprovMX + SMTP2GO, support@shaperassistant.com) — that walk-through is
  separate from this quick task.
- **Left for the founder's own live check, once the key is in Vercel** (this plan's own
  `<success_criteria>`, deliberately not provable by a stand-in or a unit test):
  - a real message actually arrives in the founder's inbox;
  - the founder's Reply reaches the shaper's own address (Reply-To carries it). Replying AS `support@` from Gmail is
    uncertain: Gmail is retiring "Send mail as" for outside addresses in January 2027 and a personal Gmail no
    longer offered the SMTP step on 2026-09-29, so how the founder replies is their open decision (SPEC item 10);
  - visiting `/contact` while signed in shows the founder's own name and email already filled in.
- **Coordinator steps still open**, per this plan's `<verification>` (not part of this executor's
  scope): the full `npm run test:e2e` (all specs, both phones and desktop), `npm run
  test:e2e:prod`, and `npm run build` from the main checkout — the build must stay green, which is
  the stand-in's "this can't switch on in a production build" half of the proof.

## Self-Check

- `lib/contact/message.ts` — FOUND
- `lib/contact/message.test.ts` — FOUND
- `lib/contact/delivery.ts` — FOUND
- `lib/contact/delivery.test.ts` — FOUND
- `lib/contact-server.ts` — FOUND
- `app/actions/contact.ts` — FOUND
- `app/contact/page.tsx` — FOUND
- `components/contact/contact-form.tsx` — FOUND
- `e2e/contact.spec.ts` — FOUND
- Commit `c5bd888` — FOUND in `git log`
- Commit `a5a8ddc` — FOUND in `git log`
- Commit `20e172a` — FOUND in `git log`

## Self-Check: PASSED

---
*Task: quick-260929-u1t*
*Completed: 2026-09-29*
