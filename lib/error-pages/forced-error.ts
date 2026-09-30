/**
 * The forced-error switch (quick 260930-fjm, Phase 13 item 12, Task 3, P-4): a test-only server
 * throw at `/test-error`, honoured only outside a production build AND with the flag exactly
 * "1" — mirroring `resolveContactDelivery`'s own production-guarded stand-in (`lib/contact/delivery.ts`).
 *
 * The flag is set only in `playwright.config.ts`'s `webServer.env`, which `playwright.prod.config.ts`
 * strips, and never in Vercel or any `.env` file. `app/test-error/page.tsx` passes the literal
 * `process.env.NODE_ENV` (never through a variable), because that literal property access is what
 * Next inlines as the string `"production"` at build time — which is what makes this route
 * provably dead in a real build (T-fjm-02), proven by `e2e/prod/error-pages.spec.ts`.
 *
 * No React, Next, browser API or network import anywhere in this file.
 */

export const FORCED_ERROR_ROUTE = "/test-error";

export const FORCED_ERROR_ENV = "SHAPER_FORCED_ERROR";

/** Never shown to a shaper — `app/error.tsx` and `app/global-error.tsx` never read an error's
 * own message text, and the browser suite asserts this sentence never appears on the screen. */
export const FORCED_ERROR_MESSAGE = "Forced test failure for the browser suite — never shown to a shaper";

/**
 * True only when BOTH are true: `nodeEnv` is not the literal `"production"` string, and `flag` is
 * exactly `"1"` (not `"true"`, not a padded `" 1"`, not anything else). Every other combination —
 * including a real production build with the flag somehow set — is false.
 */
export function forcedErrorRouteEnabled(input: { nodeEnv: string | undefined; flag: string | undefined }): boolean {
  return input.nodeEnv !== "production" && input.flag === "1";
}
