import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { SetupScreen } from "@/components/setup/setup-screen";
import type { SavedModel } from "@/components/setup/board-rack-card";
import { PhoneTabBar } from "@/components/design/phone-tab-bar";
import { listModels } from "@/lib/db/queries";
import { parseSnapshot } from "@/lib/models/design-snapshot";

export const metadata: Metadata = {
  title: "Shaper Assistant — Start a New Board",
  description: "Pick a board type and start shaping.",
};

/**
 * Server Component: reads the signed-in shaper's saved boards (MODL-03) and hands them to
 * `SetupScreen` as plain, already-validated props. Three failure/latency paths all degrade to
 * "no saved boards" rather than a broken or spinner-bearing page — a board-list failure, one
 * corrupt row, or a slow query must never stop a shaper starting a new board (UI-SPEC board-rack
 * "error"/"loading").
 *
 * A signed-out visitor skips the query entirely and renders the plain preset screen immediately.
 * A signed-in shaper's board list is fetched inside `BoardRackData`, a nested async Server
 * Component wrapped in `<Suspense>` — per this Next.js version's own streaming-data guidance
 * (node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md "With <Suspense>"):
 * an uncached database read blocks the whole route unless it's isolated behind its own boundary.
 * The fallback renders `SetupScreen` with an empty model list — the exact same plain-preset-grid
 * view the empty and signed-out cases already produce (UI-SPEC: "the Suspense fallback is the
 * plain page shell with no rack section... never a spinner") — so a slow query is visually
 * indistinguishable from "no boards yet" for the moment it takes to resolve.
 */
export default async function Home() {
  const { userId } = await auth();

  // A single returned fragment, `PhoneTabBar` as its last child on both the signed-in and
  // signed-out paths, so the bar is mounted exactly once no matter which branch renders — two
  // separate early returns each mounting their own copy is the one mistake this shape prevents.
  // It has to live here rather than in `components/site-nav.tsx` for the same reason
  // `app/design/layout.tsx` mounts it after `props.children`: it must be the LAST child of the
  // root layout's flex column (app/layout.tsx) to sit at the bottom. No bottom padding is needed
  // anywhere for it either — the bar is `flex-none` and `SetupScreen`'s own root is `min-h-0
  // flex-1 overflow-y-auto` (setup-screen.tsx), so that scroller shrinks to fit above the bar on
  // its own and nothing can hide underneath it.
  return (
    <>
      {!userId ? (
        <SetupScreen models={[]} />
      ) : (
        <Suspense fallback={<SetupScreen models={[]} />}>
          <BoardRackData userId={userId} />
        </Suspense>
      )}
      <PhoneTabBar />
    </>
  );
}

async function BoardRackData({ userId }: { userId: string }) {
  let models: SavedModel[] = [];

  let rows: Awaited<ReturnType<typeof listModels>> = [];
  try {
    rows = await listModels(userId);
  } catch (error) {
    // A failed board-list read must never stop a shaper starting a new board — degrade to the
    // same view a signed-out visitor gets, but log the failure server-side so it's discoverable
    // rather than invisible.
    console.error("Shaper: failed to list saved boards", error);
    rows = [];
  }

  models = rows.flatMap((row) => {
    try {
      return [{ id: row.id, name: row.name, snapshot: parseSnapshot(row.snapshot), updatedAt: row.updatedAt }];
    } catch (error) {
      // One corrupt snapshot omits a single card instead of breaking the page. Logged so a
      // missing board is discoverable by whoever can read the server log, even though the
      // shaper themself has no way to see this line (this plan's prohibition).
      console.error(`Shaper: dropped unparsable saved board ${row.id}`, error);
      return [];
    }
  });

  return <SetupScreen models={models} />;
}
