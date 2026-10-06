import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SetupScreen } from "@/components/setup/setup-screen";
import { rackModelsFromRows } from "@/lib/models/rack-models";
import { rackStandInRouteEnabled, standInBoardCount, standInRackRows } from "@/lib/models/rack-stand-in";
import { standInRackOrderForRequest } from "@/lib/rack-stand-in-server";

export const metadata: Metadata = {
  title: "Shaper Assistant — Practice Rack",
  robots: { index: false, follow: false },
};

/**
 * A test-only address (Phase 15, the Board Rack, RESEARCH Pattern 8): the real home screen holding
 * stand-in saved boards built from the app's own presets, so the browser suite — which runs signed
 * out with no database — can see a rack of one, fifteen or thirty boards (`?boards=N`, clamped to
 * 1-100). The stand-in boards pass through `rackModelsFromRows`, the same check a real saved board
 * passes on `/`.
 *
 * The flag this reads is set only in `playwright.config.ts`'s `webServer.env`, which
 * `playwright.prod.config.ts` strips — so this route is provably dead in a real build
 * (`e2e/prod/test-rack.spec.ts` proves it's an ordinary not-found page there).
 *
 * `nodeEnv: process.env.NODE_ENV` must be this literal property access, not read through a
 * variable — that literal form is what Next inlines as the string `"production"` at build time,
 * which is the whole reason this route can be proven dead in production rather than merely
 * believed dead.
 */
export default async function TestRackPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const enabled = rackStandInRouteEnabled({
    nodeEnv: process.env.NODE_ENV,
    flag: process.env.SHAPER_RACK_STAND_IN,
  });

  if (!enabled) {
    notFound();
  }

  const { boards } = await searchParams;
  // The order this browser's practice-rack session last saved (lib/rack-stand-in-server.ts), read
  // the way app/page.tsx reads a shaper's own: null until a board is moved.
  const rackOrder = await standInRackOrderForRequest();
  return <SetupScreen models={rackModelsFromRows(standInRackRows(standInBoardCount(boards)))} rackOrder={rackOrder} />;
}
