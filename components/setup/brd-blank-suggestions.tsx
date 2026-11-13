"use client";

/**
 * The SUGGESTED BLANKS block of the board-file preview (quick 261113-gwo, the founder, 2026-11-13: "Maybe suggest a blank
 * (from each mfg?) that gets the rocker very close"). `lib/geometry/brd-blank-suggest.ts` works the suggestions out and
 * `lib/export/brd-blank-words.ts` words them; this fetches the catalogue, runs the search and paints what it says.
 *
 * The catalogue reaches the browser only when a board file is being looked at: the first time a preview mounts this hook it
 * asks `/api/blank-catalog` (the same owner-less list ROCKER streams to every visitor), once per page visit, and prepares every
 * blank once. The home page itself makes no catalogue request. The `.brd` never leaves the browser: the request is a bare GET
 * that carries nothing. The search runs one tick after the preview has painted its "Looking for blanks…" line, so the
 * preview itself stays instant; a change of Imperial or Metric re-words it, never re-searches. If the catalogue cannot be
 * read, or the search itself fails, the block says so in one quiet line and everything else in the preview works as before.
 *
 * It only ever suggests: nothing here picks a blank for the shaper.
 */

import { useEffect, useMemo, useState } from "react";
import { CAPTION_CLASS } from "@/components/3d/brd-preview-dialog";
import { useBlankMakers } from "@/components/blank-makers-provider";
import { useFitDefaults } from "@/components/fit-defaults-provider";
import { isPickable, isWellFormedBlankRecord } from "@/lib/blanks/catalog";
import { shownBlankVendors } from "@/lib/blanks/vendors";
import { brdBlankWords, type BrdBlankState, type BrdBlankWords } from "@/lib/export/brd-blank-words";
import type { BrdFitLook } from "@/lib/export/brd-fit-preview";
import type { BlankRecord, FitSettings } from "@/lib/geometry/blank";
import { prepareBlank, type PreparedBlank } from "@/lib/geometry/blank-fit";
import { suggestBlanks, type BrdBlankCut, type BrdBlankSuggestion } from "@/lib/geometry/brd-blank-suggest";
import type { UnitsSystem } from "@/lib/geometry/units";
import { cn } from "@/lib/utils";

/** The catalogue's address: public, read-only, the same list ROCKER shows every visitor. */
const CATALOGUE_URL = "/api/blank-catalog";

/**
 * One in-flight-or-done read of the catalogue for the whole page visit: the blanks, prepared once, or null when it could not
 * be read. A failure is forgotten, so the next preview tries again; a success is kept.
 */
let catalogue: Promise<PreparedBlank[] | null> | null = null;

/** Every pickable, well-formed blank the answer holds, each prepared; null when the answer is not a catalogue or holds none. */
function prepareAnswer(body: unknown): PreparedBlank[] | null {
  if (typeof body !== "object" || body === null) return null;
  const { status, blanks } = body as { status?: unknown; blanks?: unknown };
  if (status !== "ok" || !Array.isArray(blanks)) return null;
  const prepared: PreparedBlank[] = [];
  for (const candidate of blanks as unknown[]) {
    if (!isWellFormedBlankRecord(candidate) || !isPickable(candidate)) continue;
    try {
      prepared.push(prepareBlank(candidate as BlankRecord));
    } catch {
      // One blank that can't be drawn costs only itself.
    }
  }
  return prepared.length > 0 ? prepared : null;
}

function loadCatalogue(): Promise<PreparedBlank[] | null> {
  if (catalogue) return catalogue;
  const pending = (async (): Promise<PreparedBlank[] | null> => {
    try {
      const response = await fetch(CATALOGUE_URL);
      if (!response.ok) return null;
      return prepareAnswer(await response.json());
    } catch {
      return null;
    }
  })();
  catalogue = pending;
  void pending.then((result) => {
    if (result === null && catalogue === pending) catalogue = null;
  });
  return pending;
}

/** What one search was run for: the file, the catalogue, the makers, the cut and the three fit rules. */
interface SearchInputs {
  look: BrdFitLook;
  prepared: readonly PreparedBlank[];
  makers: readonly string[];
  cut: BrdBlankCut;
  settings: FitSettings;
}

/**
 * The block's words for the file being looked at, in `system`: loading until the catalogue is in and the search has run, then
 * the suggestions for the makers the shaper shows, judged by the shaper's own App Default Settings. A change to the file,
 * the makers or those settings searches again; a change of system only re-words.
 */
export function useBrdBlankWords(look: BrdFitLook, system: UnitsSystem): BrdBlankWords {
  const { defaults, settings } = useFitDefaults();
  const { hidden } = useBlankMakers();
  // undefined: still loading. null: could not be read.
  const [prepared, setPrepared] = useState<readonly PreparedBlank[] | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    void loadCatalogue().then((result) => {
      if (live) setPrepared(result);
    });
    return () => {
      live = false;
    };
  }, []);

  const makers = useMemo(() => shownBlankVendors(hidden), [hidden]);
  const { deckSkin, tipStyle } = defaults;
  const { extraLength, planerMaxDepth, widthMargin } = settings;
  const inputs = useMemo<SearchInputs | null>(
    () =>
      prepared
        ? { look, prepared, makers, cut: { deckSkin, tipStyle }, settings: { extraLength, planerMaxDepth, widthMargin } }
        : null,
    [prepared, look, makers, deckSkin, tipStyle, extraLength, planerMaxDepth, widthMargin],
  );

  // The search runs a tick later, so "Looking for blanks…" has painted first. `suggestions` null: the search itself failed.
  const [done, setDone] = useState<{ inputs: SearchInputs; suggestions: BrdBlankSuggestion[] | null } | null>(null);
  useEffect(() => {
    if (!inputs) return;
    const timer = window.setTimeout(() => {
      let suggestions: BrdBlankSuggestion[] | null;
      try {
        suggestions = suggestBlanks({
          fit: inputs.look.fit,
          bottom: inputs.look.board.bottom,
          prepared: inputs.prepared,
          makers: inputs.makers,
          cut: inputs.cut,
          settings: inputs.settings,
        });
      } catch {
        suggestions = null;
      }
      setDone({ inputs, suggestions });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [inputs]);

  const state = useMemo<BrdBlankState>(() => {
    if (prepared === null) return { status: "unavailable" };
    if (!inputs || done?.inputs !== inputs) return { status: "loading" };
    return done.suggestions === null ? { status: "unavailable" } : { status: "ready", suggestions: done.suggestions };
  }, [prepared, inputs, done]);
  return useMemo(() => brdBlankWords(state, look, system), [state, look, system]);
}

/**
 * The block, under the rocker table: a caption, then either the one quiet line (still looking, or the catalogue didn't load) or
 * the intro and one group of lines per maker. Plain text only, never HTML: a blank's name is painted as text.
 */
export function BrdBlankSuggestions({ words }: { words: BrdBlankWords }) {
  const quiet = words.status !== "ready";
  return (
    <div data-brd-blanks data-brd-blanks-state={words.status} className="flex flex-col gap-1">
      <div className={CAPTION_CLASS}>{words.caption}</div>
      {quiet ? (
        <p data-brd-blanks-status role="status" className="text-xs text-surf-ink-muted">
          {words.lines[0][0]}
        </p>
      ) : (
        <>
          {words.intro !== null && (
            <p data-brd-blanks-intro className="text-xs text-surf-ink-muted">
              {words.intro}
            </p>
          )}
          {words.lines.map((lines) => (
            <div key={lines[0]} data-brd-blanks-maker className="flex flex-col gap-0.5">
              {lines.map((text, i) => (
                <p key={text} {...(i === 1 ? { "data-brd-blanks-bends": "" } : {})} className={cn("text-xs text-surf-ink", i === 1 && "pl-3")}>
                  {text}
                </p>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
