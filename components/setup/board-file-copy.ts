/**
 * Every word Open a board file… shows on the home page (quick 261103-k8o, 2026-11-03, PC11): the
 * button, the line under it, and the one quiet line that says why a picked file can't open. Sentence
 * case, plain words — a file and a board, never what the file is made of. No React import, so the
 * browser tests (`e2e/board-file.spec.ts`) import these words exactly as `rack-config.ts`'s are.
 *
 * The line under the button is the founder's, kept exactly as written (2026-11-03).
 *
 * Quick 261113-d9b adds the words for a `.brd` (the founder, 2026-11-13: look first, nothing saved): the line that says
 * what a .brd does and the three quiet lines for a .brd that can't be looked at. Everything the closest-fit preview itself
 * says lives in `BRD_FIT_COPY` (`lib/export/brd-fit-preview.ts`, quick 261113-et0), because the printed overview says it too.
 * They are ours to be reworded after his look: plain English, a shaper's words ("the file", "our closest fit").
 */
import { BRD_READ_MAX_BYTES } from "../../lib/export/brd-read";

export const BOARD_FILE_COPY = {
  button: "Open a board file…",
  hint: "A board someone saved as a file, or one of your own. It opens as a new board.",
  tooBig: "That file is too big to be a board file (over 20 MB).",
  notOurs: "That file isn't a Shaper Assistant board file.",
  noBoards: "That file holds no boards.",
  manyBoards: (count: number) =>
    `That file holds ${count} boards. To add them all to your account, sign in and use Import my designs on the Your data page.`,
  unreadable: "The board in that file couldn't be opened. The file may be damaged.",
  readFailed: "Couldn't read that file. Try again.",
  /** Under the founder's line, muted: what a .brd does when it is picked. */
  brdHint: "An AkuShaper or Shape3D .brd file shows our closest fit laid over it, with an overview to print, and opens as a new board if you choose.",
  brdTooBig: `That .brd file is too big to be a board (over ${BRD_READ_MAX_BYTES / (1024 * 1024)} MB).`,
  brdUnreadable: "That .brd file couldn't be read. It may be damaged, or written in a way this app doesn't know yet.",
  brdOutOfRange: (length: string, shortest: string, longest: string) =>
    `That board is ${length} long. This app's boards run ${shortest} to ${longest}, so there's no fit to lay over it.`,
} as const;
