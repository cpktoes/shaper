import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { SetupScreen } from "@/components/setup/setup-screen";
import { listModels, readRackOrder } from "@/lib/db/queries";
import { resolveCarryOverTipStyle } from "@/lib/fit-defaults-server";
import { rackModelsFromRows, rackNeedsTipStyle, type RackModel } from "@/lib/models/rack-models";

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

  // No bottom bar here since quick 261003-q2f removed the old bottom tab bar: on a phone the six
  // screens are reached from the top bar's menu, so the page is just the setup screen.
  if (!userId) return <SetupScreen models={[]} />;
  return (
    <Suspense fallback={<SetupScreen models={[]} />}>
      <BoardRackData userId={userId} />
    </Suspense>
  );
}

async function BoardRackData({ userId }: { userId: string }) {
  let models: RackModel[] = [];

  // Phase 15 D-03: the shaper's own rack order, kept on their account so the rack stands the same
  // way on every device they sign in on. Read beside the board list rather than after it, with its
  // failure handled at once so it can never go unhandled while the list loads: a failed read (for
  // instance before production carries the `rack_order` column) shows today's automatic order —
  // newest first — never a broken page.
  const orderRead: Promise<string[] | null> = readRackOrder(userId).catch((error) => {
    console.error("Shaper: failed to read the rack order", error);
    return null;
  });

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

  // One corrupt snapshot — one that doesn't parse, or whose card numbers can't be worked out —
  // omits a single card instead of breaking the page. Logged so a missing board is discoverable
  // by whoever can read the server log, even though the shaper themself has no way to see this
  // line (this plan's prohibition).
  //
  // A board saved under Phase 11 opens with the shaper's own Tip Style (Phase 12 D-14), looked up
  // once for the whole rack and only when some row actually holds a Phase 11 blank — decided by
  // the blank's shape, never the envelope's version number. The lookup fails soft to the cookie's
  // Tip Style or Pin deck (for instance before production carries the `tip_style` column), so it
  // can never take the rack down.
  const tipStyle = rackNeedsTipStyle(rows) ? await resolveCarryOverTipStyle() : undefined;
  models = rackModelsFromRows(rows, undefined, { tipStyle });
  const rackOrder = await orderRead;

  return <SetupScreen models={models} rackOrder={rackOrder} />;
}
