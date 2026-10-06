import { SITE_NAME, SITE_TITLE, SITE_URL } from "./metadata";

/**
 * The Share row's pure logic (quick 261006-fom, D-06 with P-4 and P-7): pass the SITE's address
 * on — https://www.shaperassistant.com, whose link-preview card already exists — through the
 * device's own share sheet where there is one (Messages, Mail, AirDrop), otherwise by copying the
 * address. Boards have no public page yet, so this is never a board link, and never the current
 * page's address either, which could carry a page's own state (T-261006-04).
 *
 * Browser-free by injection: `env` mirrors the two parts of the browser's `navigator` this uses,
 * so the tests pass plain fakes and the menu row passes `navigator` itself.
 */

export const SHARE_COPY = {
  label: "Share",
  copied: "Copied",
  failed: "Couldn't copy — www.shaperassistant.com",
} as const;

/** What the share sheet is handed (P-7): the app's name, its approved title line and its address. */
export const SHARE_DATA = { title: SITE_NAME, text: SITE_TITLE, url: SITE_URL } as const;

export interface ShareEnv {
  share?: (data: { title: string; text: string; url: string }) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
}

export type ShareResult = "shared" | "dismissed" | "copied" | "failed";

function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError";
}

async function copyAddress(env: ShareEnv): Promise<ShareResult> {
  if (!env.clipboard) return "failed";
  try {
    // The address alone, so pasting it anywhere shows the site's link-preview card.
    await env.clipboard.writeText(SITE_URL);
    return "copied";
  } catch {
    return "failed";
  }
}

/**
 * Shares the site: the share sheet first, else the clipboard.
 *
 * `share` is called FIRST, before any `await`, because a phone only opens its share sheet straight
 * from the tap — a pause before it would lose the tap's permission. Closing the sheet without
 * sending (an `AbortError`) is the shaper's choice, so nothing is copied behind their back; any
 * other failure falls back to copying the address.
 */
export async function shareSite(env: ShareEnv): Promise<ShareResult> {
  if (typeof env.share === "function") {
    try {
      await env.share({ ...SHARE_DATA });
      return "shared";
    } catch (error) {
      if (isAbortError(error)) return "dismissed";
      return copyAddress(env);
    }
  }
  return copyAddress(env);
}
