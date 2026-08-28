/**
 * drizzle-kit config for `generate` (writes a reviewable migration under ./drizzle) and
 * `migrate` (runs it against a named Neon branch).
 *
 * drizzle-kit runs as a standalone CLI, not through Next.js, so it never reads an env file on
 * its own the way `next dev`/`next build` do. Which file it reads is controlled by
 * `MIGRATE_ENV_FILE` — unset, it reads `.env.local` (the development branch); `db:migrate:prod`
 * in package.json points it at a transient pulled-production file instead. Before loading that
 * file, any `DATABASE_URL`/`DATABASE_URL_UNPOOLED` already exported in the shell is deleted:
 * `process.loadEnvFile` (Node 20.6+) does not overwrite a variable that already exists, so
 * without this a stale shell export would silently outrank the file drizzle was told to read.
 * When no such file exists on disk at all, nothing is deleted and a clean shell that already
 * exports DATABASE_URL (e.g. CI, or Vercel's own build environment) still works.
 */
import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

const envFile = process.env.MIGRATE_ENV_FILE ?? ".env.local";

if (existsSync(envFile)) {
  delete process.env.DATABASE_URL;
  delete process.env.DATABASE_URL_UNPOOLED;
  process.loadEnvFile(envFile);
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
});
