---
phase: quick-260909-sda
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/site-nav.tsx
  - components/design/phone-top-bar.tsx
  - components/summary/order-form-primitives.tsx
  - components/summary/order-form.tsx
  - app/design/summary/order-form.css
  - app/layout.tsx
  - app/page.tsx
  - app/design/outline/page.tsx
  - app/design/rocker/page.tsx
  - app/design/rails/page.tsx
  - app/design/volume/page.tsx
  - app/design/fins/page.tsx
  - app/design/summary/page.tsx
  - package.json
  - README.md
  - CLAUDE.md
  - .claude/CLAUDE.md
  - .planning/PROJECT.md
  - e2e/phone-home.spec.ts
  - e2e/phone-layout.spec.ts
  - e2e/summary-preview.spec.ts
  - e2e/prod/slider-dots.spec.ts
  - e2e/desktop-baseline.spec.ts-snapshots/outline-desktop-desktop-darwin.png
  - e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png
  - e2e/desktop-baseline.spec.ts-snapshots/rails-desktop-desktop-darwin.png
  - e2e/desktop-baseline.spec.ts-snapshots/volume-desktop-desktop-darwin.png
  - e2e/desktop-baseline.spec.ts-snapshots/fins-desktop-desktop-darwin.png
autonomous: true
requirements: [QT-260909-sda]

estimate:
  tokens: 70000
  raw_tokens: 45000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "The name over the app reads SHAPER ASSISTANT — on the desktop top bar, on the phone top bar on the setup screen and on all six design screens, and on both printed order-form sheets."
    - "Every browser tab reads Shaper Assistant: `Shaper Assistant — Surfboard Design` as the app-wide default, `Shaper Assistant — Start a New Board` on the setup screen, and `<Screen> — Shaper Assistant` on the six design and summary screens."
    - "The phone top bar still holds the name, Save and the menu button on one line at 360px wide, with real space between the name and Save, in every one of Save's four faces — Save, Saving…, Saved and Not saved. Nothing wraps, nothing is cut off, and the phone screens still never scroll sideways."
    - "The project's own paperwork says Shaper Assistant: CLAUDE.md's heading, PROJECT.md's heading, the project name in .claude/CLAUDE.md, and the package name. Both places that print the live web address now point at https://www.shaperassistant.com."
    - "Not one number a shaper cuts foam to has moved. Nothing under lib/geometry/ is touched, no drawing is redrawn, no measurement is recalculated, and every geometry test still passes untouched."
    - "The word for the PERSON — shaper — is unchanged everywhere it appears: in prose, in code comments, in test names, in the order form's `Shaper Use Only` box and its `Shaper Reference` back page, in the `Shaper Supply` fin table's own name, and in every mention of the old iShaper reference prototype."
    - "The five desktop reference screenshots were regenerated on purpose, and the only pixels that moved sit in the name at the top-left of the bar. Everything else on those five screens is pixel-identical."
  artifacts:
    - components/site-nav.tsx
    - components/design/phone-top-bar.tsx
    - components/summary/order-form-primitives.tsx
    - components/summary/order-form.tsx
    - app/layout.tsx
    - e2e/phone-home.spec.ts
    - e2e/desktop-baseline.spec.ts-snapshots/outline-desktop-desktop-darwin.png
  key_links:
    - "D-01 — THE PHONE NAME GETS ONE SIZE SMALLER, PHONE ONLY. Measured in a real browser at planning time, on /design/outline at 360px with a coarse pointer. The bar's inside width is 328px (56px tall, 16px padding each side). Its right-hand cluster is 123.8px wide in the everyday `Save` state, but 149.0px in the three other Save faces (`Saving…`, `Saved`, `Not saved` all carry `min-w-20` = 80px, wider than the 54.8px filled Save button) — 149.0px is the honest worst case. Against that: today's `SHAPER` at `text-sm`/`tracking-architectural` is 70.0px wide, leaving 109.0px of clear air. `SHAPER ASSISTANT` at that same size is 175.4px, leaving 3.5px — it does NOT overflow and does NOT wrap, but 3.5px is visually touching the Save control (confirmed on a screenshot). `SHAPER ASSISTANT` at `text-xs` with the tracking left alone is 150.3px, leaving 28.7px of clear air. DECISION: `text-xs`, tracking untouched, on the phone bar only. It uses two tokens the app already has rather than inventing a one-off size and a one-off tracking, it keeps `--tracking-architectural` as the single tracking value every all-caps heading in the app shares (app/globals.css says exactly that), and it buys MORE room than a 13px/0.12em alternative would (28.7px vs 22.4px). At 390px on an iPhone 14 the bar's inside width is 358px and the same choice leaves 58.7px. The desktop bar is NOT resized — at 1280px it has 325.8px to spare with the longer name."
    - "D-02 — THE PRINTED SHEET KEEPS ITS TYPE SIZE; THE NAME STACKS ONTO TWO LINES. Measured on /design/summary at the order form's own 880px design width. The identity box at the top-left of page 1 has 272px of usable width inside its border; `Shaper Assistant` at today's 24.64px is 270.2px, so it breaks onto two centred lines — `SHAPER` over `ASSISTANT` — inside a box whose height does not change and does not clip (rendered and eyeballed at planning time: it reads as a deliberate stacked logo above the rule, not as an accident). On page 2 the same name sits on ONE line, 308.6px wide, in the reference header beside the board name, which still has 147.2px and does not truncate for an ordinary name. So `--order-form-wordmark` in app/design/summary/order-form.css is NOT changed, and e2e/summary-preview.spec.ts's `WORDMARK_PX = 24.64` stays correct and stays green. (If the founder later prefers one line in the identity box, the measured answer is 20px — 250.5px, one line in both places. Do NOT do that now.)"
    - "D-03 — WHAT THE FIVE DESKTOP SCREENSHOTS ARE ALLOWED TO CHANGE. Measured at 1280px: the name's painted box starts at x=48, runs y=30 to y=50, and grows from 70.0px wide to 175.4px wide. The bar's right-hand cluster does not move at all (its left edge is 549.2px before and after — the bar pins it to the right edge), and the bar's height stays 81px. So every changed pixel must fall inside roughly x 48–224, y 30–50. Nothing below y=81 may differ on any of the five images."
    - "THE ONE RULE: only the PRODUCT name changes. `shaper` is also the word for the PERSON using the app, and it stays exactly as it is everywhere — including three traps that look like the product name but are not: the order form's `Shaper Use Only` sub-box (components/summary/order-form.tsx line 699, its comment on line 11, and app/design/summary/order-form.css line 519), the order form's page-2 `Shaper Reference` page mark (order-form.tsx line 720, asserted in components/summary/rail-instructions-sheet.test.ts line 77), and the `Thruster — Basic (Shaper Supply)` fin table in lib/geometry/fins.ts line 1019, which names a real fin company. Every `iShaper` mention names the founder's separate reference prototype and also stays."
    - "DELIBERATELY NOT RENAMED, and the SUMMARY must say so: (a) the `Shaper: …` prefix on internal error logs in app/page.tsx, components/design/design-store.tsx, components/design/save-button.tsx, lib/units-server.ts, lib/preference-handoff.ts and lib/print-instructions-server.ts — those are developer diagnostics, not branding, and no shaper ever sees them; (b) every browser storage key that starts `shaper-` (`shaper-units`, `shaper-theme`, `shaper-sign-in-banner-dismissed`, `shaper-print-rail-instructions`, `shaper-toolbar-tip-dismissed`) — renaming a key silently throws away the saved choice behind it, so a shaper would find their units preference and their dismissed banners reset for no reason; (c) app/globals.css line 448's comment, which records the historical fact that the founder picked the old wordmark's tracking as the heading standard — still true as history."
    - "OUT OF SCOPE — infrastructure names the founder must change elsewhere, if at all: the Vercel project name, the GitHub repository name (`cpktoes/shaper`), and the Clerk application's display name, which appears on sign-in screens and account emails and lives in Clerk's dashboard rather than in this repository. List all three in the SUMMARY."
---

<objective>
Rename the product to **Shaper Assistant**, to match its new home at shaperassistant.com.

Purpose: the app now lives at www.shaperassistant.com, and the name over the door should say so —
on screen, on the printed order form, in the browser tab, and in the project's own paperwork.

Output: the name reads SHAPER ASSISTANT everywhere the product names itself; every mention of a
*shaper the person* is untouched; the five desktop reference screenshots are regenerated with
proof that only the name moved.

This is a naming change and nothing else. No board number changes, no formula is touched, no
drawing is redrawn.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@CLAUDE.md
</context>

<execution_constraints>
Work in a git worktree, not the main checkout.

- Run `npm install --no-audit --no-fund` once in the worktree before any Playwright command.
- Put `PW_PORT=3127` on EVERY Playwright invocation. Port 3000 is the founder's own dev server —
  never touch it. Port 3100 is the suite's default and another checkout may be holding it.
- The browsers are already installed. Never run `npx playwright install`.
- Checks: `npx tsc --noEmit` (if a fresh worktree is missing route types, run `npx next typegen`
  once first), `npx vitest run` (never bare `vitest`), `npm run lint`.
- `npm run build` runs on main after the merge — that is the orchestrator's job, not this plan's.
- `--update-snapshots` is permitted for `e2e/desktop-baseline.spec.ts` ONLY, and only after the
  diff inspection in Task 3. Never pass it to any other spec.
- Do not edit anything under `lib/geometry/`, `components/ui/`, or any viewer component.
</execution_constraints>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Put the name SHAPER ASSISTANT over the app, on every screen and both printed sheets</name>

  <files>
    components/site-nav.tsx,
    components/design/phone-top-bar.tsx,
    components/summary/order-form-primitives.tsx,
    components/summary/order-form.tsx,
    app/design/summary/order-form.css,
    e2e/phone-home.spec.ts,
    e2e/phone-layout.spec.ts,
    e2e/summary-preview.spec.ts
  </files>

  <read_first>
    components/site-nav.tsx (the header comment at line 10, and the name link at line 57),
    components/design/phone-top-bar.tsx (whole file — it is 54 lines),
    components/summary/order-form-primitives.tsx (LogoBlock, around lines 192-215),
    components/summary/order-form.tsx (the page-2 reference header, around lines 570-575),
    e2e/phone-home.spec.ts (lines 30-46, 105-118, 228-236),
    e2e/phone-layout.spec.ts (lines 165-185),
    e2e/summary-preview.spec.ts (lines 20-25 and 55-60)
  </read_first>

  <behavior>
    Write the test expectations first, then make them true.

    - On a phone at 360px on the setup screen `/`: the top bar shows the exact text
      `SHAPER ASSISTANT`, and it is NOT a link (it points at the page already being read).
    - On a phone at 360px on `/design/outline`: the top bar shows a link whose accessible name is
      exactly `SHAPER ASSISTANT`, and tapping it returns to the setup screen.
    - On a phone at 360px, in the top bar, the gap between the right edge of the name and the left
      edge of the Save control is at least 20px in Save's widest face — assert it directly, do not
      infer it from "no overflow". Measured headroom for this: 28.7px.
    - The top bar is still one non-wrapping row at 360px (`scrollHeight === clientHeight`), and the
      page still has no sideways scroll.
    - On the summary screen, both printed order-form sheets carry the text `Shaper Assistant`, and
      the name still computes to 24.64px type at the 880px design width.
  </behavior>

  <action>
Change the four places the product names itself on screen and in print, and update the browser
tests that name it. Nothing else in these files changes.

1. `components/site-nav.tsx` — the desktop bar. Change the link text on line 57 from the old
mark to `SHAPER ASSISTANT`. Leave its classes exactly as they are: at 1280px the bar has 325.8px
of room to spare with the longer name and the right-hand cluster does not move at all, so no
resizing is warranted (D-03). Update the file's header comment on line 10, which names the mark,
to name the new one. That comment line carries no person-sense wording — keep it that way.

2. `components/design/phone-top-bar.tsx` — the phone bar, both faces. Change both renderings of
the mark (the plain-text one on `/` at line 41, and the link one at line 44) to
`SHAPER ASSISTANT`. Then apply D-01: in `WORDMARK_CLASS` on line 29, swap `text-sm` for
`text-xs`. Change NOTHING else in that class — `font-extrabold`, `tracking-architectural` and
`text-surf-ink` all stay, so the mark keeps the app's one architectural tracking value and its
weight, and only steps down one size. Because that class was written as a deliberate copy of the
desktop bar's own class, its comment on lines 27-29 is now WRONG: rewrite it to say the two marks
now differ on purpose — the phone bar is one size smaller so the longer name keeps real space
between itself and Save at 360px — and record the measured figures (328px of bar, a 149.0px
right-hand cluster in Save's widest face, a 150.3px mark, 28.7px of clear air). Keep person-sense
wording off any line you touch here; see this task's verify block for the guard that checks it.

3. `components/summary/order-form-primitives.tsx` — the printed identity box. In `LogoBlock`
(around line 203) change the mark to `Shaper Assistant`. Per D-02 change no type size and no
class: at the order form's 880px design width it breaks onto two centred lines inside its
bordered box, which is the intended stacked logo lockup and does not clip.

4. `components/summary/order-form.tsx` — the printed page-2 reference header. Change the mark
(around line 572) to `Shaper Assistant`. It stays on one line there.

5. `app/design/summary/order-form.css` — line 63's comment names the mark in the
`--order-form-wordmark` note. Update the name in that comment. Do NOT change the value: it stays
`clamp(16px, 2.8cqw, 34px)`. Line 519's comment names the `SHAPER USE ONLY` box, which is about
the person, not the product — leave line 519 completely alone.

6. The browser tests. In `e2e/phone-home.spec.ts` and `e2e/phone-layout.spec.ts`, every
`getByRole("link", { name: ... })` and `getByRole(...)`-style lookup that names the mark must be
updated: role-name matching is a whole-string match by default, so a stale name would fail
outright. The `getByText(...)` lookup and the `toHaveCount(0)` assertion in phone-home.spec.ts
around lines 40-42 are the subtle ones — text lookups match on substring, so a stale string would
keep PASSING while no longer testing what its own sentence claims. Update both, and update the
test title on line 30 that spells the mark out. Then add the new gap assertion from
`<behavior>` to the phone-layout.spec.ts case that already checks the bar is one non-wrapping row
at 360px, measuring in Save's widest face rather than its everyday one. In
`e2e/summary-preview.spec.ts`, only the two comments on lines 23 and 58 name the mark — update
those. That spec finds the mark by its `.order-form-wordmark` class, not by its text, and
`WORDMARK_PX = 24.64` is still the right number, so no assertion there changes.

Expect `e2e/desktop-baseline.spec.ts` to go RED at the end of this task. That is correct and
intended: those five reference pictures still show the old name. Task 3 is what inspects that
redness and then closes it — it needs the failure this task creates.

Suggested commit subject: `feat(branding): the app now calls itself Shaper Assistant on screen and in print`
  </action>

  <verify>
    <automated>PW_PORT=3127 npx playwright test e2e/phone-home.spec.ts e2e/phone-layout.spec.ts e2e/summary-preview.spec.ts --project=iphone --project=android</automated>
    <automated>npx vitest run &amp;&amp; npx tsc --noEmit &amp;&amp; npm run lint</automated>
    <automated>! git diff --unified=0 main -- ':!.planning/quick' ':!e2e/desktop-baseline.spec.ts-snapshots' | grep '^-' | grep -v '^---' | grep -E "([Aa]|[Tt]he|[Ee]very|[Ee]ach|[Aa]ny|[Pp]er) shapers?\b|shaper's|[Ss]hapers\b"</automated>
    <automated>test "$(grep -c 'SHAPER ASSISTANT' components/site-nav.tsx components/design/phone-top-bar.tsx --include='*.tsx' -h | paste -sd+ - | bc)" -ge 3</automated>
  </verify>

  <done>
    The phone and summary specs pass on both phone profiles; unit tests, types and lint are clean;
    the third command prints nothing, proving no removed line carried a person-sense mention of a
    shaper; the desktop nav, both phone-bar faces and both printed sheets read the new name.
  </done>
</task>

<task type="auto">
  <name>Task 2: Retitle the browser tabs and rename the project in its own paperwork</name>

  <files>
    app/layout.tsx,
    app/page.tsx,
    app/design/outline/page.tsx,
    app/design/rocker/page.tsx,
    app/design/rails/page.tsx,
    app/design/volume/page.tsx,
    app/design/fins/page.tsx,
    app/design/summary/page.tsx,
    package.json,
    README.md,
    CLAUDE.md,
    .claude/CLAUDE.md,
    .planning/PROJECT.md,
    e2e/prod/slider-dots.spec.ts
  </files>

  <read_first>
    app/layout.tsx (line 31),
    app/page.tsx (line 11),
    CLAUDE.md (lines 1-5 and line 19),
    .claude/CLAUDE.md (lines 1-6),
    .planning/PROJECT.md (line 1 and lines 110-113)
  </read_first>

  <action>
Eight browser titles, five documents, and one stale comment. Every edit below is a
replacement of the product name on that one line — never a rewrap of the paragraph around it, and
never a find-and-replace across the file.

Browser tab titles, exactly these strings:
- `app/layout.tsx` line 31 → `Shaper Assistant — Surfboard Design` (the app-wide default)
- `app/page.tsx` line 11 → `Shaper Assistant — Start a New Board`
- `app/design/outline/page.tsx` line 5 → `Outline Editor — Shaper Assistant`
- `app/design/rocker/page.tsx` line 5 → `Rocker &amp; Foil — Shaper Assistant`
- `app/design/rails/page.tsx` line 6 → `Rail Band Calculator — Shaper Assistant`
- `app/design/volume/page.tsx` line 5 → `Volume Estimator — Shaper Assistant`
- `app/design/fins/page.tsx` line 5 → `Fin Setup &amp; Placement — Shaper Assistant`
- `app/design/summary/page.tsx` line 6 → `Board Order Form — Shaper Assistant`

Keep the em dash `—` that every one of those titles already uses. Do not touch the
`console.error("Shaper: …")` call further down app/page.tsx — that is a developer log line, not
branding, and it stays (see the frontmatter's "deliberately not renamed" note).

The paperwork:
- `package.json` line 2: the package name becomes `shaper-assistant`. Nothing else in that file.
- `CLAUDE.md` line 3: the heading becomes `# Shaper Assistant`. Line 19: the deployed address
  becomes `https://www.shaperassistant.com`, and add a short trailing note in plain English that
  the old shaper-coral.vercel.app address redirects there, so nobody thinks the old link died.
  Change nothing else in CLAUDE.md — in particular Rule 2's heading and body are about the person
  and stay word for word.
- `.claude/CLAUDE.md` line 5: the project name becomes `**Shaper Assistant**`. That line sits
  inside a `<!-- GSD:project-start source:PROJECT.md -->` block generated from PROJECT.md, so
  change PROJECT.md to match in the same commit or the two will drift. Line 6's description
  mentions people who shape boards — leave line 6 entirely alone.
- `.planning/PROJECT.md` line 1: the heading becomes `# Shaper Assistant`. Line 111: replace only
  the web address with `https://www.shaperassistant.com`. Do NOT rewrap that paragraph — the next
  line down is about a person signing in, and rewrapping would drag it into the diff and trip this
  task's guard.
- `README.md` is still untouched create-next-app boilerplate. Give it a single real title line at
  the top — `# Shaper Assistant` and one plain-English sentence saying what the app is for. Leave
  the rest of the boilerplate exactly as it is. No rewrite.
- `e2e/prod/slider-dots.spec.ts` line 17: a comment names the product. Update the name there.

Suggested commit subject: `docs(branding): browser tabs and project paperwork now say Shaper Assistant`
  </action>

  <verify>
    <automated>npx tsc --noEmit &amp;&amp; npm run lint &amp;&amp; npx vitest run</automated>
    <automated>test "$(grep -rhc 'Shaper Assistant' app/layout.tsx app/page.tsx app/design/*/page.tsx | paste -sd+ - | bc)" -eq 8</automated>
    <automated>grep -q '"name": "shaper-assistant"' package.json &amp;&amp; grep -q 'www.shaperassistant.com' CLAUDE.md &amp;&amp; grep -q 'www.shaperassistant.com' .planning/PROJECT.md</automated>
    <automated>! grep -rn 'shaper-coral' CLAUDE.md .planning/PROJECT.md | grep -v redirect</automated>
    <automated>! git diff --unified=0 main -- ':!.planning/quick' ':!e2e/desktop-baseline.spec.ts-snapshots' | grep '^-' | grep -v '^---' | grep -E "([Aa]|[Tt]he|[Ee]very|[Ee]ach|[Aa]ny|[Pp]er) shapers?\b|shaper's|[Ss]hapers\b"</automated>
  </verify>

  <done>
    All eight titles read the new name, the package is `shaper-assistant`, both documents point at
    www.shaperassistant.com with the redirect noted, and the person-sense guard still prints
    nothing across the whole accumulated diff.
  </done>
</task>

<task type="auto">
  <name>Task 3: Regenerate the five desktop reference pictures, and prove only the name moved</name>

  <files>
    e2e/desktop-baseline.spec.ts-snapshots/outline-desktop-desktop-darwin.png,
    e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png,
    e2e/desktop-baseline.spec.ts-snapshots/rails-desktop-desktop-darwin.png,
    e2e/desktop-baseline.spec.ts-snapshots/volume-desktop-desktop-darwin.png,
    e2e/desktop-baseline.spec.ts-snapshots/fins-desktop-desktop-darwin.png
  </files>

  <read_first>
    e2e/desktop-baseline.spec.ts (the whole file — it is short, and its header comment explains
    what these five pictures are for and when regenerating them is legitimate)
  </read_first>

  <action>
These five pictures are the app's promise that the desktop never changed while phone work went
on, so they are normally never regenerated. Renaming the product is the one legitimate reason to
regenerate them, because the name sits in the bar at the top of all five. Do it in three steps,
in this order, and keep the evidence.

STEP 1 — fail on purpose and look at what changed. Run the spec WITHOUT updating anything:

    PW_PORT=3127 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop

All five must fail. Playwright writes `-expected.png`, `-actual.png` and `-diff.png` for each
under `test-results/`. For each of the five, compute the exact rectangle of changed pixels by
comparing expected against actual with Python and Pillow (Pillow 11.3 is installed; the pngjs
node package is NOT, so do not reach for it):

    python3 - <<'PY'
    from PIL import Image, ImageChops
    import glob, os
    for exp in sorted(glob.glob("test-results/**/*-expected.png", recursive=True)):
        act = exp.replace("-expected.png", "-actual.png")
        if not os.path.exists(act): continue
        a, b = Image.open(exp).convert("RGB"), Image.open(act).convert("RGB")
        box = ImageChops.difference(a, b).getbbox()
        print(os.path.basename(exp), "size", a.size, "changed box", box)
    PY

Every reported box must sit inside roughly x 48–224 and y 30–50 — the name's own painted area at
the top-left of the bar (D-03: the name grows from 70.0px wide to 175.4px, the bar's right-hand
cluster does not move, and the bar's height stays 81px). If ANY box reaches below y=81, or spills
right past x≈230, STOP and report it — something other than the name moved and this task must not
paper over it by regenerating. Write all five boxes down; they go in the SUMMARY.

STEP 2 — regenerate, only now, and only this spec:

    PW_PORT=3127 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop --update-snapshots

STEP 3 — prove the new pictures are correct by running the spec clean, with no update flag:

    PW_PORT=3127 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop

All five must pass. Then run the whole suite once so nothing else drifted:

    PW_PORT=3127 npm run test:e2e

Confirm `git status` shows exactly five changed PNGs under
`e2e/desktop-baseline.spec.ts-snapshots/` and no sixth image anywhere.

Suggested commit subject: `test(branding): refresh the five desktop reference pictures for the new name`
  </action>

  <verify>
    <automated>PW_PORT=3127 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop</automated>
    <automated>PW_PORT=3127 npm run test:e2e</automated>
    <automated>test "$(git status --porcelain e2e/desktop-baseline.spec.ts-snapshots/ | grep -c '\.png$')" -eq 5</automated>
    <automated>test "$(git status --porcelain -- '*.png' | grep -vc 'desktop-baseline.spec.ts-snapshots')" -eq 0</automated>
  </verify>

  <done>
    The desktop baseline spec passes against its own new pictures with no update flag; the whole
    browser suite is green on both phones and the desktop; exactly five PNGs changed and no other
    image in the repository did; the five changed-pixel rectangles are recorded for the SUMMARY.
  </done>
</task>

</tasks>

<verification>
Run from the worktree, after all three tasks:

1. `npx vitest run` — every geometry suite green, untouched.
2. `npx tsc --noEmit` and `npm run lint` — clean.
3. `PW_PORT=3127 npm run test:e2e` — both phone profiles and the desktop, all green.
4. The person-sense guard over the whole change, which must print nothing:

       git diff --unified=0 main -- ':!.planning/quick' ':!e2e/desktop-baseline.spec.ts-snapshots' \
         | grep '^-' | grep -v '^---' \
         | grep -E "([Aa]|[Tt]he|[Ee]very|[Ee]ach|[Aa]ny|[Pp]er) shapers?\b|shaper's|[Ss]hapers\b"

   Nothing printed means no line that spoke about a shaper *the person* was removed or reworded
   anywhere in the change. That is the whole safety net for this task.

5. Confirm the three lookalikes are untouched:

       git diff main -- components/summary/ lib/geometry/ | grep -E 'Shaper Use Only|Shaper Reference|Shaper Supply'

   must print nothing.
</verification>

<success_criteria>
- The name reads SHAPER ASSISTANT on the desktop bar, on the phone bar on `/` and on all six
  design screens, and on both printed order-form sheets.
- The phone bar holds the name, Save and the menu on one line at 360px with at least 20px of clear
  space before Save in Save's widest face, and no phone screen scrolls sideways.
- All eight browser tab titles read Shaper Assistant, in the exact wording listed in Task 2.
- CLAUDE.md, PROJECT.md, .claude/CLAUDE.md, package.json and README.md name the product
  Shaper Assistant, and both live-address mentions point at https://www.shaperassistant.com with
  the old address noted as a redirect.
- Not one mention of a shaper the person changed anywhere — proven by the guard in
  `<verification>` printing nothing.
- Exactly five PNGs changed, all under `e2e/desktop-baseline.spec.ts-snapshots/`, and each one's
  changed-pixel rectangle sits inside the name's own area at the top-left of the bar.
- No file under `lib/geometry/`, `components/ui/`, or any viewer was edited.
</success_criteria>

<output>
Write `.planning/quick/260909-sda-the-product-is-now-called-shaper-assista/260909-sda-SUMMARY.md` when done.

The SUMMARY must, in plain English for a shaper:

1. Say what a shaper now sees differently: the name over the app, the browser tab, and the printed
   order form.
2. Record the phone measurement behind D-01 — the bar's 328px at 360px, the 149.0px worst-case
   right-hand cluster, the 150.3px name, the 28.7px of clear air — and say the name is one size
   smaller on the phone only, with the desktop bar untouched.
3. Record that the printed identity box now stacks the name onto two centred lines at its
   unchanged type size (D-02), and note the measured one-line fallback (20px) in case the founder
   prefers it.
4. List the five changed-pixel rectangles from the desktop pictures, and state plainly that
   nothing outside the name moved on any of the five screens.
5. List what was deliberately left alone and why: every mention of a shaper the person, the three
   lookalikes (`Shaper Use Only`, `Shaper Reference`, `Shaper Supply`), the internal error-log
   prefixes, and the `shaper-` browser storage keys — noting that renaming a storage key would
   have silently reset a shaper's saved units and dismissed banners.
6. List the three things the founder still has to change elsewhere, none of which live in this
   repository: the Vercel project name, the GitHub repository name (`cpktoes/shaper`), and the
   Clerk application's display name, which is what shows on sign-in screens and account emails and
   is edited in Clerk's dashboard.
</output>
