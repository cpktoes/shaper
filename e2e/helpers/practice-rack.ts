import { randomUUID } from "node:crypto";
import { test, type Page } from "@playwright/test";
import { RACK_STAND_IN_SAVE_COOKIE, RACK_STAND_IN_SESSION_COOKIE } from "../../lib/models/rack-stand-in";

/**
 * A practice rack of this test's own (Phase 15 code review, WR-04). The practice rack's saves land
 * in the dev server's memory, kept per `shaper-rack-stand-in-session` cookie — so every test that
 * opens `/test-rack` starts on a fresh session id and never sees an order another test (or another
 * run against the same server) left behind. `save` picks how this test's saves behave: `fail` (each
 * save fails), `slow` (each lands after 1.5 s), or none (each lands at once).
 *
 * Call it before the first `goto`. Calling it again mid-test starts a fresh, never-arranged rack.
 */
export async function freshPracticeRack(page: Page, save?: "fail" | "slow"): Promise<string> {
  const baseURL = test.info().project.use.baseURL;
  if (!baseURL) throw new Error("the Playwright project has no baseURL");
  const session: string = randomUUID();
  const cookies: { name: string; value: string; url: string }[] = [{ name: RACK_STAND_IN_SESSION_COOKIE, value: session, url: baseURL }];
  if (save) cookies.push({ name: RACK_STAND_IN_SAVE_COOKIE, value: save, url: baseURL });
  await page.context().addCookies(cookies);
  return session;
}
