"use client";

/**
 * The BLANK section of the ROCKER sidebar (Phase 11, D-04–D-08; 11-UI-SPEC §2).
 *
 * The page hands this a promise of the pickable catalogue, NOT awaited on the server (11-RESEARCH
 * Pattern 8). Only the list region waits for it, inside its own Suspense boundary, so the title,
 * the centre control, the placement slider and the drawing never wait on the catalogue. The
 * loader never rejects: a catalogue that didn't load resolves to `unavailable` and the list says
 * so (E4) — a board that already has a blank keeps working from its own copy (D-01).
 *
 * One list across all three vendors, shortest first: the blanks that fit under FITS THIS BOARD,
 * then the ones that don't, greyed, each with the one reason it fails (station and amount). A
 * greyed row is still pickable — it lands at its "nearly fits" placement and the flag says why.
 * Greyed text is `text-surf-ink-muted`, never faded with opacity, so the warning-ink reason keeps
 * its full contrast.
 *
 * Every number goes through `lib/geometry/measure-display.ts`, every sentence through
 * `lib/geometry/blank-reasons.ts` (CLAUDE.md Rule 2); the verdicts come from `use-blank-list.ts`.
 */

import { Suspense, use } from "react";
import { CheckIcon } from "lucide-react";
import { useDesign } from "@/components/design/design-store";
import { useFitDefaults } from "@/components/fit-defaults-provider";
import { useUnits } from "@/components/units-provider";
import type { BlankCatalogResult } from "@/lib/db/blanks";
import type { BlankRecord } from "@/lib/geometry/blank";
import type { BlankVerdict } from "@/lib/geometry/blank-fit";
import { blankRowMeta, formatShortfall, listIntro } from "@/lib/geometry/blank-reasons";
import type { UnitsSystem } from "@/lib/geometry/units";
import { cn } from "@/lib/utils";
import { useBlankList, type BlankListState } from "./use-blank-list";

/** The 10px/800 uppercase group label the datasheet's station headers use. */
const GROUP_LABEL_CLASS =
  "px-2 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-architectural text-surf-ink-muted";

/** Is this row the board's own blank? Matched by vendor and name — the board carries a copy. */
function isSameBlank(a: Pick<BlankRecord, "vendor" | "name">, b: Pick<BlankRecord, "vendor" | "name"> | null) {
  return b !== null && a.vendor === b.vendor && a.name === b.name;
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
        picked && "border-l-2 border-surf-accent-ink bg-surf-well pl-1.5",
      )}
    >
      <span className="flex w-full items-baseline gap-2">
        <span
          data-blank-name
          className={cn("flex-1 text-sm leading-tight font-semibold", greyed ? "text-surf-ink-muted" : "text-surf-ink")}
        >
          {record.name}
        </span>
        {picked && <CheckIcon aria-hidden className="size-4 shrink-0 self-center text-surf-accent-ink" />}
      </span>
      <span className="text-xs text-surf-ink-muted">{blankRowMeta(record, system)}</span>
      {greyed && <span className="text-xs text-surf-warning-ink">{reason}</span>}
    </button>
  );
}

/** The judged list, once the catalogue has arrived. */
function BlankListBody({ records }: { records: readonly BlankRecord[] }) {
  const { system } = useUnits();
  const { blank, pickBlank } = useDesign();
  const state: BlankListState = useBlankList(records);
  const { list, board, recordOf } = state;

  const rows = (verdicts: BlankVerdict[], group: "fits" | "wontFit") =>
    verdicts.map((verdict) => {
      const record = recordOf.get(verdict.prepared) ?? verdict.prepared.record;
      const reason = group === "wontFit" ? formatShortfall(verdict.worst, board, system) : null;
      return (
        <li
          key={`${record.vendor}|${record.name}`}
          data-group={group}
          className="border-b border-surf-line-faint last:border-b-0"
        >
          <BlankRow
            record={record}
            reason={reason}
            picked={isSameBlank(record, blank?.copy ?? null)}
            system={system}
            onPick={() => pickBlank(record, verdict.placement)}
          />
        </li>
      );
    });

  return (
    <ul aria-label="Blanks" className="rounded-md border border-surf-line">
      {list.fits.length > 0 && <li className={GROUP_LABEL_CLASS}>FITS THIS BOARD</li>}
      {rows(list.fits, "fits")}
      {list.wontFit.length > 0 && <li className={cn(GROUP_LABEL_CLASS, "mt-4")}>WON&apos;T FIT THIS BOARD</li>}
      {rows(list.wontFit, "wontFit")}
    </ul>
  );
}

/** Reads the streamed catalogue — suspends until it arrives (the Suspense fallback shows meanwhile). */
function BlankList({ catalog }: { catalog: Promise<BlankCatalogResult> }) {
  const result = use(catalog);
  if (result.status === "unavailable") {
    return (
      <div className="flex flex-col gap-1">
        <div className="text-sm font-semibold text-surf-ink">The blank catalog didn&apos;t load.</div>
        <div className="text-xs text-surf-ink-muted">
          Your board is fine — the blank you picked travels with it. Reload the page to see the list again.
        </div>
      </div>
    );
  }
  return <BlankListBody records={result.blanks} />;
}

export function BlankPicker({ catalog }: { catalog: Promise<BlankCatalogResult> }) {
  const { system } = useUnits();
  const { settings } = useFitDefaults();
  const { blank } = useDesign();
  return (
    <div className="flex flex-col gap-2">
      {blank && (
        // The board's own blank, drawn from its own copy (D-01) — present the moment the board loads.
        <div
          data-picked-blank
          className="flex flex-col gap-1 rounded-md border border-surf-line border-l-2 border-l-surf-accent-ink bg-surf-well px-2 py-2"
        >
          <span className="text-sm leading-tight font-semibold text-surf-ink">{blank.copy.name}</span>
          <span className="text-xs text-surf-ink-muted">{blankRowMeta(blank.copy, system)}</span>
        </div>
      )}
      <div className="text-xs text-surf-ink-muted font-normal">{listIntro(settings, system)}</div>
      <Suspense fallback={<p className="text-xs text-surf-ink-muted">Loading blanks…</p>}>
        <BlankList catalog={catalog} />
      </Suspense>
    </div>
  );
}
