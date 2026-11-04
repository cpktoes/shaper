import { boardFileName, boardFileText, buildBoardFile } from "@/lib/models/board-file";
import type { DesignSnapshotFields } from "@/lib/models/design-snapshot";

/**
 * Save board as file… (quick 261103-k8o, PC5/PC6): downloads one board as a small file named after it
 * and answers that file's name. Called straight from the Board Rack's ⋯ menu, inside the tap, with
 * nothing awaited first — Safari, an iPhone's above all, refuses a download that starts after the tap
 * has gone stale. Any browser error is left to the caller, which says so in the rack's status pill.
 *
 * It lives in its own file, never in a rack file: `components/setup/rack-source.test.ts` forbids every
 * rack file from making a browser address for a file (its "no picture is stored or exported" rule), and
 * a file with no "rack" in its name is outside that contract by its own design. The download is the
 * Your data page's own hidden-link pattern (`components/account/your-data-page.tsx`): the file's text in
 * a Blob, a browser address for it, a hidden link that names the file, clicked once and removed. Safari
 * needs the address alive while the download starts, so it is let go a minute later.
 */
export function downloadBoardFile(name: string, fields: DesignSnapshotFields, now: Date = new Date()): string {
  const fileName = boardFileName(name);
  const blob = new Blob([boardFileText(buildBoardFile(name, fields, now))], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return fileName;
}
