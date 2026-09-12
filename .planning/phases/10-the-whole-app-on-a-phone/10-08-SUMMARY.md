---
phase: 10-the-whole-app-on-a-phone
plan: 08
subsystem: real-device-sweep
tags: [uat, real-device, ios, rails, scroll, phone-layout]
dependency-graph:
  requires: ["10-05", "10-06", "10-07", "10-09", "10-10", "10-11"]
  provides: ["The second real-device sweep, walked end to end on a real iPhone; one finding, fixed in the same round"]
  affects: [".planning/phases/10-the-whole-app-on-a-phone/10-SWEEP-2.md", "components/design/design-screen-shell.tsx", "e2e/phone-rails.spec.ts", "CLAUDE.md"]
tech-stack:
  added: []
  patterns:
    - "A short screen is a height question, not a width question: `[@media(max-height:500px)]` now has two consumers (FINS key placement, and the drawing column's scroll), both written inline and neither tied to the layout switch."
key-files:
  created: []
  modified:
    - ".planning/phases/10-the-whole-app-on-a-phone/10-SWEEP-2.md"
    - "components/design/design-screen-shell.tsx"
    - "e2e/phone-rails.spec.ts"
    - "CLAUDE.md"
decisions:
  - "D-12 — Fix the one finding and close the sweep on the iPhone; the Android column is not walked. The founder's call, made with the consequence stated: PHON-10 names both phones, so it closes on one phone's evidence."
  - "The avatar five-tap question is retired in its current form: it asked for a tap a finger-width outside the rim, but the tappable ring is ~2mm wide and a fingertip ~8mm, so the answer cannot distinguish a 28-dot target from a 44-dot one. Recorded as a pass on use, not as proof."
  - "The RAILS scroll fix is height-gated (Shape B), not unconditional (Shape A): Shape A was tried first and subtly moved the RAILS and VOLUME desktop screenshots, which are this phase's proof that nothing changes for a mouse. Re-recording them would have papered over a real change."
metrics:
  duration: "two walks across 2026-09-11 and 2026-09-12; the fix ~1h40m"
  completed: "2026-09-12"
actuals:
  tokens: 0
  tasks: 3
  commits: 9
status: complete
---

# Plan 10-08: The real-device sweep, re-issued and walked

**The app was put in a shaper's hands on a real iPhone and walked end to end — twice. The first
walk found three faults in the previous round of fixes and was stopped on purpose; the second walk,
against a build that fixed all three, passed every one of its ten steps and found exactly one thing,
which was fixed the same day.** The Android phone was not walked, by the founder's decision, and
this summary says so wherever it matters.

## Accomplishments

- The sweep sheet (`10-SWEEP-2.md`) was written, handed over against a green build, walked once,
  parked with its findings recorded verbatim, re-issued against the twice-fixed build, and walked
  again — every cell of its two tables is now either an answer in the founder's own words or an
  explicit "still unwalked" marker. No cell is silently empty.
- **iPhone, second walk: all ten steps pass**, including the three never answered on any earlier
  walk of this sheet — step 8 (the rack keeps its order when you leave and come back), the sideways
  layout (the founder's own D-10, checked in the hand for the first time), and the Hide Toolbar tip
  appearing on an iPhone, which had failed on every previous walk.
- **One finding, in the founder's words:** *"Rails sideways is the only issue. Vertical, the rails
  appear in their own tabs. Horizontal, they appear as desktop on one window; one at a time is fine,
  two are too small to view, and 3 makes the big which is nice but the window doesn't scroll so you
  can only see whatever is on top. I feel like the only real solution would be to allow the scroll
  on small width screens."* Confirmed in the code and fixed in `0eecec0` (below).
- The two judgment calls no machine could settle were settled by the founder: 220 dots of board
  picture is enough (*"220 dots seem great"*), and the sideways-as-desktop layout is right — the
  problem there was a missing scrollbar, not the layout.

## Task Commits

| Commit | What it did |
|---|---|
| `26aace9` | write the second sweep sheet, ready for a shaper's hands |
| `66a4458` | hand the sheet to the shaper and stop at the checkpoint |
| `f817db6` | record the first walk of the second sweep and what it found |
| `3621cc2` | park the sweep after the first walk, with the rulings it produced (D-10, D-11) |
| `7914a82` | re-issue the sheet against the twice-fixed build |
| `063162d` | record the iPhone half of the second walk and the rails scroll finding |
| `967a573` | record the founder's call to close the sweep on the iPhone (D-12), and the verdict |
| `33594b9` | fill every cell of the sheet — iPhone answers, Android marked unwalked |
| `0eecec0` | **fix(10): let the board drawing scroll when the screen is short** |

## What the sweep found

### First walk (2026-09-11, one phone) — stopped by decision

Three faults in the previous round, all confirmed in the code: sideways as a phone was unusable
(reverted by D-10), the board cards collapsed to nothing sideways (a fixed 205px of card text
subtracted from three-quarters of the screen with no floor), and the rail-band controls sat under
all three RAILS tabs. Those became plans 10-09, 10-10 and 10-11.

### Second walk (2026-09-12, iPhone) — complete

| Row | Result |
|---|---|
| Steps 1–10 | **PASS** — *"iphone done, 1-10 all good."* Two cells (the tabs moving to the top sideways, and the tip appearing sideways) are marked *inferred* from that sentence rather than answered in their own words, because both had failed last time; the founder was told which two. |
| Avatar five-tap count | *"avatar only opens when touched, felt good."* — **pass on use**; the question could not do its job (see Decisions). |
| Two cards sideways, floored | **PASS** — *"220 dots seem great."* |
| Is 220 dots enough to tell a board apart | **PASS** — *"220 dots seem great."* |
| RAILS → INSTRUCTIONS sideways | **FAIL** — the drawing column does not scroll on a short screen. Layout itself fine. |
| Hide Toolbar tip — iPhone | **PASS (inferred)** — covered by step 7. |
| Hide Toolbar tip — Android | **still unwalked (D-12)** |
| Every Android cell | **still unwalked (D-12)** |

### The fix the finding produced — `0eecec0`

In the desktop layout the controls column scrolled but the drawing column did not (`<main>` was
`h-full` with no overflow rule, and nothing inside RAILS supplied one). That has always been true;
a real desktop window is tall enough that it never bit. D-10 put a ~390-dot-tall sideways phone
into that same layout, and with three rail sections open only the top one could be reached.

The founder named the remedy — let it scroll — and named the wrong axis: it is height, not width
(sideways a phone is wide and short). The drawing column now scrolls under
`[@media(max-height:500px)]`, this codebase's existing meaning of "a short screen". An
unconditional scroll (Shape A) was tried first and reverted because it subtly moved the RAILS and
VOLUME desktop screenshot baselines. A browser test at a real 844x390 viewport opens RAILS with all
three sections, proves the column genuinely scrolls (`scrollHeight > clientHeight`, `scrollTop`
changes), and proves the Tail section — invisible before scrolling — becomes visible after.
`CLAUDE.md`'s Layout section now records the short-screen switch's second consumer.

## What this sweep does and does not establish, per requirement

Marking is the orchestrator's job after the verifier reads this; **no requirement is marked here.**
No claim below rests on an automated test standing in for a real phone.

- **PHON-07** (sign in, sign up, account menu on a phone) — evidenced by steps 1, 2, 3 on the
  iPhone, all PASS, plus the avatar row (pass on use). **Complete on iPhone; not walked on Android.**
- **PHON-08** (pick a preset; open/rename/duplicate/delete from the rack, on a phone) — evidenced
  by steps 4, 5a, 5b, 5c and 8 on the iPhone, all PASS. **Complete on iPhone; not walked on Android.**
- **PHON-09** (read the summary and the on-screen order form on a phone) — evidenced by step 9 on
  the iPhone, PASS in both orientations, on both walks. **Complete on iPhone; not walked on Android.**
- **PHON-10** (the whole flow, end to end, on a real iPhone AND a real Android phone) — evidenced
  by steps 1–10 on the iPhone, all PASS, with the one finding fixed and pinned by a test.
  **Complete on the iPhone. The Android half was not walked (D-12), and this requirement's own
  wording names both phones — it closes on one phone's evidence, by the founder's explicit call.**

## Decisions Made

- **D-12** (founder, 2026-09-12): fix the scroll and call the sweep done; Android not walked. The
  consequence for PHON-10 was stated at the moment of choosing and is recorded above.
- **The avatar question is retired in its current form.** The sheet asked for a tap "a
  finger-width out from its rim"; the implemented target is a 28-dot circle plus 8 dots of padding,
  so the tappable ring is ~2mm wide against an ~8mm fingertip. The answer *"only opens when
  touched"* is what a correct AND a broken implementation would both produce. What IS proven: the
  compiled-CSS test shows the padding rule ships and outranks an ordinary rule. What is not: whether
  the sign-in service's own rule is also flagged important. Recorded as a pass on use.
- **Shape B over Shape A** for the scroll fix, for the reason in the frontmatter.

## Deviations from Plan

- **The Android column was not walked** (D-12). The plan called for both phones, no blanks; the
  Android cells carry an explicit "still unwalked" marker instead of an answer.
- **The sheet's tables were filled by the orchestrator from the founder's messages**, not by a
  continuation executor — the founder reported inline, and the orchestrator transcribed verbatim,
  marking two cells as inferred and telling the founder which two.
- **The first walk stopped after step 10 on one phone** — by decision (D-11), because two of its
  findings were faults in the round of fixes it was testing.

## Follow-up Required

- The Android walk, if the founder ever wants PHON-10 evidenced on both phones. What it would
  uniquely prove: keyboard behaviour on sign-up and rename, the account menu's long-press, turning
  sideways and back on the design screens, and that the Hide Toolbar tip correctly stays absent.
- The desktop-side RAILS oddity (a control column beside INSTRUCTIONS, which none of its controls
  target) is still an open question for the founder, recorded in 10-11's summary — a sideways phone
  now falls into the same bucket by construction, and the founder judged the layout fine.
- A real proof of the avatar's 44-dot target needs a different instrument than a thumb: a
  signed-in session with the browser's computed styles read off the real Clerk button.

## Verification

- At `0eecec0`, by the fixer that produced it: `npx tsc --noEmit` clean; `npx vitest run` 2463
  passed, 2 skipped, 0 failed; full Playwright suite (all three projects) run twice — 226 passed,
  215 skipped, 0 failed both times; desktop screenshot baselines untouched.
- On `main` at `0eecec0`, by the orchestrator: `npm run build` clean; `npx vitest run` 2463 passed,
  2 skipped, 0 failed; full Playwright suite: 225 passed, 215 skipped, 1 failed — the one failure a 30-second `page.goto` timeout in `touch-sizing.spec.ts` (iPhone project) during a run that took 1.7 hours on a machine at load 250–500; that spec re-run alone at load 6 passes 12/12 in 22 s. Two earlier full runs on main during the same load spike failed 3–5 Summary-screen specs, all page-load or post-hydration timeouts, on screens the change cannot reach (the Summary screen does not use the shell it touched, and the iPhone project is portrait, so the height-gated rule cannot fire). Desktop screenshot baselines unchanged throughout. The scroll fix was reviewed by the orchestrator reading its diff, not by a separate reviewer pass; the phase verifier reads it next.

## Self-Check: PASSED (with what it does not prove stated, not hidden)

- The sweep sheet has no empty cell; every FAIL is a verbatim quotation; the results state the date,
  which phone, and that the sheet is complete for the iPhone and unwalked for Android.
- No credential, verification code or image of a sign-in form appears in the sheet or here.
- All four requirement IDs are named above with the rows evidencing each; none is marked satisfied;
  PHON-10 is not claimed to be met by any automated test.
- `grep -n "<!-- Shaper fills this in -->" 10-SWEEP-2.md` — the sheet's original pre-fill
  placeholders: the two under "Your overall verdict" remain as the sheet's own template markers
  beneath the founder's recorded verdict section, which supersedes them; no table cell holds one.
