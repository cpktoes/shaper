/**
 * Request-time glue for the practice rack's saves (Phase 15 code review, WR-04), mirroring
 * `lib/contact-server.ts`: read the environment and the request's own cookies, hand the pure decider
 * (`resolveRackStandInSave` in `lib/models/rack-stand-in.ts`) its inputs, and act on its answer.
 *
 * `process.env.NODE_ENV` is passed as a literal property access (never through a variable) because
 * that is the exact form Next inlines as the string `"production"` in a real build — which is what
 * makes this stand-in provably unreachable on the live site, exactly like `/test-rack` itself.
 * `lib/models/rack-stand-in.test.ts`'s boundary block pins that literal, and pins that nothing under
 * `components/` imports this file: it is reached only from the `saveRackOrder` Server Action and the
 * `/test-rack` page, both on the server.
 *
 * The orders live in memory on the dev server (never a database — the browser suite has none), in
 * one map hung on `globalThis` so the Server Action and the page share it even where the bundler
 * gives them separate copies of this module, and so it survives a hot reload.
 */

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { parseRackOrderInput } from "./models/rack-order";
import {
  RACK_STAND_IN_ROUTE,
  RACK_STAND_IN_SAVE_COOKIE,
  RACK_STAND_IN_SESSION_COOKIE,
  rackStandInRouteEnabled,
  rackStandInSession,
  resolveRackStandInSave,
} from "./models/rack-stand-in";

const STORE_KEY = "__shaperPracticeRackOrders";

/** Every practice-rack session's stored order, by session id. */
function practiceRackOrders(): Map<string, string[]> {
  const holder = globalThis as typeof globalThis & { [STORE_KEY]?: Map<string, string[]> };
  holder[STORE_KEY] ??= new Map();
  return holder[STORE_KEY];
}

/**
 * The practice rack's own save for a signed-out caller. Returns true when the stand-in took the
 * save (the order is now kept for this browser's session); false when the stand-in is off — a real
 * build, the flag unset — so nothing was stored anywhere. Throws for the `fail` cookie, as a real
 * save does when the database fails.
 */
export async function saveStandInRackOrder(orderedIds: readonly string[]): Promise<boolean> {
  const cookieStore = await cookies();
  const decision = resolveRackStandInSave({
    nodeEnv: process.env.NODE_ENV,
    flag: process.env.SHAPER_RACK_STAND_IN,
    signedIn: false,
    choice: cookieStore.get(RACK_STAND_IN_SAVE_COOKIE)?.value,
    session: cookieStore.get(RACK_STAND_IN_SESSION_COOKIE)?.value,
  });
  if (decision.kind === "off") return false;
  if (decision.kind === "fail") throw new Error("The practice rack's save failed on purpose (test cookie)");
  const parsed = parseRackOrderInput(orderedIds);
  if (parsed === null) return false;
  if (decision.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, decision.delayMs));
  practiceRackOrders().set(decision.session, [...parsed]);
  // The practice rack's own page refreshed, exactly as the real save refreshes the home page.
  revalidatePath(RACK_STAND_IN_ROUTE);
  return true;
}

/** The order this browser's practice-rack session last saved, or null (never arranged, or the
 * practice rack is off). Read by `app/test-rack/page.tsx`, as `app/page.tsx` reads an account's. */
export async function standInRackOrderForRequest(): Promise<string[] | null> {
  if (!rackStandInRouteEnabled({ nodeEnv: process.env.NODE_ENV, flag: process.env.SHAPER_RACK_STAND_IN })) return null;
  const cookieStore = await cookies();
  const stored = practiceRackOrders().get(rackStandInSession(cookieStore.get(RACK_STAND_IN_SESSION_COOKIE)?.value));
  return stored ? [...stored] : null;
}
