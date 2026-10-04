"use client";

/**
 * The Back and Next pair that ends every design screen's controls — the founder's "almost wizard
 * like" (2026-10-03, sketch 008's pick B): once a shaper has finished with a screen's controls the
 * next step is right there under their thumb, so walking a board TEMPLATE, ROCKER, RAILS, VOLUME,
 * FINS, SUMMARY needs no menu. The top row (computer) and the tab bar and menu (phone) stay for
 * jumping around. TEMPLATE has only Next and SUMMARY only Back; each then fills its row.
 *
 * They are real links (client-side moves), never a page reload: a board that has not been saved
 * lives only in the app's memory, and a full reload would throw it away.
 *
 * Every instance carries Tailwind's `print:hidden` as well as `data-print-hide`, because only two
 * stylesheets (the order form's and the full-size template dialog's) turn that attribute into
 * `display: none` — the same reason `phone-undo-bar.tsx` carries both. Nothing here ever reaches paper.
 *
 * The navigation landmark's name, "Back and Next", is fixed on purpose. Existing browser tests find
 * the computer's top row as the one `<nav>` with no name at all and the phone's tab bar by a name
 * containing "Screens" — so this landmark needs a name, and that name must not contain that word.
 * The screen order is read from `NAV_LINKS`, imported and never copied.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { NAV_LINKS } from "@/components/site-nav";
import { buttonVariants } from "@/components/ui/button";
import { screenStepsAround, screenWord } from "@/lib/screen-steps";
import { cn } from "@/lib/utils";

export function StepNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const { previous, next } = screenStepsAround(NAV_LINKS, pathname);

  // The home, Contact, Privacy and error pages never get one.
  if (!previous && !next) return null;

  return (
    <nav aria-label="Back and Next" data-step-nav data-print-hide className={cn("mt-6 flex gap-2 print:hidden", className)}>
      {previous && (
        <Link
          href={previous.href}
          aria-label={`Previous screen: ${screenWord(previous.label)}`}
          data-step="previous"
          // A lone grow factor under 1 would take only that share of the free space, so a Back
          // with no Next beside it (SUMMARY) uses flex-1 to fill its row.
          className={cn(buttonVariants({ variant: "outline" }), next ? "flex-[0.8]" : "flex-1")}
        >
          <ArrowLeftIcon aria-hidden />
          {screenWord(previous.label)}
        </Link>
      )}
      {next && (
        <Link
          href={next.href}
          aria-label={`Next screen: ${screenWord(next.label)}`}
          data-step="next"
          // The app's own accent fill, the same string Print Order Form wears.
          className={cn(
            buttonVariants(),
            "flex-1 border-surf-on-accent bg-surf-accent text-surf-on-accent hover:bg-surf-accent/85",
          )}
        >
          {screenWord(next.label)}
          <ArrowRightIcon aria-hidden />
        </Link>
      )}
    </nav>
  );
}
