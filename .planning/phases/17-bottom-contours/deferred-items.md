# Phase 17 — things found and left for later

Things a plan's work ran into that were not that plan's to fix. Each says what was seen, how it was proved not to be
the plan's own doing, and what would settle it.

## 1. CLOSED — A Shortboard with a Deep Single and six channels trips the app's own rail warning — and one computer test still expects it not to

**Closed by:** plan 17-14's follow-up after the founder's look, commit `b47bf3dc`, 2026-11-10 UTC.

**How it was settled.** The founder ruled it the first of the two below: the warning is right and is kept. On the
stock Shortboard six channels at their starting numbers do leave the rail under 1/4" at the stations nearest the
tail, with or without a Deep Single, and the bottom's maths has not changed since the test was written. The test had
only ever passed by luck of timing: the check that finds the thin rail runs a moment after a pick, and the test
counted DATA's notes before the warning landed. It now waits for the warning, reads its words from the app's own
sentence, and expects four notes; and every other BOTTOM test that counted notes straight after a pick waits the
same way. What follows is the note as first written, kept for the record.

**Found by:** plan 17-14 (BOTTOM on phones), 2026-11-10 UTC, while running the plan's full browser line.

**What is seen.** On a computer, open the 6'2" Shortboard, pick a Deep Single Concave in the CENTER and six channels in
the TAIL, leave every slider where it starts, and open DATA. Under the two tables there are four notes, not three. The
fourth is the app's own warning:

> The channels leave the rail under 1/4" near the tail: the rail is thinner there than the floor. Lower the Depth, or
> move the cut away from the tip.

**The test that fails.** `e2e/bottom-viewer.spec.ts`, line 369, on the computer only — "a Deep Single and six
channels: the marks table's columns in shop order, a wall `—` ahead of its own channel's start, and the notes". It
expects three notes and finds four. The test does not run on the phones, so only a computer run shows it.

**Why it is not 17-14's.** It fails every time, alone, on the committed code. It fails the same way with every change
17-14 made to the app's own files taken back out (the test file left as it was): expected 3, received 4. The bottom's
maths in `lib/geometry` has not changed since that test was written (plan 17-10, `e9805e62`); the board's state file
and others changed in plans 17-12 and 17-13.

**What needs deciding.** Two different things could be wrong, and they are the founder's to tell apart:

1. The warning is right, and the test is stale — it was written when those starting numbers did not reach the rail's
   1/4" floor. Then the test learns the fourth note.
2. The warning is wrong, or the channels' starting numbers should not trip it — a shaper who picks six channels and
   touches nothing should not be told at once to lower the Depth. Then the starting numbers (or the floor's reach near
   the tail) are looked at again.

**Left alone because** it is outside 17-14's files and is a question about the bottom's starting numbers, not about
phones.
