"use client";

/**
 * The Board Rack's status pill — and the rack's one live region (Phase 15, UI-SPEC §10).
 *
 * After a move the rack says what happened in a small rounded pill fixed to the bottom centre of
 * the screen, 24 dots above the edge (plus the phone's safe-area inset): ink fill, the ground colour
 * for its words, 12px 600, wrapping to two lines at most. It fades in over 120 ms, holds 4 s and
 * fades out over 200 ms — no fade when the shaper asked their device for less motion. A new message
 * replaces the old one and restarts the 4 s. It never takes focus and has no close button.
 *
 * The pill is itself the live region: one status-role element, always in the DOM and empty when
 * idle, so a screen reader hears every change. The messages meant only for a screen reader
 * (`Duplicated…`, `Deleted…`, a failed duplicate) are spoken through the same element with the pill
 * not drawn — the words are clipped out of sight, never `visibility: hidden`, which would silence
 * them. Each message is a fresh text node, so the same words twice in a row are spoken twice.
 *
 * One local component owned by `board-rack.tsx`; no package. The same polite live-region
 * convention as `components/design/save-button.tsx`.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/components/design/use-viewer-media";
import { STATUS_HOLD_MS, STATUS_IN_MS, STATUS_OUT_MS } from "@/lib/models/rack-gesture";
import { cn } from "@/lib/utils";

interface StatusState {
  message: string | null;
  visible: boolean;
  fading: boolean;
  serial: number;
}

export interface RackStatusState {
  /** The words in the live region right now (null when idle). */
  message: string | null;
  /** True while the pill is drawn (a spoken-only message is never drawn). */
  visible: boolean;
  /** True while the pill fades out at the end of its hold. */
  fading: boolean;
  /** Counts messages, so the same words twice restart the hold and are spoken again. */
  serial: number;
  /** Says `message`: drawn as the pill and spoken (the default), or spoken only (`visible: false`). */
  announce(message: string, options?: { visible?: boolean }): void;
}

export function useRackStatus(): RackStatusState {
  const [state, setState] = useState<StatusState>({ message: null, visible: false, fading: false, serial: 0 });
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    for (const timer of timers.current) window.clearTimeout(timer);
    timers.current = [];
  };

  useEffect(() => clearTimers, []);

  const announce = useCallback((message: string, options?: { visible?: boolean }) => {
    clearTimers();
    const visible = options?.visible ?? true;
    setState((prev) => ({ message, visible, fading: false, serial: prev.serial + 1 }));
    timers.current.push(
      window.setTimeout(() => setState((prev) => ({ ...prev, fading: prev.visible })), STATUS_HOLD_MS),
      window.setTimeout(
        () => setState((prev) => ({ ...prev, message: null, visible: false, fading: false })),
        STATUS_HOLD_MS + STATUS_OUT_MS,
      ),
    );
  }, []);

  return { ...state, announce };
}

interface RackStatusProps {
  message: string | null;
  visible: boolean;
  fading?: boolean;
  serial?: number;
}

export function RackStatus({ message, visible, fading = false, serial = 0 }: RackStatusProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const shown = visible && message !== null;

  // The fade in, on each new visible message, and the fade out at the end of the hold — the Web
  // Animations API, so nothing per frame is React state. None at all with reduced motion.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !shown || reduced || typeof element.animate !== "function") return;
    const animation = fading
      ? element.animate([{ opacity: 1 }, { opacity: 0 }], { duration: STATUS_OUT_MS, easing: "linear", fill: "forwards" })
      : element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: STATUS_IN_MS, easing: "linear" });
    return () => animation.cancel();
  }, [shown, fading, serial, reduced]);

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-rack-status
      className={cn(
        shown
          ? "pointer-events-none fixed bottom-[calc(24px+env(safe-area-inset-bottom))] left-1/2 z-50 line-clamp-2 w-max max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-full bg-surf-ink px-4 py-1 text-center text-xs leading-[1.4] font-semibold text-surf-on-ink"
          : "sr-only",
      )}
      style={shown && fading && reduced ? { opacity: 0 } : undefined}
    >
      {message !== null && <span key={serial}>{message}</span>}
    </div>
  );
}
