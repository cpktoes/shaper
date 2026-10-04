"use client";

/**
 * The BLANK section of the ROCKER sidebar (Phase 11, D-04–D-08; 11-UI-SPEC §2, §6, §7).
 *
 * The page hands this a promise of the pickable catalogue, NOT awaited on the server (11-RESEARCH
 * Pattern 8). Only the list region waits for it, inside its own Suspense boundary, so the title,
 * the centre control, the placement slider and the drawing never wait on the catalogue. The
 * loader never rejects: a catalogue that didn't load resolves to `unavailable` and the list says
 * so (E4) — a board that already has a blank keeps working from its own copy (D-01).
 *
 * Three states (§2):
 * - A — browsing, no search: the intro, the search box, the first six rows of one list across the
 *   blank makers ticked in the settings menu (all three unless a shaper has unticked some — then a
 *   one-line note under the intro says which are shown), shortest first (the blanks that fit under FITS THIS BOARD, then the ones that
 *   don't, greyed, each with the one reason it fails), then "Show all {n} blanks".
 * - B — searching: every match, uncapped, or "No blanks match …" with Clear Search. The search is a
 *   plain filter over the list already held; it never re-judges a blank and never fetches.
 * - C — a blank is picked: the picked card from the board's own copy, the fit flag beneath it when
 *   it stops fitting (`blank-flag.tsx`), and Change Blank / Remove This Blank. The list shows only
 *   while Change Blank is open; picking any row closes it. Nothing here ever clears the pick on
 *   its own — only the shaper's own tap on Remove This Blank or on another blank does (D-08).
 *
 * A greyed row is still pickable — it lands at its "nearly fits" placement and the flag says why.
 * Greyed text is `text-surf-ink-muted`, never faded with opacity, so the warning-ink reason keeps
 * its full contrast. Every number goes through `lib/geometry/measure-display.ts` by way of the
 * sentences in `lib/geometry/blank-reasons.ts` (CLAUDE.md Rule 2); the verdicts come from
 * `use-blank-list.ts`. Catalogue text is rendered as React text only (T-11-32).
 *
 * Touch (§15): rows carry `coarse:min-h-11`; every text link grows its row, not its glyph, with
 * `coarse:min-h-11 coarse:flex coarse:items-center`. Nothing here reads width or height.
 */

import { Suspense, use, useState } from "react";
import { CheckIcon, SearchIcon } from "lucide-react";
import { useDesign } from "@/components/design/design-store";
import { useBlankMakers } from "@/components/blank-makers-provider";
import { useAppSettings } from "@/components/app-settings-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUnits } from "@/components/units-provider";
import { blankMakersNote, catalogsPhrase } from "@/lib/blanks/vendors";
import type { BlankCatalogResult } from "@/lib/db/blanks";
import type { BlankRecord } from "@/lib/geometry/blank";
import { catalogueExtremes, type BlankVerdict } from "@/lib/geometry/blank-fit";
import {
  blankRowMeta,
  blankRowVolume,
  emptyListMessage,
  formatShortfall,
  listIntro,
  matchesBlankSearch,
} from "@/lib/geometry/blank-reasons";
import type { UnitsSystem } from "@/lib/geometry/units";
import { cn } from "@/lib/utils";
import { BlankFlag } from "./blank-flag";
import { useBlankList, useCenterFloorRules } from "./use-blank-list";

/** How many rows state A shows before "Show all" (`(researcher's choice — founder may overrule)`). */
const FIRST_ROWS = 6;

/** The 10px/800 uppercase group label the datasheet's station headers use. */
const GROUP_LABEL_CLASS =
  "px-2 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-architectural text-surf-ink-muted";

/** The 11px/700 "↺ Reset" text-link idiom (`rail-controls.tsx`), grown to 44px on a touch pointer. */
const TEXT_LINK_CLASS =
  "focus-ring-accent cursor-pointer text-left text-[11px] font-bold coarse:flex coarse:min-h-11 coarse:items-center";

/** Is this row the board's own blank? Matched by vendor and name — the board carries a copy. */
function isSameBlank(a: Pick<BlankRecord, "vendor" | "name">, b: Pick<BlankRecord, "vendor" | "name"> | null) {
  return b !== null && a.vendor === b.vendor && a.name === b.name;
}

/** A blank's first two lines — name (and volume, where the catalogue has one), then the meta line. */
function BlankLines({
  record,
  greyed,
  checked,
  system,
}: {
  record: BlankRecord;
  greyed: boolean;
  checked: boolean;
  system: UnitsSystem;
}) {
  const volume = blankRowVolume(record);
  return (
    <>
      <span className="flex w-full items-baseline gap-2">
        <span
          data-blank-name
          className={cn("flex-1 text-sm leading-tight font-semibold", greyed ? "text-surf-ink-muted" : "text-surf-ink")}
        >
          {record.name}
        </span>
        {volume !== null && <span className="shrink-0 text-xs text-surf-ink-muted">{volume}</span>}
        {checked && <CheckIcon aria-hidden className="size-4 shrink-0 self-center text-surf-accent-ink" />}
      </span>
      <span className="text-xs text-surf-ink-muted">{blankRowMeta(record, system)}</span>
    </>
  );
}

interface BlankRowProps {
  record: BlankRecord;
  /** The reason line for a greyed row; null for a row that fits. */
  reason: string | null;
  picked: boolean;
  system: UnitsSystem;
  onPick: () => void;
}

/** One blank as a row: its name, its meta line, and for a greyed row the reason it won't fit. */
function BlankRow({ record, reason, picked, system, onPick }: BlankRowProps) {
  const greyed = reason !== null;
  const accessibleName = `Use ${record.vendor} ${record.name}${greyed ? `, doesn't fit: ${reason}` : ""}`;
  return (
    <button
      type="button"
      aria-pressed={picked}
      aria-label={accessibleName}
      onClick={onPick}
      className={cn(
        "focus-ring-accent flex w-full cursor-pointer flex-col gap-1 px-2 py-2 text-left hover:bg-surf-well coarse:min-h-11",
        // The 2px accent bar replaces 2px of the left padding, so the text does not shift.
        picked && "border-l-2 border-surf-accent-ink bg-surf-well pl-1.5",
      )}
    >
      <BlankLines record={record} greyed={greyed} checked={picked} system={system} />
      {greyed && <span className="text-xs text-surf-warning-ink">{reason}</span>}
    </button>
  );
}

/** One listed row: the verdict, the catalogue's own record, and the group it sits in. */
interface ListedRow {
  verdict: BlankVerdict;
  record: BlankRecord;
  group: "fits" | "wontFit";
}

interface BlankListProps {
  catalog: Promise<BlankCatalogResult>;
  query: string;
  onClearSearch: () => void;
  /** Called after a row is picked — closes the list in state C. */
  onPicked: () => void;
}

/** The judged list, once the catalogue has arrived. */
function BlankListBody({
  records,
  query,
  onClearSearch,
  onPicked,
}: Omit<BlankListProps, "catalog"> & { records: readonly BlankRecord[] }) {
  const { system } = useUnits();
  const { blank, pickBlank, outline, foil } = useDesign();
  const { openAppSettings } = useAppSettings();
  const { hidden } = useBlankMakers();
  const { list, board, prepared, recordOf } = useBlankList(records);
  const rules = useCenterFloorRules();
  const [expanded, setExpanded] = useState(false);

  if (list.emptyReason !== null) {
    const { longest, thickestCenter } = catalogueExtremes(prepared);
    const message = emptyListMessage(
      list.emptyReason,
      { boardLength: outline.length, longest, centre: foil.center, thickestCenter, rules },
      system,
      catalogsPhrase(hidden),
    );
    return (
      <div className="flex flex-col gap-1" data-blank-list-empty>
        <div className="text-sm font-semibold text-surf-ink">{message.heading}</div>
        <div className="text-xs text-surf-ink-muted">{message.body}</div>
        <Button variant="outline" className="mt-1 self-start max-shell:w-full max-shell:self-stretch" onClick={() => openAppSettings("fit")}>
          Change Fit Rules
        </Button>
      </div>
    );
  }

  // One order across both groups: every fitting blank shortest first, then every greyed one.
  const all: ListedRow[] = [
    ...list.fits.map((verdict) => ({ verdict, group: "fits" as const })),
    ...list.wontFit.map((verdict) => ({ verdict, group: "wontFit" as const })),
  ].map((row) => ({ ...row, record: recordOf.get(row.verdict.prepared) ?? row.verdict.prepared.record }));

  const searching = query.trim() !== "";
  // State B filters the rows already judged — it never re-runs a verdict.
  const matched = searching ? all.filter((row) => matchesBlankSearch(row.record, query)) : all;

  if (searching && matched.length === 0) {
    return (
      <div className="flex flex-col items-start gap-1">
        <div className="text-xs break-words text-surf-ink-muted">No blanks match &quot;{query}&quot;.</div>
        <button type="button" onClick={onClearSearch} className={cn(TEXT_LINK_CLASS, "text-surf-accent-ink")}>
          Clear Search
        </button>
      </div>
    );
  }

  const capped = !searching && !expanded && matched.length > FIRST_ROWS;
  const visible = capped ? matched.slice(0, FIRST_ROWS) : matched;
  const hiddenOrExpanded = !searching && all.length > FIRST_ROWS;

  return (
    <div className="flex flex-col items-start gap-2">
      <ul aria-label="Blanks" className="w-full rounded-md border border-surf-line">
        {visible.flatMap((row, index) => {
          // A group label appears where its group's first visible row falls, and only then.
          const firstOfGroup = index === 0 || visible[index - 1].group !== row.group;
          const reason = row.group === "wontFit" ? formatShortfall(row.verdict.worst, board, system) : null;
          const key = `${row.record.vendor}|${row.record.name}`;
          const label = firstOfGroup ? (
            <li key={`${row.group}-label`} className={cn(GROUP_LABEL_CLASS, row.group === "wontFit" && index > 0 && "mt-4")}>
              {row.group === "fits" ? "FITS THIS BOARD" : "WON'T FIT THIS BOARD"}
            </li>
          ) : null;
          return [
            ...(label ? [label] : []),
            <li key={key} data-group={row.group} className="border-b border-surf-line-faint last:border-b-0">
              <BlankRow
                record={row.record}
                reason={reason}
                picked={isSameBlank(row.record, blank?.copy ?? null)}
                system={system}
                onPick={() => {
                  pickBlank(row.record, row.verdict.placement);
                  onPicked();
                }}
              />
            </li>,
          ];
        })}
      </ul>
      {hiddenOrExpanded && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className={cn(TEXT_LINK_CLASS, "text-surf-accent-ink")}
        >
          {expanded ? "Show Fewer" : `Show all ${all.length} blanks`}
        </button>
      )}
    </div>
  );
}

/** Reads the streamed catalogue — suspends until it arrives (the Suspense fallback shows meanwhile). */
function BlankList({ catalog, ...rest }: BlankListProps) {
  const result = use(catalog);
  if (result.status === "unavailable") {
    return (
      <div className="flex flex-col gap-1" data-blank-catalog-unavailable>
        <div className="text-sm font-semibold text-surf-ink">The blank catalog didn&apos;t load.</div>
        <div className="text-xs text-surf-ink-muted">
          Your board is fine — the blank you picked travels with it. Reload the page to see the list again.
        </div>
      </div>
    );
  }
  return <BlankListBody records={result.blanks} {...rest} />;
}

/** The intro, the search box and the list region (states A and B). */
function BlankBrowser({ catalog, onPicked }: { catalog: Promise<BlankCatalogResult>; onPicked: () => void }) {
  const { system } = useUnits();
  const rules = useCenterFloorRules();
  const { hidden } = useBlankMakers();
  const makersNote = blankMakersNote(hidden);
  const [query, setQuery] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-surf-ink-muted font-normal">{listIntro(rules, system)}</div>
      {/* Only when a maker is unticked in the settings menu — with all ticked nothing is drawn, so
          the list reads exactly as it always has. */}
      {makersNote !== null && (
        <div data-blank-makers-note className="text-xs text-surf-ink-muted font-normal">
          {makersNote}
        </div>
      )}
      <div className="relative">
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-surf-ink-muted"
        />
        <Input
          type="search"
          aria-label="Search blanks"
          placeholder="Search blanks — e.g. Marko, 6'2, EPS"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="pl-8"
        />
      </div>
      <Suspense fallback={<p className="text-xs text-surf-ink-muted">Loading blanks…</p>}>
        <BlankList catalog={catalog} query={query} onClearSearch={() => setQuery("")} onPicked={onPicked} />
      </Suspense>
    </div>
  );
}

export function BlankPicker({ catalog }: { catalog: Promise<BlankCatalogResult> }) {
  const { system } = useUnits();
  const { blank, removeBlank } = useDesign();
  /** State C's Change Blank / Keep This Blank toggle — view state, never saved. */
  const [listOpen, setListOpen] = useState(false);

  if (!blank) {
    return <BlankBrowser catalog={catalog} onPicked={() => setListOpen(false)} />;
  }

  return (
    <div className="flex flex-col gap-2">
      {/* The board's own blank, drawn from its own copy (D-01): present the moment the board
          loads, even when the catalogue did not, and never changed, cleared or dimmed by a flag. */}
      <div
        data-picked-blank
        className="flex flex-col gap-1 rounded-md border border-surf-line border-l-2 border-l-surf-accent-ink bg-surf-well px-2 py-2"
      >
        <BlankLines record={blank.copy} greyed={false} checked={false} system={system} />
      </div>

      <BlankFlag catalog={catalog} />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-expanded={listOpen}
          onClick={() => setListOpen((open) => !open)}
          className={cn(TEXT_LINK_CLASS, "text-surf-accent-ink")}
        >
          {listOpen ? "Keep This Blank" : "Change Blank"}
        </button>
        <button
          type="button"
          onClick={() => {
            setListOpen(false);
            removeBlank();
          }}
          className={cn(TEXT_LINK_CLASS, "text-surf-ink-muted")}
        >
          Remove This Blank
        </button>
      </div>
      <div className="text-xs text-surf-ink-muted">
        Removing it keeps the rocker and foil at the five stations and re-draws the curve through them, for you to set by hand.
      </div>

      {listOpen && <BlankBrowser catalog={catalog} onPicked={() => setListOpen(false)} />}
    </div>
  );
}
