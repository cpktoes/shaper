"use client";

/**
 * The Fit & Tip Defaults dialog (D-09, 11-UI-SPEC §12) — opened from the gear menu's BLANKS row,
 * and rendered once, by `FitDefaultsProvider`, rather than inside the menu: the menu popup unmounts
 * the moment it closes, and a dialog inside it would vanish with it.
 *
 * Seven settings in two groups: six typed marks and one two-way choice. WHICH BLANKS FIT holds the
 * three rules that decide whether a real blank counts as a fit for the board (Phase 11 D-04's
 * extra length, Phase 12 D-03's Planer Max Depth — which, with the board's Deck Skin, sets the
 * centre floor (D-10) — and D-05's width margin); NEW BOARDS START WITH holds the Deck Skin, the
 * nose and tail tip thickness and the Tip Style (Pin deck or Bottom, Phase 12 D-04) a brand-new
 * board begins from — a board already started keeps its own.
 *
 * The Tip Style pair commits on the tap itself, like the Units rows; tapping the option already
 * shown stores nothing, the same "only a real change counts" rule the typed fields follow.
 *
 * Every field commits on blur or Enter and takes effect at once, the same way the Units rows apply
 * as they are picked, so there is no Save and no Cancel: the footer is Restore Defaults (returns
 * every setting to "not chosen", so each reads its default again) and Done, which only closes. A
 * setting nobody chose shows its default exactly as if it had been chosen — no "default" tag.
 *
 * Every number reads through the display boundary as a mark (`family="mark"`): whole millimetres
 * in Metric, sixteenths in Imperial (CLAUDE.md Rule 2). Each field's typed bounds come from the
 * same `measureSlider` + `typedFieldBounds` pair every other typed field uses, over the ranges
 * declared beside the defaults themselves, so an out-of-range value clamps silently to them.
 */

import { useRef } from "react";
import { useFitDefaults } from "@/components/fit-defaults-provider";
import { useUnits } from "@/components/units-provider";
import { MeasureField } from "@/components/design/measure-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMark, measureSlider, typedFieldBounds } from "@/lib/geometry/measure-display";
import { TwoOptionToggle } from "@/components/viewer/two-option-toggle";
import { FIT_DEFAULTS_RANGE_IN, type FitDefaultsMmKey } from "@/lib/fit-defaults-preference";
import type { TipStyle } from "@/lib/geometry/blank";
import type { Mm } from "@/lib/geometry/units";

/** The menu's own group-label type (settings-menu.tsx), reused for the dialog's two groups. */
const GROUP_LABEL_CLASS = "text-[10px] font-bold tracking-architectural text-surf-ink-muted uppercase";

interface FieldCopy {
  label: string;
  hint?: string;
}

const FIELD_COPY: Record<FitDefaultsMmKey, FieldCopy> = {
  extraLength: {
    label: "Extra Length",
    hint: "A blank must be at least this much longer than your board.",
  },
  planerMaxDepth: {
    label: "Planer Max Depth",
    hint: "How deep your planer cuts in one pass. Passes are counted at this depth, and a blank must leave room for at least one off the bottom at the center.",
  },
  widthMargin: {
    label: "Width Margin",
    hint: "Your board must be at least this much narrower than the blank everywhere, half of it spare on each rail.",
  },
  deckSkin: {
    label: "Deck Skin",
    hint: "Taken off the blank's deck, the same at every station.",
  },
  noseTipThickness: { label: "Nose Tip Thickness" },
  tailTipThickness: { label: "Tail Tip Thickness" },
};

/** The Tip Style row's fixed copy (D-04, 12-UI-SPEC §6). The hint is static — unlike the ROCKER
 * sidebar's, it does not change with the option shown. */
const TIP_STYLE_LABEL = "Tip Style";
const TIP_STYLE_HINT = "Pin deck takes the tips' extra off the bottom; Bottom takes it off the deck.";
const TIP_STYLE_OPTIONS = ["pinDeck", "bottom"] as const satisfies readonly [TipStyle, TipStyle];
const TIP_STYLE_LABELS = ["Pin deck", "Bottom"] as const;

/** One row of the dialog: a typed number of millimetres, or the Tip Style pair — the one setting
 * that is a choice rather than a number. */
type DialogRow = { kind: "measure"; key: FitDefaultsMmKey } | { kind: "tipStyle" };

const measure = (key: FitDefaultsMmKey): DialogRow => ({ kind: "measure", key });

const GROUPS: { label: string; hint?: string; rows: DialogRow[] }[] = [
  {
    label: "WHICH BLANKS FIT",
    rows: [measure("extraLength"), measure("planerMaxDepth"), measure("widthMargin")],
  },
  {
    label: "NEW BOARDS START WITH",
    hint: "Boards you've already started keep their own.",
    rows: [measure("deckSkin"), measure("noseTipThickness"), measure("tailTipThickness"), { kind: "tipStyle" }],
  },
];

export function FitDefaultsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { defaults, setDefault, restoreDefaults } = useFitDefaults();
  const { system } = useUnits();
  const popupRef = useRef<HTMLDivElement>(null);

  // A typed field also commits when it merely loses focus, so tabbing or tapping past a field
  // hands back the value it already showed. Storing that would quietly turn a setting nobody
  // chose into a chosen one (and, in Metric, round 2" = 50.8 mm to a stored 51 mm), so only a
  // value that reads differently from the one on screen counts as a change.
  function commitIfChanged(key: FitDefaultsMmKey, next: Mm) {
    if (formatMark(next, system) === formatMark(defaults[key], system)) return;
    setDefault(key, next);
  }

  // Opened from a menu row rather than its own trigger, so Base UI can't tell a tap from a click
  // and would focus the first field — which on a phone throws the keyboard up over the dialog
  // before the shaper has read it. On a touch pointer focus the dialog itself; a mouse or
  // keyboard user still lands in the first field.
  function initialFocus() {
    const coarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    return coarse ? popupRef.current : true;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={popupRef}
        initialFocus={initialFocus}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-surf-line-faint bg-surf-panel text-surf-ink sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-surf-ink">Fit & Tip Defaults</DialogTitle>
          <DialogDescription className="text-xs text-surf-ink-muted">
            Which blanks count as a fit, how deep your planer cuts, and what every new board starts
            with.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          {GROUPS.map((group) => (
            <section key={group.label} className="flex flex-col gap-4" aria-label={group.label}>
              <div>
                <div className={GROUP_LABEL_CLASS}>{group.label}</div>
                {group.hint && <p className="mt-1 text-xs text-surf-ink-muted">{group.hint}</p>}
              </div>
              {group.rows.map((row) => {
                if (row.kind === "tipStyle") {
                  return (
                    <div key="tipStyle" className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-surf-ink">{TIP_STYLE_LABEL}</div>
                        <p className="mt-0.5 text-xs text-surf-ink-muted">{TIP_STYLE_HINT}</p>
                      </div>
                      <div className="shrink-0">
                        <TwoOptionToggle
                          options={TIP_STYLE_OPTIONS}
                          labels={TIP_STYLE_LABELS}
                          value={defaults.tipStyle}
                          ariaLabel="Tip Style"
                          // Compared against the resolved value (the commitIfChanged idea): tapping
                          // the option already shown stores nothing, so "not chosen" stays so.
                          onChange={(next) => {
                            if (next !== defaults.tipStyle) setDefault("tipStyle", next);
                          }}
                        />
                      </div>
                    </div>
                  );
                }
                const key = row.key;
                const copy = FIELD_COPY[key];
                const range = FIT_DEFAULTS_RANGE_IN[key];
                const view = measureSlider(defaults[key], range, range.step, 1, system);
                const bounds = typedFieldBounds(view, "mark", system);
                return (
                  <div key={key} className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-surf-ink">{copy.label}</div>
                      {copy.hint && <p className="mt-0.5 text-xs text-surf-ink-muted">{copy.hint}</p>}
                    </div>
                    <div className="shrink-0">
                      <MeasureField
                        value={defaults[key]}
                        onCommit={(next) => commitIfChanged(key, next)}
                        label={copy.label}
                        family="mark"
                        min={bounds.min}
                        max={bounds.max}
                        system={system}
                      />
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>

        <DialogFooter className="flex-row items-center justify-between border-surf-line-faint bg-surf-panel sm:justify-between">
          <button
            type="button"
            onClick={restoreDefaults}
            className="focus-ring-accent cursor-pointer text-left text-[11px] font-bold text-surf-accent-ink coarse:flex coarse:min-h-11 coarse:items-center"
          >
            Restore Defaults
          </button>
          <DialogClose render={<Button />}>Done</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
