import { IMPORT_MAX_BOARDS, type ImportTotals } from "@/lib/account/import-designs";
import { CONTACT_ADDRESS } from "@/lib/contact/message";
import { BOARD_FILE_MAX_BYTES } from "@/lib/models/board-file";

/** "board" or "boards". */
function boards(count: number): string {
  return count === 1 ? "board" : "boards";
}

/** Names in a sentence: "A", "A and B", "A, B and C", and past `shown` the first ones and a count
 * ("A, B, C, D, E, F and 7 more"). */
function nameList(names: readonly string[], shown = 6): string {
  if (names.length > shown) return `${names.slice(0, shown).join(", ")} and ${names.length - shown} more`;
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * Every word on the Your data page in Clerk's account panel (quick 261006-g4u, 2026-10-06, D-06),
 * in sentence case like the panel around it. The support address is the Contact page's own, never
 * retyped here.
 */
export const YOUR_DATA_COPY = Object.freeze({
  pageLabel: "Your data",
  heading: "Your data",
  intro: "Everything Shaper Assistant keeps for your account: your saved boards and your App Default Settings.",
  export: Object.freeze({
    title: "Export my designs",
    body:
      "Download every saved board and your settings as one file, exactly as the app stores them " +
      "(in millimetres, whichever units you view in). Keep it as your own copy.",
    button: "Export my designs",
    busy: "Preparing your file…",
    done: (fileName: string, boardCount: number) =>
      `Downloaded ${fileName}: ${boardCount} saved ${boardCount === 1 ? "board" : "boards"}.`,
    doneNone: (fileName: string) =>
      `Downloaded ${fileName}. You have no saved boards yet, so it holds your settings only.`,
    signedOut: "You've been signed out. Sign in again to export your designs.",
    failed: `Couldn't export your designs. Try again, or email ${CONTACT_ADDRESS}.`,
  }),
  // Quick 261103-k8o, plan 02 (PC23): Import my designs, between Export and Delete. The founder's
  // ruling R3: say what will happen before anything is written, and never change a board already there.
  import: Object.freeze({
    title: "Import my designs",
    body:
      "Add the boards from an Export my designs file to your account. Boards already on your account are " +
      "never changed, and your settings stay as they are.",
    button: "Choose a file…",
    busy: "Reading your file…",
    fromFile: (fileName: string) => `From ${fileName}:`,
    nameList,
    willAdd: (count: number, names: readonly string[]) =>
      count === 0 ? "No new boards to add." : `${count} ${boards(count)} will be added: ${nameList(names)}.`,
    alreadyThere: (count: number) =>
      count === 1
        ? "1 is already on your account and will be left exactly as it is."
        : `${count} are already on your account and will be left exactly as they are.`,
    unreadable: (count: number, labels: readonly string[]) =>
      `${count} ${boards(count)} in the file couldn't be read and will be skipped: ${nameList(labels)}.`,
    copiesBox: (count: number) =>
      count === 1
        ? 'Also add the file\'s version of that board as a copy ("Copy of …")'
        : `Also add the file's versions of those ${count} as copies ("Copy of …")`,
    nothingToAdd:
      "Every board in this file is already on your account. Tick the box to add the file's versions as copies.",
    importButton: "Import",
    cancel: "Cancel",
    importing: (done: number, total: number) => `Importing… ${done} of ${total}`,
    done: (totals: ImportTotals) => {
      const parts: string[] = [];
      if (totals.added > 0) parts.push(`${totals.added} ${boards(totals.added)}`);
      if (totals.copies > 0) parts.push(`${totals.copies} ${totals.copies === 1 ? "copy" : "copies"}`);
      const total = totals.added + totals.copies;
      let line =
        total === 0
          ? "Nothing was added."
          : `Added ${parts.join(" and ")} to your account. ` +
            `${total === 1 ? "It stands" : "They stand"} at the front of your Board Rack.`;
      if (totals.alreadyThere > 0) {
        line +=
          totals.alreadyThere === 1
            ? " 1 already on your account was left as it was."
            : ` ${totals.alreadyThere} already on your account were left as they were.`;
      }
      if (totals.failed.length > 0) {
        const count = totals.failed.length;
        line += ` ${count} couldn't be read and ${count === 1 ? "was" : "were"} skipped: ${nameList(totals.failed)}.`;
      }
      return line;
    },
    partial: (added: number) =>
      `Something went wrong part-way: ${added} ${boards(added)} ${added === 1 ? "was" : "were"} added before it ` +
      "stopped. Choose the same file again to add the rest. Boards already on your account are never changed.",
    tooBig: `That file is too big (over ${BOARD_FILE_MAX_BYTES / (1024 * 1024)} MB).`,
    notOurs: "That file isn't an Export my designs file from Shaper Assistant.",
    noBoards: "That file holds no boards.",
    tooMany: `That file holds more than ${IMPORT_MAX_BOARDS} boards, more than one import can take.`,
    readFailed: "Couldn't read that file. Try again.",
    checkFailed: `Couldn't check the boards on your account. Try again, or email ${CONTACT_ADDRESS}.`,
    failed: `Couldn't import your designs. Try again, or email ${CONTACT_ADDRESS}.`,
    signedOut: "You've been signed out. Sign in again to import your designs.",
  }),
  delete: Object.freeze({
    title: "Delete my account",
    body: "Permanently deletes your account, every saved board and your settings.",
    button: "Delete my account…",
    confirmHeading: "Delete your account for good?",
    consequences: Object.freeze([
      "Every saved board on your account is deleted. Use Export my designs above first if you want a copy.",
      "Your settings are deleted: units, fit and tip defaults, blank makers, starred blanks and your rack order.",
      "Your account is closed and you're signed out.",
      "There's no undo. We can't bring any of it back.",
    ]),
    fieldLabel: "Type DELETE to confirm",
    confirmButton: "Delete my account forever",
    cancel: "Keep my account",
    busy: "Deleting…",
    done: "Done. Your account, saved boards and settings are deleted. Signing you out…",
    accountNotClosed:
      "Your saved boards and settings are deleted, but your account couldn't be closed. " +
      `Press Delete my account forever again, or email ${CONTACT_ADDRESS}.`,
    signedOut: "You've been signed out. Sign in again to delete your account.",
    failed: `Something went wrong. Try again, or email ${CONTACT_ADDRESS}.`,
  }),
});
