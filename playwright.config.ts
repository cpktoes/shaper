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
      // Deliberate non-secrets — never a real key. `pk_live_`/`sk_live_`, not `pk_test_`/
      // `sk_test_`: a `pk_test_` key marks the app as a Clerk "development" instance, and
      // @clerk/nextjs's clerkMiddleware then redirects every request through a dev-browser JWT
      // handshake against the decoded fake host (`example.clerk.accounts.dev`) before it ever
      // reaches the page — that handshake 400s ("Invalid host") against a host with no real
      // Clerk instance, which aborts navigation before the design screen ever paints, no matter
      // how open the route is. A `pk_live_`-prefixed key marks the instance "production", which
      // skips that dev-only handshake entirely, so Clerk gives up quietly (a console warning,
      // nothing more) and the app renders normally — confirmed with a scripted browser render,
      // not just a curl check, since curl never runs Clerk's client-side JS. Every /design/*
      // route is open to a signed-out shaper, so this suite runs signed out on every project.
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk",
      CLERK_SECRET_KEY: "sk_live_0000000000000000000000000000000000000000000",
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
