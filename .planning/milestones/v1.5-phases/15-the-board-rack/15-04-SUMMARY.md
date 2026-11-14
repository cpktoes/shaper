---
phase: 15-the-board-rack
plan: 04
subsystem: database
tags: [drizzle, neon, server-action, ownership, board-rack]
status: complete
requires:
  - phase: 15-03
    provides: "lib/models/rack-order.ts — parseRackOrderColumn, rackOrderColumnValue, parseRackOrderInput"
provides:
  - "user_preferences.rack_order (text, nullable) — Drizzle userPreferences.rackOrder"
  - "drizzle/0009_rack_order.sql + meta/0009_snapshot.json + journal entry 0009_rack_order"
  - "readRackOrder(clerkId: string): Promise<string[] | null> in lib/db/queries.ts"
  - "saveRackOrder(orderedIds: readonly string[]): Promise<void> in app/actions/rack-order.ts"
  - "scripts/check-preference-columns.ts proves rack_order (5 of 5) and holds the go-live commands"
affects: [15-08, 15-09, 15-13]
tech-stack:
  added: []
  patterns: ["one nullable JSON-text preference column read leniently, saved strictly (blank-makers trio)"]
key-files:
  created:
    - app/actions/rack-order.ts
    - drizzle/0009_rack_order.sql
    - drizzle/meta/0009_snapshot.json
  modified:
    - lib/db/schema.ts
    - drizzle/meta/_journal.json
    - scripts/check-preference-columns.ts
    - lib/db/queries.ts
    - lib/db/ownership.test.ts
key-decisions:
  - "The saved order keeps only ids returned by a select of the caller's own models rows, in the order given — a foreign or deleted id is dropped silently rather than refusing the whole save (the strict whole-list refusal stays for malformed input)."
metrics:
  duration: "~8 min"
  completed: 2026-10-05
actuals:
  tokens: 5800
  tasks: 2
  commits: 4
---

# Phase 15 Plan 04: The rack order's place on the shaper's account Summary

The order a shaper arranges their saved boards in now has a home on their account — one empty-by-default setting, `rack_order`, added to the development database and proved there — plus a read for the home page and a save that only ever stores the signed-in shaper's own boards.

## What this does for a shaper

- Their account can now remember the order of their boards on the Board Rack, so it can follow them to any device. Until they first arrange the rack it stays empty, and the rack keeps today's automatic order.
- Saving an order is safe: only the signed-in shaper can save, only the ids of their own boards are kept, and a list that is too long or malformed is refused whole. Signed out, nothing is written (the practice rack in the browser tests moves boards with no database).
- The live database is untouched. It gets the new setting at go-live, before the code that uses it, with the founder present (plan 15-13).

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 (tracer) | The order gets a place on the account — column, migration, applied to development and proved | 788f3ac | lib/db/schema.ts, drizzle/0009_rack_order.sql, drizzle/meta/0009_snapshot.json, drizzle/meta/_journal.json, scripts/check-preference-columns.ts |
| 2 RED | Ownership suite extended to the new action | 16bcd96 | lib/db/ownership.test.ts |
| 2 GREEN | readRackOrder + saveRackOrder | 7e15ae0 | lib/db/queries.ts, app/actions/rack-order.ts |

## Development database proof

Generated migration name matched the plan: `drizzle/0009_rack_order.sql`, exactly one statement:
`ALTER TABLE "user_preferences" ADD COLUMN "rack_order" text;`

Before the migrate (`CHECK_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx --no-install tsx scripts/check-preference-columns.ts`), exit 1:
```
user_preferences: planer_max_depth_mm double precision, deck_skin_mm double precision, tip_style text, hidden_blank_makers text, rack_order missing (4 of 5 columns); extra_center_thickness_mm absent (expected absent)
drizzle migrations recorded: 9
```

Migrate (`MIGRATE_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx --no-install drizzle-kit migrate`): "migrations applied successfully!", exit 0.

After the migrate, exit 0:
```
user_preferences: planer_max_depth_mm double precision, deck_skin_mm double precision, tip_style text, hidden_blank_makers text, rack_order text (5 of 5 columns); extra_center_thickness_mm absent (expected absent)
drizzle migrations recorded: 10
```

Neither database command was refused. Nothing was run against production.

## Verification

- `npx vitest run lib/db/ownership.test.ts lib/db lib/models/rack-order.test.ts` — 5 files, 85 tests passed (RED first: the suite failed because `app/actions/rack-order.ts` did not exist).
- `npx next typegen && npx tsc --noEmit` — exit 0. `npm run lint` — exit 0.
- Acceptance greps: `readRackOrder(clerkId: string)` 1; `^export` in the action 1; `await auth()` outside comments 1; `revalidatePath` outside comments 0; `eq(models.clerkUserId, userId)` 1; `rack_order` in the check script 7; `db:migrate:prod` present.
- Full `npx vitest run`: 4173 passed, 2 timed out (`lib/geometry/blank-fit.test.ts` deck-skin case, `lib/geometry/phase14-curves.test.ts` stress-board case) at the 5-second limit while the sibling executor and the orchestrator's checks were running; both files pass alone (79/79). Not touched by this plan.

## Deviations from Plan

None that change behaviour. Two small notes:
- The schema comment is three lines rather than two (the column line itself is unchanged and only the `userPreferences` block moved).
- The ownership filter drops a foreign id rather than refusing the save, exactly as the plan's action describes ("keep only listed ids that are the shaper's own"); recorded as the key decision above.

## TDD Gate Compliance

RED `16bcd96` (test) precedes GREEN `7e15ae0` (feat). No refactor was needed.

## Known Stubs

None. The home page does not read the order yet by design — that is plan 15-08's (`app/page.tsx` belongs to sibling 15-06 this wave).

## Threat model

T-15-08 (IDOR) mitigated: owner from `await auth()` only, ids filtered by `eq(models.clerkUserId, userId)`, ownership suite extended. T-15-09 (oversized list) mitigated by `parseRackOrderInput`. T-15-10 signed-out resolves before any database call. T-15-11 only the development env file was named. T-15-12 the check prints column names, types and a count only. No new surface beyond the plan.

## Self-Check: PASSED

- FOUND: app/actions/rack-order.ts, drizzle/0009_rack_order.sql, drizzle/meta/0009_snapshot.json
- FOUND commits: 788f3ac, 16bcd96, 7e15ae0
