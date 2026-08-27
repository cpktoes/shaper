import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { SetupScreen } from "@/components/setup/setup-screen";
import type { SavedModel } from "@/components/setup/board-rack-card";
import { listModels } from "@/lib/db/queries";
import { parseSnapshot } from "@/lib/models/design-snapshot";

export const metadata: Metadata = {
  title: "Shaper — Start a New Board",
  description: "Pick a board type and start shaping.",
};

/**
 * Server Component: reads the signed-in shaper's saved boards (MODL-03) and hands them to
 * `SetupScreen` as plain, already-validated props. Two failure paths both degrade to "no saved
 * boards" rather than a broken page — a board-list failure or one corrupt row must never stop a
 * shaper starting a new board (UI-SPEC board-rack "error").
 */
export default async function Home() {
  const { userId } = await auth();
  let models: SavedModel[] = [];

  if (userId) {
    try {
      const rows = await listModels(userId);
      models = rows.flatMap((row) => {
        try {
          return [{ id: row.id, name: row.name, snapshot: parseSnapshot(row.snapshot), updatedAt: row.updatedAt }];
        } catch {
          // One corrupt snapshot omits a single card instead of breaking the page.
          return [];
        }
      });
    } catch {
      models = [];
    }
  }

  return <SetupScreen models={models} />;
}
