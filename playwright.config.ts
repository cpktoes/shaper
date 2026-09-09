import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for Phase 9's "before" and "after" desktop/phone evidence (TEST-01). Every
 * `/design/*` route is open to a signed-out shaper (`proxy.ts` runs no `.protect()`), so this
 * suite never needs a real Clerk key or a real database — the three `webServer.env` values below
 * are deliberate non-secrets, not real credentials read from `.env.local`. Running signed out on
 * purpose also makes every run deterministic: there is no sign-in state to vary between runs.
 *
 * Port 3100, not 3000: the shaper's own `next dev` (and sometimes another project) holds 3000, so
 * this suite's dev server always starts on its own port instead of colliding with it.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://localhost:3100/design/outline",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Deliberate non-secrets — never a real key. Clerk's own test-mode publishable/secret pair
      // and a localhost database URL that resolves to nothing. Every /design/* route is open to a
      // signed-out shaper, so this suite runs signed out on every project, on purpose.
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk",
      CLERK_SECRET_KEY: "sk_test_0000000000000000000000000000000000000000000",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/shaper",
    },
  },
  use: {
    baseURL: "http://localhost:3100",
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,
      animations: "disabled",
    },
  },
  projects: [
    { name: "iphone", use: { ...devices["iPhone 14"] } },
    { name: "android", use: { ...devices["Pixel 7"] } },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
});
