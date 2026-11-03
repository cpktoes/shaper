/**
 * Every word Open a board file… shows on the home page (quick 261103-k8o, 2026-11-03, PC11): the
 * button, the line under it, and the one quiet line that says why a picked file can't open. Sentence
 * case, plain words — a file and a board, never what the file is made of. No React import, so the
 * browser tests (`e2e/board-file.spec.ts`) import these words exactly as `rack-config.ts`'s are.
 *
 * The line under the button is the founder's, kept exactly as written (2026-11-03).
 */
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
} as const;
