/**
 * The background worker that reads and fits a picked `.brd` (quick 261113-kvo, Task 3): the page posts `{ id, bytes, fileName }`
 * and gets `{ id, result }` back, where `result` is `brdLookFromBytes`'s own answer (`lib/export/brd-look.ts`), so the page
 * stays live while a long board is worked out. It runs only the app's own code on the bytes it is given and touches nothing else:
 * no React, no document, nothing leaves the browser. Any throw is answered as an unreadable file, so the page is never left waiting.
 */
import { brdLookFromBytes, type BrdLookResult } from "@/lib/export/brd-look";

/** The worker's own side of the channel, typed by hand (the project's TypeScript is set for the page, not a worker). */
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<{ id: number; bytes: Uint8Array; fileName: string }>) => void) | null;
  postMessage: (message: { id: number; result: BrdLookResult }) => void;
};

scope.onmessage = (event) => {
  const { id, bytes, fileName } = event.data;
  let result: BrdLookResult;
  try {
    result = brdLookFromBytes(bytes, fileName);
  } catch {
    result = { ok: false, problem: "unreadable" };
  }
  scope.postMessage({ id, result });
};
