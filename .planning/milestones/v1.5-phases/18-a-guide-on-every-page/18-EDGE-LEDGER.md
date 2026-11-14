# Phase 18 — Edge, UI-consideration and prohibition ledger

**Why this page exists.** `18-SPEC.md` has no `## Edge Coverage` and no `## Prohibitions` section, so the planner ran the spec-less
probe fallback (`edge-coverage.json`, 53 items) and the prohibition recall in-prompt, and lifted the UI-SPEC's `## UI Considerations`
(53 items) by the same rule. Every item below sits in exactly one plan's `must_haves` (a `truths` string when explicit, a flat
`{ statement, verification: backstop }` marker when backstop, a `prohibitions` entry for a must-NOT) or is surfaced as a flagged
assumption in the owning plan. Nothing is dropped. The checker can count: 53 edge items in = 51 explicit + 0 backstop + 2 flagged;
53 UI items in = 43 explicit + 10 backstop + 0 flagged; 10 prohibitions kept, descriptor-less (flagged-unverified).

**A note on the UI-SPEC's own count.** Its header says 41 explicit and 12 backstop; its table holds 43 explicit and 10 backstop
(E5 and E7 each fold "loading / error" into one row, which is two considerations). This ledger lifts the table as written.

**One UI row restated by a locked decision.** E1 overflow said the board's name "is cut short" on ROCKER's phone strip. D-21 (a
later ruling) replaces that: below 44 dots of box the name is not drawn at all, never a stub. The backstop is lifted with D-21's
wording into 18-04.

## Edge probes (53)

| # | Req | Category | Plan | Resolution |
|---|-----|----------|------|------------|
| 1 | R1 | boundary | 18-08 | explicit — five pages at 360/375/390/412/430/820: tab words whole on one line, no sideways scroll, the name not drawn or drawn with a box of at least 44 |
| 2 | R1 | adjacency | 18-02 | explicit — a drawn name starts at least 6 dots right of the last tab; under 50 dots of room it is not drawn |
| 3 | R1 | empty | 18-02 | explicit — a strip with no trailing slot renders exactly as before |
| 4 | R1 | encoding | 18-02 | explicit — the name gives way by room in dots (a container query), never by character count |
| 5 | R1 | ordering | 18-04 | explicit — GUIDE last in both ROCKER tab lists; crossing 820 with GUIDE open keeps GUIDE |
| 6 | R1 | precision | 18-04 | explicit — the 50-dot room line; ROCKER's measured boxes logged at every width, none within 2 dots of 44 |
| 7 | R2 | adjacency | 18-03 | explicit — TEMPLATE's two Fullness and two Depth are four cards with four ids |
| 8 | R2 | empty | 18-08 | explicit — 22/14/17/8/23 on every board, stock and unsaved included |
| 9 | R2 | encoding | 18-01 | explicit — exact string equality after trim; the test fails on a non-breaking space or markup in a line |
| 10 | R2 | ordering | 18-08 | explicit — 84 cards in the words page's order, page by page in the app's order |
| 11 | R3 | boundary | 18-06 | explicit — Needs 8'0" exactly when `isQuadRearModelAvailable` is false; none at the minimum itself |
| 12 | R3 | adjacency | 18-04 | explicit — a pair card's tag joins the two values with ` · ` in the page's order |
| 13 | R3 | empty | 18-03 | explicit — Tail Block `—` on pin/round, Depth `Diamond & swallow only` off diamond/swallow, an unpicked tail untagged |
| 14 | R3 | encoding | 18-01 | explicit — every word a React text child; figures in a normal-case span |
| 15 | R3 | ordering | 18-08 | explicit — a slider moved with GUIDE open changes the tag and the cartoon in the same render |
| 16 | R3 | precision | 18-01 | explicit — tags round only for display, through the page's own formatter |
| 17 | R3 | idempotency | 18-08 | explicit — two builds from the same board and system are deep-equal; the memo returns the identical object |
| 18 | R3 | concurrency | 18-08 | explicit — building from a deep-frozen board throws nothing and changes nothing; no guide file calls a store action |
| 19 | R4 | boundary | 18-01 | explicit — every window inside the strip's 3-unit inset, whole-board and tip windows included |
| 20 | R4 | adjacency | 18-08 | explicit — no drawing label overlaps another or a window's name; every label inside its window, all pages |
| 21 | R4 | empty | 18-08 | explicit — caption none/drawnAs means no push path; caption dashed means at least one push path (D-26) |
| 22 | R4 | ordering | 18-01 | explicit — the painter draws board fill, reference lines, the push, dimensions, text, in that order |
| 23 | R4 | precision | 18-08 | explicit — every coordinate finite and inside the 300 × H viewBox, every fixture board, both systems |
| 24 | R5 | adjacency | 18-08 | explicit — each pushed variant differs from the open board only in its card's declared push fields |
| 25 | R5 | empty | 18-04 | explicit — no room for a push: drawn the other way if that has room, else the board as is and no caption |
| 26 | R5 | ordering | 18-06 | explicit — fins in `computeFinPlacement`'s order; `lateral`/`leadingLateral` used as signed, never times `side` |
| 27 | R6 | boundary | 18-08 | explicit — every card has non-empty is, does, how; exactly 14 FINS cards have info |
| 28 | R6 | adjacency | 18-06 | explicit — McKee Shortboard and McKee Gun share one sentence verbatim; Convention = MODEL INFO's first paragraph |
| 29 | R6 | empty | 18-01 | explicit — no info note means no Model info rule or label; no caption means no caption line |
| 30 | R6 | encoding | 18-07 | explicit — the no-inch rule's exact pattern and its two exemptions (blank name, `formatRockerNote`) |
| 31 | R6 | ordering | 18-06 | explicit — a FINS card runs name row, figure, two sentences, Model info, How to shape |
| 32 | R6 | precision | 18-07 | explicit — every app-number phrase equals what `units.ts` / `measure-display` formats for the app's own value |
| 33 | R7 | unclassified | 18-01 | **flagged assumption** — no classifiable edge; covered by the source test and the click test |
| 34 | R8 | boundary | 18-08 | explicit — 3 across at 1280, 2 at 1024, 1 at 820 and 390; never under 236; 820 shell, 819 stacked |
| 35 | R8 | precision | 18-08 | explicit — phone: scrollHeight equals the window, pinned column at most 66dvh + 1, card at least 66dvh − 41 |
| 36 | R9 | boundary | 18-06 | explicit — eight groups with 1, 1, 1, 4, 5, 1, 6, 4 cards; FINS strip has exactly three tabs |
| 37 | R9 | adjacency | 18-06 | explicit — the Thruster group's front models are the quad's front models; a Quad card draws its front pair by them |
| 38 | R9 | empty | 18-06 | explicit — every sentence of `fin-model-info.tsx` is in the FINS words before the file goes |
| 39 | R9 | encoding | 18-06 | explicit — model names are the app's own labels from `fins.ts`, held to the words page |
| 40 | R9 | ordering | 18-06 | explicit — each setup group opens with the setup's card, then its models in the sidebar's order |
| 41 | R9 | precision | 18-06 | explicit — every fin figure on a card is a mark (1/16" or whole mm) through `formatMark` |
| 42 | R10 | boundary | 18-03 | explicit — on a diamond or swallow Depth is the board's own depth as a mark, pushed deeper inside the outline's clamp |
| 43 | R10 | precision | 18-03 | explicit — elsewhere Depth draws `TAIL_PRESETS.swallow` in dashes, 3" (76 mm) dimensioned as a mark |
| 44 | R11 | boundary | 18-01 | explicit — `guidePush("metric")`: dims clean half-centimetres, marks whole millimetres, degrees/percent/scale unchanged |
| 45 | R11 | adjacency | 18-01 | explicit — one push number drives the drawing, the dimension label and the caption |
| 46 | R11 | empty | 18-07 | explicit — a card with no figure in its words has no Metric saying; a saying never empties a line |
| 47 | R11 | encoding | 18-08 | explicit — no Metric tag, caption, label, window name or card name carries an inch or foot figure (two exemptions) |
| 48 | R11 | ordering | 18-07 | explicit — sayings apply in listed order; each Imperial phrase occurs exactly once in its line |
| 49 | R11 | precision | 18-01 | explicit — no pushed Metric dim prints as a converted fraction; every one reads x.0 or x.5 cm |
| 50 | R12 | unclassified | 18-08 | **flagged assumption** — no classifiable edge; covered by the suite staying green and five baselines re-recorded on purpose |
| 51 | R13 | adjacency | 18-10 | explicit — the full suite runs on the merged main-style checkout; a load flake is named, re-run alone, recorded |
| 52 | R13 | empty | 18-10 | explicit — origin/main unmoved means the merge step records no change and the gate runs as is |
| 53 | R13 | ordering | 18-10 | explicit — test, lint, build, full e2e to its EXIT line, baselines, push, deploy marker, founder's look; stop at the first red |

Per plan: 18-01 9 + 1 flagged · 18-02 3 · 18-03 4 · 18-04 4 · 18-05 0 · 18-06 10 · 18-07 4 · 18-08 14 + 1 flagged · 18-10 3.

## UI considerations (53)

| Surface | State | Plan | Resolution |
|---------|-------|------|------------|
| E1 tab strip | loading | 18-01 | explicit |
| E1 | error | 18-01 | explicit |
| E1 | overflow | 18-04 | **backstop** (D-21 wording) |
| E1 | long-text | 18-02 | explicit |
| E2 panel | empty | 18-08 | explicit |
| E2 | loading | 18-01 | explicit |
| E2 | error | 18-01 | explicit |
| E2 | populated | 18-01 | explicit |
| E2 | partial | 18-08 | explicit |
| E2 | overflow | 18-08 | **backstop** |
| E2 | zero-one-many | 18-01 | explicit |
| E2 | long-text | 18-01 | explicit |
| E3 list | empty | 18-08 | explicit |
| E3 | loading | 18-01 | explicit |
| E3 | error | 18-01 | explicit |
| E3 | populated | 18-08 | **backstop** |
| E3 | partial | 18-01 | explicit |
| E3 | overflow | 18-08 | **backstop** |
| E3 | zero-one-many | 18-08 | explicit |
| E4 card | empty | 18-01 | explicit |
| E4 | loading | 18-01 | explicit |
| E4 | error | 18-01 | explicit |
| E4 | populated | 18-01 | explicit |
| E4 | partial | 18-01 | explicit |
| E4 | overflow | 18-08 | **backstop** |
| E4 | zero-one-many | 18-01 | explicit |
| E4 | long-text | 18-04 | **backstop** |
| E5 tag | empty | 18-01 | explicit |
| E5 | loading | 18-01 | explicit |
| E5 | error | 18-01 | explicit |
| E5 | populated | 18-01 | explicit |
| E5 | partial | 18-08 | explicit |
| E5 | overflow | 18-03 | **backstop** |
| E5 | zero-one-many | 18-01 | explicit |
| E5 | long-text | 18-06 | explicit |
| E6 figure | empty | 18-01 | explicit |
| E6 | loading | 18-01 | explicit |
| E6 | error | 18-08 | explicit |
| E6 | populated | 18-01 | explicit |
| E6 | partial | 18-08 | explicit |
| E6 | overflow | 18-08 | **backstop** |
| E6 | zero-one-many | 18-01 | explicit |
| E6 | long-text | 18-06 | **backstop** |
| E7 text | empty | 18-08 | explicit |
| E7 | loading | 18-01 | explicit |
| E7 | error | 18-01 | explicit |
| E7 | populated | 18-01 | explicit |
| E7 | partial | 18-01 | explicit |
| E7 | overflow | 18-06 | **backstop** |
| E7 | zero-one-many | 18-01 | explicit |
| E7 | long-text | 18-07 | explicit |
| E8 intro | overflow | 18-01 | explicit |
| E8 | long-text | 18-01 | explicit |

Per plan: 18-01 32 · 18-02 1 · 18-03 1 · 18-04 2 · 18-06 3 · 18-07 1 · 18-08 13. Backstops: 18-03 1, 18-04 2, 18-06 2, 18-08 5 = 10.

## Prohibitions kept (10, descriptor-less, flagged-unverified)

Recall ran about ten must-NOT candidates per requirement; routine engineering was dropped (it is owned by the edge items above or by
review), and two canon items were referred, not minted: *a board name rendered as raw HTML is injection — canon, covered by
`/gsd-secure-phase` and the T-18-01 threat; not minted here*; *unbounded drawing work is resource exhaustion — canon, covered by
T-18-02; not minted here*.

| # | Req | Category | Plan | Statement |
|---|-----|----------|------|-----------|
| P1 | R7 | safety | 18-01 | MUST NOT change the board, the store or a saved design from anything on a GUIDE card |
| P2 | R5 | safety | 18-01 | MUST NOT show a number on a card that did not come out of the app's own maths and its formatters |
| P3 | R6 | transparency | 18-01 | MUST NOT show words on a card that differ from the founder's words page |
| P4 | R4 | transparency | 18-08 | MUST NOT say dashed on a card where nothing is dashed |
| P5 | R11 | values | 18-07 | MUST NOT show a Metric shaper an inch or foot figure on a card, apart from the maker's own blank name and rocker order code |
| P6 | R1 | values | 18-02 | MUST NOT shorten, abbreviate or drop a tab word the founder named to make room on a strip |
| P7 | R9 | transparency | 18-06 | MUST NOT lose, paraphrase or re-attribute a MODEL INFO sentence (Greg McKee's guidance stays credited as written) |
| P8 | R10 | transparency | 18-03 | MUST NOT present Depth as a setting of a pin, round or squash tail |
| P9 | R12 | safety | 18-08 | MUST NOT change what any page calculates, any saved board, preset or litres figure |
| P10 | R13 | safety | 18-10 | MUST NOT push to main on a red gate or an unread EXIT line, and MUST NOT touch the founder's checkout or port 3005 |
