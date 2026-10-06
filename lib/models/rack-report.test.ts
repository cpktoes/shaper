import { beforeEach, describe, expect, it, vi } from "vitest";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { DEFAULT_BLANK_CUT } from "@/lib/geometry/blank";
import { DEFAULT_BOARD_SPEC } from "@/lib/geometry/board";
import { DEFAULT_FIN_PLACEMENT_SPEC } from "@/lib/geometry/fins";
import { DEFAULT_FOIL_SPEC } from "@/lib/geometry/foil";
import { DEFAULT_RAIL_BAND_SPEC } from "@/lib/geometry/rail-bands";
import { DEFAULT_FALLBACK_ROCKER } from "@/lib/geometry/rocker";
import { mm } from "@/lib/geometry/units";
import { DEFAULT_VOLUME_SPEC } from "@/lib/geometry/volume";
import { carryOverTipStyle, EMPTY_FIT_DEFAULTS_PREFERENCE } from "@/lib/fit-defaults-preference";
import { buildSnapshot, type DesignSnapshotFields } from "./design-snapshot";
import * as rackModels from "./rack-models";
import { accountsNeedingTipStyle, rackReport, type RackReportRow } from "./rack-report";

/**
 * `--rack-report` (code review IN-06): every account's boards go through the home page's own path
 * with that account's own Tip Style, decided and resolved by the page's own rules.
 */

vi.mock("./rack-models", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./rack-models")>();
  return { ...actual, rackModelsAndDrops: vi.fn(actual.rackModelsAndDrops) };
});

const MARKO = readSeedCatalog().find((blank) => blank.vendor === "Marko Foam" && blank.name === `6'0" M-Regular`)!;

const FIELDS: DesignSnapshotFields = {
  outline: DEFAULT_BOARD_SPEC.outline,
  rocker: DEFAULT_FALLBACK_ROCKER,
  foil: DEFAULT_FOIL_SPEC,
  rails: DEFAULT_RAIL_BAND_SPEC,
  fins: DEFAULT_FIN_PLACEMENT_SPEC,
  volume: DEFAULT_VOLUME_SPEC,
  finsImportTemplate: true,
  railsImportFoilThickness: true,
  boardName: "report test",
  finSystem: "fcs2",
  blank: { copy: MARKO, placement: mm(0), nose12Offset: mm(0), tail12Offset: mm(0), ...DEFAULT_BLANK_CUT },
};

function row(id: string, account: string): RackReportRow {
  return { id, clerkUserId: account, snapshot: JSON.parse(JSON.stringify(buildSnapshot(FIELDS))) };
}

/** A version-4 envelope with a Phase 11 blank (no cut on the blank), as rack-models.test.ts builds it. */
function phase11Row(id: string, account: string): RackReportRow {
  const envelope = JSON.parse(JSON.stringify(buildSnapshot(FIELDS)));
  envelope.version = 4;
  delete envelope.design.blank.deckSkin;
  delete envelope.design.blank.tipStyle;
  delete envelope.design.blank.fineTuneSurface;
  return { id, clerkUserId: account, snapshot: envelope };
}

/** A board that can't be drawn (a 500 mm board in a blank — see rack-models.test.ts). */
function brokenRow(id: string, account: string): RackReportRow {
  return {
    id,
    clerkUserId: account,
    snapshot: JSON.parse(JSON.stringify(buildSnapshot({ ...FIELDS, outline: { ...FIELDS.outline, length: mm(500) } }))),
  };
}

const draws = vi.mocked(rackModels.rackModelsAndDrops);

beforeEach(() => {
  draws.mockClear();
});

describe("accountsNeedingTipStyle", () => {
  it("names only the accounts holding a Phase 11 board, each once — the page's own test", () => {
    const rows = [row("a1", "alice"), phase11Row("b1", "bob"), phase11Row("b2", "bob"), row("c1", "cara")];
    expect(accountsNeedingTipStyle(rows)).toEqual(["bob"]);
    expect(rackModels.rackNeedsTipStyle(rows.filter((r) => r.clerkUserId === "bob"))).toBe(true);
    expect(rackModels.rackNeedsTipStyle(rows.filter((r) => r.clerkUserId === "alice"))).toBe(false);
  });
});

describe("rackReport", () => {
  it("draws each account's rack with that account's Tip Style, and none for an account with no Phase 11 board", () => {
    const rows = [phase11Row("b1", "bob"), row("a1", "alice"), phase11Row("c1", "cara"), row("b2", "bob")];
    const report = rackReport(rows, new Map([["bob", "bottom"], ["cara", "pinDeck"]]));
    expect(report).toEqual({ saved: 4, drawn: 4, perAccount: [2, 1, 1], dropped: [] });

    expect(draws).toHaveBeenCalledTimes(3);
    const calls = draws.mock.calls.map(([groupRows, , options]) => ({ ids: groupRows.map((r) => r.id), options }));
    expect(calls).toEqual([
      { ids: ["b1", "b2"], options: { tipStyle: "bottom" } },
      { ids: ["a1"], options: { tipStyle: undefined } },
      { ids: ["c1"], options: { tipStyle: "pinDeck" } },
    ]);
    // Bob's Phase 11 board really comes out with Bob's Tip Style.
    expect(draws.mock.results[0].value.models[0].snapshot.blank?.tipStyle).toBe("bottom");
  });

  it("never reads a board's name, and silences the rack's own log", () => {
    rackReport([row("a1", "alice")], new Map());
    const [groupRows, log] = draws.mock.calls[0];
    expect(groupRows.every((r) => r.name === "")).toBe(true);
    expect(log).toBeTypeOf("function");
  });

  it("counts the boards it leaves out by id, and per-account counts carry no account", () => {
    const rows = [row("a1", "alice"), brokenRow("a2", "alice"), row("b1", "bob")];
    const report = rackReport(rows, new Map());
    expect(report).toEqual({ saved: 3, drawn: 2, perAccount: [2, 1], dropped: ["a2"] });
    expect(JSON.stringify(report)).not.toMatch(/alice|bob/);
  });

  it("an empty site: nothing saved, nothing drawn", () => {
    expect(rackReport([], new Map())).toEqual({ saved: 0, drawn: 0, perAccount: [], dropped: [] });
  });
});

describe("carryOverTipStyle — the page's rule the report resolves each account with", () => {
  it("the account's own Tip Style signed in with no cookie; Pin deck when nobody chose one", () => {
    expect(
      carryOverTipStyle({ signedIn: true, account: { ...EMPTY_FIT_DEFAULTS_PREFERENCE, tipStyle: "bottom" }, browser: null }),
    ).toBe("bottom");
    expect(carryOverTipStyle({ signedIn: true, account: null, browser: null })).toBe(DEFAULT_BLANK_CUT.tipStyle);
  });
});
