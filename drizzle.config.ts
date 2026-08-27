/**
 * drizzle-kit config for `generate` (writes a reviewable migration under ./drizzle) and
 * `migrate` (runs it against the branch DATABASE_URL points at).
 *
 * drizzle-kit runs as a standalone CLI, not through Next.js, so it never reads `.env.local` on
 * its own the way `next dev`/`next build` do. `process.loadEnvFile` (Node 20.6+) loads it here,
 * guarded in a try/catch so a clean shell that already exports DATABASE_URL (e.g. CI, or Vercel's
 * own build environment) doesn't fail just because there's no .env.local file to find.
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local on disk — fall through to whatever the shell already has in its environment.
}

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
