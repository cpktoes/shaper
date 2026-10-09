import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BOARD_NAME_COPY, bandBoardName, boardNameButtonLabel } from "./board-name-copy";

/**
 * The board's name in the tab band (quick 261008-raw). The copy is pure and tested directly; the
 * button itself is held by source contracts, in the idiom of `slider-row.test.ts`, because it needs
 * the design store, a Server Action and a dialog that only a browser provides (the browser half is
 * `e2e/board-name-band.spec.ts`).
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const read = (path: string) => readFileSync(join(REPO_ROOT, path), "utf8");

describe("bandBoardName", () => {
  it("is Untitled for a board that has never been saved, whatever name was typed", () => {
    expect(bandBoardName(null, "")).toBe("Untitled");
    expect(bandBoardName(null, "Fish")).toBe("Untitled");
    expect(BOARD_NAME_COPY.untitled).toBe("Untitled");
  });

  it("is the board's own name once it is saved", () => {
    expect(bandBoardName("id", "Fish")).toBe("Fish");
    expect(bandBoardName("id", "  Fish  ")).toBe("Fish");
  });

  it("falls back to Untitled for a saved board whose name is blank", () => {
    expect(bandBoardName("id", "  ")).toBe("Untitled");
  });
});

describe("boardNameButtonLabel", () => {
  it("says what pressing the name does", () => {
    expect(boardNameButtonLabel("Fish", { saved: true, locked: false })).toBe("Board name: Fish — rename");
    expect(boardNameButtonLabel("Fish", { saved: true, locked: true })).toBe("Board name: Fish, locked — rename");
    expect(boardNameButtonLabel("Untitled", { saved: false, locked: false })).toBe(
      "Board name: Untitled — name and save",
    );
  });
});

describe("board-name-tab.tsx source contracts", () => {
  const source = read("components/design/board-name-tab.tsx");

  it("renames through the Board Rack's own Server Action", () => {
    expect(source).toMatch(/renameModel\(/);
  });

  it("keeps the open board's name in step the way the rack does: noteRenamed when locked, setBoardName when not", () => {
    expect(source).toMatch(/if \(locked\) noteRenamed\(name\);\s*else setBoardName\(name\);/);
  });

  it("is exempt from the board lock's sweeps: renaming never changes the design", () => {
    expect(source).toMatch(/<button[^>]*data-lock-exempt/);
  });
});

describe("one first save, and the five screens (quick 261008-raw)", () => {
  it("the top bar's Save and the band's Untitled both go through saveForFirstTime, and neither calls saveModel itself", () => {
    for (const path of ["components/design/save-button.tsx", "components/design/board-name-tab.tsx"]) {
      const text = read(path);
      expect(text, path).toMatch(/saveForFirstTime/);
      expect(text, path).not.toMatch(/\bsaveModel\(/);
    }
  });

  it("the five drawing screens each hand their tab strip the board's name", () => {
    for (const path of [
      "components/outline/outline-editor.tsx",
      "components/rocker/rocker-editor.tsx",
      "components/rails/rail-band-editor.tsx",
      "components/volume/volume-estimator.tsx",
      "components/fins/fin-placement-editor.tsx",
    ]) {
      const text = read(path);
      expect(text, path).toMatch(/trailing=\{\(strip\) => <BoardNameTab touchClearance=\{strip\.touchClearance\} \/>\}/);
    }
  });

  it("RAILS' View Full Sized dialog and SUMMARY carry no band name", () => {
    expect((read("components/rails/rail-band-editor.tsx").match(/trailing=/g) ?? []).length).toBe(1);
    const summaryFiles = readdirSync(join(REPO_ROOT, "components/summary")).filter((f) => /\.tsx?$/.test(f));
    for (const file of summaryFiles) {
      expect(read(`components/summary/${file}`), file).not.toMatch(/BoardNameTab/);
    }
    expect(read("app/design/summary/page.tsx")).not.toMatch(/BoardNameTab/);
  });
});
