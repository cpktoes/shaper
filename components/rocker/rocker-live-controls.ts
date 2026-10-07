/**
 * Which of ROCKER's sidebar controls stay live on each tab (quick 261006-v20, 2026-10-06).
 *
 * The founder's words, 2026-10-06: "we also need to limit some controls. For all screens, when on the
 * datasheet tab, only make live the 3 thickness values you can edit. WHen on the top view tab, only make
 * the placement slider and blank picker live."
 *
 * - VIEWER: everything, exactly as before.
 * - DATASHEET: Center Thickness (its typed box and slider) and the THICKNESS section's Nose Tip and Tail
 *   Tip rows. The DATASHEET table's own typed cells are not the sidebar and keep working.
 * - TOP VIEW (small screens only — the tab exists only there): the whole BLANK section and the Placement
 *   slider.
 * The same rule holds wherever the tabs exist: a computer, an upright phone, a phone held sideways.
 * A control that is not live stays where it is, dimmed and inert (`live.tsx`), so nothing moves when a
 * shaper switches tabs (D-02).
 *
 * This is view state derived from the tab actually on screen — the editor's derived `activeTab` — and
 * is never saved; no board value and no store action changes with it (D-04). It lives here, beside the
 * sidebar, rather than in `lib/geometry/`, because it is a rule about the screen, not about the board:
 * no measurement goes in or comes out (CLAUDE.md Rule 1 keeps `lib/geometry/` for the board's maths).
 * It imports nothing, so it can be unit-tested in isolation (`rocker-live-controls.test.ts`).
 *
 * The planner's reading, for the founder to overrule (D-12): with no blank picked, the DATASHEET table
 * types all five thicknesses, but the sidebar's two hand-set Nose @ 12" / Tail @ 12" rows share the
 * `fineTune` flag with the blank's 12" fine-tunes and are dimmed on DATASHEET, because the founder said
 * "only make live the 3 thickness values". Changing that is one value in the DATASHEET table below.
 */

/** The ROCKER panel's tabs; TOP VIEW exists only on a small screen (quick 261006-qfm, D-04). */
export type RockerTab = "viewer" | "datasheet" | "topView";

/** One flag per group of sidebar controls: true means live, false means dimmed and inert. */
export interface RockerLiveControls {
  /** The CENTER THICKNESS section: its heading, typed box and slider. */
  center: boolean;
  /** The whole BLANK section: heading, search, list, Show all, Change / Keep, Remove, Switch to This Blank. */
  blank: boolean;
  /** BOARD ON BLANK's Placement slider (every one of its three states). */
  placement: boolean;
  /** BOARD ON BLANK's Deck Skin slider; the readouts and planer passes are text and never dim. */
  deckSkin: boolean;
  /** The hand-set ROCKER section (shown only with no blank): its heading and four lifts. */
  rocker: boolean;
  /** THICKNESS's Nose Tip and Tail Tip rows. */
  tipThickness: boolean;
  /** THICKNESS's 12" stations in both states — the two fine-tunes and the Fine-tune off pair with a blank,
   * the two hand-set Nose @ 12" / Tail @ 12" rows without one — and ↺ Reset Fine-Tune (D-12). */
  fineTune: boolean;
  /** THICKNESS's Tip Style pair (blank only). */
  tipStyle: boolean;
  /** THICKNESS's two Thinning Starts rows (blank only). */
  thinning: boolean;
  /** Derived: the THICKNESS heading and intro line, live whenever any of the section's rows is (D-13). */
  thicknessHeading: boolean;
}

/** The live table for the tab in view. A fresh object on every call, so a caller can never change the
 * next caller's answer. */
export function liveControls(tab: RockerTab): RockerLiveControls {
  const groups =
    tab === "datasheet"
      ? {
          center: true,
          blank: false,
          placement: false,
          deckSkin: false,
          rocker: false,
          tipThickness: true,
          fineTune: false,
          tipStyle: false,
          thinning: false,
        }
      : tab === "topView"
        ? {
            center: false,
            blank: true,
            placement: true,
            deckSkin: false,
            rocker: false,
            tipThickness: false,
            fineTune: false,
            tipStyle: false,
            thinning: false,
          }
        : {
            center: true,
            blank: true,
            placement: true,
            deckSkin: true,
            rocker: true,
            tipThickness: true,
            fineTune: true,
            tipStyle: true,
            thinning: true,
          };
  return {
    ...groups,
    thicknessHeading: groups.tipThickness || groups.fineTune || groups.tipStyle || groups.thinning,
  };
}
