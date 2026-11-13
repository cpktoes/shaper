"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { TAP_MAX_TRAVEL_PX } from "@/components/viewer/drag-selection";
import type { Mm } from "@/lib/geometry/units";
import { useSetSectionStation } from "./section-station";

/** The gesture under way: where it was pressed (in client dots) and whether it has travelled far enough to be a drag. */
interface Gesture {
  pointerId: number;
  x: number;
  y: number;
  dragging: boolean;
}

/**
 * The press, drag and tap that move the section (D-12, 17-10), shared by the board from below and the side view: press
 * anywhere on the drawing and the section jumps there; drag and it follows the pointer. A press that moves less than
 * `TAP_MAX_TRAVEL_PX` is a tap, so a finger's wobble leaves the section where it landed. `toStation` turns the pointer's
 * place into a station from the tail (null when the drawing is not measured yet); the section moves through
 * `useSetSectionStation`. Each drawing assigns the four handlers to its press box.
 */
export function useStationPress(toStation: (event: ReactPointerEvent<HTMLDivElement>) => Mm | null) {
  const setStation = useSetSectionStation();
  const gestureRef = useRef<Gesture | null>(null);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const at = toStation(event);
    if (at === null) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, dragging: false };
    setStation({ at });
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    if (!gesture.dragging && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) <= TAP_MAX_TRAVEL_PX) return;
    gesture.dragging = true;
    const at = toStation(event);
    if (at !== null) setStation({ at });
  }

  function onPointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return { onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd };
}
