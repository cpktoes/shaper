import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

/**
 * The same three device profiles as playwright.config.ts, run against a PRODUCTION build
 * (`next start`) instead of the dev server.
 *
 * Why a second config exists: the dev server runs React in StrictMode, which mounts every
 * component's effects twice. That double run hid a real production bug for a whole phase — a
 * slider folded away at page load never got its dot positioned in production (Base UI's
 * ResizeObserver is attached in an effect that runs before the control's ref exists; StrictMode's
 * second pass papers over it), so a shaper on a phone saw sliders with no dot. No test on the dev
 * server can ever fail for that class of bug. The specs under `e2e/prod/` run here only.
 *
 * Run with `npm run test:e2e:prod` (builds first, then serves on port 3107 — override with
 * `PW_PROD_PORT=`). `reuseExistingServer` lets a run point at an already-running `next start`.
 */
const port = Number(process.env.PW_PROD_PORT ?? 3107);

export default defineConfig({
  ...base,
  testDir: "./e2e/prod",
  webServer: {
    ...base.webServer,
    command: `npx next start -p ${port}`,
    url: `http://localhost:${port}/design/outline`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: {
    ...base.use,
    baseURL: `http://localhost:${port}`,
  },
});
