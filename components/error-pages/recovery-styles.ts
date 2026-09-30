import { buttonVariants } from "@/components/ui/button";

/**
 * Class strings shared by all three recovery screens — `app/not-found.tsx`, `app/error.tsx` and
 * `app/global-error.tsx` (quick 260930-fjm, Phase 13 item 12, Tasks 2 and 3) — so the three can
 * never drift apart from each other or from the Contact/Privacy pages' own layout.
 *
 * `max-shell:` classes pick LAYOUT by width alone; `coarse:` (via `buttonVariants`' own `h-11`)
 * picks a control's SIZE by pointer alone — CLAUDE.md's two switches are never mixed here.
 */

export const RECOVERY_MAIN = "min-h-0 flex-1 overflow-y-auto bg-surf-ground";

export const RECOVERY_COLUMN = "mx-auto max-w-xl px-8 pt-16 pb-16 max-shell:px-4 max-shell:pt-6 max-shell:pb-8";

/** The Contact/Privacy h1 classes, exactly. */
export const RECOVERY_HEADING =
  "text-3xl max-shell:text-xl leading-[1.2] font-display text-surf-ink uppercase tracking-architectural font-extrabold";

export const RECOVERY_LEAD = "mt-4 text-sm leading-relaxed text-surf-ink";

export const RECOVERY_HINT = "mt-3 text-sm leading-relaxed text-surf-ink";

export const RECOVERY_ACTIONS = "mt-8 flex flex-wrap gap-3 max-shell:mt-6";

export const RECOVERY_PRIMARY_ACTION = buttonVariants({ variant: "default" });

export const RECOVERY_SECONDARY_ACTION = buttonVariants({ variant: "outline" });

export const RECOVERY_REFERENCE = "mt-8 text-xs leading-relaxed text-surf-ink-muted";

export const RECOVERY_REFERENCE_CODE = "font-mono text-surf-ink select-all";
