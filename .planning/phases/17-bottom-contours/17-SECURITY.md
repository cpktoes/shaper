---
phase: 17
slug: bottom-contours
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-11-11
---

# Phase 17 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

BOTTOM adds no sign-in path, no network call and no new server route. What it adds is one optional field on a saved
board (the bottom's cuts and channels), a great deal of geometry that reads it, and drawings and printed pages made from
that geometry. So the threats here are almost all about a number a shaper would cut foam to being wrong, a crafted saved
board breaking a screen, and the go-live itself.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| A saved board → the app | A board's stored `bottom` field is read back from the database or from a board file a shaper opens | Cut names, channel counts, depths and stations (untrusted on read; validated by the snapshot schema) |
| The shaper's controls → the design store | BOTTOM's menus and sliders write the bottom on the open board | The same fields, bounded by the controls; refused on a locked board |
| The bottom → every reader | One foam-off figure is read by VOLUME, the 3D board, the export files, RAILS, FINS, DATA and the printed pages | Lengths in millimetres; a not-a-number here would reach litres and drawings |
| Test expectations → the repo | Golden fixtures and litres pins that the tests hold the maths to | Expected figures (must come from running code, never typed) |
| The branch → the live site | A push to `main` deploys to production | The whole change |
| Production's settings → a terminal | The saved-boards report reads production with a pulled settings file | Database credentials (never read, named or printed by the orchestrator) |

---

## Threat Register

83 rows across 23 plans; 37 distinct threats. Evidence is a grep-level (ASVS 1) check of the code on
`claude/bottom-uat-17-d1559c` at `1b5fd2e1`, the code that is live as main `93c0ea8f`.

| Threat ID | Category | Component | Severity | Disposition | Mitigation (evidence) | Status |
|-----------|----------|-----------|----------|-------------|-----------------------|--------|
| T-17-01 | Tampering | test expectations (hand-typed figures) | high | mitigate | `lib/geometry/bottom.test.ts:3` imports `bottom-golden.json`, whose line 2 carries the sketch's SHA-1 and producer script; later plans' tests compute from the app's own functions | closed |
| T-17-02 | Repudiation | `phase17-litres-pin.json` | medium | mitigate | `scripts/extract-phase17-litres-pin.ts:30` refuses once `volume.ts` names `foamOffAt` | closed |
| T-17-03 | Integrity | the litres and drawings of a flat board | high | mitigate | `lib/geometry/design.ts:204` passes no sampler unless `bottomHasCut`; `lib/geometry/phase17-litres-pin.test.ts` holds 102 boards | closed |
| T-17-04 | Integrity / DoS | `foamOff`, `bottomedHalfSection`, the mesh with walls | high | mitigate | `lib/geometry/volume.ts:1069` reads a non-finite cut as 0 and never below 0; `:1137` skips a column with no foam (`top > 0`); `board-surface.test.ts:167,251` hold `meshCheck` at zero faults | closed |
| T-17-05 | Integrity | a rack card vs VOLUME | medium | mitigate | `lib/models/rack-models.ts:67` passes the saved `bottom` into the same summary | closed |
| T-17-06 | Integrity | headline thickness and VOLUME's estimator | medium | mitigate | `lib/geometry/design.ts:337-346`: `railsOnTheBottom` is RAILS-only and never runs inside `deriveEffectiveRails` | closed |
| T-17-07 | Tampering / DoS | the saved bottom's schema | high | mitigate | `lib/models/design-snapshot.ts:540-553` bounds every number (`bottomAcrossSchema`, `bottomDepthSchema`, `bottomStationSchema`, `bottomSmoothnessSchema`); crafted-value tests at `design-snapshot.test.ts:1097,1300-1301` (NaN, null, 1e9, wrong types) | closed |
| T-17-08 | Integrity | re-saving an old board; saved boards at go-live | high | mitigate | `design-snapshot.ts:158,199` (`isDefaultBottom`: an untouched bottom saves key for key as before); the founder's production report at go-live, 31 boards all flat (17-16-SUMMARY) | closed |
| T-17-09 | Information Disclosure | `--bottom-report` and the pulled settings file | medium | mitigate | `scripts/check-saved-boards.ts:99` is read-only, ids and litres only; run by the founder in his own terminal, the file confirmed gone (17-16-SUMMARY line 51) | closed |
| T-17-10 | Tampering | the board name in names, labels and print | low | mitigate | No `dangerouslySetInnerHTML` under `components/bottom/` (the one hit is the test that forbids it, `bottom-guide-words.test.ts:208`) | closed |
| T-17-11 | Denial of Service | channel loops, the shade, cartoons | medium | mitigate | `lib/geometry/bottom.ts:95` `count: 0 \| 4 \| 6 \| 8`; fixed grids `bottom-draw.ts:78,80` (120 × 64, tile 40 × 12) | closed |
| T-17-12 | Denial of Service | the sideways ☰ row and layout | medium | mitigate | `e2e/phone-screen-tiles.spec.ts:177-178` holds the 92-dot tile floor on both phone profiles | closed |
| T-17-13 | Repudiation | scratch scripts | low | mitigate | No loose `.ts/.js/.cjs/.mjs` under `.planning` outside the sketches (find: 0); picture scripts archived as `.tar.gz` per plan | closed |
| T-17-14 | Tampering / Elevation | an unreviewed push | high | mitigate | 17-16's push: the founder's recorded Go, the full gate and the code review on the named commit (17-16-SUMMARY, 17-REVIEW.md). The fix-wave push (2026-11-11): the founder's recorded Go ("Go — push to main") and the gate recorded in 17-UAT.md; **the code review of the fix-wave commits was not run before that push** — it was run after it (17-FIXWAVE-REVIEW.md). See the audit trail | closed |
| T-17-16 | Tampering | editing a locked board from BOTTOM | medium | mitigate | 50 `lockedRef.current` guards in `components/design/design-store.tsx`; `board-lock-scope.test.ts:30-36` lists BOTTOM's panels | closed |
| T-17-17 | Integrity | a flat board's sheets; the Full Sized Template | medium | mitigate | `components/summary/bottom-sheet-fit.test.ts:256`: a flat bottom lays out no page | closed |
| T-17-18 | Integrity | fin-anchored stations (`resolveCut`) | medium | mitigate | `lib/geometry/bottom.test.ts:187-195`: resolved on read, checked against the stored spec | closed |
| T-17-19 | Integrity | nose stations | medium | mitigate | `lib/geometry/bottom.test.ts:315`: a Nose station is taped from the nose | closed |
| T-17-20 | Repudiation | the GUIDE words page ↔ `components/guide/words/volume.ts` | low | mitigate | `components/guide/words/volume.test.ts:11` holds the module to `18-GUIDE-WORDS.md` by exact string | closed |
| T-17-21 | Integrity | VOLUME's litres while its words change | low | mitigate | 17-17 touched only `imported-readout.ts` and its test under `lib/geometry` (git diff of its commits) | closed |
| T-17-22 | Denial of Service | `railSectionBottom`'s channel sampling | low | mitigate | `lib/geometry/rail-bottom.ts:51` (`RAIL_CHANNEL_STEP` 1/64"), `:102,104` non-finite reads as 0, walls kept only when finite and inside the reach | closed |
| T-17-23 | Integrity | `bottomRailLift` / `railsOnTheBottom` | medium | mitigate | `lib/geometry/design.ts:326` reads `sectionsFoamOff`; `design.test.ts:1056-1083` | closed |
| T-17-24 | Integrity | channel-free boards on RAILS | medium | mitigate | `lib/geometry/bottom.test.ts:1601` (the split equals the whole); 17-18's byte-identical capture (17-18-SUMMARY) | closed |
| T-17-25 | Tampering | `phase17-channel-litres-pin.json` | medium | mitigate | `scripts/extract-phase17-channel-litres-pin.ts:29` refuses once `volume.ts` names `sectionsOffAt` | closed |
| T-17-26 | Integrity | litres on boards without channels or with Hard Edge tails | high | mitigate | `lib/geometry/phase17-channel-litres.test.ts:46,48`: caps 0.01 / 0.15 L and Hard Edge 1e-5 L, never widened (17-20-SUMMARY: the 25 Hard Edge boards equal their pin to the last digit) | closed |
| T-17-27 | Integrity | the 3D board and the STL | medium | mitigate | `meshCheck` zero faults in `board-surface.test.ts` and `volume.test.ts` on the soft, rolled and golden boards | closed |
| T-17-28 | Denial of Service | the walled layout on a malformed section | low | mitigate | `lib/geometry/volume.ts:1069` (non-finite read as no cut) | closed |
| T-17-29 | Integrity | DATA's Rail lift | medium | mitigate | `lib/geometry/bottom.ts:1285` reads `sectionsFoamOff` at the rail | closed |
| T-17-30 | Integrity | RAILS' rail on a flat-tail channel board | medium | mitigate | `lib/geometry/design.test.ts:1083`: the same rails object comes back | closed |
| T-17-31 | Integrity | the litres, lifted sections, boards without channels (17-21) | high | mitigate | 17-21 to 17-23 changed neither `volume.ts` nor `board-surface.ts` (git diff 0827de7c..6544ff7a: none) | closed |
| T-17-32 | Denial of Service | channel sampling on unlifted sections | low | mitigate | `lib/geometry/design.ts:396`: a section that cuts nothing and has no walls returns the bands' own object at once | closed |
| T-17-33 | Integrity | RAILS' rail on a concave board | medium | mitigate | `lib/geometry/rail-bottom.test.ts:90-98,529`: a concave's lift is 0 and the rails come back as the same object | closed |
| T-17-34 | Integrity | BOTTOM's rail-lift gauge | medium | mitigate | `lib/geometry/bottom-draw.ts:982` reads `sectionsFoamOff` at the rail, held at the thickness | closed |
| T-17-35 | Integrity | the litres and DATA's figures (17-22, 17-23) | high | mitigate | Same diff as T-17-31; byte-identical litres captures after every task (17-22-SUMMARY, 17-23-SUMMARY) | closed |
| T-17-36 | Denial of Service | the concave's sampling on RAILS | low | accept | See the Accepted Risks Log | closed |
| T-17-37 | Integrity | the printed tables sheet | medium | mitigate | `components/summary/bottom-sheet-fit.ts:110,138,160` (`tablesTight`, `tableRowTight` measured 16.6): rows only tightened, never dropped | closed |
| T-17-SC | Tampering | package installs | low | accept (mitigate in 17-16) | `package.json` and `package-lock.json` unchanged from main before the fix waves to the tip (git diff 556162ba..HEAD: empty) | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-17-01 | T-17-SC | No package is installed anywhere in the phase (constraint C5), so there is no supply-chain surface to mitigate | founder, via plan approval | 2026-11-08 |
| AR-17-02 | T-17-36 | Drawing a concave on RAILS samples the bottom every 1/8" across a section (about 100–150 reads, three sections a board); bounded by the section's reach, a flat board skips it | founder, via plan approval (17-22, "Always draw it") | 2026-11-11 |

*Accepted risks do not resurface in future audit runs.*

---

## Verification Evidence

Grep-level checks run by the orchestrator on 2026-11-11, one per threat, against the merged branch. The Threat Flags
section of all 23 plan summaries reads "None" (no new endpoint, input, file path or schema beyond the saved bottom of
17-12, which is T-17-07 and T-17-08).

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-11 | 37 | 37 | 0 | orchestrator (Claude), ASVS 1 grep depth, register authored at plan time |

**One thing this audit records plainly.** The fix-wave push of 2026-11-11 went out on the founder's word after the
type check, lint, the unit suite, the full browser suite, the production build and the desktop pictures, but **without
the code review that 17-16's push had** and without the five production-build browser tests (`e2e/prod`). The code
review was run afterwards on the same commits; its findings are in `17-FIXWAVE-REVIEW.md`.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-11
