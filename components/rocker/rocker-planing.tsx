"use client";

/**
 * ROCKER's PLANING tab (quick 261019-gqo, plan 02, 2026-10-19). The founder's words: "Lets move the controls data
 * table (passes) to a new "PLANING" tab and add a OFF DECK column too." Their answers: the table shows four columns
 * plus the planer passes for the deck and the bottom at every station (decision 1), and PLANING sits before
 * DATASHEET (decision 2).
 *
 * The station-by-station numbers plan 01 took out of the sidebar live here now — each of the board's five stations
 * nose to tail with its ROCKER, the foam to come OFF DECK and the foam to come OFF BOTTOM, and under each foam figure
 * how many full passes of the shaper's own Planer Max Depth that is, plus what is left for one last, lighter pass
 * (`2 + 1/16"`). The deck column is the new one. A figure below zero (the board would poke out of the blank there)
 * reads in warning ink with its minus sign; one that prints as zero reads an unsigned zero.
 *
 * Every string is worked out by `planingStations` in `lib/geometry/planing.ts` (CLAUDE.md Rule 1) — this file only
 * lays them out, in the DATASHEET's own frame: the same root, intro, header rule and faint row rules, as a four-column
 * grid with two lines per station (the figures, then the passes under them). With no blank picked the tab says to pick
 * one first and draws no table. On this tab every sidebar control is live (`rocker-live-controls.ts`), so the numbers
 * move as the shaper slides the board along its blank or changes the Deck Skin.
 */

import { useFitDefaults } from "@/components/fit-defaults-provider";
import { useUnits } from "@/components/units-provider";
import { formatMark } from "@/lib/geometry/measure-display";
import type { BoardSideProfile } from "@/lib/geometry/board-profile";
import { planingStations, type PlaningFigure } from "@/lib/geometry/planing";

const INTRO_WITH_BLANK =
  "Your board's five stations, nose to tail: its rocker, the foam to come off the deck and the bottom, and how many full passes of your planer that is.";
const INTRO_NO_BLANK = "Pick a blank first — the planing numbers come from the blank your board is cut from.";
const NOTE_PASSES = "Passes are full passes; a figure after the + is the foam left for one last, lighter pass.";
const NOTE_BELOW_ZERO = "A figure below zero means the board would poke out of the blank there.";

/** A column header: the DATASHEET's own 10-dot display type. */
const HEADER_CELL = "pl-2 text-right text-[10px] font-display text-surf-ink uppercase tracking-architectural font-extrabold";
/** The faint rule closing a station's second line (a station is a grid of its own two lines, so the rule rides its four cells). */
const RULE = "border-b border-surf-line-faint";

function FoamFigure({ figure, cell }: { figure: PlaningFigure; cell: "offDeck" | "offBottom" }) {
  return (
    <div
      data-rocker-planing-cell={cell}
      className={`pl-2 pt-1.5 text-right text-sm font-normal tabular-nums ${figure.negative ? "text-surf-warning-ink" : "text-surf-ink"}`}
    >
      {figure.text}
    </div>
  );
}

export function RockerPlaning({ profile }: { profile: BoardSideProfile }) {
  const { system } = useUnits();
  const { defaults } = useFitDefaults();
  const rows = planingStations(profile, defaults.planerMaxDepth, system);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
      {/* With no blank this sentence is all the tab holds (D-09). */}
      <div className="text-sm text-surf-ink-muted font-normal" data-rocker-planing-empty={rows ? undefined : ""}>
        {rows ? INTRO_WITH_BLANK : INTRO_NO_BLANK}
      </div>
      {rows ? (
        <>
          <div data-rocker-planing className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto_auto_auto]">
            {/* The header row, over a 2-dot rule (the DATASHEET's own). */}
            <div className="border-b-2 border-surf-line-faint pb-2 text-[10px] font-display text-surf-ink uppercase tracking-architectural font-extrabold">
              Station
            </div>
            <div className={`border-b-2 border-surf-line-faint pb-2 ${HEADER_CELL}`}>Rocker</div>
            <div className={`border-b-2 border-surf-line-faint pb-2 ${HEADER_CELL}`}>Off Deck</div>
            <div className={`border-b-2 border-surf-line-faint pb-2 ${HEADER_CELL}`}>Off Bottom</div>
            {rows.map((row) => (
              <div key={row.key} className="contents" data-rocker-planing-station={row.key}>
                {/* First line: the station's name and its three figures. */}
                <div className="min-w-0 pt-1.5 text-sm text-surf-ink-muted font-normal">{row.name}</div>
                <div
                  data-rocker-planing-cell="rocker"
                  className={`pl-2 pt-1.5 text-right text-sm font-normal tabular-nums ${row.key === "center" ? "text-surf-ink-muted" : "text-surf-ink"}`}
                >
                  {row.rocker}
                </div>
                <FoamFigure figure={row.offDeck} cell="offDeck" />
                <FoamFigure figure={row.offBottom} cell="offBottom" />
                {/* Second line: Passes under the name, then the deck and bottom passes under their foam figures. */}
                <div className={`pb-1.5 text-xs text-surf-ink-muted font-normal ${RULE}`}>Passes</div>
                <div className={`pl-2 ${RULE}`} />
                <div
                  data-rocker-planing-cell="deckPasses"
                  className={`pl-2 pb-1.5 text-right text-xs tabular-nums text-surf-ink-muted font-normal ${RULE}`}
                >
                  {row.deckPasses}
                </div>
                <div
                  data-rocker-planing-cell="bottomPasses"
                  className={`pl-2 pb-1.5 text-right text-xs tabular-nums text-surf-ink-muted font-normal ${RULE}`}
                >
                  {row.bottomPasses}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1 text-xs text-surf-ink-muted font-normal" data-rocker-planing-note>
            <p>{`At ${formatMark(defaults.planerMaxDepth, system)} a pass — your Planer Max Depth.`}</p>
            <p>{NOTE_PASSES}</p>
            {rows.some((row) => row.offDeck.negative || row.offBottom.negative) && <p>{NOTE_BELOW_ZERO}</p>}
          </div>
        </>
      ) : null}
    </div>
  );
}
