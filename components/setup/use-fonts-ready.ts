"use client";

import { useEffect, useState } from "react";

/**
 * A count that goes up once the page's web fonts have finished loading (`document.fonts.ready`), for
 * the Board Rack's vertical words (code review IN-03). The words are fitted to their room with a
 * canvas measure in the rack's own font; measured before Inter has loaded, a long name is fitted
 * against the fallback font and can draw a little longer than its room. Adding this count to the
 * fit's dependencies measures them again with the real font. 0 until then (and on the server).
 */
export function useFontsReadyCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let live = true;
    const fonts = typeof document === "undefined" ? undefined : document.fonts;
    fonts?.ready.then(
      () => {
        if (live) setCount((n) => n + 1);
      },
      () => {},
    );
    return () => {
      live = false;
    };
  }, []);
  return count;
}
