import { afterEach, describe, expect, it } from "vitest";
import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import { DEFAULT_VOLUME_SPEC } from "@/lib/geometry/volume";
import { SNAPSHOT_BOARD_LENGTH_MM, buildSnapshot, parseSnapshot, type DesignSnapshotFields } from "./design-snapshot";
import {
  OPEN_BOARD_COPY_VERSION,
  OPEN_BOARD_STORAGE_KEY,
  OPEN_BOARD_WRITE_DEBOUNCE_MS,
  clearOpenBoardCopy,
  flushOpenBoardCopy,
  openBoardCopyJson,
  parseOpenBoardCopy,
  readOpenBoardCopy,
  reconcileOpenBoardOwner,
  writeOpenBoardCopy,
  type OpenBoardBookkeeping,
  type OpenBoardRow,
} from "./open-board";

/** The Fish, sitting in its own blank, exactly as "Start Shaping" opens it — built from the app's
 * own preset mapping, never from hand-typed numbers. */
const FISH = BOARD_PRESETS.find((preset) => preset.name === "Fish");
if (!FISH) throw new Error("the Fish preset is missing");

const FIXTURE: DesignSnapshotFields = {
  ...presetDesignFields(FISH),
  volume: DEFAULT_VOLUME_SPEC,
  finsImportTemplate: true,
  railsImportFoilThickness: true,
  boardName: "Reload test",
  finSystem: "futures",
};

const SAVED_ROW: OpenBoardBookkeeping = { modelId: "m-1", ownerId: "user_a", locked: true, dirty: true };

/** The written copy as plain data, so a test can bend one part of it out of shape. */
function envelope(bookkeeping: OpenBoardBookkeeping = SAVED_ROW): Record<string, unknown> {
  return JSON.parse(openBoardCopyJson(FIXTURE, bookkeeping)) as Record<string, unknown>;
}

/** Minimal localStorage stand-in, following banner-dismissal.test.ts's fakeSessionStorage. */
function fakeLocalStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  let setItemCalls = 0;
  return {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      setItemCalls += 1;
      store.set(key, value);
    },
    removeItem: (key: string) => void store.delete(key),
    get setItemCalls() {
      return setItemCalls;
    },
    has: (key: string) => store.has(key),
    raw: (key: string) => store.get(key),
  };
}

afterEach(() => {
  // @ts-expect-error test-only cleanup: a fake from one test must never leak into the next.
  delete globalThis.localStorage;
  // And the module's own page-memory copy, for the same reason.
  clearOpenBoardCopy();
});

describe("the open board's copy — what is written", () => {
  it("is a save's own snapshot plus the bookkeeping, under the copy's own version", () => {
    const written = JSON.parse(openBoardCopyJson(FIXTURE, SAVED_ROW));
    expect(written.version).toBe(OPEN_BOARD_COPY_VERSION);
    expect(OPEN_BOARD_COPY_VERSION).toBe(1);
    expect(written.snapshot).toEqual(JSON.parse(JSON.stringify(buildSnapshot(FIXTURE))));
    expect(written.modelId).toBe("m-1");
    expect(written.ownerId).toBe("user_a");
    expect(written.locked).toBe(true);
    expect(written.dirty).toBe(true);
  });

  it("round trip: the Fish in its blank comes back exactly, with its bookkeeping", () => {
    const copy = parseOpenBoardCopy(openBoardCopyJson(FIXTURE, SAVED_ROW));
    expect(copy).not.toBeNull();
    // The expected board is the fixture read the way a save is read back — the same path the
    // rack's reopen takes — so no expected number is typed by hand.
    expect(copy!.snapshot).toEqual(parseSnapshot(JSON.parse(JSON.stringify(buildSnapshot(FIXTURE)))));
    expect(copy!.snapshot.blank?.copy.name).toBe(FIXTURE.blank?.copy.name);
    expect(copy!.snapshot.boardName).toBe("Reload test");
    expect(copy!.modelId).toBe("m-1");
    expect(copy!.ownerId).toBe("user_a");
    expect(copy!.locked).toBe(true);
    expect(copy!.dirty).toBe(true);
  });

  it("the key is app-named and never mentions zoom (viewer-zoom.spec.ts checks storage for it)", () => {
    expect(OPEN_BOARD_STORAGE_KEY.startsWith("shaper-")).toBe(true);
    expect(OPEN_BOARD_STORAGE_KEY).not.toMatch(/zoom/i);
    expect(OPEN_BOARD_WRITE_DEBOUNCE_MS).toBe(250);
  });
});

describe("the open board's copy — the reader never throws and ignores anything it cannot trust", () => {
  it.each([null, "", "{not json", "[]", "null", "42"])("%j reads as no copy", (raw) => {
    expect(() => parseOpenBoardCopy(raw)).not.toThrow();
    expect(parseOpenBoardCopy(raw)).toBeNull();
  });

  it("a wrong shape reads as no copy", () => {
    const noDirty = envelope();
    delete noDirty.dirty;
    const noSnapshot = envelope();
    delete noSnapshot.snapshot;
    const shapes = [
      noDirty,
      { ...envelope(), locked: "yes" },
      { ...envelope(), modelId: 7 },
      noSnapshot,
      { ...envelope(), modelId: "m".repeat(201) },
    ];
    for (const shape of shapes) {
      expect(parseOpenBoardCopy(JSON.stringify(shape))).toBeNull();
    }
  });

  it.each([2, 0, "1"])("an unknown version (%j) reads as no copy", (version) => {
    expect(parseOpenBoardCopy(JSON.stringify({ ...envelope(), version }))).toBeNull();
  });

  it("a board the save reader rejects reads as no copy", () => {
    const tooLong: DesignSnapshotFields = {
      ...FIXTURE,
      outline: { ...FIXTURE.outline, length: (SNAPSHOT_BOARD_LENGTH_MM.max + 1) as DesignSnapshotFields["outline"]["length"] },
    };
    expect(() => parseOpenBoardCopy(openBoardCopyJson(tooLong, SAVED_ROW))).not.toThrow();
    expect(parseOpenBoardCopy(openBoardCopyJson(tooLong, SAVED_ROW))).toBeNull();
  });

  it("an older saved-board version inside the copy is read by the save reader's own rules", () => {
    // A version-1 design: no rocker, no foil, no blank — the shape design-snapshot.test.ts uses.
    const versionOneDesign = {
      outline: FIXTURE.outline,
      rails: FIXTURE.rails,
      fins: FIXTURE.fins,
      volume: FIXTURE.volume,
      finsImportTemplate: FIXTURE.finsImportTemplate,
      boardName: FIXTURE.boardName,
      finSystem: FIXTURE.finSystem,
    };
    const wire = JSON.parse(JSON.stringify({ version: 1, design: versionOneDesign }));
    const raw = JSON.stringify({ ...envelope(), snapshot: wire });
    const copy = parseOpenBoardCopy(raw);
    expect(copy).not.toBeNull();
    expect(copy!.snapshot).toEqual(parseSnapshot(wire));
    expect(copy!.snapshot.blank).toBeNull();
  });

  it("a saved row with no owner is not trusted: the board comes back unsaved, its changes kept", () => {
    for (const ownerId of [null, ""]) {
      const copy = parseOpenBoardCopy(JSON.stringify({ ...envelope(), ownerId }));
      expect(copy, `ownerId ${JSON.stringify(ownerId)}`).not.toBeNull();
      expect(copy!.modelId).toBeNull();
      expect(copy!.ownerId).toBeNull();
      expect(copy!.locked).toBe(false);
      expect(copy!.dirty).toBe(true);
    }
  });

  it("an owner with no saved row is forgotten", () => {
    const copy = parseOpenBoardCopy(JSON.stringify({ ...envelope(), modelId: null, locked: false }));
    expect(copy).not.toBeNull();
    expect(copy!.modelId).toBeNull();
    expect(copy!.ownerId).toBeNull();
  });
});

describe("the open board's copy — storage", () => {
  it("with no localStorage at all, the copy lives in page memory for the life of the page", () => {
    const json = openBoardCopyJson(FIXTURE, SAVED_ROW);
    expect(() => writeOpenBoardCopy(json)).not.toThrow();
    expect(readOpenBoardCopy()).toBe(json);
    clearOpenBoardCopy();
    expect(readOpenBoardCopy()).toBeNull();
  });

  it("with localStorage, the copy sits under the key, and clearing removes it", () => {
    const storage = fakeLocalStorage();
    // @ts-expect-error assigning a fake localStorage for the node test environment
    globalThis.localStorage = storage;
    const json = openBoardCopyJson(FIXTURE, SAVED_ROW);
    writeOpenBoardCopy(json);
    expect(storage.raw(OPEN_BOARD_STORAGE_KEY)).toBe(json);
    expect(readOpenBoardCopy()).toBe(json);
    clearOpenBoardCopy();
    expect(storage.has(OPEN_BOARD_STORAGE_KEY)).toBe(false);
    expect(readOpenBoardCopy()).toBeNull();
  });

  it("when every storage call throws (Safari private mode, blocked cookies), page memory keeps the board", () => {
    const refuse = () => {
      throw new Error("SecurityError");
    };
    // @ts-expect-error simulating a browser whose storage refuses every call
    globalThis.localStorage = { getItem: refuse, setItem: refuse, removeItem: refuse };
    const json = openBoardCopyJson(FIXTURE, SAVED_ROW);
    expect(() => writeOpenBoardCopy(json)).not.toThrow();
    expect(readOpenBoardCopy()).toBe(json);
    expect(() => clearOpenBoardCopy()).not.toThrow();
  });

  it("a write the browser refuses (storage full) removes the older copy, so a stale board never comes back", () => {
    const older = openBoardCopyJson({ ...FIXTURE, boardName: "An older board" }, SAVED_ROW);
    const storage = fakeLocalStorage({ [OPEN_BOARD_STORAGE_KEY]: older });
    // @ts-expect-error a fake whose setItem fails the way a full storage does
    globalThis.localStorage = {
      getItem: storage.getItem,
      removeItem: storage.removeItem,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(() => writeOpenBoardCopy(openBoardCopyJson(FIXTURE, SAVED_ROW))).not.toThrow();
    expect(storage.has(OPEN_BOARD_STORAGE_KEY)).toBe(false);
    expect(readOpenBoardCopy()).toBeNull();
  });

  it("the flush writes the waiting copy once and then has nothing left to write", () => {
    const storage = fakeLocalStorage();
    // @ts-expect-error assigning a fake localStorage for the node test environment
    globalThis.localStorage = storage;
    const json = openBoardCopyJson(FIXTURE, SAVED_ROW);
    const pending: { current: string | null } = { current: json };
    flushOpenBoardCopy(pending);
    expect(pending.current).toBeNull();
    expect(storage.raw(OPEN_BOARD_STORAGE_KEY)).toBe(json);
    expect(storage.setItemCalls).toBe(1);
    flushOpenBoardCopy(pending);
    expect(storage.setItemCalls).toBe(1);
  });
});

describe("the owner rule — a kept saved board stays linked only for its own account", () => {
  const ROW: OpenBoardRow = { modelId: "m-1", ownerId: "user_a", locked: true };

  it("while the account is not known yet (still loading), the row is kept as it is", () => {
    expect(reconcileOpenBoardOwner(ROW, undefined)).toEqual(ROW);
  });

  it("signed out, the row is kept: a sign-out alone never loses a saved board's link", () => {
    expect(reconcileOpenBoardOwner(ROW, null)).toEqual(ROW);
  });

  it("the same account keeps the row", () => {
    expect(reconcileOpenBoardOwner(ROW, "user_a")).toEqual(ROW);
  });

  it("a different account drops the row and its lock: the board stays open, unsaved", () => {
    expect(reconcileOpenBoardOwner(ROW, "user_b")).toEqual({ modelId: null, ownerId: null, locked: false });
  });

  it("a saved board with no known owner belongs to whoever is signed in", () => {
    const unowned: OpenBoardRow = { modelId: "m-1", ownerId: null, locked: true };
    expect(reconcileOpenBoardOwner(unowned, "user_a")).toEqual({ modelId: "m-1", ownerId: "user_a", locked: true });
    expect(reconcileOpenBoardOwner(unowned, undefined)).toEqual(unowned);
    expect(reconcileOpenBoardOwner(unowned, null)).toEqual(unowned);
  });

  it("a board with no saved row has no owner, its lock as given, whoever is signed in", () => {
    for (const userId of [undefined, null, "user_a", "user_b"]) {
      for (const locked of [false, true]) {
        expect(reconcileOpenBoardOwner({ modelId: null, ownerId: "user_a", locked }, userId)).toEqual({
          modelId: null,
          ownerId: null,
          locked,
        });
      }
    }
  });
});
