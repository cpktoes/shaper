import Link from "next/link";
import { TERMS_ROUTE } from "@/lib/legal/documents";
import { PRIVACY_ROUTE } from "@/lib/privacy/copy";
import { copyrightNotice } from "@/lib/site/footer";
import { cn } from "@/lib/utils";

/**
 * The site footer (quick 261006-fom, the founder's request of 2026-10-06): "© <this year> Shaper
 * Assistant. All rights reserved." with links to Terms and Privacy (D-02).
 *
 * Where it sits (D-03): always the LAST thing inside a page's own scroller, never pinned — at the
 * end of the home, Contact, Terms, Privacy, not-found and error pages, and at the very end of the
 * scrolling controls on the design screens (the sidebar on a computer, the controls under the
 * drawing on a phone), never in the drawing column. On an upright phone the controls' own end
 * room keeps its links clear of the floating Undo/Redo pair, like every other last row.
 *
 * Small muted type, a faint rule above it (the founder: "a faint line separating the last controls
 * from the copyright text"), one line where it fits and the two links wrapped under the notice on
 * a narrow column (P-6). On a touch screen each link gets a 44-dot finger box drawn by an invisible
 * `::after` block, so the line itself never grows. Never printed: `data-print-hide` for the order
 * form's own print rules, `print:hidden` everywhere else.
 *
 * No "use client": it holds no state, so it works inside the server pages and the client design
 * shells alike. The notice's span carries `suppressHydrationWarning`, because the server and the
 * browser can disagree about the year in the minutes around New Year across time zones; the span
 * then keeps the server's text instead of warning.
 */

const FOOTER_LINK =
  "relative text-surf-ink-muted underline-offset-4 hover:text-surf-ink hover:underline focus-ring-accent " +
  "coarse:after:absolute coarse:after:inset-x-0 coarse:after:top-1/2 coarse:after:h-11 coarse:after:-translate-y-1/2 coarse:after:content-['']";

/**
 * The footer's frame on a page whose words sit in a `max-w-xl` column (Contact, Terms, Privacy and
 * the not-found and error screens): the column's own width and side padding, so the footer's faint
 * rule lines up with the text above it, and the column's own bottom room under it. Those pages pass
 * `mt-0` to the footer, since the column's bottom padding already parts the two.
 */
export const PAGE_FOOTER_FRAME = "mx-auto max-w-xl px-8 pb-8 max-shell:px-4 max-shell:pb-6";

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer
      data-site-footer
      data-print-hide
      className={cn(
        "mt-6 flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 border-t border-surf-line-faint pt-3 text-[11px] leading-snug text-surf-ink-muted print:hidden",
        className,
      )}
    >
      <span suppressHydrationWarning>{copyrightNotice()}</span>
      <span className="flex gap-x-3">
        <Link href={TERMS_ROUTE} className={FOOTER_LINK}>
          Terms
        </Link>
        <Link href={PRIVACY_ROUTE} className={FOOTER_LINK}>
          Privacy
        </Link>
      </span>
    </footer>
  );
}
