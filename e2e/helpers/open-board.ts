import type { Page } from "@playwright/test";
import { OPEN_BOARD_STORAGE_KEY } from "../../lib/models/open-board";

/**
 * The board a shaper is working on, as this browser keeps it (quick 261019-ep5,
 * `lib/models/open-board.ts`): the stored copy read straight out of the page's storage, parsed, or
 * null when there is none or it cannot be read.
 */
export async function storedOpenBoard(page: Page): Promise<{
  version: number;
  snapshot: { version: number; design: { boardName: string; blank: { copy: { name: string } } | null } };
  modelId: string | null;
  ownerId: string | null;
  locked: boolean;
  dirty: boolean;
} | null> {
  return page.evaluate((key) => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? null : JSON.parse(raw);
    } catch {
      return null;
    }
  }, OPEN_BOARD_STORAGE_KEY);
}
