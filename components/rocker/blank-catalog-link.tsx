"use client";

/**
 * The link to the maker's own page for a blank (quick 261114-vwo; the founder's ruling of 2026-11-14): drawn in
 * exactly two places — the BLANK button's card on ROCKER, beside Change Blank, and the DATASHEET's blank footnote,
 * where "page 12" becomes the link — and nowhere else. It opens in a new tab. Where the maker has no page for the
 * blank, nothing is drawn: a wrong page is worse than none.
 *
 * Which addresses may become a link is `lib/blanks/catalog-link.ts`'s rule, never this file's: the address comes
 * from the blank's own record (`catalogUrl`, seeded from the audit of 2026-11-14), and only when it starts with the
 * maker's known address. A board saved before that column existed carries a copy with no such field; for it alone
 * this looks the address up in the streamed catalogue — same maker, same name — inside its own Suspense, so the
 * card and the sheet draw at once and the link follows when the catalogue lands.
 *
 * Two looks. `card`: a small CATALOG PAGE action in the card's call-to-action ink, on the line under Change Blank
 * and flush with it (it is a sibling of the BLANK button laid over the card, never a child — a link inside a button
 * is not valid HTML and a tap on it would open the popup too; the two did not fit side by side on a computer's
 * sidebar card), a 44-dot touch box on a coarse pointer. `inline`: the words handed to it
 * ("page 12") inside a running sentence, dotted-underlined; on a coarse pointer a `::after` box widens the tap area
 * to 44 dots without moving a line. With nothing to link, `inline` prints its words plain and `card` prints nothing.
 */
import { ExternalLinkIcon } from "lucide-react";
import { Suspense, use, type ReactNode } from "react";
import { blankCatalogLink, catalogUrlFromCatalogue, type BlankCatalogLinkSource } from "@/lib/blanks/catalog-link";
import type { BlankCatalogResult } from "@/lib/db/blanks";
import { cn } from "@/lib/utils";

type Look = "card" | "inline";

interface BlankCatalogLinkProps {
  /** The blank — a board's copy (which may predate the address column) or a catalogue record. */
  record: BlankCatalogLinkSource;
  /** The streamed catalogue, read only for a copy saved before the address column existed. */
  catalog: Promise<BlankCatalogResult>;
  look: Look;
  /** `inline` only: the words that become the link, printed plain when there is nothing to link. */
  children?: ReactNode;
}

/**
 * The card look: the line under Change Blank, flush with it — 114 dots in, which is the picked card's 2-dot accent
 * bar, the BLANK button's 10-dot padding, its 92-dot thumbnail and the 10-dot gap after it (`BlankThumbnail`,
 * `blank-card.tsx`). The button keeps an invisible line of the same words for the link to stand on while it exists
 * (`group-has`, `blank-picker.tsx`).
 */
const CARD_CLASS =
  "focus-ring-accent absolute bottom-2 left-[114px] flex items-center gap-1 text-[11px] font-bold tracking-architectural text-surf-accent-ink uppercase hover:underline " +
  // A coarse pointer: a 44-dot box standing on the card's bottom edge, its words still 8 dots up like Change Blank's.
  "coarse:bottom-0 coarse:min-h-11 coarse:items-end coarse:pr-2.5 coarse:pb-2";

const INLINE_CLASS =
  "focus-ring-accent rounded-xs text-surf-ink underline decoration-dotted underline-offset-2 hover:text-surf-accent-ink " +
  // A coarse pointer: the tap area grows 14 dots above and below the words (a 16-dot line → 44) without moving a line.
  "coarse:relative coarse:after:absolute coarse:after:inset-x-0 coarse:after:-inset-y-3.5 coarse:after:content-['']";

function Anchor({ record, look, children }: { record: BlankCatalogLinkSource; look: Look; children?: ReactNode }) {
  const link = blankCatalogLink(record);
  if (!link) return look === "inline" ? <>{children}</> : null;
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={link.label}
      data-blank-catalog-link={look}
      className={cn(look === "card" ? CARD_CLASS : INLINE_CLASS)}
    >
      {look === "card" ? "Catalog Page" : children}
      <ExternalLinkIcon aria-hidden className={cn("shrink-0", look === "card" ? "size-3" : "ml-0.5 inline size-3 align-[-2px]")} />
    </a>
  );
}

/** The address looked up in the catalogue for a copy with no field of its own; suspends until the catalogue lands. */
function LookedUp({ record, catalog, look, children }: BlankCatalogLinkProps) {
  const result = use(catalog);
  const catalogUrl = result.status === "ok" ? catalogUrlFromCatalogue(record, result.blanks) : null;
  return (
    <Anchor record={{ ...record, catalogUrl }} look={look}>
      {children}
    </Anchor>
  );
}

export function BlankCatalogLink(props: BlankCatalogLinkProps) {
  const { record, look, children } = props;
  if (record.catalogUrl !== undefined) {
    return (
      <Anchor record={record} look={look}>
        {children}
      </Anchor>
    );
  }
  // An old copy: the words print plain (inline) or nothing shows (card) until the catalogue answers.
  return (
    <Suspense fallback={look === "inline" ? <>{children}</> : null}>
      <LookedUp {...props} />
    </Suspense>
  );
}
