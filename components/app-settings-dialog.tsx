"use client";

/**
 * App Default Settings (quick 261003-uwi) — the one pop-up that holds every app-wide default a
 * shaper sets once: Imperial or Metric, the theme, which blank makers ROCKER lists, and the seven
 * fit and tip defaults. It grew out of the Fit & Tip Defaults dialog (D-09, 11-UI-SPEC §12), whose
 * two groups it keeps exactly as they were, below a hairline.
 *
 * Who opens it: the single "App Default Settings" row in the gear menu (computer) and in the ☰
 * sheet (phone) open it at its top; ROCKER's two "Change Fit Rules" buttons open it at the fit part
 * (`at="fit"`). It is rendered once, by `AppSettingsProvider`, rather than inside either menu: a menu
 * popup unmounts the moment it closes, and a dialog inside it would vanish with it. That provider
 * sits inside the theme, makers, fit-defaults and units providers, so this pop-up can read all four.
 *
 * Everything applies at once — a tap on a Units button, a typed field on blur or Enter, the Tip
 * Style pair on the tap — so there is no Save and no Cancel. The footer is Restore Fit & Tip
 * Defaults (returns only the seven fit and tip values to "not chosen", never units, theme or
 * makers) and Done, which only closes. A tap on the option already shown stores nothing, the same
 * "only a real change counts" rule the typed fields follow.
 *
 * WHICH BLANKS FIT holds the three rules that decide whether a real blank counts as a fit for the
 * board (Phase 11 D-04's extra length, Phase 12 D-03's Planer Max Depth — which, with the board's
 * Deck Skin, sets the centre floor (D-10) — and D-05's width margin); NEW BOARDS START WITH holds
 * the Deck Skin, the nose and tail tip thickness and the Tip Style (Pin deck or Bottom, Phase 12
 * D-04) a brand-new board begins from — a board already started keeps its own. A setting nobody
 * chose shows its default exactly as if it had been chosen — no "default" tag.
 *
 * Every number reads through the display boundary (CLAUDE.md Rule 2): the Units examples are the
 * Shortboard's dims through `formatDimsExample`, and every fit and tip field reads as a mark
 * (`family="mark"`) — whole millimetres in Metric, sixteenths in Imperial. Each field's typed bounds
 * come from the same `measureSlider` + `typedFieldBounds` pair every other typed field uses, over
 * the ranges declared beside the defaults themselves, so an out-of-range value clamps silently.
 */

import { useId, useRef } from "react";
import { CheckIcon } from "lucide-react";
import type { AppSettingsPlace } from "@/components/app-settings-provider";
import { useBlankMakers } from "@/components/blank-makers-provider";
import { useFitDefaults } from "@/components/fit-defaults-provider";
import { ThemeTiles } from "@/components/theme-tiles";
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
import { formatMark, measureSlider, stationLabel, typedFieldBounds } from "@/lib/geometry/measure-display";
import { TwoOptionToggle } from "@/components/viewer/two-option-toggle";
import { FIT_DEFAULTS_RANGE_IN, type FitDefaultsMmKey } from "@/lib/fit-defaults-preference";
import type { TipStyle } from "@/lib/geometry/blank";
import { formatDimsExample, presetSummary } from "@/lib/geometry/summary-line";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import type { Mm, UnitsSystem } from "@/lib/geometry/units";
import { isLastShownMaker } from "@/lib/blank-makers-preference";
import { KNOWN_BLANK_VENDORS } from "@/lib/blanks/vendors";

/** The menus' old group-label type, kept for every group heading in the pop-up. */
const GROUP_LABEL_CLASS = "text-[10px] font-bold tracking-architectural text-surf-ink-muted uppercase";

/**
 * The live example board under each Units button (D-06) — a fixed reference (Shortboard) run
 * through the same `summarizeDesign()` pipeline the cards use, computed once at module load. Fixed
 * rather than the board in progress so the example never moves while a shaper edits (UI-SPEC's
 * resolved assumption): switching units mid-edit should not also make the pop-up's own example jump.
 */
const UNITS_EXAMPLE_SUMMARY = presetSummary(
  // Shortboard is always present in BOARD_PRESETS — see lib/geometry/presets.ts.
  BOARD_PRESETS.find((preset) => preset.id === "shortboard")!,
);

const UNITS_OPTIONS: { system: UnitsSystem; label: string }[] = [
  { system: "imperial", label: "Imperial" },
  { system: "metric", label: "Metric" },
];

interface FieldCopy {
  label: string;
  /** A fixed line, or one that names the 12" station in the shaper's system (CLAUDE.md Rule 2). */
  hint?: string | ((system: UnitsSystem) => string);
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
    hint: (system) =>
      `Taken off the blank's deck, the same at every station until a board's ${stationLabel(system)} fine-tunes move it.`,
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

export function AppSettingsDialog({
  open,
  onOpenChange,
  at,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What the pop-up was opened for: null for its top, "fit" for the fit part. */
  at: AppSettingsPlace | null;
}) {
  const { defaults, setDefault, restoreDefaults } = useFitDefaults();
  const { system, setSystem } = useUnits();
  const { hidden, setMakerShown } = useBlankMakers();
  const popupRef = useRef<HTMLDivElement>(null);
  const fitHeadingRef = useRef<HTMLHeadingElement>(null);
  const fitHeadingId = useId();
  const makersHintId = useId();
  // Whether any maker is the last one ticked — then it is locked and the hint shows.
  const makerLocked = KNOWN_BLANK_VENDORS.some((vendor) => isLastShownMaker(hidden, vendor));

  // A typed field also commits when it merely loses focus, so tabbing or tapping past a field
  // hands back the value it already showed. Storing that would quietly turn a setting nobody
  // chose into a chosen one (and, in Metric, round 2" = 50.8 mm to a stored 51 mm), so only a
  // value that reads differently from the one on screen counts as a change.
  function commitIfChanged(key: FitDefaultsMmKey, next: Mm) {
    if (formatMark(next, system) === formatMark(defaults[key], system)) return;
    setDefault(key, next);
  }

  // Opened from a menu row or a button elsewhere rather than its own trigger, so Base UI can't tell
  // a tap from a click and would focus the first control — which on a phone can throw the keyboard
  // up over the pop-up before the shaper has read it. On a touch pointer focus the pop-up itself; a
  // mouse or keyboard user still lands on the first control.
  //
  // Opened by ROCKER's Change Fit Rules (`at="fit"`, S4): scroll the pop-up so WHICH BLANKS FIT
  // sits at the top of its scroll area, and focus that heading — a heading never throws a keyboard
  // up, so this applies on every pointer. The popup is fixed-position, so it is the heading's
  // offsetParent; less the popup's 16-dot top padding puts the heading flush with the top. Set
  // again on the next frame in case focusing scrolled it anywhere else.
  function initialFocus() {
    const popup = popupRef.current;
    const heading = fitHeadingRef.current;
    if (at === "fit" && popup && heading) {
      const place = () => {
        popup.scrollTop = Math.max(0, heading.offsetTop - 16);
      };
      place();
      requestAnimationFrame(place);
      return heading;
    }
    const coarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    return coarse ? popup : true;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={popupRef}
        initialFocus={initialFocus}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-surf-line-faint bg-surf-panel text-surf-ink sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-surf-ink">App Default Settings</DialogTitle>
          <DialogDescription className="text-xs text-surf-ink-muted">
            Your defaults for this app. Changes apply at once.
          </DialogDescription>
        </DialogHeader>

        <section className="flex flex-col gap-2" aria-label="UNITS">
          <h3 className={GROUP_LABEL_CLASS}>UNITS</h3>
          <div role="group" aria-label="Units" className="grid grid-cols-2 gap-1.5">
            {UNITS_OPTIONS.map((option) => {
              const active = option.system === system;
              return (
                <button
                  key={option.system}
                  type="button"
                  aria-pressed={active}
                  // Only a real change counts: tapping the system already shown stores nothing.
                  onClick={() => {
                    if (option.system !== system) setSystem(option.system);
                  }}
                  // TwoOptionToggle's own pressed and unpressed colours, so this pair reads as one
                  // family with Tip Style below; the example line under the name keeps the preview
                  // the menu's old Units rows gave.
                  className={`focus-ring-accent flex cursor-pointer flex-col items-start gap-0.5 rounded-md border px-2 py-1.5 text-left leading-tight coarse:min-h-11 ${
                    active
                      ? "border-surf-on-accent bg-surf-accent text-surf-on-accent"
                      : "border-surf-line bg-surf-sidebar text-surf-ink"
                  }`}
                >
                  <span className="text-xs font-bold">{option.label}</span>
                  <span className={`text-[11px] ${active ? "text-surf-on-accent" : "text-surf-ink-muted"}`}>
                    {formatDimsExample(UNITS_EXAMPLE_SUMMARY, option.system)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-2" aria-label="THEME">
          <h3 className={GROUP_LABEL_CLASS}>THEME</h3>
          <ThemeTiles />
        </section>

        {/* Quick task 260926-wmf's tick boxes, as one row: an unticked maker's blanks leave the
            ROCKER blank list. All ticked until a shaper chooses; the last one ticked is locked (not
            `disabled`, so it stays readable and reachable from the keyboard) and the hint says why,
            so the list can never be emptied. A long name wraps inside its chip on a narrow phone
            rather than running out of it (U-5). */}
        <section className="flex flex-col gap-2" aria-label="BLANK MAKERS">
          <h3 className={GROUP_LABEL_CLASS}>BLANK MAKERS</h3>
          <div role="group" aria-label="Blank Makers" className="grid grid-cols-3 gap-1.5">
            {KNOWN_BLANK_VENDORS.map((vendor) => {
              const shown = !hidden.includes(vendor);
              const locked = isLastShownMaker(hidden, vendor);
              return (
                <button
                  key={vendor}
                  type="button"
                  aria-pressed={shown}
                  aria-disabled={locked || undefined}
                  aria-describedby={locked ? makersHintId : undefined}
                  onClick={() => {
                    if (!locked) setMakerShown(vendor, !shown);
                  }}
                  className="focus-ring-accent flex cursor-pointer items-center gap-1.5 rounded-md border border-surf-line bg-surf-sidebar px-1.5 py-1.5 text-left coarse:min-h-11 aria-disabled:cursor-default"
                >
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-surf-ink-muted">
                    {shown && <CheckIcon aria-hidden className="size-3.5 text-surf-accent-ink" />}
                  </span>
                  <span className="min-w-0 text-[11px] leading-tight text-surf-ink">{vendor}</span>
                </button>
              );
            })}
          </div>
          {makerLocked && (
            <p id={makersHintId} className="text-[11px] text-surf-ink-muted">
              Keep at least one maker ticked
            </p>
          )}
        </section>

        <div aria-hidden className="border-t border-surf-line-faint" />

        <div data-app-settings-fit className="flex flex-col gap-6">
          {GROUPS.map((group, index) => (
            <section key={group.label} className="flex flex-col gap-4" aria-label={group.label}>
              <div>
                {index === 0 ? (
                  // WHICH BLANKS FIT: where Change Fit Rules lands, so it can take focus.
                  <h3 ref={fitHeadingRef} id={fitHeadingId} tabIndex={-1} className={`${GROUP_LABEL_CLASS} outline-none`}>
                    {group.label}
                  </h3>
                ) : (
                  <h3 className={GROUP_LABEL_CLASS}>{group.label}</h3>
                )}
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
                      {copy.hint && (
                        <p className="mt-0.5 text-xs text-surf-ink-muted">
                          {typeof copy.hint === "function" ? copy.hint(system) : copy.hint}
                        </p>
                      )}
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
            Restore Fit & Tip Defaults
          </button>
          <DialogClose render={<Button />}>Done</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
