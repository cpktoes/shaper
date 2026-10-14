# Blank catalogue as it stood on 2026-10-14, before the founder's review

A plain copy of the four catalogue files (`db/seed/blanks/*.csv`) taken on 2026-10-14, after that day's
corrections (Arctic's three fish blanks' tails and noses; the Marko 10'2" M pair's nose and tail swap) and
before the founder's station-by-station review of the outlier page. Kept so any review change can be undone
by copying a file back and reseeding. Git holds every earlier version too: tag `blanks-2026-10-13-before-fixes`
is the catalogue before any of the 2026-10-14 changes, and `blanks-2026-10-14-before-review` is this copy.

Nothing reads this folder: the app and the seed read only the four files named in `lib/blanks/seed-files.ts`.

To put a file back:

    cp db/seed/blanks/snapshots/2026-10-14-before-review/arctic_foam_stations.csv db/seed/blanks/
    npx --no-install tsx scripts/seed-blanks.ts && npx --no-install tsx scripts/seed-blanks.ts --check
