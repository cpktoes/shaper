/**
 * The Board Rack's one settings-and-words file (Phase 15).
 *
 * D-11's prepared fallback is the single constant `PHONE_MOVE_VIA_MENU`. Inside the app it is read
 * only as the default of the four functions below — `holdToMoveEnabled`, `movesOffered`,
 * `rackHintText` and `rackHeadingLine` — which components call instead of reading the constant.
 * Flipping it to `true` turns off hold-and-slide on phones and iPads (the swipe rack) and gives
 * their ⋯ menu Move left / Move right instead, with the heading's hint saying `tap ⋯ to move`. Left
 * `false`, a finger holds a board to move it and its ⋯ menu offers no Move rows (D-12). A mouse is
 * the same either way: it drags, and its ⋯ menu always offers both moves.
 *
 * Every word the rack says, from UI-SPEC § Copywriting, lives once in `RACK_COPY`, exactly as the
 * spec has it (American spelling, the em dash, straight apostrophes). The dialogs' words are not
 * here: they belong to the dialogs and are unchanged.
 *
 * No React import, so the browser tests can import this file to know which way the switch is set.
 */

/** D-11: false — phones and iPads hold a board to move it. True — they move it from the ⋯ menu. */
export const PHONE_MOVE_VIA_MENU = false;

/** Which rack a device gets (D-04): `hover` for a mouse or trackpad, `swipe` for a finger. */
export type RackKind = "hover" | "swipe";

/** Whether holding a board picks it up: only on the swipe rack, and only with the switch off. */
export function holdToMoveEnabled(kind: RackKind, viaMenu: boolean = PHONE_MOVE_VIA_MENU): boolean {
  return kind === "swipe" && !viaMenu;
}

/** Whether a board's ⋯ menu offers Move left / Move right: always on the hover rack; on the swipe
 * rack only with the switch on (D-11), never otherwise (D-12). */
export function movesOffered(kind: RackKind, viaMenu: boolean = PHONE_MOVE_VIA_MENU): boolean {
  return kind === "hover" || viaMenu;
}

/** The plain count on the heading's line: `1 board`, `{n} boards`. */
export function rackCountText(count: number): string {
  return count === 1 ? "1 board" : `${count} boards`;
}

/** The hint on the heading's line, for the rack the device gets. */
export function rackHintText(kind: RackKind, viaMenu: boolean = PHONE_MOVE_VIA_MENU): string {
  if (kind === "hover") return RACK_COPY.hints.hover;
  return viaMenu ? RACK_COPY.hints.swipeViaMenu : RACK_COPY.hints.swipe;
}

/** The muted line beside the heading, always shown (D-08): the count, a middle dot, the hint —
 * `15 boards · point to turn, drag to move`. */
export function rackHeadingLine(count: number, kind: RackKind, viaMenu: boolean = PHONE_MOVE_VIA_MENU): string {
  return `${rackCountText(count)} · ${rackHintText(kind, viaMenu)}`;
}

/** How a card has always dated a board's last touch: `Oct 4, 2026`. */
function formatRackDate(date: Date | string): string {
  if (typeof date === "string") return date;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Every word on the rack, from UI-SPEC § Copywriting. */
export const RACK_COPY = {
  heading: "Board Rack",
  unsavedTag: "In progress — not saved",
  untitled: "Untitled Board",
  open: "Open This Board",
  continueBoard: "Continue This Board",
  lastTouched: (date: Date | string) => `Last touched ${formatRackDate(date)}`,

  moved: (name: string) => `Moved ${name}. The rack keeps your order.`,
  unsavedStaysFirst: "The unsaved board stays first until it's saved",
  alreadyFirst: (name: string) => `${name} is already first.`,
  alreadyLast: (name: string) => `${name} is already last.`,
  saveFailed: "Couldn't save the new order — try again.",
  carryingPrefix: "Moving ",
  carryingSuffix: ". Let go where you want it.",

  duplicated: (name: string) => `Duplicated ${name}. The copy stands next to it.`,
  deleted: (name: string) => `Deleted ${name}.`,
  duplicateFailed: "Couldn't duplicate — try again.",

  groupName: "Boards in your rack",
  hoverInstructions:
    "Use the left and right arrow keys to look along the rack, Enter to open the board, and Alt with an arrow key to move it one place.",
  swipeInstructions:
    "Swipe, or use the left and right arrow keys, to look along the rack. Press Enter to open the board.",
  boardLabel: (name: string, line: string, i: number, n: number) => `${name}, ${line}, board ${i} of ${n}`,
  unsavedBoardLabel: (name: string, line: string, n: number) =>
    `${name}, in progress and not saved, ${line}, board 1 of ${n}`,
  captionGroup: (name: string) => `${name} actions`,

  moveLeft: "Move left",
  moveRight: "Move right",

  hints: {
    hover: "point to turn, drag to move",
    swipe: "hold to move",
    swipeViaMenu: "tap ⋯ to move",
  },
} as const;
