# Phase 2: Accounts & Saved Designs - Context

**Gathered:** 2026-08-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Users get their own account and their boards stop disappearing on reload: sign up / log in / stay logged in / reset password via Clerk (ACCT-01..03), and save the current design as a named model in Neon Postgres via Drizzle, reopen it, and see a list of saved models (MODL-01..03). Public sharing, tiers/billing, and new design capability are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Sign-in gate
- **D-01:** The design tool stays fully open — anyone can pick a preset and shape without an account. Sign-in is prompted early but never required to shape.
- **D-02:** The nudge is two-part: a quiet "Sign in" button at the right end of the existing top nav on every screen (shows the Clerk avatar once signed in), plus a dismissable one-time banner on the design screens: sign in and your boards are saved. Banner dismissal persists for the visit; don't nag.
- **D-03:** Sign-up/sign-in happens in a dialog over the design screen. The in-progress board carries through untouched; it is stored only when the user explicitly hits Save for the first time. No auto-save-on-signup.
- **D-04:** Sign-up methods: email/password (with emailed reset link per ACCT-03) plus Google, both via Clerk. — **Reversibility:** reversible — toggling providers is Clerk dashboard config.

### Where Save lives
- **D-05:** One Save button in the top nav, visible on every design screen. The board-name box stays on Summary; saving an unnamed board opens a small name prompt.
- **D-06:** Home (`/`) for a signed-in user with saved boards leads with their board rack — cards above the "start a new board" preset cards. Signed-out/first-time visitors see exactly today's preset screen. No separate My Boards page.
- **D-07:** The unsaved in-progress board appears as the FIRST card in the rack, marked "In progress — not saved" — one place to look for all your boards.

### Editing a saved board
- **D-08:** Autosave after first save: once a board has a name and a home, edits save themselves shortly after the user stops adjusting, with a subtle "Saved" tick in the nav. The Save button only does real work the first time. Anonymous users have no autosave (nothing to save to).
- **D-09:** Save writes over the board that was opened. A separate Duplicate action branches a copy for riffing on a shape. No "update or save as new?" prompts.
- **D-10:** Opening a saved board while an unsaved board is in progress asks first — same confirm pattern as Phase 1's preset replacement (D-07 of Phase 1). One consistent rule everywhere a board gets swapped out.

### What a saved board holds
- **D-11:** A save captures the full design snapshot — everything `DesignState` holds today: outline, rails, fins, volume, boardName, finSystem, and the import toggles. Reopening restores the design exactly; "reopen and continue editing" (MODL-02) requires nothing less.
- **D-12:** Rack cards show: outline thumbnail (same rendering as preset cards), board name, length × width × thickness in shaper units plus volume in litres, and last-touched date.
- **D-13:** Board management on each rack card: Rename, Duplicate ("copy of …"), Delete behind an are-you-sure naming the board. No trash/undo system — the confirm is the safety.

### Claude's Discretion
- Dialog styling and exact banner/confirm wording (plain English, shaper audience).
- Autosave debounce timing and failure handling (retry/quiet error state).
- Database schema shape, serialization format of the design snapshot, and migration setup — subject to the metric-storage rule.
- Rack sort order (last-touched first is a sensible default) and card menu affordance.
- Clerk + Neon environment/config mechanics on Vercel.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project scope & phase definition
- `.planning/PROJECT.md` — constraints: prescribed stack (Clerk, Neon via Drizzle, Vercel), metric storage / inches+litres display, plain-English audience
- `.planning/REQUIREMENTS.md` — ACCT-01..03, MODL-01..03 definitions
- `.planning/ROADMAP.md` — Phase 2 goal and success criteria

### Prior phase decisions that bind this one
- `.planning/phases/01-foundation-port-deploy-the-design-tool/01-CONTEXT.md` — D-05 (/ is the setup screen), D-06 (nav), D-07 (in-session board + replace confirm — Phase 2's D-10 extends it, and real persistence was explicitly deferred to this phase)

No other external specs — remaining decisions fully captured above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/design/design-store.tsx` — `DesignState` IS the save snapshot (D-11); `applyPreset` is the model for a future `loadModel` action; `boardStarted`/`hasBoardInProgress` already gates the replace confirm D-10 reuses
- `components/setup/setup-screen.tsx` + preset cards — the rack (D-06/D-07/D-12) extends this screen; outline thumbnails already render from specs
- `components/site-nav.tsx` — right end of the nav is where Sign in / avatar / Save / "Saved" tick land (D-02, D-05, D-08)
- `components/summary/*` — Board Name box stays the naming home (D-05)
- `components/ui/*` — shadcn dialog/button primitives for sign-in dialog, name prompt, confirms

### Established Patterns
- All design values stored metric (branded Mm/Degrees/Litres), converted at the UI edge via `lib/geometry/units.ts` — the database snapshot stores the same metric spec objects; no imperial in the DB
- Geometry math pure and tested under `lib/geometry/` — persistence code must not import React; serialization helpers should be pure and unit-tested
- One screen per route under `app/design/*` with the shared store in the root layout

### Integration Points
- `app/layout.tsx` — ClerkProvider wraps the app; the design store stays client-side
- `components/design/design-store.tsx` — gains load-model, model identity (id/name), dirty tracking for autosave (D-08) and the "Saved" tick
- `app/page.tsx` / setup screen — rack section for signed-in users (D-06/D-07)
- New: Drizzle schema + Neon connection + server routes/actions for CRUD (save, list, load, rename, duplicate, delete)
- Vercel env vars for Clerk + Neon; Clerk dashboard config (email/password, Google, reset emails)

### Non-code prerequisites (user-owned)
- Clerk account + application (publishable/secret keys) and Neon project (connection string) must be created by the user — flag as blockers in planning; nothing runs without them

</code_context>

<specifics>
## Specific Ideas

- "Sign in and your boards are saved" — the banner sells the payoff, not the account
- The rack should feel like the preset cards: a shaper recognises their board by its outline and numbers (6'2" × 20 1/4" × 2 5/8", 34 L)

</specifics>

<deferred>
## Deferred Ideas

- Copy-spec-to-clipboard across design screens (todo, UI polish — not accounts/saving)
- Rails viewer "View Full Sized" modal + plan view (todo, UI polish)

</deferred>
