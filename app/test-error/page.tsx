import { notFound } from "next/navigation";
import { FORCED_ERROR_MESSAGE, forcedErrorRouteEnabled } from "@/lib/error-pages/forced-error";

/**
 * A test-only address (quick 260930-fjm, Phase 13 item 12, Task 3, P-4). The flag this reads is
 * set only in `playwright.config.ts`'s `webServer.env`, which `playwright.prod.config.ts` strips
 * — so this route is provably dead in a real build (`e2e/prod/error-pages.spec.ts` proves it's
 * an ordinary not-found page there).
 *
 * `nodeEnv: process.env.NODE_ENV` must be this literal property access, not read through a
 * variable — that literal form is what Next inlines as the string `"production"` at build time,
 * which is the whole reason this route can be proven dead in production rather than merely
 * believed dead.
 */
export default async function TestErrorPage() {
  const enabled = forcedErrorRouteEnabled({
    nodeEnv: process.env.NODE_ENV,
    flag: process.env.SHAPER_FORCED_ERROR,
  });

  if (!enabled) {
    notFound();
  }

  throw new Error(FORCED_ERROR_MESSAGE);
}
