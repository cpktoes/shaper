# Phase 3: Volume, Templates & Verified Math - Research

**Researched:** 2026-08-28
**Domain:** Client-side PDF generation (tiled 1:1 print templates), pure geometry-math verification, GitHub Actions CI for a Next.js/Vitest project
**Confidence:** MEDIUM-HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Template delivery (how it reaches paper)**
- **D-01:** The template is a **downloaded multi-page PDF** with true 1:1 physical size baked into the file — not a browser-print path. Prints identically on any home printer or at a print shop. Adds one small PDF-generation library (library choice is Claude's discretion).
- **D-02:** The shaper **picks Letter or A4** at export time, defaulting to Letter; the page count adjusts to the pick.
- **D-03:** The export button lives on **both** the Template screen and the Summary screen.
- **D-04:** Export is **preview-first**: a dialog shows how the board splits across pages (tile grid + page count, e.g. "8 pages — tape nose to tail") with the Letter/A4 pick, then Download.

**What's on the template**
- **D-05:** It is a **half (spin) template** — one side of the outline curve with the stringer as the straight edge. Trace, flip, trace; symmetry comes free and paper is halved. — Reversibility: reversible — a full-outline layout could be added later without disturbing the half-template path.
- **D-06:** Working marks are **only**: the nose 12" mark, the tail 12" mark, the center mark, and the widepoint mark — "the marks a shaper needs." **No** every-12" station ladder. These are the same stations the rail-band and volume calculators use.
- **D-07:** A **2"×2" scale-check square** prints on the first page (the nose page) so the shaper can verify 100% scale before taping anything.
- **D-08:** The **board name and core dims print inside the kept template area** — positioned so they survive the cut, never in a margin that gets trimmed off.
- **D-09:** Pages join by **overlap (~½") with match marks**, plus page labels ("3 of 8 — nose to tail"). Page order runs **nose to tail**; exact overlap size is Claude's discretion.
- **D-10:** A **small plain-English how-to box** sits on the nose page next to the scale square: print at 100% (no fit-to-page), measure the square, tape nose to tail.

### Claude's Discretion
- **Live volume:** the store already recomputes litres live from the drawn geometry. Verify that pipeline end-to-end and cover it with tests; whether litres get surfaced anywhere beyond the Volume screen (e.g. a nav readout) is a planning call, not a new capability mandate. The volume *method* is settled: the prototype's three-station approach stays until the Phase 4 foil editor brings the Simpson upgrade (recorded in `lib/geometry/volume.ts` header, deviation 3).
- **Verified math / CI:** GitHub Actions running the Vitest geometry suites on every push/PR (lint and build steps at planner's judgment). The prototype-extracted golden fixtures **are** the definition of known-good values. Playwright: install only if phase acceptance genuinely needs an e2e (e.g. exercising the PDF export), otherwise defer.
- PDF library choice, tile orientation per board size (portrait vs landscape pages), overlap size, file name, and all preview-dialog styling/wording (plain English, shaper audience).
- Print styling may borrow the sketch manifest's drafting grammar where it helps legibility; note the manifest's "no text inside the outline" rule is a *screen* rule — D-08 deliberately places name + dims inside the kept area on paper.

### Deferred Ideas (OUT OF SCOPE)
None new — discussion stayed within phase scope. Reviewed-but-not-folded todos (photo uploads, mobile polish, copy-to-clipboard, fin tail curve cosmetics, presets extension, rails instructions page, rails viewer extras, units toggle, bottom contours) stay in the backlog — none are volume, template, or test work.

### Folded Todos (now in phase scope)
- Verify and refit the Summary print sheet (`components/summary/board-summary.tsx`, `use-print-fit.ts`, `app/design/summary/summary.css`, `outline-viewer.tsx`, `callout-primitives.tsx`) after the callout-system rebuild changed the outline viewBox. This is the **existing shrink-to-fit browser-print order form** — a different artifact from TMPL-01's tiled 1:1 PDF. Do both this phase, do not merge them.
- Template screen: construction-lines toggle button + a sidebar-minimize "wide view" button (toolbar addition to `components/outline/outline-editor.tsx`).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VOL-01 | App calculates board volume (litres) live from the shaped geometry (outline + rocker + foil) | The full derivation pipeline (`buildOutline` → `computeRailBands` → `deriveTemplateValues`/`deriveRailValues`/`deriveEffectiveVolume` → `computeVolume`) already exists and is wired live into `design-store.tsx`'s `volumeResult` memo. `lib/geometry/design.ts`'s three derive-functions are exercised only transitively (through `summarizeDesign`'s one test file) — see Wave 0 Gaps. Rocker/foil inputs are Phase 4; this phase's "live from the shaped geometry" is outline + rail-band derived, which is the full extent of what geometry exists today. |
| TMPL-01 | User can export a full-size (1:1 scale) printable template of the outline, tiled across multiple standard pages for taping together | `OutlineGeometry` (`lib/geometry/outline.ts`) already carries every value the template needs in millimetres: `points` (161 station/half-width samples, right half), `length`, `widePointStation`, `tailWidthAt12in`, `noseWidthAt12in`. No new geometry math — this is a physical-scale layout problem, solved with a new pure tile-layout module plus jsPDF as the rendering library (see Standard Stack, Architecture Patterns). |
</phase_requirements>

## Summary

Both requirements are layout/verification problems, not new shaping math. VOL-01's calculator (`lib/geometry/volume.ts`) is already ported, golden-tested, and live-wired through the shared design store — the real work is closing the coverage gap on the three small derivation functions in `lib/geometry/design.ts` that feed it, and wiring the whole `npm test` suite into CI so "proven correct" means something machine-checked rather than "passes on my machine." TMPL-01 is new work, but it draws on data that already exists: `OutlineGeometry.points` is the exact curve to trace, in millimetres, and the four required marks (nose 12", tail 12", center, widepoint) are either already on that object (`tailWidthAt12in`, `noseWidthAt12in`, `widePointStation`) or one `inchesToMm(12)` away (`length`, `length/2`) from being derivable — the 12" constant itself is currently a private `const` in `outline.ts` and needs exporting.

The project's own pre-implementation design doc (`.planning/design/GEOMETRY-MODULE.md`, approved 2026-08-18) already anticipated a `lib/geometry/template.ts` module with a `generateOutlineTemplate(board, paper, style): TemplateResult {pages[{...,row,col}], columns, rows, style}` shape — but it specified **pure SVG text** output. CONTEXT.md's D-01 overrides that with a **downloaded PDF** requirement instead (a shop needs one file that opens and prints identically everywhere, not an SVG a browser has to be talked into printing at 100%). This is a recorded, deliberate deviation, structurally identical to `volume.ts`'s own recorded deviation from the same document — keep the tile-layout math pure and testable as originally designed, swap only the output format.

For the PDF library, `jsPDF` (verified OK via package-legitimacy check, actively maintained — published 2026-03-17, ~15M weekly downloads, created 2015) is the better fit over `pdf-lib` (also OK, hugely downloaded, but its last publish was 2021-11-06 — effectively unmaintained) because jsPDF's `unit: "mm"` document mode maps directly onto this codebase's `Mm`-branded millimetre domain with no extra conversion layer, and its Node build works inside a plain Vitest (`environment: "node"`) test file for basic vector/text output — meaning the tile-layout math AND a PDF-bytes smoke test can both run in the existing Vitest suite without installing Playwright at all, which lines up with CONTEXT.md's discretion to defer Playwright unless genuinely needed.

**Primary recommendation:** Add `jsPDF` as the one new dependency; build a pure `lib/geometry/template.ts` (tile-grid + mark-position math, Vitest-tested against `OutlineGeometry` fixtures) that a thin, PDF-only consumer module renders — never let PDF drawing calls and geometry math share a function. Wire `npm test` (and lint/build) into a new `.github/workflows/ci.yml`, providing syntactically-valid dummy `DATABASE_URL`/Clerk env vars so `next build`'s module-collection phase doesn't fail on the existing top-level `neon(process.env.DATABASE_URL!)` call.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Live volume recompute (VOL-01) | Browser / Client | — | `computeVolume` runs inside a `useMemo` in `design-store.tsx`; no server round-trip, no persistence needed for the number to update on screen. |
| Tile-layout math (page grid, mark stations, overlap) | Browser / Client (pure lib) | — | Belongs in `lib/geometry/` per Rule 1 — no React/DOM import, runs identically in the browser bundle and in a Vitest/Node process. |
| PDF byte generation (jsPDF calls) | Browser / Client | — | D-01's "downloaded PDF" is produced client-side from data already in the store; no server endpoint is needed and none should be built — the design has no server-only inputs (no user uploads, no server-computed geometry). |
| Export preview dialog (tile grid + page count + paper picker) | Browser / Client | — | Pure UI state (`useState` for paper choice) reading the same pure layout function before Download is clicked — no new store field required. |
| CI test/lint/build execution | Build / CI pipeline | — | Not an app tier — runs in GitHub Actions on every push/PR, outside the Vercel runtime entirely. |
| Saved design persistence (existing, unaffected) | Database / Storage (Neon via Drizzle) | API / Backend (server actions) | Untouched by this phase — volume/template are computed from data the store already holds; nothing here is new persisted state. |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `jspdf` | `^4.2.1` [VERIFIED: npm registry — `npm view jspdf version` → `4.2.1`, published 2026-03-17] | Multi-page PDF generation with a native millimetre unit mode and simple path/text drawing primitives | Actively maintained (~15M weekly downloads [VERIFIED: npm registry]), works in a plain Node/Vitest process for vector/text output without a browser or jsdom, `unit: "mm"` avoids a second conversion layer on top of this codebase's `Mm` domain |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| *(none required)* | — | — | jsPDF's core (`.rect()`, `.lines()`, `.text()`, `.setLineDashPattern()`, `.addPage()`) covers every mark this phase needs (outline path, scale-check square, match marks, labels) — no plugin (e.g. `svg2pdf.js`, `jspdf-autotable`) is needed for a hand-drawn outline path and a handful of labels. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `jspdf` | `pdf-lib` | Also `[OK]` on the legitimacy check and hugely downloaded, but its last publish was 2021-11-06 [VERIFIED: npm registry — `npm view pdf-lib time.modified`] — effectively unmaintained (~5 years). Its API is lower-level (raw PDF content-stream operators) and its unit is points (1/72in) with no native mm mode, so every coordinate would need converting at the drawing boundary instead of once at the module's top. Would still work, but jsPDF is the better-maintained, less-friction choice. |
| A downloaded PDF (D-01) | Pure SVG text (`GEOMETRY-MODULE.md`'s original approved design) | SVG output was the *original* pre-implementation design (2026-08-18), but CONTEXT.md's D-01 explicitly supersedes it for TMPL-01: a shop-floor artifact needs one file that any printer treats identically at true scale, without depending on the browser's own SVG/print pipeline getting a shaper to a 100%-scale printout. Recorded deviation — see Summary. |
| `next build` server-rendering the PDF | Client-side generation (this recommendation) | No server endpoint exists or is needed for this data — the design lives entirely in `design-store.tsx`'s client state. A server route would add latency, a new API surface, and no benefit; only add one if a future requirement needs the PDF server-side (e.g. emailing it). |

**Installation:**
```bash
npm install jspdf
```

**Version verification:** Confirmed live against the npm registry this session:
```bash
npm view jspdf version        # 4.2.1
npm view jspdf time.modified  # 2026-03-17T11:16:14.323Z
```

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|--------------|---------|-------------|
| jspdf | npm | ~11 yrs (created 2015-05-19) [VERIFIED: npm registry] | ~15.1M/wk [VERIFIED: npm registry] | github.com/parallax/jsPDF | OK | Approved |
| pdf-lib | npm | ~9 yrs (created 2017-09-04), last publish 2021-11-06 [VERIFIED: npm registry] | ~12.6M/wk [VERIFIED: npm registry] | github.com/Hopding/pdf-lib | OK | Considered, not selected (see Alternatives Considered) |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none. Both packages ran clean through `gsd query package-legitimacy check --ecosystem npm jspdf pdf-lib`: no postinstall scripts, not deprecated, real GitHub-hosted source repos.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Browser (client)                                                        │
│                                                                           │
│  Outline / Rails screens (existing)                                     │
│    updateOutline / updateRailSection                                    │
│           │                                                             │
│           ▼                                                             │
│  design-store.tsx (existing, unchanged pipeline)                        │
│    buildOutline ─▶ computeRailBands ─▶ derive*() ─▶ computeVolume        │
│           │                                    │                        │
│           ▼                                    ▼                        │
│    outlineGeometry (OutlineGeometry)      volumeResult (VolumeResult)   │
│           │                                    │                        │
│           │                                    ▼                        │
│           │                          Volume screen renders litres live  │
│           │                          (VOL-01 — already wired, verify)   │
│           ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ NEW: lib/geometry/template.ts (pure, Vitest-tested)              │   │
│  │   computeTemplateLayout(outlineGeometry, paperChoice, marginMm,  │   │
│  │     overlapMm) -> { pages[{row,col,label,bounds}], columns, rows }│  │
│  │   markStations(outlineGeometry) -> { nose12, tail12, center,     │   │
│  │     widepoint }  (mm stations only — no drawing)                 │   │
│  └───────────────────────────────┬───────────────────────────────┘   │
│                                    │ pure data (pages, marks)          │
│                                    ▼                                   │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ NEW: Export preview dialog (Template screen + Summary screen,    │  │
│  │   D-03) — reads computeTemplateLayout() to show tile grid + page  │  │
│  │   count + Letter/A4 picker (D-04), before any PDF bytes exist     │  │
│  └───────────────────────────────┬───────────────────────────────┘  │
│                                    │ Download click                    │
│                                    ▼                                   │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ NEW: PDF renderer (jsPDF consumer — draws only, no geometry math) │  │
│  │   for each page: draw outline segment, scale-check square (nose  │  │
│  │   page only, D-07), marks, overlap/match marks (D-09), name+dims │  │
│  │   inside kept area (D-08), how-to box (nose page, D-10)          │  │
│  └───────────────────────────────┬───────────────────────────────┘  │
│                                    ▼                                   │
│                          doc.save("<board-name>-template.pdf")         │
│                          (browser download, no server round-trip)      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  GitHub Actions (separate pipeline, not the runtime app)                 │
│    push/PR ─▶ checkout ─▶ setup-node (npm cache) ─▶ npm ci               │
│      ─▶ npm test (vitest run, all lib/**/*.test.ts incl. new template   │
│         suite) ─▶ npm run lint ─▶ npm run build (dummy env vars)         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
lib/
├── geometry/
│   ├── outline.ts            # existing — export MEASURE_STATION_MM (currently private)
│   ├── volume.ts             # existing, unchanged
│   ├── design.ts             # existing — add direct unit tests for the 3 derive*() fns
│   ├── template.ts           # NEW — pure tile-layout + mark-station math, Vitest-tested
│   └── template.test.ts      # NEW — golden/invariant tests against OutlineGeometry fixtures
components/
├── template/                 # NEW (or extend components/outline/)
│   ├── export-preview-dialog.tsx   # D-04 preview (tile grid, page count, Letter/A4 picker)
│   └── build-template-pdf.ts       # NEW — the ONE module that imports jsPDF; draws only
├── outline/
│   └── outline-editor.tsx    # gains: construction-lines toggle button, wide-view button,
│                              #   template-export button (D-03)
└── summary/
    └── (order-form components) # gains: second export button (D-03); print-sheet refit (folded todo)
.github/
└── workflows/
    └── ci.yml                 # NEW — npm test / lint / build on push + PR
```

### Pattern 1: Pure tile-layout math, PDF-only consumer

**What:** All page-grid, mark-station, and overlap arithmetic lives in `lib/geometry/template.ts` as plain functions taking `OutlineGeometry` and paper parameters and returning plain data (page bounds, row/col, mark mm-coordinates). A separate, thin module owns the only `import jsPDF from "jspdf"` in the codebase and does nothing but iterate that data and call drawing methods.
**When to use:** Always, for this feature — mirrors the existing `volume.ts`/`design-store.tsx` split (pure math vs. consumer) and keeps the tile math unit-testable without ever constructing a PDF document in a test.
**Example:**
```typescript
// lib/geometry/template.ts — pure, no jsPDF import
import type { OutlineGeometry } from "./board";
import { type Mm, inchesToMm, mm } from "./units";

export const MEASURE_STATION_MM = inchesToMm(12); // move here or export from outline.ts

export type PaperSize = "letter" | "a4";

const PAPER_MM: Record<PaperSize, { width: Mm; height: Mm }> = {
  letter: { width: mm(215.9), height: mm(279.4) },
  a4: { width: mm(210), height: mm(297) },
};

export interface TemplatePage {
  row: number;
  col: number;
  /** Station/half-width window this page covers, in the outline's own mm frame. */
  stationRange: [Mm, Mm];
  halfWidthRange: [Mm, Mm];
  label: string; // e.g. "3 of 8 — nose to tail"
}

export interface TemplateLayout {
  pages: TemplatePage[];
  columns: number;
  rows: number;
}

export function computeTemplateLayout(
  geometry: OutlineGeometry,
  paper: PaperSize,
  marginMm: Mm,
  overlapMm: Mm,
): TemplateLayout {
  // tile the (length x halfWidePointWidth) rectangle into
  // (PAPER_MM[paper].height - 2*marginMm - overlapMm) row steps and
  // (PAPER_MM[paper].width  - 2*marginMm - overlapMm) column steps —
  // pure arithmetic, no drawing.
  // ...
}
```
```typescript
// components/template/build-template-pdf.ts — the ONE PDF-drawing module
import jsPDF from "jspdf";
import type { TemplateLayout } from "@/lib/geometry/template";
import type { OutlineGeometry } from "@/lib/geometry/board";

export function buildTemplatePdf(
  layout: TemplateLayout,
  geometry: OutlineGeometry,
  paper: "letter" | "a4",
  boardName: string,
): Blob {
  const doc = new jsPDF({ unit: "mm", format: paper === "letter" ? "letter" : "a4" });
  layout.pages.forEach((page, i) => {
    if (i > 0) doc.addPage(paper === "letter" ? "letter" : "a4");
    // draw this page's slice of geometry.points, marks, overlap strips, labels —
    // reads layout/geometry, computes nothing new.
  });
  return doc.output("blob");
}
```
Source: jsPDF's documented `unit`/`format`/`addPage` API [CITED: https://parallax.github.io/jsPDF/docs/jsPDF.html] combined with this codebase's own existing pure/consumer split pattern (`lib/geometry/volume.ts` vs. `design-store.tsx`) [VERIFIED: lib/geometry/volume.ts, lib/geometry/design.ts — read this session].

### Anti-Patterns to Avoid
- **Computing tile bounds or mark positions inside the jsPDF-drawing module:** violates Rule 1's "never inline a formula" spirit even though `build-template-pdf.ts` sits outside `lib/geometry/` — the drawing module must be a pure consumer of `template.ts`'s output, or the tile math becomes untestable without constructing a real PDF.
- **Reusing the Summary order form's browser-print CSS path (`use-print-fit.ts`, `order-form.css`) for the 1:1 template:** CONTEXT.md's code_context section is explicit that this is prior art, not the mechanism — tiled 1:1 output is a different artifact (D-01: downloaded PDF, not `window.print()`).
- **Hand-transcribing the 12" measure-station constant:** `MEASURE_STATION_MM` already exists in `outline.ts:32` [VERIFIED: lib/geometry/outline.ts:32 — `const MEASURE_STATION_MM = inchesToMm(12);`] but is not exported. Export and reuse it (or move it into the new `template.ts` and have `outline.ts` import it) rather than writing a second `inchesToMm(12)` literal — two independent constants for the same physical station is exactly the kind of drift Rule 1 exists to prevent.
- **Letting `next build`'s dummy CI env vars leak into local `.env.local` or getting committed:** keep them declared inline in the workflow YAML (`env:` block) or as repo Actions secrets — never write a real-looking `.env` file into the CI checkout.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| PDF byte encoding (page tree, content streams, fonts) | A hand-written PDF writer | `jspdf` | PDF is a real binary format with cross-reference tables, font embedding, and page-tree objects — a hand-rolled encoder is the definition of the "deceptively complex" problem this rule exists for, and would be untestable against real-world PDF readers/printers. |
| 1:1 physical scale verification | Trusting the PDF library's default page size | The 2"×2" scale-check square (D-07), drawn from the *same* mm coordinates as everything else on the page, using the *same* `doc` unit mode | A silently wrong scale (e.g. a stray points-vs-mm mismatch) is invisible until the shaper has taped 8 pages together — the square is the tested, physical proof the file is honest before any cutting happens. |
| CI dependency caching | A hand-written cache key/restore step | `actions/setup-node@v4`'s built-in `cache: "npm"` option | Built-in caching keys off `package-lock.json`'s hash and is the documented, standard approach [CITED: actions/setup-node README] — a custom `actions/cache` step duplicates this for no benefit. |

**Key insight:** Everything genuinely new in this phase (PDF bytes, CI YAML) is infrastructure with mature, standard tooling. The only project-specific logic worth writing by hand is the tile-grid arithmetic — and that already has a design precedent (`GEOMETRY-MODULE.md`'s `generateOutlineTemplate`) and existing geometry data to consume.

## Runtime State Inventory

Not applicable — this phase adds new capability (template export, CI) and closes a test-coverage gap; it does not rename, refactor, or migrate any existing identifier, database key, or external service configuration.

## Common Pitfalls

### Pitfall 1: Wide boards need column tiling too, not just row tiling
**What goes wrong:** A layout that only tiles down the board's length (one column of pages) silently clips the outline on wide boards.
**Why it happens:** `WIDEPOINT_WIDTH_RANGE_IN` [VERIFIED: lib/geometry/board.ts:90 — `export const WIDEPOINT_WIDTH_RANGE_IN = { min: 16, max: 25 } as const;`] allows a half-width up to 12.5in (25/2). A Letter page's usable width after margins is roughly 8–8.25in, and A4's is narrower still — so the widest boards' half-outline genuinely does not fit in one page-width even though it is only a half-template.
**How to avoid:** Design `computeTemplateLayout` as a 2D grid (`rows` × `columns`) from the start, not a 1D list that happens to work for the default 19in-widepoint board. D-09's "page order runs nose to tail" then means numbering column-major-within-row or choosing an explicit reading order the how-to box explains.
**Warning signs:** Only testing against `DEFAULT_BOARD_SPEC` (19in widepoint) — test against a board at `WIDEPOINT_WIDTH_RANGE_IN.max` explicitly.

### Pitfall 2: `next build` can fail in CI on the existing top-level `neon()` call
**What goes wrong:** `lib/db/client.ts` calls `neon(process.env.DATABASE_URL!)` at module scope [VERIFIED: lib/db/client.ts:12 — `const sql = neon(process.env.DATABASE_URL!);`]. If `DATABASE_URL` is unset when `next build`'s page-data-collection pass imports this module (transitively, via `app/design/actions.ts`), the build can fail before any test of this phase's own code runs.
**Why it happens:** GitHub Actions runners have no `.env.local` and no repo secrets configured for this yet — CI is entirely new (no `.github/workflows/` exists today [VERIFIED: `ls .github/workflows` — directory does not exist]).
**How to avoid:** [ASSUMED — not executed this session, sandbox blocks reading `.env.local`] `neon()` validates connection-string *format* but does not open a network connection at construction time, so a syntactically valid but non-resolving placeholder (`postgres://user:pass@localhost:5432/db`) set as a workflow `env:` value should satisfy it without needing real credentials. Verify this empirically in Wave 0 rather than assuming — if it does throw, the fallback is guarding the `neon()` call or gating DB-touching routes so `next build`'s static pass never imports it eagerly.
**Warning signs:** `npm run build` failing in CI with a Neon/connection-string error while `npm run build` succeeds locally (local has `.env.local`, CI does not).

### Pitfall 3: Clerk env vars may hit the same build-time problem
**What goes wrong:** Same failure mode as Pitfall 2, for `@clerk/nextjs`'s publishable/secret keys.
**Why it happens:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are read by the Clerk SDK; a missing or malformed value can throw at import/middleware-setup time rather than only when an auth call is actually made.
**How to avoid:** [ASSUMED] Set format-valid placeholder values in the workflow (Clerk test keys typically look like `pk_test_...` / `sk_test_...`) — verify in Wave 0 alongside Pitfall 2, in the same CI dry-run.
**Warning signs:** Build succeeds for `npm test`/`npm run lint` but fails specifically at `npm run build` with a Clerk configuration error.

### Pitfall 4: `git worktree` builds don't apply to CI, but do apply to any local reproduction
**What goes wrong:** Trying to reproduce a CI build failure locally inside a worktree checkout and getting a *different* failure (Turbopack unable to resolve `next`).
**Why it happens:** CLAUDE.md already documents this: "`npm run build` gotcha: must run from the main checkout; Turbopack won't resolve next in a worktree." [CITED: ./CLAUDE.md] GitHub Actions always checks out a plain clone, never a worktree, so this specific failure mode cannot occur in CI itself — but a developer debugging a CI-only build failure locally, from a GSD-created worktree, will hit this unrelated failure first.
**How to avoid:** Reproduce CI build issues from the main checkout, not a phase worktree.
**Warning signs:** A build error mentioning Turbopack/module resolution that doesn't match the CI log's actual error.

### Pitfall 5: `beforeprint`/CSS-print patterns don't transfer to jsPDF output
**What goes wrong:** Assuming the Summary order form's hard-won print-fit lessons (`use-print-fit.ts`'s measured-`beforeprint` pattern, container-query font sizing) apply to the new template PDF.
**Why it happens:** Both are "printing," but they are different mechanisms entirely — one measures a live DOM layout at `beforeprint` time and scales it with CSS `zoom`; the other constructs a PDF document programmatically with no DOM/CSS layout involved at all.
**How to avoid:** Treat `use-print-fit.ts` purely as documented prior art for *why* pinned-margin, exact-page-box reasoning matters (per CONTEXT.md's code_context) — port the reasoning, not the mechanism.
**Warning signs:** Trying to render the template via a hidden HTML element plus `window.print()` instead of jsPDF's direct drawing API.

## Code Examples

### Deriving the four required marks from existing `OutlineGeometry`
```typescript
// All four values are already computable from data OutlineGeometry exposes today —
// nothing new needs to be measured, only exported/assembled.
import type { OutlineGeometry } from "@/lib/geometry/outline";
import { inchesToMm, type Mm } from "@/lib/geometry/units";

interface TemplateMarks {
  noseTwelve: Mm;   // station: length - 12in
  tailTwelve: Mm;   // station: 12in from tail tip (station 0)
  center: Mm;       // station: length / 2
  widepoint: Mm;    // station: geometry.widePointStation (already computed)
}

function computeTemplateMarks(geometry: OutlineGeometry): TemplateMarks {
  const twelveIn = inchesToMm(12); // move MEASURE_STATION_MM here, or export it from outline.ts
  return {
    tailTwelve: twelveIn,
    noseTwelve: (geometry.length - twelveIn) as Mm,
    center: (geometry.length / 2) as Mm,
    widepoint: geometry.widePointStation,
  };
}
```
Source: [VERIFIED: lib/geometry/outline.ts — `OutlineGeometry` interface (lines 92-120) and `MEASURE_STATION_MM` (line 32), read this session]. Quoted verbatim: `const MEASURE_STATION_MM = inchesToMm(12);` (outline.ts:32); `widePointStation: Mm;` is a field on `OutlineGeometry` (outline.ts:98); `length: Mm;` is a field on `OutlineGeometry` (outline.ts:93).

### GitHub Actions workflow skeleton
```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    env:
      # Placeholder values only — format-valid, never queried/authenticated against.
      # Verify in Wave 0 whether these are sufficient for `next build` (Pitfalls 2-3);
      # adjust if the real SDKs validate more strictly than expected.
      DATABASE_URL: postgres://user:pass@localhost:5432/shaper_ci
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: pk_test_Y2ktcGxhY2Vob2xkZXIuZXhhbXBsZS5jb20k
      CLERK_SECRET_KEY: sk_test_ci_placeholder_0000000000000000000000
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22" # [ASSUMED — verify against the Vercel project's own Node setting]
          cache: "npm"
      - run: npm ci
      - run: npm test
      - run: npm run lint
      - run: npm run build
```
Source: `actions/setup-node`'s built-in npm cache option [CITED: https://github.com/actions/setup-node] combined with this project's own `package.json` scripts [VERIFIED: package.json — `"test": "vitest run"`, `"lint": "eslint"`, `"build": "next build"`, read this session].

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Approved pre-implementation design's "output as pure SVG text" for the template (`GEOMETRY-MODULE.md`, 2026-08-18) | Downloaded 1:1 multi-page PDF (D-01, 2026-08-28 CONTEXT.md) | This phase's discuss-phase session | A PDF is one file that opens and prints at true scale on any device without depending on a browser correctly honoring an SVG's intrinsic size or the user disabling "fit to page" in a print dialog — same reasoning that drove `use-print-fit.ts`'s own hard lessons about relying on browser print behavior. |

**Deprecated/outdated:**
- Treating `GEOMETRY-MODULE.md`'s type/function inventory as a literal build target: several of its prescribed files (`sample.ts`, `section.ts`, `validate.ts`) were never built, because the actual implementation strategy (statement-for-statement ports of the working prototype, per `outline.ts`/`volume.ts`'s own header comments) diverged pragmatically from the idealized pre-implementation design. Treat the document as directional precedent (naming, general shape), not a spec to match exactly — CONTEXT.md's explicit decisions always win where they conflict.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `neon(process.env.DATABASE_URL!)` accepts a syntactically valid but non-resolving placeholder URL without throwing at construction time (only fails when a query actually runs) | Common Pitfalls #2, Code Examples (CI workflow) | If wrong, `npm run build` fails in CI on every run until the DB call is guarded or a real (test) database is provisioned — blocks the entire CI gate this phase exists to add. Low cost to verify: run the workflow once in Wave 0 and observe. |
| A2 | Clerk's Next.js SDK does not throw at build/import time when given format-valid placeholder publishable/secret keys | Common Pitfalls #3, Code Examples (CI workflow) | Same failure mode and same low-cost Wave-0 verification as A1. |
| A3 | The Vercel project's actual Node version (pinned in Vercel project settings per CLAUDE.md, not readable from this repo checkout) is compatible with Node 22 in CI | Code Examples (CI workflow `node-version`) | A CI/prod Node mismatch could pass CI while a real prod build behaves differently (unlikely given both are modern LTS lines, but unverified). Cheap to check: `vercel env ls` or the Vercel dashboard's project settings. |
| A4 | An exact overlap size (~½" per D-09, exact value at Claude's discretion) of e.g. 12.7mm is enough for reliable taping without wasting excessive paper on the widest boards | Architecture Patterns, Common Pitfalls #1 | Low risk — D-09 already grants discretion here; worst case is a follow-up tweak to one constant, not a structural rework. |

**If this table is empty:** N/A — see rows above.

## Open Questions

1. **Does `next build` actually fail today without `DATABASE_URL`/Clerk env vars set?**
   - What we know: `lib/db/client.ts` calls `neon(...)` at module scope; the sandbox in this research session blocked reading `.env.local` to check what's already configured, and running a build was out of scope for research.
   - What's unclear: whether Next 16's build-time module collection actually imports this module for the `/design/*` routes (which use `auth()`/cookies and may already be forced-dynamic, potentially skipping eager import) — or whether it's imported regardless.
   - Recommendation: Wave 0 task — run `npm run build` locally with `DATABASE_URL` and Clerk keys temporarily unset (or in a scratch env) to observe the actual failure mode before writing the CI workflow's env block from assumption.

2. **Exact page-count expectation for a "default" board, to sanity-check the tile-grid math**
   - What we know: CONTEXT.md's own example says "8 pages — tape nose to tail" for what reads as a typical board.
   - What's unclear: whether that example assumed Letter or A4, single-column or multi-column tiling, and what margin/overlap it assumed.
   - Recommendation: Treat "8 pages" as a rough sanity check during manual verification, not a hard assertion in a golden test — the real invariant to test is "every sampled outline point falls within some page's bounds, with no gap and the specified overlap between adjacent pages."

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| npm registry access | Installing `jspdf` | ✓ | — | — |
| GitHub Actions (repo has Actions enabled) | CI workflow | ✓ (assumed — standard for a GitHub-hosted repo; not independently verified this session) | — | — |
| Local Node.js | Running `npm test`/`npm run build` locally | ✓ | v24.19.0 [VERIFIED: `node --version`] | — |
| Playwright | Optional e2e for PDF export | ✗ (not installed) | — | Deferred per CONTEXT.md discretion — jsPDF's Node-compatible build lets the tile-layout math and a PDF-bytes smoke test run in the existing Vitest suite instead. Install only if a later verification step finds a genuine gap Vitest cannot cover (e.g. asserting the *visual* legibility of the printed page, which no unit test can do). |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** Playwright (fallback: Vitest-only coverage of the PDF-generation pure functions and a Node-environment smoke test on the produced PDF bytes).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.11 [VERIFIED: package.json] |
| Config file | `vitest.config.ts` — `environment: "node"`, `include: ["lib/**/*.test.ts"]` [VERIFIED: vitest.config.ts, read this session] |
| Quick run command | `npm test` (runs `vitest run` — already non-watch, CI-safe) |
| Full suite command | `npm test` (same command; this project has one suite, not split quick/full) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|--------------------|--------------|
| VOL-01 | `computeVolume` matches golden fixtures | unit | `npx vitest run lib/geometry/volume.test.ts` | ✅ (existing, 8 golden-fixture suites) |
| VOL-01 | The live derivation pipeline (`deriveTemplateValues`/`deriveRailValues`/`deriveEffectiveVolume`) produces correct inputs to `computeVolume`, not just `computeVolume` in isolation | unit | `npx vitest run lib/geometry/design.test.ts` | ⚠️ Partial — only exercised transitively via `summarizeDesign`; **Wave 0 gap:** add direct tests for each `derive*` function against known inputs/outputs, not only end-to-end through the composed pipeline. |
| VOL-01 | All 8 existing geometry suites (outline, rail-bands, fins, volume, units, presets, design, outline-drag) run and pass in CI | unit (CI gate) | `npm test` inside `.github/workflows/ci.yml` | ❌ Wave 0 — CI workflow doesn't exist yet |
| TMPL-01 | Tile-grid math covers the full outline with correct overlap, for both a default board and a max-widepoint board | unit | `npx vitest run lib/geometry/template.test.ts` | ❌ Wave 0 — new module and test file |
| TMPL-01 | Mark-station positions (nose 12", tail 12", center, widepoint) match `OutlineGeometry`'s own values | unit | `npx vitest run lib/geometry/template.test.ts` | ❌ Wave 0 |
| TMPL-01 | Generated PDF has the expected page count and is well-formed bytes (jsPDF's Node build runs under Vitest's `environment: "node"`) | unit (smoke) | `npx vitest run components/template/build-template-pdf.test.ts` (or colocated) | ❌ Wave 0 |
| TMPL-01 | Export preview dialog shows correct tile-grid/page-count/paper-picker copy | manual-only | Manual UAT — no e2e framework installed this phase (Playwright deferred per CONTEXT.md) | N/A |

### Sampling Rate
- **Per task commit:** `npm test` (single command, whole suite — this project doesn't distinguish quick vs. full)
- **Per wave merge:** `npm test` plus `npm run lint`
- **Phase gate:** `npm test`, `npm run lint`, and `npm run build` all green, AND the new `.github/workflows/ci.yml` itself green on the phase's own PR/push before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `lib/geometry/design.test.ts` — add direct unit tests for `deriveTemplateValues`, `deriveRailValues`, `deriveEffectiveVolume` (currently only exercised transitively through `summarizeDesign`)
- [ ] `lib/geometry/template.ts` + `lib/geometry/template.test.ts` — new pure tile-layout/mark-station module and its tests
- [ ] `components/template/build-template-pdf.ts` + a colocated smoke test — the one jsPDF-importing module
- [ ] `.github/workflows/ci.yml` — new; resolve Open Question 1 (env vars for `next build`) before finalizing its `env:` block
- [ ] Export `MEASURE_STATION_MM` from `outline.ts` (or relocate it into the new `template.ts`) rather than duplicating the `inchesToMm(12)` literal

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | Unchanged by this phase — no new auth surface. |
| V3 Session Management | No | Unchanged — Clerk session handling untouched. |
| V4 Access Control | No | The template/volume features read only the currently-open design already held in client state (own board or an anonymous unsaved one); no new access boundary is introduced. |
| V5 Input Validation | Yes | The only new user input is the Letter/A4 choice (D-02) — a closed, client-side enum with a fixed default. Validate it as a TypeScript union (`"letter" | "a4"`), not a free string, so an invalid value is a compile error rather than a runtime branch to guard. |
| V6 Cryptography | No | No new cryptographic operation. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| CI secrets exposure via `pull_request` from a fork | Information Disclosure | This repo's CI env values are non-secret placeholders (Open Question 1/Assumption A1-A2) — no real `DATABASE_URL` or Clerk secret should ever be needed by `npm test`/`lint`/`build`, which sidesteps the classic "fork PR reads repo secrets" risk entirely for this workflow. If a future workflow does need real secrets (e.g. deploying from CI), use `pull_request_target` carefully or restrict to `push`-only triggers for the secret-bearing job. |
| Client-side PDF generation reading unsanitized board-name text into the PDF | Tampering (of the output artifact, not the app) | `boardName` is free text the shaper enters (D-08 prints it inside the template). jsPDF's `.text()` draws literal characters into a content stream — there is no HTML/script execution context in a PDF viewer for plain text draws, so this is not an XSS-class risk the way it would be if rendered into a DOM string; no special escaping is needed beyond what jsPDF already handles for its own encoding. |

## Sources

### Primary (HIGH confidence)
- `npm view jspdf` / `npm view pdf-lib` (version, time.created, time.modified, downloads) — registry data pulled directly this session
- `gsd-tools query package-legitimacy check --ecosystem npm jspdf pdf-lib` — verdicts, signals (postinstall, deprecated, repo URL) computed this session
- In-repo source read this session: `lib/geometry/volume.ts`, `lib/geometry/outline.ts`, `lib/geometry/board.ts`, `lib/geometry/units.ts`, `lib/geometry/design.ts`, `lib/geometry/design.test.ts`, `components/design/design-store.tsx`, `components/outline/outline-editor.tsx`, `components/summary/use-print-fit.ts`, `lib/db/client.ts`, `vitest.config.ts`, `package.json`, `.planning/design/GEOMETRY-MODULE.md`

### Secondary (MEDIUM confidence)
- jsPDF official docs (unit/format/addPage API) — https://parallax.github.io/jsPDF/docs/jsPDF.html [CITED]
- jsPDF Node.js compatibility (works without a browser for text/shape output; jsdom only needed for `.html()`) — corroborated across the npm page, GitHub repo, and a GitHub issue thread on server-side jsPDF usage [CITED]
- `actions/setup-node`'s built-in npm-cache option — https://github.com/actions/setup-node [CITED]

### Tertiary (LOW confidence)
- Exact tile-overlap conventions for poster-style PDF printing (2-3mm to ½" range, cut/match marks) — general web consensus from consumer PDF-poster tools (Smallpdf, pdfposter, PrintTiler), not jsPDF-specific and not verified against an authoritative spec; CONTEXT.md's own D-09 already settles the overlap approach (~½" with match marks), so this is background corroboration only, not a load-bearing claim.
- Node version compatibility assumption (A3) — not verified against the actual Vercel project setting; flagged in Assumptions Log.

## Metadata

**Confidence breakdown:**
- Standard stack (jsPDF choice): HIGH — verified via npm registry and package-legitimacy check this session, both authoritative for the claim being made (the package exists, is maintained, is safe to add).
- Architecture (pure tile-layout + PDF consumer split): HIGH — directly extends a pattern already verified in this codebase (`volume.ts`/`design-store.tsx`) and matches the project's own approved pre-implementation design's module shape.
- CI env-var behavior (Pitfalls 2-3, Assumptions A1-A2): LOW — reasoned from how `@neondatabase/serverless` and Clerk's SDKs are generally documented to behave, but not executed/verified this session (sandbox blocked `.env.local` access; running a real build was out of scope). Flagged explicitly for Wave 0 verification.
- Tile-grid overlap/print conventions: LOW-MEDIUM — general web consensus, not authoritative; CONTEXT.md's own decisions (D-07 through D-10) are the actual governing spec here, not this research.

**Research date:** 2026-08-28
**Valid until:** ~2026-09-27 (30 days — this is a fairly stable domain: PDF generation libraries and GitHub Actions patterns don't shift week to week, but the jsPDF version pin and the CI env-var behavior should be re-checked if this research is reused past that window)
