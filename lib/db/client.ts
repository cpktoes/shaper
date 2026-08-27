/**
 * Drizzle bound to Neon's HTTP driver — an HTTP call per query, not a persistent TCP
 * connection. This is not a preference: a TCP connection pool does not survive Vercel's
 * per-invocation serverless lifecycle (each function invocation is a fresh process), and this
 * app deploys to Vercel (RESEARCH.md Pattern 4).
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
