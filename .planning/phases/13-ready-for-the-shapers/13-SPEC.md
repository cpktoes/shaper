# Phase 13: Ready for the Shapers — Specification

**Created:** 2026-09-27
**Deadline:** Saturday 2026-10-10, when the founder shows Shaper Assistant to many shapers at once. **Freeze:** Wednesday 2026-10-07 evening — after that, only fixes for what the rehearsal (item 13) finds.
**Items:** 13, run one at a time in the order below
**Source:** the project review of 2026-09-27 (the day v1.4 closed), agreed with the founder the same day: "lets commit this to a GSD phase and memory so we don't get lost, tackling 1 at a time, starting with the security patch and cleanup"
**Guide:** "Shaping Bay to Production" (the founder's build guide), Stage 13. Oct 10 is **M4 — "Invite ten shapers. Free for everyone. Watch what they use. Fix the top five complaints. Add whatever they all ask for."** Going public with tiered subscriptions shortly after is **M5 — "Turn on Pro"**, which is its own milestone after this one (see *After Oct 10* below).

## Goal

When a room of shapers sees the app on Oct 10 it is safe, tidy, and credible on the numbers they know best, and it is ready to hear from them. That means the security patch is live, the project is clean, the founder's open decisions are made, volume has been proven against real boards, the printed order form is complete, a shaper has a way to reach the founder, and the founder can see which screens get used. The whole trip is rehearsed on real phones before the freeze.

## Background

The review found the app healthy: the live site at www.shaperassistant.com was serving `main` exactly, 3,043 unit tests passed, lint had no errors, and sign-in ran on Clerk's production instance (Google or email, public sign-up). It also found what stands between that and a room full of shapers:

- **Security.** The live site ran Next.js 16.3.1, which carries a critical advisory (fixed in 16.3.6). There were also five lesser advisories, mostly in developer tooling pulled in by the `shadcn` package, plus `sharp`, which comes with Next.
- **Loose ends from shipped work.** Five Phase 12 founder questions (foot of `milestones/v1.4-phases/12-foil-the-way-a-shaper-cuts-it/12-UAT.md`). The retired `extra_center_thickness_mm` column (D-19). The four presets' blanks, still marked provisional, whose litres moved again under v1.4. The whole-app walk on a real Android phone, skipped in v1.2 (D-12); only ROCKER has been tried on one since. The Google OAuth secret file sitting in the project folder, and `.env.example` never created. Stale records carried through three milestone closes.
- **Credibility.** Volume has only been checked against one foam blank's catalogue figure (the Arctic Foam 7'3" SBF test), never against a finished board with known litres. The Shortboard preset reads 6'2" × 18¾" × 2¼" = 30.2 L, and a production shortboard at those numbers usually reads nearer 27–28 L (a rough rule of thumb). The order form lacks the tip thicknesses and the planer passes.
- **Listening.** There's no way to send feedback and no record of which screens get used. There's no privacy note, even though shapers will be signing up with their email addresses. A crash shows the framework's bare default screen, and a texted link shows no preview picture.

## How this phase runs

- **One item at a time, in order.** Each code item runs as its own `/gsd-quick` task, named "Phase 13 item N: …", and stops for the founder's review before the next one starts. Founder items are decisions or walks, recorded in the Progress Log below.
- **Nothing reaches the live site without the founder's go.** Every code item passes `npm test`, `npm run lint`, `npm run build` (in the main checkout) and the browser tests before it is offered for deployment.
- **Tick the item** in this file's Progress Log and in the Phase 13 checklist in `ROADMAP.md` in the same commit that records it.
- If an item turns out bigger than a quick task, stop and ask; don't grow it silently.
- The phase closes with item 13's rehearsal recorded in `13-UAT.md`. The milestone (v1.5) closes after the demo, when the founder has heard from the shapers.

## Work list

### Safe fixes shapers won't see — Mon–Tue, Sep 28–29

1. **Security patch.** Next.js 16.3.1 → 16.3.6 (and the matching `eslint-config-next`), plus `npm audit fix` for the advisories that arrive through other packages. Nothing else is upgraded: no Clerk, no major versions. This is the smallest change that clears the advisories.
   *Who:* Claude (quick task); the founder gives the go to deploy.
   *Done when:* `npm audit --omit=dev` shows no critical or high advisory (anything moderate left is named, with why); unit tests, lint, the production build, all three browser-test profiles and the production-build suite pass; and, after the founder's go, the live site serves the new build.

2. **Housekeeping and old records.**
   - Delete the six merged branches, here and on GitHub, and decide the one unmerged sketch branch (`design/horizontal-template-view`).
   - Remove the two finished session worktrees and the orphan `agent-…` folder.
   - Delete the five unused starter images in `public/`.
   - Stop committing the research cache: ignore the folder and untrack its files.
   - Clear the 11 lint warnings.
   - Close the stale records carried through three milestone closes: the seven diagnosed debug sessions, the five quick-task records, the two open entries in `WINDOWS.md`, and the phone-width todo that v1.2 delivered.
   *Who:* Claude (quick task). *Founder:* move `client_secret_…json` out of the project folder into a password manager; create `.env.example` (three names, no values), which Claude is blocked from writing; say whether GSD's model profile goes back to `balanced` for routine items (the guide's advice, keeping `quality` for the volume check and for billing).
   *Done when:* only `main` (and any branch the founder keeps) remains; `git worktree list` shows only the main checkout; lint reports 0 warnings; and the pre-close scanner lists only the real backlog.

3. **Retire the unused Extra Center Thickness column** (D-19). This is a removal, so the order is: take it out of the schema, deploy, then drop it from the development database and, once that deploy is live, from production.
   *Who:* Claude (quick task); the founder is present for the production step.
   *Done when:* neither database has the column, and a signed-in shaper's settings still save on the live site.

### The founder's decisions — this week, about an hour

4. **The five Phase 12 questions.** Claude's suggestions:
   - (1) Is ⅛" the right minimum thickness at a thin tip? The founder's call as a shaper.
   - (2) Carried-over Phase 11 boards open with every blank greyed until the fine-tune is reset: accept, since production holds only one such board.
   - (3) The reason line that blames the blank's thickness when a negative fine-tune is the cause: reword it (a small quick task).
   - (4) A saved Deck Skin accepted anywhere in 0–50 mm: keep it, because that's what lets every older board open.
   - (5) A tab left open across the Phase 12 deploy: accept, since that moment is past.
   *Done when:* each answer is recorded in the Progress Log and any agreed rewording has shipped.

5. **The four preset blanks.** The founder confirms or re-picks each preset's blank. They were provisional in v1.3 and passed as built, but they're still marked provisional, and v1.4 moved their litres (Shortboard 30.2, Fish 35.4, Mid-length 51.5, Longboard 75.3 L). These four cards are the first thing every shaper sees.
   *Done when:* each preset uses the founder's pick, captured through the preset-capture workflow, with no "provisional" marks left; and the four cards' litres read right to the founder, after item 7.

6. **The fin-placement tail question** (todo `2026-08-21-fins-imported-template-width-branch`). When an outline is imported, is the generic tail curve close enough for fin placement, or must placement follow the drawn tail?
   *Done when:* the todo is closed as won't-fix, or kept for after Oct 10 with the reason written in it.

### What shapers will test first — Wed–Fri, Sep 30–Oct 2

7. **Volume proven against three real boards** (guide Stage 12: *"Ask a shaper friend for three real boards with measured volumes and use those"*). The founder supplies three boards with known dimensions and litres: friends' boards or well-known production models, one of them a shortboard near the preset's 6'2" × 18¾" × 2¼". Claude builds each in the app, compares, and explains any gap in plain English. Anything wrong is fixed in `lib/geometry/` with tests, and the three boards become permanent test fixtures, kept as source data the way the blank catalogues are (never hand-typed expected numbers).
   *Who:* the founder (the three boards and the tolerance), then Claude (quick task, on the `quality` profile).
   *Done when:* all three read within the tolerance the founder sets, and the Shortboard preset's 30.2 L is either explained or corrected.

8. **The order form carries the tips and the planer passes** (todo `2026-09-27-summary-needs-tip-thickness-and-deck-bottom-passes`). The printed Shaper Reference sheet shows the Nose Tip and Tail Tip thicknesses, the Deck Skin, and the foam off the bottom as a depth and as planer passes (the foam-off numbers only when a blank is picked). Every number is read through `measure-display.ts` and the DATASHEET's own derivations, and the sheet stays within its page budget.
   *Done when:* the print tests and a headless print-to-PDF prove it in both Imperial and Metric, and the founder approves it on paper.

9. **Blank catalogue links, if time allows before the freeze** (todo `2026-09-26-open-the-blank-s-catalog-page-from-the-app`). A picked blank links to its maker's catalogue, and to the right page where the vendor allows it, from the blank card and from the DATASHEET's footnote. The addresses come from a fixed table in `lib/blanks/`, never from free text.
   *Done when:* each vendor's link opens the right catalogue on desktop and phone, or the item is moved to after Oct 10.

9b. **Optional: a ghost of the last edit on TEMPLATE** (todo `2026-09-27-show-a-ghost-of-the-last-edit-on-the-template-screen`, added by the founder on 2026-09-27: "add a ghost image on the template page so that when you edit, you still have a reference of your last edit"). A faint outline of the shape before the most recent edit, drawn behind the live one on screen only, never printed. The before-shape already sits in the undo history, so this needs no new geometry. Which "last edit" it shows, and whether it fades or has a toggle, is the founder's call when it is planned.
   *Who:* the founder (those choices), then Claude (quick task). **Built only if items 1–9 leave room before the Oct 7 freeze** (founder, 2026-09-27); otherwise it moves to after Oct 10.
   *Done when:* the ghost shows after an edit on desktop and phone, in both orientations, in all four themes, and never on paper or the Summary; or the item is moved to after Oct 10.

### Ready to listen (guide M4) — Sat–Mon, Oct 3–5

10. **Contact page** (todo `2026-09-27-add-a-contacts-page`). A `/contact` page that works signed in or out, reachable from the gear menu and the phone menu. The founder decides the words and whether it's an email link or a small form.
    *Done when:* a shaper can reach it from any screen in two taps, and a message sent from it arrives.

11. **Visitor analytics and a privacy page** (guide M4: *"Watch what they use"*).
    - Analytics: Vercel's own Web Analytics, cookie-free, counting visits per screen. The founder switches it on in the Vercel dashboard.
    - Privacy page: short and in plain English, covering what's collected (the account's name and email through Clerk, saved boards and preferences, anonymous page visits), why, and how to ask for deletion. It's linked from both menus and from Clerk's sign-in. This version covers the free demo; a person checks the wording properly before paid tiers (M5).
    *Done when:* screen visits appear in Vercel's dashboard and the privacy page is live.

12. **A friendly error screen and a link-preview picture.** Replace the framework's bare default with an on-brand "something went wrong" screen and a not-found page, each with a way back and a way to report the problem. Add a link-preview picture and description so a texted or posted link shows the app.
    *Done when:* a forced error shows the new screen on desktop and phone, and the live page carries the preview tags with an image that loads.

### Rehearse, then freeze — Tue–Thu, Oct 6–8

13. **Real-device rehearsal.**
    - Walk the live site end to end (sign-in, presets, every design screen, saving, printing the order form) on a real Android phone, the founder's iPhone, and the laptop that will be used on Oct 10.
    - Someone other than the founder signs up with Google on the live site. This proves Google's consent screen is published rather than in "testing", where only listed test users can sign in.
    - A demo account holds a few finished boards.
    - Check headroom for a crowd signing up at once: Neon usage, Vercel usage, Clerk's user limit.
    *Done when:* the walk is recorded in `13-UAT.md` with every step passed or fixed, and the freeze is in place from Wednesday Oct 7 evening.

## Rules that hold for every item

- CLAUDE.md Rule 1 (geometry in `lib/geometry/`, pure and tested; expected values from fixtures, never hand-typed) and Rule 2 (every number through `lib/geometry/units.ts` / `measure-display.ts`; storage stays metric).
- The three layout switches in CLAUDE.md (width picks the layout, pointer picks sizing, height picks scrolling) for any new control or page.
- Database order: additive changes go to production **before** the deploy; removals go **after** it (CLAUDE.md, amended 2026-09-26).
- No change to how a saved board opens or what it shows, except where an item says so and the founder has approved it.
- Explain every change to the founder in plain English: what it does to the board or the screen.

## After Oct 10 — recorded here, not part of this phase

- **Listen (guide M4), about 1–2 weeks.** Fix the top five complaints and add what they all ask for. Use the visit counts to see which screens shapers actually use, because that is where the Free/Pro line gets drawn. The guide suggests outline editing and printable templates free, with rocker, volume, fins, exports and unlimited boards as Pro, but it says to let real shapers decide.
- **The curve-flow phase (founder, 2026-09-28): its own phase after Oct 10.** The foil and rocker curves get a realistic surfboard flow: never a hump near a tip, no kinks or facets, and still no overshoot at the nose. It needs a discussion, curve-type research, a golden of today's numbers first, and a carry-over for saved boards. Todo `2026-09-28-give-the-foil-and-rocker-curves-a-realistic-surfboard-flow` (major), which folds in the 2026-09-26 smoother-rocker todo.
- **Custom rocker on a blank (founder, 2026-09-28):** an "Edit rocker" button on ROCKER's DATASHEET unlocks the blank's rocker values. The edited blank is saved as the shaper's own Custom Blank in their blank list, and the founder is told the profile is wanted. In time, popular adjustments join the shared catalogue. Todo `2026-09-28-custom-rocker-on-a-blank-saved-as-the-shaper-s-own-custom-bl` (minor); it pairs naturally with the curve-flow phase.
- **v1.6 — Turn on Pro (guide M5), its own milestone on the `quality` profile:**
  - terms and privacy pages checked by a person
  - Vercel Pro (the free Hobby plan is non-commercial, so this is required before taking money)
  - a Stripe account and Clerk Billing
  - a `/pricing` page
  - Pro features locked on the server, not just hidden in the screens
  - a Stripe test-mode run-through: buy, unlock, cancel, locked again
  - a full security review before the live keys, folding in the two v1.1 checks never run (Phase 5 security, Phases 5–7 validation)
  - the branded order form (todo `2026-09-06-brand-the-order-form-for-paid-shapers`) as a ready-made first Pro feature
- **Guide M6 and the backlog, ordered by what shapers ask for:**
  - DXF/SVG export for CNC
  - read-only share links
  - comparing two boards
  - a public gallery, with finished-board photos (todo 2026-08-19)
  - saved-board version history (the one M3 item never built)
  - bottom contours (a full phase: new maths, and it changes volume)
  - live coordinates under the pointer
  - the fin tail branch, if item 6 keeps it

## Progress Log

| Item | Date | How | Record | Outcome |
|------|------|-----|--------|---------|
| — | 2026-09-27 | Phase opened | this file | Work list agreed with the founder; item 1 next |
| 1 | 2026-09-27 | quick 260927-onx | 5d2d5a1, e9afc79 (merged 2947858; pushed as ec28b43) | **✅ Done — live.** Deployed on the founder's go: pushed 01:14:55 UTC 2026-09-28, Vercel production deployment 6700402439 succeeded 53 s later; the live build changed (`rM62mCXw…` → `9j5yksjo…`), all seven pages answer 200, the home page shows the four presets, sign-in is still on Clerk's production key, and the ROCKER screen still lists all three makers' blanks from the database. Next.js 16.3.1 → 16.3.6 and sharp 0.35.5; fast-uri, js-yaml, hono and qs patched; nothing else upgraded (drizzle-kit held at 0.31.10). `npm audit --omit=dev` 6 → 0; 3,043 unit tests, lint (0 errors, the same 11 warnings), the build, 360 browser tests across iPhone, Android and desktop (screenshots unchanged) and the production-build suite all green on `main` after `npm ci`. Four developer-only moderates stay (the esbuild chain under drizzle-kit — see the task SUMMARY) |
| — | 2026-09-27 | founder | 79590b4 | The founder created `.env.example` (three names, no values — checked without printing it) and it is committed; one of item 2's two founder steps done. The founder also added optional item 9b (a ghost of the last edit on TEMPLATE, todo e73e80e) |
| 2 | 2026-09-27 | quick 260927-pij | aa086a3, 3cb5e31, 1464bcd, f722d32 (records 108dbf4) | **✅ Done — live.** Pushed on the founder's go at 02:07 UTC 2026-09-28 and the three GitHub branches deleted (GitHub now holds only `main`); Vercel production deployment 6700939587 succeeded; all seven pages answer 200, the rails plan picture still loads while a deleted starter image now answers 404, and ROCKER still lists all three makers' blanks. Only `main` remains here; the two session worktrees and the orphan folder are gone; five starter images deleted; the research cache ignored and untracked; `.env.example` made committable (a later `.env*` rule had been re-ignoring it); lint 0 warnings with the golden fixtures byte-identical, 3,043 unit tests, the build, 360 browser tests (desktop screenshots unchanged) and the production-build suite green; 7 debug sessions resolved, 4 quick-task records completed, both ledger entries closed, the phone-width todo completed — the scanner lists only the 9 real todos. **Founder decision:** GSD model profile `balanced` for routine items, `quality` for item 7 and billing. **Founder steps still open:** move `client_secret_…json` into a password manager; create `.env.example` |
| 3 | 2026-09-27 | quick 260927-qrn | 39b9b3d, 3a614b9 (records 45e1ac1) | **✅ Done — both databases.** Pushed on the founder's go at 02:50 UTC 2026-09-28; Vercel production deployment 6701389602 succeeded at 02:51 (all seven pages 200). Then, in the founder's own terminal, the one command from the check script's header: production before `present (expected present)` / 8 migrations → migration 0008 applied → after `absent (expected absent)` / 9; the temporary production settings file deleted itself on exit. The founder then changed a setting on the live site while signed in, reloaded, and it had saved. Development side: Migration 0008 (`ALTER TABLE "user_preferences" DROP COLUMN "extra_center_thickness_mm";`) generated and applied to the development database: before `present (expected present)` / 8 migrations, after `absent (expected absent)` / 9, a second run changed nothing. The account-settings check now expects the column gone and takes `--before-drop` for production's one run before the removal; a mistyped option stops it before any database work. 3,043 unit tests, lint 0 warnings and tsc green |
| 4 | 2026-09-28 | founder's answers | this commit | **Answered; the code follows as two quick tasks.** Q1 (the thin spot near a tip): **raise the floor from 1/8" to 1/4" anywhere on the board, and the lowest tip setting to 1/4"** ("no boards should have a 1/8" tip anyway"), and the real fix, curve rules that never hump, is its own phase after Oct 10 (todo 2026-09-28, major). Q2 (Phase 11 boards opening greyed until Reset Fine-Tune): **accept**. Q3 (the floor reason line): **correct it with a proper rewording by cause**. Q4 (saved Deck Skin 0–50 mm vs the slider's 1/16"–1/2"): **open the slider up to the full 0–50 mm range** ("some shapers not wanting to add a planer max depth"). Q5 (a tab left open across the Phase 12 deploy): **accept**. Code: (4a) the 1/4" floor, the 1/4" lowest tip setting and the reason line reworded by cause; (4b) the Deck Skin slider and default opened to 0–50 mm. Each is reviewed before it is pushed. The curve question was measured first with the app's own maths (the 1,611-board stress test: 92 humps at today's tips, none on short blanks or presets), which corrected Phase 12's "522 of 528" (that counted tips built back up, not humps) |
| 4a | 2026-09-28 | quick 260928-j00 | 8864015, 17f697c, 1021b0a (records a7457de) | **✅ Live.** Pushed on the founder's go at 22:28 UTC; Vercel production deployment 6722009323 succeeded; all seven pages answer 200, ROCKER lists all three makers' blanks, and the live ROCKER code carries the new reason wording ("takes too much off there"). Floor 1/8" → 1/4" anywhere, one figure with the lowest thickness any ROCKER control or the defaults dialog offers; stored thinner tips still read back as saved; the reason line names its cause — e.g. `Less than 1/4" would be left 12" from the nose — your nose fine-tune takes too much off there` (Metric: `Less than 6 mm …`). Development: 0 of 7 saved boards and 0 account defaults under 1/4". 3,064 unit tests, lint 0 warnings, tsc, the build, 360 browser tests (desktop screenshots within tolerance, none re-recorded) and the production-build suite green |
