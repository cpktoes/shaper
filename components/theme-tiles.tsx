"use client";

/**
 * App Default Settings' THEME row (quick 261003-uwi): one small picture per choice — System,
 * Daylight, Chalk, Slate, Phosphor — with its name under it and a tick on the current one. A tap
 * switches the theme at once and is remembered, exactly as the menu's old Theme rows did.
 *
 * Each picture is that theme's OWN colours, whatever theme is on screen: a top bar in its panel
 * colour holding a short ink bar (the wordmark) and a short accent bar (the current tab's
 * underline), then its canvas with a little board in its fill colour, outlined in its muted ink. So
 * a picture cannot read the live `--surf-*` colours (those are the CURRENT theme); it paints only
 * through `rampVar()` in lib/theme.ts, which names the theme's own `--ramp-<id>-*` tokens — the one
 * documented place a component touches the ramp layer (app/globals.css says so). Those values go in
 * inline `style`, never a Tailwind class built from a variable (Tailwind cannot see one), and never
 * a copied colour: lib/theme.test.ts fails if this file holds one.
 *
 * System's picture is Daylight and Slate split corner to corner — what it picks on a light device
 * and a dark one — and its spoken name says which it picks right now.
 *
 * The tick and the ring around the current picture are the pop-up's own chrome, so they use the
 * live theme's accent like every other control in it.
 */

import { CheckIcon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import {
  SYSTEM_TILE_HALVES,
  THEME_TILE_IDS,
  getTheme,
  rampVar,
  systemTileName,
  type ThemePreference,
} from "@/lib/theme";

/** One theme's picture, filling its tile's 4:3 frame. Every colour is that theme's own token. */
function Miniature({ themeId }: { themeId: string }) {
  return (
    <span
      data-swatch="ground"
      className="absolute inset-0 flex flex-col overflow-hidden rounded-[4px] border"
      style={{ backgroundColor: rampVar(themeId, "ground"), borderColor: rampVar(themeId, "line-faint") }}
    >
      {/* The top bar: wordmark in ink, the current tab's underline in accent. */}
      <span
        className="flex h-1/4 shrink-0 items-center gap-1 border-b px-1"
        style={{ backgroundColor: rampVar(themeId, "panel"), borderColor: rampVar(themeId, "line-faint") }}
      >
        <span className="h-[3px] w-2/5 rounded-full" style={{ backgroundColor: rampVar(themeId, "ink") }} />
        <span
          data-swatch="accent"
          className="h-[3px] w-1/5 rounded-full"
          style={{ backgroundColor: rampVar(themeId, "accent") }}
        />
      </span>
      {/* The canvas, with a little board on it. */}
      <span className="relative m-[3px] flex-1 rounded-[2px]" style={{ backgroundColor: rampVar(themeId, "canvas") }}>
        <span
          className="absolute inset-x-[14%] inset-y-[30%] rounded-full border"
          style={{ backgroundColor: rampVar(themeId, "fill"), borderColor: rampVar(themeId, "ink-muted") }}
        />
      </span>
    </span>
  );
}

/** System's picture: the light default under, the dark default on top clipped to the bottom-right
 * triangle, so the split runs corner to corner. */
function SystemMiniature() {
  return (
    <>
      <span data-swatch-half="light" className="absolute inset-0">
        <Miniature themeId={SYSTEM_TILE_HALVES.light} />
      </span>
      <span
        data-swatch-half="dark"
        className="absolute inset-0"
        style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
      >
        <Miniature themeId={SYSTEM_TILE_HALVES.dark} />
      </span>
    </>
  );
}

export function ThemeTiles() {
  const { preference, setPreference, systemTheme } = useTheme();

  return (
    // Five across from 276 dots of room up (every phone 360 wide and wider), wrapping only below.
    <div role="group" aria-label="Theme" className="grid grid-cols-[repeat(auto-fit,minmax(3.25rem,1fr))] gap-1">
      {THEME_TILE_IDS.map((id: ThemePreference) => {
        const pressed = preference === id;
        const isSystem = id === "system";
        const theme = isSystem ? undefined : getTheme(id);
        const label = isSystem ? "System" : (theme?.label ?? id);
        const spoken = isSystem ? systemTileName(systemTheme) : undefined;
        return (
          <button
            key={id}
            type="button"
            data-theme-tile={id}
            aria-pressed={pressed}
            aria-label={spoken}
            title={spoken ?? theme?.description}
            // Only a real change counts: tapping the theme already chosen stores nothing.
            onClick={() => {
              if (id !== preference) setPreference(id);
            }}
            className="focus-ring-accent flex cursor-pointer flex-col items-stretch gap-1 rounded-md p-0 text-center coarse:min-h-11"
          >
            <span
              aria-hidden
              className={`relative block aspect-[4/3] w-full rounded-[4px] ${
                pressed ? "ring-2 ring-surf-accent-ink" : ""
              }`}
            >
              {isSystem ? <SystemMiniature /> : <Miniature themeId={id} />}
              {pressed && (
                <span className="absolute top-0.5 right-0.5 flex size-3.5 items-center justify-center rounded-full bg-surf-accent text-surf-on-accent">
                  <CheckIcon className="size-2.5" strokeWidth={3} />
                </span>
              )}
            </span>
            <span className="block w-full text-[11px] leading-tight text-surf-ink">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
