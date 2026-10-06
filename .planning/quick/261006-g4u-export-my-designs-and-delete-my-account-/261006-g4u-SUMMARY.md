---
phase: quick-261006-g4u
plan: 01
subsystem: account
status: complete
tags: [account, privacy, export, delete, clerk, server-actions]
requires:
  - quick 261006-fom (the Terms and Privacy pages whose section 6 promises both actions)
  - lib/db/account-deletion.ts (Phase 13 item 11a, the atomic delete, unchanged)
provides:
  - "Your data page inside Clerk's account panel, reached from the avatar menu and from Manage account"
  - "Export my designs: one JSON file of every saved board and the settings, as stored"
  - "Delete my account: typed-DELETE confirmation in place, data first, then Clerk, then sign out home"
affects:
  - components/auth/nav-auth-control.tsx (the signed-in avatar now carries children)
tech-stack:
  added: []
  patterns:
    - "Clerk custom account page via UserButton.UserProfilePage + UserButton.Action open=, as direct children"
    - "Daylight ramp variables through Tailwind (--var) arbitrary values for UI drawn inside Clerk's white panel"
key-files:
  created:
    - lib/account/account-data.ts
    - lib/account/account-data.test.ts
    - app/actions/account.ts
    - components/account/your-data-copy.ts
    - components/account/your-data-page.tsx
  modified:
    - components/auth/nav-auth-control.tsx
    - lib/db/ownership.test.ts
    - lib/db/account-deletion.test.ts
decisions:
  - "The Your data page lives in Clerk's account panel, reached from the avatar menu's own row and from Manage account (D-01)"
  - "Delete confirms in place on that page with a typed DELETE, never a pop-up (D-04)"
  - "Delete removes the boards and settings first, then closes the account in Clerk; a Clerk failure is reported and pressing again is safe (D-03)"
metrics:
  duration: "about 20 minutes"
  completed: 2026-10-06
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
---

# Quick 261006-g4u: Export my designs and Delete my account Summary

A signed-in shaper now has a Your data page inside the account panel. It holds Export my designs, which
downloads every saved board and their settings as one file exactly as the app stores them, and Delete my
account, which confirms in place with a typed DELETE. It then removes their boards and settings from the
database in one step, closes the account in Clerk, and signs them out onto the home page.

## What changes for a shaper

- **The avatar menu** (signed in) now reads Manage account, **Your data**, Sign out. Your data opens the
  account panel straight to the new page. Inside Manage account, the panel's side list has Account, Security
  and **Your data**.
- **Export my designs** downloads `shaper-assistant-designs-YYYY-MM-DD.json` (dated from the shaper's own
  clock). It holds a plain-English `about` line, the time it was made, every saved board oldest first (id,
  name, when it was made and last changed, and the design exactly as stored, in millimetres), and their App
  Default Settings as stored (`null` if they never changed one). Their account id is never in the file. The
  status line under the button says how many boards went into it.
- **Delete my account…** swaps the section, in place, to "Delete your account for good?", with four
  plain-English consequences, a "Type DELETE to confirm" box and two buttons. **Delete my account forever**
  stays greyed out until DELETE is typed (any case, spaces ignored, since a phone capitalises the first
  letter). **Keep my account** backs out and clears the box. Once pressed, the boards and settings go first,
  in one all-or-nothing step, then the account. The done line shows, and the shaper is signed out onto the
  home page. If Clerk won't close the account, the page says the boards and settings are already gone and
  pressing again finishes the job.
- The page keeps the light Daylight colours in every theme, because Clerk's panel around it is always white.
- Signed out, nothing changed. The nav still looks and measures as before.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 (tracer) | 1f4d61d | Your account page can now download every saved board as one file |
| 2 | 78d5f6b | Your account page can now delete your account and every saved board |

## Verification

- `npx vitest run`: 123 files, 4420 passed, 2 skipped (the pre-existing skips). That includes the new
  `lib/account/account-data.test.ts` (9 cases), `lib/db/ownership.test.ts` (now 15 cases, account.ts in all
  three checks plus its own exports-exactly case), `lib/db/account-deletion.test.ts` (new case 14, the delete
  run twice), `components/auth/nav-auth-control.test.ts` and `components/ui/input.css.test.ts`, all unedited
  except as listed.
- `npx tsc --noEmit` clean. `npm run lint` clean, with 0 warnings.
- `git diff --numstat d9eb132 HEAD`: `lib/db/ownership.test.ts` 13 added / 0 deleted,
  `lib/db/account-deletion.test.ts` 21 added / 0 deleted (D-07).
- `PW_PORT=3132 npx playwright test e2e/phone-account.spec.ts e2e/site-nav-width.spec.ts`: 15 passed, 27
  skipped by the specs' own per-device gating, 0 failed, on iPhone, Android and desktop. The signed-out nav
  is unchanged.
- A check that the app's Tailwind compiles every Daylight arbitrary class the page uses to a real colour
  declaration (`border-color`, `color`, `background-color`, `--tw-ring-color`): all present.
- Order in `app/actions/account.ts`: `await auth()`, then the typed word re-checked on the server, then
  `deleteAccountData(db, userId)`, then `(await clerkClient()).users.deleteUser(userId)`. No id is accepted
  from the browser.
- No schema change, no migration, no package change, nothing pushed, no `npm run build` (the orchestrator's).

**Nothing signed in was seen in a browser.** The browser suite runs on fake Clerk keys and never reaches
the avatar, so the Your data page, the export download and the delete are all unproven on screen. The
founder's review list in the plan (`<founder_review>`) is the next step.

## Deviations from Plan

### Recorded choices

**1. [D-04, planner's] The confirmation sits in the page, not in the pop-up the orchestrator first
suggested.** This is the plan's own decision, carried out as written. Clerk's panel is a full-screen modal
that keeps keyboard focus inside itself, so an app dialog drawn on the page body would sit behind it or
fight it for focus. To raise with the founder.

**2. [Rule 2 - Correctness] The account panel is closed after sign-out.** After a successful
`signOut({ redirectUrl: "/" })` the page also calls Clerk's `closeUserProfile()`, so Clerk's panel (its own
layer, drawn by Clerk's script) can never stay open over the signed-out home page. If either step throws, the
plan's fallback `window.location.assign("/")` runs. Files: `components/account/your-data-page.tsx`.
Commit 78d5f6b.

**3. [Rule 3 - Lint] One lint suppression for the plan's fallback.** Next's lint rule warns on
`window.location.assign("/")`. The full page load is deliberate: the session may already be gone with the
account, and a fresh load resets the sign-in state that a client-side push would keep. So the line carries an
`eslint-disable-next-line` with that reason above it. Commit 78d5f6b.

**4. [D-06] Menu row and page labels come from the copy file.** In `nav-auth-control.tsx`, the Your data
label is `YOUR_DATA_COPY.pageLabel` rather than a retyped `"Your data"`, so every word on the page lives in
one file. The `url="your-data"` and `open="your-data"` literals are as planned. Commit 1f4d61d.

**5. [Minor] A fake setting value in the export test.** The fake `extraLengthMm` is 30, not 25.4, so the
test file never shows the inch constant that CLAUDE.md Rule 2 keeps inside `lib/geometry/units.ts`.

Clerk's installed types matched the plan exactly (`UserButton.UserProfilePage`, `UserButton.Action` with
`open`, `MenuItems`, `users.deleteUser`, `signOut({ redirectUrl })`). No type deviation.

## Points for the founder (from the plan, unchanged)

- The confirmation is in the page rather than a pop-up (D-04). A pop-up would have to be drawn inside
  Clerk's panel; ask before building that.
- Clerk's own Delete account (Security page) still exists beside the new one, and both work. It can be
  switched off in the Clerk dashboard if the founder wants only one.
- privacy.md says "we'll confirm when it's done". In the app, that confirmation is the done line shown just
  before sign-out. No email is sent.
- The export is a data file the shaper keeps as their own copy. The app cannot read it back in yet.

## Threat model

All of T-g4u-01 to T-g4u-07 are mitigated as planned: identity comes from the session only, the ownership
test pins the new file, both selects are owner-scoped, the export drops the account id (unit-tested), the
server re-checks the typed word, data goes first in one batch, the run-twice test passes, and caught errors
are never logged. T-g4u-08 is accepted as planned. No new surface beyond the threat model.

## Self-Check: PASSED

- FOUND: lib/account/account-data.ts, lib/account/account-data.test.ts, app/actions/account.ts,
  components/account/your-data-copy.ts, components/account/your-data-page.tsx
- FOUND: commits 1f4d61d and 78d5f6b on main
