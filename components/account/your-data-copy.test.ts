import { describe, expect, it } from "vitest";
import { CONTACT_ADDRESS } from "@/lib/contact/message";
import { YOUR_DATA_COPY } from "./your-data-copy";

/**
 * Import my designs' words on the Your data page (quick 261103-k8o, plan 02, PC23): sentence case, the
 * page's own voice, one and many each in their own words. The founder's ruling R3: the page says what
 * will happen before anything is written, and that boards already on the account are never changed.
 */
const IMPORT = YOUR_DATA_COPY.import;
const NAMES = Array.from({ length: 13 }, (_, i) => `Board ${String.fromCharCode(65 + i)}`);

describe("nameList", () => {
  it("names one, two, three and six boards in full, and more than six as the first six and a count", () => {
    expect(IMPORT.nameList(NAMES.slice(0, 1))).toBe("Board A");
    expect(IMPORT.nameList(NAMES.slice(0, 2))).toBe("Board A and Board B");
    expect(IMPORT.nameList(NAMES.slice(0, 3))).toBe("Board A, Board B and Board C");
    expect(IMPORT.nameList(NAMES.slice(0, 6))).toBe("Board A, Board B, Board C, Board D, Board E and Board F");
    expect(IMPORT.nameList(NAMES)).toBe("Board A, Board B, Board C, Board D, Board E, Board F and 7 more");
  });
});

describe("the preview's lines", () => {
  it("says the section's title, body, button and reading line", () => {
    expect(IMPORT.title).toBe("Import my designs");
    expect(IMPORT.body).toBe(
      "Add the boards from an Export my designs file to your account. Boards already on your account are " +
        "never changed, and your settings stay as they are.",
    );
    expect(IMPORT.button).toBe("Choose a file…");
    expect(IMPORT.busy).toBe("Reading your file…");
    expect(IMPORT.fromFile("shaper-assistant-designs-2026-11-03.json")).toBe("From shaper-assistant-designs-2026-11-03.json:");
  });

  it("says what will be added, for none, one and several", () => {
    expect(IMPORT.willAdd(0, [])).toBe("No new boards to add.");
    expect(IMPORT.willAdd(1, ["Fish"])).toBe("1 board will be added: Fish.");
    expect(IMPORT.willAdd(3, ["Fish", "Log", "Egg"])).toBe("3 boards will be added: Fish, Log and Egg.");
  });

  it("says what is already on the account and will be left exactly as it is", () => {
    expect(IMPORT.alreadyThere(1)).toBe("1 is already on your account and will be left exactly as it is.");
    expect(IMPORT.alreadyThere(9)).toBe("9 are already on your account and will be left exactly as they are.");
  });

  it("says which boards couldn't be read", () => {
    expect(IMPORT.unreadable(1, ["board 4"])).toBe("1 board in the file couldn't be read and will be skipped: board 4.");
    expect(IMPORT.unreadable(2, ["Fish", "board 7"])).toBe(
      "2 boards in the file couldn't be read and will be skipped: Fish and board 7.",
    );
  });

  it("labels the copies box for that one board or those several", () => {
    expect(IMPORT.copiesBox(1)).toBe('Also add the file\'s version of that board as a copy ("Copy of …")');
    expect(IMPORT.copiesBox(9)).toBe('Also add the file\'s versions of those 9 as copies ("Copy of …")');
    expect(IMPORT.nothingToAdd).toBe(
      "Every board in this file is already on your account. Tick the box to add the file's versions as copies.",
    );
  });

  it("names Import, Cancel and the progress", () => {
    expect(IMPORT.importButton).toBe("Import");
    expect(IMPORT.cancel).toBe("Cancel");
    expect(IMPORT.importing(25, 40)).toBe("Importing… 25 of 40");
  });
});

describe("the done line", () => {
  it("counts boards and copies added, and says where they stand", () => {
    expect(IMPORT.done({ added: 3, alreadyThere: 0, copies: 0, failed: [] })).toBe(
      "Added 3 boards to your account. They stand at the front of your Board Rack.",
    );
    expect(IMPORT.done({ added: 1, alreadyThere: 0, copies: 0, failed: [] })).toBe(
      "Added 1 board to your account. It stands at the front of your Board Rack.",
    );
    expect(IMPORT.done({ added: 3, alreadyThere: 9, copies: 9, failed: [] })).toBe(
      "Added 3 boards and 9 copies to your account. They stand at the front of your Board Rack. " +
        "9 already on your account were left as they were.",
    );
    expect(IMPORT.done({ added: 0, alreadyThere: 1, copies: 1, failed: [] })).toBe(
      "Added 1 copy to your account. It stands at the front of your Board Rack. " +
        "1 already on your account was left as it was.",
    );
  });

  it("says when nothing was added, and names what couldn't be read", () => {
    expect(IMPORT.done({ added: 0, alreadyThere: 12, copies: 0, failed: [] })).toBe(
      "Nothing was added. 12 already on your account were left as they were.",
    );
    expect(IMPORT.done({ added: 2, alreadyThere: 0, copies: 0, failed: ["board 3"] })).toBe(
      "Added 2 boards to your account. They stand at the front of your Board Rack. " +
        "1 couldn't be read and was skipped: board 3.",
    );
    expect(IMPORT.done({ added: 0, alreadyThere: 0, copies: 0, failed: ["Fish", "Log"] })).toBe(
      "Nothing was added. 2 couldn't be read and were skipped: Fish and Log.",
    );
  });
});

describe("the refusals and failures", () => {
  it("says each in plain words, with the support address where it helps", () => {
    expect(IMPORT.partial(1)).toBe(
      "Something went wrong part-way: 1 board was added before it stopped. Choose the same file again to add " +
        "the rest. Boards already on your account are never changed.",
    );
    expect(IMPORT.partial(30)).toBe(
      "Something went wrong part-way: 30 boards were added before it stopped. Choose the same file again to add " +
        "the rest. Boards already on your account are never changed.",
    );
    expect(IMPORT.tooBig).toBe("That file is too big (over 20 MB).");
    expect(IMPORT.notOurs).toBe("That file isn't an Export my designs file from Shaper Assistant.");
    expect(IMPORT.noBoards).toBe("That file holds no boards.");
    expect(IMPORT.tooMany).toBe("That file holds more than 500 boards, more than one import can take.");
    expect(IMPORT.readFailed).toBe("Couldn't read that file. Try again.");
    expect(IMPORT.checkFailed).toBe(`Couldn't check the boards on your account. Try again, or email ${CONTACT_ADDRESS}.`);
    expect(IMPORT.failed).toBe(`Couldn't import your designs. Try again, or email ${CONTACT_ADDRESS}.`);
    expect(IMPORT.signedOut).toBe("You've been signed out. Sign in again to import your designs.");
  });
});
