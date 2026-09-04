# Walking Skeleton — Shaper

**Phase:** 1
**Generated:** 2026-08-19

## Capability Proven End-to-End

> A shaper lands on the deployed Shaper URL, clicks a board-type preset card, and is dropped
> straight into the outline editor with that preset's curve already drawn — then moves through
> RAILS / VOLUME / FINS / SUMMARY seeing the same board, with every number in inches and litres.

Phase 1 is a *partial* skeleton by construction: five design screens, `lib/geometry/*` (562 passing
Vitest tests), and the shared board store were already ported by prior quick tasks. The remaining
skeleton — the part this phase builds — is the **entry point and the deployment leg**: setup screen
at `/` → preset → editor → live on Vercel.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16.3.1, App Router, React 19.2, Turbopack by default | Prescribed by the founder's build guide (`.claude/CLAUDE.md`). Note: Next 16 breaking changes are real — `LayoutProps<'/route'>` typed helpers, `proxy.ts` not `middleware.ts`, `eslint` not `next lint`. Existing files already follow these; extend them, do not fall back to Next 13/14 idioms. |
| Language / styling | TypeScript strict + Tailwind CSS v4 + shadcn/ui on `@base-ui/react` primitives | Prescribed by the build guide; `components/ui/*` already established on `@base-ui/react/*` subpath imports. |
| Geometry math | Pure TypeScript under `lib/geometry/*`, framework-agnostic, Vitest-covered | Hard project constraint — the calculators are the core value, so their correctness must be verifiable in isolation from UI code. `lib/geometry/presets.ts` joins this tier as pure data. |
| Units | Millimetres internally; inches + litres only at the `lib/geometry/units.ts` boundary | Hard project constraint. Shapers think in inches/litres; the math needs one consistent internal unit. No module outside `units.ts` performs a conversion. |
| Client state | React context + `useState`/`useMemo` in `components/design/design-store.tsx` — no reducer library, **no effects that write state**, no persistence | Already established. Phase 1 promotes this provider to the root layout so `/` and `/design/*` share one instance. Persistence is Phase 2's job (Neon Postgres via Drizzle). |
| Data layer | **None in Phase 1** — board state is in-memory only, gone on reload | Deliberate. CONTEXT.md D-07 + Deferred Ideas: even `localStorage` is explicitly out of scope so Phase 2's real persistence is designed once, properly. |
| Auth | **None in Phase 1** | Clerk arrives in Phase 2 (ACCT-01..03). No `middleware.ts`/`proxy.ts` file exists or should be introduced now. |
| Deployment target | Vercel, Git integration from `main`, default `*.vercel.app` URL | Claude's discretion per CONTEXT.md. Vercel is built by the Next.js maintainers for zero-config Next deploys; a hand-rolled GitHub Action would reimplement build detection, preview-per-PR, and edge caching for free. |
| Directory layout | `app/{route}/page.tsx` thin Server Components → `components/{feature}/*` client components → `lib/geometry/*` pure functions | Already established across all five design screens; `components/setup/*` follows it exactly. |

## Stack Touched in Phase 1

- [x] Project scaffold (framework, build, lint, test runner) — **pre-existing**, ported by quick tasks 260818-kvp/lm0/mr2/nyw/u1n
- [ ] Routing — `/` becomes a real route (was a forward to `/design/outline`); five `/design/*` routes pre-existing
- [ ] Database — **deliberately absent in Phase 1.** The Walking Skeleton's "one real read + one real write" is satisfied against the in-memory board store (`applyPreset` write on `/`, `useDesign()` read in `/design/outline`); the persistent-storage leg of the skeleton is Phase 2 (MODL-01..03), which is where Neon + Drizzle are introduced. This is a recorded, intentional deferral, not an oversight.
- [ ] UI — preset card click wired through the shared store to a live geometry re-render
- [ ] Deployment — running at a public Vercel URL, auto-deploying from `main`

## Out of Scope (Deferred to Later Slices)

> Explicit, so later phases do not re-litigate Phase 1's minimalism.

- **Any persistence at all** — no database, no `localStorage`, no `sessionStorage`. The board resets on reload. (Phase 2)
- **Accounts / auth / sessions** — no Clerk, no user records, no protected routes. (Phase 2)
- **Rocker and foil editors** — `ROCK-01`, `FOIL-01`. Rail band and volume compute from what exists today. (Phase 4)
- **Live volume recalculation from full geometry + printable 1:1 templates** — `VOL-01`, `TMPL-01`. (Phase 3)
- **Groveler and Gun presets** — the roster is exactly the core four (Shortboard, Fish, Mid-length, Longboard). (Backlog)
- **Saved-boards section on the setup screen** — the layout must leave room for it, but it is not built. (Phase 2)
- **Marketing/landing page** — `/` *is* the setup screen; there is no separate marketing surface. (Later milestone)
- **Playwright / component tests** — no e2e or component-test framework is installed. `SETUP-01` and `VIZ-01` remain manual-UAT verified this phase. Not a regression Phase 1 introduces.
- **Community board database, public sharing, billing** — v2 milestones (SHAR2-*, ACCT2-01).

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- **Phase 2** — a shaper signs in and their board survives a reload: Clerk auth + Neon/Drizzle persistence, saved models listed on the setup screen beside the presets. This is the phase that fills the deliberately-empty data-layer row above.
- **Phase 3** — a shaper sees live volume in litres and prints a 1:1 tiled template to cut foam from, with the geometry math proven by CI-green unit tests.
- **Phase 4** — a shaper shapes rocker and foil as first-class editors, with rail band and volume recalculating live from them.
