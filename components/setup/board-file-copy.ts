/**
 * Every word Open a board file… shows on the home page (quick 261103-k8o, 2026-11-03, PC11): the
 * button, the line under it, and the one quiet line that says why a picked file can't open. Sentence
 * case, plain words — a file and a board, never what the file is made of. No React import, so the
 * browser tests (`e2e/board-file.spec.ts`) import these words exactly as `rack-config.ts`'s are.
 *
 * The line under the button is the founder's, kept exactly as written (2026-11-03).
 *
 * Quick 261113-d9b adds the words for a `.brd` (the founder, 2026-11-13: look first, nothing saved): the line that says
 * what a .brd does, the three quiet lines for a .brd that can't be looked at, and everything the closest-fit preview says.
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
  /** Under the founder's line, muted: what a .brd does when it is picked (it is a look only). */
  brdHint: "An AkuShaper or Shape3D .brd file opens as a look only: the file, with our closest fit laid over it. Nothing is saved.",
  brdTooBig: `That .brd file is too big to be a board (over ${BRD_READ_MAX_BYTES / (1024 * 1024)} MB).`,
  brdUnreadable: "That .brd file couldn't be read. It may be damaged, or written in a way this app doesn't know yet.",
  brdOutOfRange: (length: string, shortest: string, longest: string) =>
    `That board is ${length} long. This app's boards run ${shortest} to ${longest}, so there's no fit to lay over it.`,
  /** The preview dialog. */
  fitTitle: "Board file — our closest fit",
  fitDescription: "The file in solid lines, our closest fit dashed. A look only: nothing is opened or saved, and your board is untouched.",
  fitFrom: (fileName: string) => `From ${fileName}`,
  fitKeyFile: "The file",
  fitKeyOurs: "Our closest fit",
  fitSize: (dims: string) => `The file: ${dims}`,
  fitHowClose: "HOW CLOSE",
  fitCloseness: (what: "Outline" | "Rocker" | "Thickness", largest: string, typical: string, at: string) =>
    `${what}: within ${largest}, typically ${typical} — the widest gap ${at} from the tail`,
  fitTipsNote: (tipSkip: string) =>
    `Rocker and thickness are compared from ${tipSkip} in from each end: the file rounds its tips over there, and our side view ends square.`,
  fitControls: "OUR CLOSEST FIT",
  fitOutlineLine: (length: string, width: string, offset: string) => `Length ${length} · Width ${width} · Offset ${offset}`,
  fitNoseLine: (angle: string, fullness: string, rail: string) => `Nose Angle ${angle} · Fullness ${fullness} · Nose Rail ${rail}`,
  fitTailLine: (name: string, block: string | null, angle: string, fullness: string, rail: string) =>
    `${name} tail${block === null ? "" : ` · Tail Block ${block}`} · Tail Angle ${angle} · Fullness ${fullness} · Tail Rail ${rail}`,
  fitRockerLine: (noseTip: string, nose12: string, tail12: string, tailTip: string, station: string) =>
    `Rocker: nose ${noseTip} · nose ${station} ${nose12} · tail ${station} ${tail12} · tail ${tailTip}`,
  fitThicknessLine: (noseTip: string, nose12: string, center: string, tail12: string, tailTip: string, station: string) =>
    `Thickness: nose ${noseTip} · nose ${station} ${nose12} · centre ${center} · tail ${station} ${tail12} · tail ${tailTip}`,
  fitNotRead: "Rails and bottom contours (the file's cross-sections) aren't read yet — only the outline, rocker and thickness.",
  fitClose: "Close",
  fitTopName: "The board file from above, with our closest fit",
  fitSideName: "The board file from the side, with our closest fit",
} as const;
