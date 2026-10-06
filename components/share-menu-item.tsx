"use client";

import { Menu } from "@base-ui/react/menu";
import { ShareIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SHARE_COPY, shareSite } from "@/lib/site/share";

/**
 * The Share row both menus carry (quick 261006-fom, D-06 with P-4): the gear menu on a computer
 * and the ☰ sheet on a phone, right after Privacy, so the two menus read Contact, Privacy, Share,
 * then App Default Settings and can never drift apart. It is a row rather than a fourth icon in the
 * computer's top row because that row has 38 dots to spare at an iPad's 1024 width and a fourth
 * icon needs 40, so SHAPER ASSISTANT would wrap (P-4, measured in components/site-nav.tsx).
 *
 * A tap hands the site's address to the device's own share sheet where there is one (Messages,
 * Mail, AirDrop); otherwise it copies the address and the row reads "Copied" for two seconds, or
 * shows the address for four if even copying fails (`lib/site/share.ts`). `closeOnClick={false}`
 * keeps the menu open so that confirmation can be read in the row itself. The row's accessible
 * name stays "Share" throughout, and a visually hidden live region carries the same confirmation
 * to a screen reader.
 *
 * The row classes are copied verbatim from `PageMenuItem` in `components/settings-menu.tsx`: 44
 * dots tall under a touch pointer, today's height for a mouse.
 */

const CONFIRMATION_MS = { copied: 2000, failed: 4000 } as const;

export function ShareMenuItem() {
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  function confirm(text: string, ms: number) {
    if (timer.current !== null) clearTimeout(timer.current);
    setConfirmation(text);
    timer.current = setTimeout(() => {
      timer.current = null;
      setConfirmation(null);
    }, ms);
  }

  function handleClick() {
    // Called straight from the tap, so a phone's share sheet is allowed to open.
    void shareSite(navigator).then((result) => {
      if (result === "copied") confirm(SHARE_COPY.copied, CONFIRMATION_MS.copied);
      else if (result === "failed") confirm(SHARE_COPY.failed, CONFIRMATION_MS.failed);
    });
  }

  return (
    <Menu.Item
      closeOnClick={false}
      onClick={handleClick}
      aria-label={SHARE_COPY.label}
      data-share-row
      className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm text-surf-ink outline-none select-none coarse:min-h-11 data-highlighted:bg-surf-well"
    >
      <ShareIcon aria-hidden className="size-4 text-surf-ink-muted" />
      <span aria-hidden data-share-label>
        {confirmation ?? SHARE_COPY.label}
      </span>
      <span role="status" aria-live="polite" className="sr-only">
        {confirmation ?? ""}
      </span>
    </Menu.Item>
  );
}
