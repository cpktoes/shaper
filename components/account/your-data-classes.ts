/**
 * The Your data page's own class strings (quick 261006-g4u), shared since quick 261103-k8o by its
 * three sections, so Import my designs draws exactly like Export my designs and Delete my account.
 * Daylight colours only (D-05): Clerk's panel is white in every app theme. Every button grows to a
 * 44-dot row under a touch pointer (`coarse:min-h-11`).
 */
export const YOUR_DATA_CLASSES = Object.freeze({
  section: "flex flex-col gap-2 border-t border-(--ramp-daylight-line) pt-4",
  title: "text-sm font-semibold text-(--ramp-daylight-ink)",
  body: "text-sm text-(--ramp-daylight-ink-muted)",
  buttonBase:
    "inline-flex min-h-9 items-center justify-center self-start rounded-md px-4 text-sm font-medium " +
    "transition-colors outline-none focus-visible:ring-2 focus-visible:ring-(--ramp-daylight-accent-ink) " +
    "focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 coarse:min-h-11",
  /** The filled accent button (Export my designs, Import). */
  accentButton: "bg-(--ramp-daylight-accent) text-(--ramp-daylight-on-accent) hover:brightness-95",
  /** The outlined plain button (Keep my account, Choose a file…, Cancel). */
  outlinedButton:
    "border border-(--ramp-daylight-ink) text-(--ramp-daylight-ink) hover:bg-(--ramp-daylight-well)",
});
