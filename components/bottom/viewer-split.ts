"use client";

import { useLayoutEffect, useMemo, useState, type RefObject } from "react";
import type { BottomBoard } from "@/lib/geometry/bottom";
import type { SectionHeight } from "@/lib/geometry/bottom-draw";
import { bottomViewerSplit } from "@/lib/geometry/bottom-side-view";

/** What the three drawing boxes share, in screen dots, as last measured. */
interface Room {
  width: number;
  height: number;
}

/**
 * How VIEWER's room is split between the board from below, the cross-section and the side view (quick 261112-ogx). It
 * measures what the three drawing boxes (`[data-bottom-box]`) share — the sum of their heights and the section box's
 * width — and hands it to `bottomViewerSplit`, which says how tall each box is.
 *
 * The sum is the right thing to measure because the section's box takes up whatever the other two leave (flex 1) and the
 * other two may shrink (flex 0 1 basis), so the three always fill the room together: applying the split leaves the sum where
 * it was, and the measure settles on the first pass. It is held only when either number moves by a dot or more, so the
 * split never chases sub-pixel rounding.
 *
 * Measured once in a layout effect (before the first paint) and then by a ResizeObserver watching the wrapper and every box.
 * The size question is the boxes' own, never the window's or the device's.
 */
export function useViewerSplit(
  wrapperRef: RefObject<HTMLElement | null>,
  input: { board: Pick<BottomBoard, "length" | "widePointWidth">; rise: number; factor: SectionHeight },
) {
  const [room, setRoom] = useState<Room | null>(null);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const measure = () => {
      const boxes = Array.from(wrapper.querySelectorAll<HTMLElement>("[data-bottom-box]"));
      const section = wrapper.querySelector<HTMLElement>('[data-bottom-box="section"]');
      if (boxes.length === 0 || !section) return;
      const height = boxes.reduce((sum, box) => sum + box.getBoundingClientRect().height, 0);
      const width = section.getBoundingClientRect().width;
      setRoom((now) => (now && Math.abs(now.width - width) < 1 && Math.abs(now.height - height) < 1 ? now : { width, height }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrapper);
    for (const box of wrapper.querySelectorAll("[data-bottom-box]")) observer.observe(box);
    return () => observer.disconnect();
    // The boxes are in the wrapper for as long as the wrapper is; the ref's element is the dependency.
  }, [wrapperRef]);

  const { board, rise, factor } = input;
  return useMemo(
    () => (room ? bottomViewerSplit({ width: room.width, height: room.height, board, rise, factor }) : null),
    [room, board, rise, factor],
  );
}
