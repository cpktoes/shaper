import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildSignedWebhookRequest, buildUnsignedRequest, createTestSigningSecret } from "./clerk-webhook-test-signing";

/**
 * TDD RED for quick 260930-ckm, Task 2 (R1–R8): proof against the REAL route module — not the
 * injected-fakes core lib/clerk-webhook.test.ts already covers — that verification really runs
 * before the database is ever touched.
 *
 * The env is stubbed BEFORE the route is imported, and the route is imported dynamically inside
 * beforeAll: `lib/db/client.ts` calls `neon(process.env.DATABASE_URL!)` at module load, so a
 * static `import "@/app/api/webhooks/clerk/route"` at the top of this file would dial Neon with
 * no URL before the stub ever ran. The fake DATABASE_URL below is never actually dialled, because
 * every database call in this file goes through a `vi.spyOn(db, "batch")` — nothing here makes a
 * real network call. This is the mechanical proof that POST really wires verifyWebhook, the
 * signing-secret check, and deleteAccountData together in the order the core assumes.
 */

const ROUTE_USER_ID = "user_test_route";
const PINNED_MODELS_SQL = 'delete from "models" where "models"."clerk_user_id" = $1 returning "id"';
const PINNED_PREFS_SQL =
  'delete from "user_preferences" where "user_preferences"."clerk_user_id" = $1 returning "clerk_user_id"';

let signingKey: Buffer;
let signingSecret: string;
let POST: (request: Request) => Promise<Response>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any;
let routeModule: Record<string, unknown>;

beforeAll(async () => {
  const generated = createTestSigningSecret();
  signingKey = generated.key;
  signingSecret = generated.secret;

  vi.stubEnv("DATABASE_URL", "postgresql://nobody:nothing@localhost/none");
  vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", signingSecret);

  routeModule = await import("@/app/api/webhooks/clerk/route");
  POST = routeModule.POST as typeof POST;
  db = (await import("@/lib/db/client")).db;
});

afterAll(() => {
  vi.unstubAllEnvs();
});

let batchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // Fresh spy per test (restored below): vi.spyOn on an already-mocked property returns the same
  // mock instance rather than a new one, which would otherwise leak call history across tests.
  batchSpy = vi.spyOn(db, "batch");
});

afterEach(() => {
  batchSpy.mockRestore();
});

function userDeletedBody(id: string): string {
  return JSON.stringify({ type: "user.deleted", data: { object: "user", id, deleted: true } });
}

function signedRequest(body: string, key: Buffer = signingKey): Request {
  return buildSignedWebhookRequest({ url: "https://www.shaperassistant.com/api/webhooks/clerk", body, key });
}

describe("POST /api/webhooks/clerk (the real route)", () => {
  it("R1. a correctly signed user.deleted reaches the database through two owner-scoped deletes", async () => {
    batchSpy.mockResolvedValue([[{ id: "a" }], [{ clerkUserId: ROUTE_USER_ID }]]);
    const response = await POST(signedRequest(userDeletedBody(ROUTE_USER_ID)));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Deleted: saved boards 1, settings rows 1");
    expect(batchSpy).toHaveBeenCalledTimes(1);
    const statements = batchSpy.mock.calls[0][0] as { toSQL: () => { sql: string; params: unknown[] } }[];
    expect(statements).toHaveLength(2);
    expect(statements[0].toSQL()).toEqual({ sql: PINNED_MODELS_SQL, params: [ROUTE_USER_ID] });
    expect(statements[1].toSQL()).toEqual({ sql: PINNED_PREFS_SQL, params: [ROUTE_USER_ID] });
  });

  it("R2. a correctly signed session.created is ignored; batch is never called", async () => {
    const body = JSON.stringify({ type: "session.created", data: { object: "session", id: "sess_test" } });
    const response = await POST(signedRequest(body));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Ignored");
    expect(batchSpy).not.toHaveBeenCalled();
  });

  it("R3. the signed user.deleted with its body altered after signing is refused; batch is never called", async () => {
    const signed = signedRequest(userDeletedBody(ROUTE_USER_ID));
    const tampered = new Request(signed.url, {
      method: "POST",
      body: userDeletedBody("user_someone_else"),
      headers: signed.headers,
    });
    const response = await POST(tampered);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Webhook refused");
    expect(batchSpy).not.toHaveBeenCalled();
  });

  it("R4. an unsigned POST with a JSON body and no svix headers is refused; batch is never called", async () => {
    const response = await POST(
      buildUnsignedRequest("https://www.shaperassistant.com/api/webhooks/clerk", userDeletedBody(ROUTE_USER_ID)),
    );

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Webhook refused");
    expect(batchSpy).not.toHaveBeenCalled();
  });

  it("R5. with no signing secret set on the server, a request signed with the real secret is still refused", async () => {
    vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", "");
    try {
      const response = await POST(signedRequest(userDeletedBody(ROUTE_USER_ID)));
      expect(response.status).toBe(400);
      expect(await response.text()).toBe("Webhook refused");
      expect(batchSpy).not.toHaveBeenCalled();
    } finally {
      vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", signingSecret);
    }
  });

  it("R6. a database failure answers 500 so Clerk retries", async () => {
    batchSpy.mockRejectedValue(new Error(`Failed query: ...\nparams: ["${ROUTE_USER_ID}"]`));
    const response = await POST(signedRequest(userDeletedBody(ROUTE_USER_ID)));

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("Webhook failed");
  });

  it("R7. the route module exports POST only — no GET, PUT, PATCH, DELETE or HEAD", () => {
    expect(typeof routeModule.POST).toBe("function");
    for (const method of ["GET", "PUT", "PATCH", "DELETE", "HEAD"]) {
      expect(routeModule[method]).toBeUndefined();
    }
  });
});

describe("boundary: the signing secret never carries Next's public-variable prefix", () => {
  function collectSourceFiles(dir: string): string[] {
    const entries = readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...collectSourceFiles(full));
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        files.push(full);
      }
    }
    return files;
  }

  it("R8. no non-test file under app/, components/ or lib/ names CLERK_WEBHOOK_SIGNING_SECRET with the public prefix", () => {
    // Built from parts (the delivery.test.ts boundary (b) idiom) so this test's own source never
    // matches its own search needle.
    const publicPrefix = ["NEXT", "_PUBLIC_"].join("");
    const keyName = ["CLERK_WEBHOOK", "_SIGNING_SECRET"].join("");
    const needle = publicPrefix + keyName;

    const repoRoot = fileURLToPath(new URL("..", import.meta.url));
    const dirs = ["app", "components", "lib"].map((d) => join(repoRoot, d));
    const offenders: string[] = [];
    for (const dir of dirs) {
      for (const file of collectSourceFiles(dir)) {
        if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
        if (readFileSync(file, "utf8").includes(needle)) offenders.push(file);
      }
    }
    expect(offenders, `Found the public-prefixed key name in: ${offenders.join(", ")}`).toEqual([]);
  });
});
