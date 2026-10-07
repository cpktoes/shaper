"use client";

/**
 * Zooming a drawing viewer (quick 261007-fnz, 2026-10-07). The founder's brief: "Build and show me
 * the Rocker window first, then apply the same component to the others without re-implementing
 * anything per viewer." So this module is the one place the zoom lives — the level, the pan, every
 * way in and out, and the small control that shows the level — and each viewer only wires it.
 *
 * - `ViewerZoomProvider` owns the level and the pan, in component state only: never in the design
 *   store, never in the browser's storage, never in a saved board (D2). A caller starts again at 1x
 *   by changing the provider's React `key` (ROCKER keys it on the board's orientation, P9).
 * - `useViewerZoom` turns that state into the svg's `viewBox`, hands back the zoom unit (`1 /
 *   zoom`, what a raw line width is multiplied by to keep its screen size), and listens for every
 *   way in and out: the mouse wheel, a trackpad pinch (ctrl+wheel, or Safari's own gesture events),
 *   two fingers, one finger once zoomed in, a mouse drag once zoomed in, and a double-click or a
 *   double-tap back to 1x.
 * - `ScreenSizeGroup` holds a card, a reading or a title at its own screen size about its anchor.
 * - `ViewerZoomControl` shows the level, with zoom out, zoom in and reset, under the toolbar icons
 *   (P2); on a touch screen only the level and reset, and only once zoomed in (P3).
 *
 * Outside a provider every hook here returns zoom 1 and the viewer's own base `viewBox` string,
 * untouched, hands back no svg props and listens to nothing — which is how the Summary order
 * form's ROCKER box, drawn by the same viewer, prints exactly as before (D11).
 *
 * Fingers (D6 as revised by the orchestrator before dispatch, from the founder's own words "On
 * phones, pinch to zoom and drag to pan"; P4). On a viewer with nothing to drag (`touch: "pan"`) the
 * svg carries `touch-action: pan-x pan-y` at exactly 1x, so one finger stays the browser's — it may
 * scroll the page or a drawing column, exactly as today — while the browser never pinch-zooms the
 * page over the drawing; the moment the zoom is above 1x it carries `touch-action: none` and one
 * finger pans the drawing instead. The browser reads `touch-action` when a touch starts, and the
 * re-render the zoom change itself causes puts the new value on the svg before the next touch. A
 * gesture that began at 1x and zoomed mid-way still runs under `pan-x pan-y`, so above 1x the
 * one-finger `touchmove` also cancels itself — the backstop for that one gesture. Touches are read
 * from Touch Events, not pointer events, because the browser cancels a touch's pointer events the
 * moment it starts a one-finger scroll at 1x. A viewer with its own one-finger dragging
 * (`touch: "viewer"`, plan 02's TEMPLATE) keeps `touch-action: none` at every zoom and only ever
 * hands two fingers to the zoom.
 *
 * The maths (where the view sits, how the wheel steps, a pinch, a pan) is all in `zoom-math.ts`,
 * tested on its own (D10); this file only connects it to the screen.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";
import { ScanIcon, ZoomInIcon, ZoomOutIcon } from "lucide-react";
import { useSvgClientSize, useViewerZoomUnit, ViewerZoomUnitProvider } from "@/components/viewer/callout-primitives";
import { ViewerToolbarButton } from "@/components/viewer/toolbar-button";
import { cn } from "@/lib/utils";
import {
  DEFAULT_MAX_ZOOM,
  DOUBLE_TAP_MS,
  DOUBLE_TAP_SLOP_PX,
  formatViewBox,
  formatZoomLevel,
  normaliseWheelDelta,
  panBy,
  parseViewBox,
  PINCH_WHEEL_RATE,
  pinchState,
  scaleDash,
  snapZoom,
  stepZoom,
  wheelStep,
  zoomAt,
  zoomedView,
  zoomUnitTransform,
  type ClientSize,
  type ViewRect,
  type WheelAccumulator,
  type ZoomState,
} from "./zoom-math";

export { useViewerZoomUnit } from "@/components/viewer/callout-primitives";

const AT_ONE: ZoomState = { zoom: 1, center: null };
/** A trackpad pinch's running level is re-read from the shown level after this much quiet. */
const PINCH_WHEEL_RESYNC_MS = 300;
/** A tap is shorter than this… */
const TAP_MAX_MS = 250;
/** …and travels less than this many pixels. A one-finger pan travels further, so it is never a tap. */
const TAP_MAX_TRAVEL_PX = 10;

/** The drawing's base frame and its laid-out box. */
interface ZoomGeometry {
  base: ViewRect;
  client: ClientSize;
}

/**
 * The provider's one long-lived object, for the input listeners that run between renders (a burst
 * of wheel events, a pinch): it always holds the latest state, so the next event in the same frame
 * builds on this one, and it holds the drawing's geometry so the control's buttons zoom with
 * exactly the clamp the drawing uses.
 */
interface ZoomController {
  get(): ZoomState;
  apply(next: ZoomState): void;
  geometry(): ZoomGeometry | null;
  setGeometry(g: ZoomGeometry | null): void;
  maxZoom(): number;
  setMaxZoom(z: number): void;
}

function createController(setState: Dispatch<SetStateAction<ZoomState>>): ZoomController {
  let current = AT_ONE;
  let geometry: ZoomGeometry | null = null;
  let max = DEFAULT_MAX_ZOOM;
  return {
    get: () => current,
    apply(next) {
      const same =
        current.zoom === next.zoom && current.center?.x === next.center?.x && current.center?.y === next.center?.y;
      current = next; // the newest anchor is kept even when nothing on screen changes
      if (!same) setState(next);
    },
    geometry: () => geometry,
    setGeometry(g) {
      geometry = g;
    },
    maxZoom: () => max,
    setMaxZoom(z) {
      max = z;
    },
  };
}

interface ZoomContextValue {
  state: ZoomState;
  maxZoom: number;
  controller: ZoomController;
}

const ZoomContext = createContext<ZoomContextValue | null>(null);

/** Holds one viewer's zoom (D2). Change its `key` to go back to 1x. */
export function ViewerZoomProvider({ maxZoom = DEFAULT_MAX_ZOOM, children }: { maxZoom?: number; children: ReactNode }) {
  const [state, setState] = useState<ZoomState>(AT_ONE);
  const [controller] = useState(() => createController(setState));
  useLayoutEffect(() => {
    controller.setMaxZoom(maxZoom);
  }, [controller, maxZoom]);
  const value = useMemo(() => ({ state, maxZoom, controller }), [state, maxZoom, controller]);
  return (
    <ZoomContext.Provider value={value}>
      <ViewerZoomUnitProvider value={1 / state.zoom}>{children}</ViewerZoomUnitProvider>
    </ZoomContext.Provider>
  );
}

/** A pointer's place in the svg's own laid-out box, in CSS pixels. */
function pointInBox(svg: SVGSVGElement, client: ClientSize, clientX: number, clientY: number) {
  const rect = svg.getBoundingClientRect();
  const sx = rect.width > 0 ? client.width / rect.width : 1;
  const sy = rect.height > 0 ? client.height / rect.height : 1;
  return { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
}

/** Safari's own pinch events (a Mac trackpad, and an iPhone's page pinch). Not in the DOM types. */
interface SafariGestureEvent extends UIEvent {
  scale: number;
  clientX: number;
  clientY: number;
}

export interface ViewerZoomOptions {
  /**
   * `"pan"` (the default): a drawing with nothing to drag — at exactly 1x one finger is left to the
   * browser, and above 1x one finger pans. `"viewer"`: the viewer's own handlers own one finger at
   * every zoom and only two fingers reach the zoom (plan 02's TEMPLATE).
   */
  touch?: "pan" | "viewer";
  /** Whether a mouse or pen press may start a pan (above 1x). Defaults to always. */
  canPanFrom?: (event: ReactPointerEvent<SVGSVGElement>) => boolean;
  /** Called when two fingers land, so a viewer can end a drag of its own. */
  onPinchStart?: () => void;
}

export interface ViewerZoomSvgProps {
  style?: CSSProperties;
  onPointerDown?: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerMove?: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerUp?: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerCancel?: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onDoubleClick?: () => void;
}

export interface ViewerZoom {
  zoom: number;
  /** `1 / zoom`: what a raw drawing size is multiplied by to keep its screen size. */
  zoomUnit: number;
  /** The svg's `viewBox`: the base string itself at 1x, never re-formatted. */
  viewBox: string;
  /** The part of the frame on screen, in the drawing's own units. */
  view: ViewRect | null;
  /** Spread onto the svg (merge `style` with the svg's own). Empty outside a provider. */
  svgProps: ViewerZoomSvgProps;
  /** True while two fingers pinch, or two or more touch points are down on the svg. */
  isPinching: () => boolean;
}

const NO_SVG_PROPS: ViewerZoomSvgProps = {};

/**
 * Wires one svg to the nearest `ViewerZoomProvider`. `baseViewBox` is the viewer's own frame; the
 * returned `viewBox` is that string untouched at 1x and the zoomed rectangle above it.
 */
export function useViewerZoom(
  svgRef: RefObject<SVGSVGElement | null>,
  baseViewBox: string,
  options: ViewerZoomOptions = {},
): ViewerZoom {
  const ctx = useContext(ZoomContext);
  const client = useSvgClientSize(svgRef);
  const base = useMemo(() => parseViewBox(baseViewBox), [baseViewBox]);
  const state = ctx?.state ?? AT_ONE;
  const zoom = state.zoom;
  const view = base ? zoomedView(base, client, state) : null;
  const viewBox = view && base && view !== base ? formatViewBox(view) : baseViewBox;
  const touchMode = options.touch ?? "pan";

  const controller = ctx?.controller ?? null;
  useLayoutEffect(() => {
    controller?.setGeometry(base ? { base, client } : null);
  }, [controller, base, client]);

  // The caller's callbacks, read by the listeners at the moment they fire.
  const optionsRef = useRef(options);
  useLayoutEffect(() => {
    optionsRef.current = options;
  });

  // Touch points down on the svg and whether a pinch is running, shared with `isPinching`.
  const gestureRef = useRef({ pinching: false, touchPointers: new Set<number>() });
  const isPinching = useCallback(
    () => gestureRef.current.pinching || gestureRef.current.touchPointers.size >= 2,
    [],
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!controller || !svg) return;
    const gesture = gestureRef.current;

    // The wheel: a native listener, not React's `onWheel`, because React 19 attaches wheel
    // listeners as passive and its handler cannot stop the page scrolling or zooming under the
    // drawing (M4, D7). A plain wheel steps half a level per notch toward the pointer (P6); a
    // trackpad pinch arrives as ctrl+wheel and zooms in proportion, snapped to the half steps.
    let wheelAcc: WheelAccumulator = { sum: 0, lastMs: Number.NEGATIVE_INFINITY };
    let pinchWheel = { zoom: 1, lastMs: Number.NEGATIVE_INFINITY };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const g = controller.geometry();
      if (!g) return;
      const p = pointInBox(svg, g.client, event.clientX, event.clientY);
      const delta = normaliseWheelDelta(event.deltaY, event.deltaMode, window.innerHeight);
      const current = controller.get();
      const max = controller.maxZoom();
      let next: number;
      if (event.ctrlKey) {
        if (event.timeStamp - pinchWheel.lastMs > PINCH_WHEEL_RESYNC_MS) pinchWheel = { zoom: current.zoom, lastMs: 0 };
        const running = Math.min(Math.max(pinchWheel.zoom * Math.exp(-delta * PINCH_WHEEL_RATE), 1), max);
        pinchWheel = { zoom: running, lastMs: event.timeStamp };
        next = snapZoom(running, max);
      } else {
        const step = wheelStep(wheelAcc, delta, event.timeStamp);
        wheelAcc = step.acc;
        if (step.steps === 0) return;
        next = stepZoom(current.zoom, step.steps, max);
      }
      if (next === current.zoom) return;
      controller.apply(zoomAt(g.base, g.client, current, next, p.x, p.y));
    };

    // Fingers (P4): two fingers always pinch and pan by their midpoint; one finger pans only above
    // 1x on a `"pan"` viewer; a double-tap goes back to 1x.
    let pinch: { start: ZoomState; mid: { x: number; y: number }; dist: number } | null = null;
    let lastPan: { id: number; x: number; y: number } | null = null;
    let tap: { t: number; x: number; y: number } | null = null;
    let lastTap: { t: number; x: number; y: number } | null = null;

    const touchPoint = (g: ZoomGeometry, t: Touch) => pointInBox(svg, g.client, t.clientX, t.clientY);
    const startPinch = (g: ZoomGeometry, touches: TouchList) => {
      const a = touchPoint(g, touches[0]);
      const b = touchPoint(g, touches[1]);
      pinch = { start: controller.get(), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, dist: Math.hypot(b.x - a.x, b.y - a.y) };
      gesture.pinching = true;
    };
    const endPinch = () => {
      pinch = null;
      gesture.pinching = false;
    };
    const resetToOne = () => {
      if (controller.get().zoom > 1) controller.apply(AT_ONE);
    };

    const onTouchStart = (event: TouchEvent) => {
      const g = controller.geometry();
      if (!g) return;
      if (event.touches.length >= 2) {
        event.preventDefault();
        const wasPinching = pinch !== null;
        startPinch(g, event.touches);
        lastPan = null;
        tap = null;
        if (!wasPinching) optionsRef.current.onPinchStart?.();
        return;
      }
      const t = event.touches[0];
      if (!t) return;
      const p = touchPoint(g, t);
      tap = { t: event.timeStamp, x: p.x, y: p.y };
      lastPan = touchMode === "pan" && controller.get().zoom > 1 ? { id: t.identifier, x: p.x, y: p.y } : null;
    };

    const onTouchMove = (event: TouchEvent) => {
      const g = controller.geometry();
      if (!g) return;
      if (pinch && event.touches.length >= 2) {
        event.preventDefault();
        const a = touchPoint(g, event.touches[0]);
        const b = touchPoint(g, event.touches[1]);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        controller.apply(pinchState(g.base, g.client, pinch.start, pinch.mid, pinch.dist, mid, dist, controller.maxZoom()));
        return;
      }
      const t = event.touches[0];
      if (!t || event.touches.length !== 1) return;
      const p = touchPoint(g, t);
      if (tap && Math.hypot(p.x - tap.x, p.y - tap.y) > TAP_MAX_TRAVEL_PX) tap = null;
      if (touchMode !== "pan" || controller.get().zoom <= 1) return;
      // Above 1x one finger pans the drawing. `preventDefault` is the backstop for a gesture that
      // began at 1x under `pan-x pan-y` (P4); the next touch starts under `none`.
      if (event.cancelable) event.preventDefault();
      if (lastPan && lastPan.id === t.identifier) {
        controller.apply(panBy(g.base, g.client, controller.get(), p.x - lastPan.x, p.y - lastPan.y));
      }
      lastPan = { id: t.identifier, x: p.x, y: p.y };
    };

    const onTouchEnd = (event: TouchEvent) => {
      const g = controller.geometry();
      if (!g) return;
      if (event.touches.length >= 2) {
        // A third finger lifted: carry on pinching from the two still down.
        startPinch(g, event.touches);
        return;
      }
      if (event.touches.length === 1) {
        // A pinch dropped to one finger: re-anchor on the finger still down, so the drawing
        // does not jump when it starts to pan.
        endPinch();
        tap = null;
        const t = event.touches[0];
        const p = touchPoint(g, t);
        lastPan = touchMode === "pan" && controller.get().zoom > 1 ? { id: t.identifier, x: p.x, y: p.y } : null;
        return;
      }
      endPinch();
      lastPan = null;
      if (event.type === "touchend" && tap && event.timeStamp - tap.t < TAP_MAX_MS) {
        if (lastTap && tap.t - lastTap.t <= DOUBLE_TAP_MS && Math.hypot(tap.x - lastTap.x, tap.y - lastTap.y) <= DOUBLE_TAP_SLOP_PX) {
          lastTap = null;
          resetToOne();
        } else {
          lastTap = { t: event.timeStamp, x: tap.x, y: tap.y };
        }
      }
      tap = null;
    };

    // Touch points by their pointer events, so `isPinching()` is already true when a second
    // finger's own `pointerdown` reaches a viewer's React handler: a native listener on the svg
    // runs before React's delegated one.
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch") gesture.touchPointers.add(event.pointerId);
    };
    const onPointerGone = (event: PointerEvent) => {
      gesture.touchPointers.delete(event.pointerId);
    };

    // Safari's own pinch events: always cancelled, so iOS never pinches the page over the drawing;
    // and on a Mac trackpad, where a pinch arrives as these rather than ctrl+wheel, they zoom.
    let safariGesture: { start: ZoomState } | null = null;
    const onGestureStart = (event: Event) => {
      event.preventDefault();
      safariGesture = pinch ? null : { start: controller.get() };
    };
    const onGestureChange = (event: Event) => {
      event.preventDefault();
      const g = controller.geometry();
      if (pinch || !safariGesture || !g) return;
      const e = event as SafariGestureEvent;
      const next = snapZoom(safariGesture.start.zoom * e.scale, controller.maxZoom());
      const current = controller.get();
      if (next === current.zoom) return;
      const p = pointInBox(svg, g.client, e.clientX, e.clientY);
      controller.apply(zoomAt(g.base, g.client, current, next, p.x, p.y));
    };
    const onGestureEnd = (event: Event) => {
      event.preventDefault();
      safariGesture = null;
    };

    const active = { passive: false } as const;
    svg.addEventListener("wheel", onWheel, active);
    svg.addEventListener("touchstart", onTouchStart, active);
    svg.addEventListener("touchmove", onTouchMove, active);
    svg.addEventListener("touchend", onTouchEnd);
    svg.addEventListener("touchcancel", onTouchEnd);
    svg.addEventListener("pointerdown", onPointerDown);
    svg.addEventListener("pointerup", onPointerGone);
    svg.addEventListener("pointercancel", onPointerGone);
    svg.addEventListener("gesturestart", onGestureStart, active);
    svg.addEventListener("gesturechange", onGestureChange, active);
    svg.addEventListener("gestureend", onGestureEnd, active);
    return () => {
      svg.removeEventListener("wheel", onWheel);
      svg.removeEventListener("touchstart", onTouchStart);
      svg.removeEventListener("touchmove", onTouchMove);
      svg.removeEventListener("touchend", onTouchEnd);
      svg.removeEventListener("touchcancel", onTouchEnd);
      svg.removeEventListener("pointerdown", onPointerDown);
      svg.removeEventListener("pointerup", onPointerGone);
      svg.removeEventListener("pointercancel", onPointerGone);
      svg.removeEventListener("gesturestart", onGestureStart);
      svg.removeEventListener("gesturechange", onGestureChange);
      svg.removeEventListener("gestureend", onGestureEnd);
      gesture.pinching = false;
      gesture.touchPointers.clear();
    };
  }, [controller, svgRef, touchMode]);

  // A mouse or pen drag pans once zoomed in (D3, D6); at 1x it does nothing at all. Touches never
  // come through here — they pan through the touch listeners above.
  const [panning, setPanning] = useState(false);
  const mousePanRef = useRef<{ id: number; x: number; y: number } | null>(null);

  let svgProps = NO_SVG_PROPS;
  if (controller) {
    svgProps = {
      style: {
        touchAction: touchMode === "viewer" || zoom > 1 ? "none" : "pan-x pan-y",
        cursor: zoom > 1 ? (panning ? "grabbing" : "grab") : undefined,
      },
      onPointerDown(event) {
        if (event.pointerType === "touch" || event.button !== 0 || controller.get().zoom <= 1) return;
        if (optionsRef.current.canPanFrom && !optionsRef.current.canPanFrom(event)) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        mousePanRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        setPanning(true);
      },
      onPointerMove(event) {
        const last = mousePanRef.current;
        const g = controller.geometry();
        if (!last || last.id !== event.pointerId || !g) return;
        const a = pointInBox(event.currentTarget, g.client, last.x, last.y);
        const b = pointInBox(event.currentTarget, g.client, event.clientX, event.clientY);
        controller.apply(panBy(g.base, g.client, controller.get(), b.x - a.x, b.y - a.y));
        mousePanRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      },
      onPointerUp(event) {
        if (mousePanRef.current?.id !== event.pointerId) return;
        mousePanRef.current = null;
        setPanning(false);
      },
      onPointerCancel(event) {
        if (mousePanRef.current?.id !== event.pointerId) return;
        mousePanRef.current = null;
        setPanning(false);
      },
      onDoubleClick() {
        if (controller.get().zoom > 1) controller.apply(AT_ONE);
      },
    };
  }

  return { zoom, zoomUnit: 1 / zoom, viewBox, view, svgProps, isPinching };
}

/**
 * Holds a symbol — a card, a reading, a title — at its own screen size about its anchor (x, y)
 * while the drawing around it zooms (D4, P1): scaled by the zoom unit about that point. Inside,
 * the primitives see a zoom unit of 1 again, so a card's frame is not shrunk twice. At 1x it
 * renders its children directly, with no wrapper element, so the 1x markup is unchanged.
 */
export function ScreenSizeGroup({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  const zoomUnit = useViewerZoomUnit();
  const transform = zoomUnitTransform(x, y, zoomUnit);
  if (!transform) return <>{children}</>;
  return (
    <g transform={transform}>
      <ViewerZoomUnitProvider value={1}>{children}</ViewerZoomUnitProvider>
    </g>
  );
}

/**
 * A dash pattern that lives in a CSS token — `--outline-stringer-dash`, `--outline-station-dash`,
 * `--outline-widepoint-dash` in `app/globals.css` — at the zoom unit, so its dashes keep their
 * screen length while the drawing grows (D4). Added in plan 02 (2026-10-07) for TEMPLATE and
 * FINS, which draw their reference lines with these tokens: `scaleDash` needs the numbers, and a
 * `var()` cannot be multiplied in place. At exactly 1 it is the `var()` itself, character for
 * character, so every 1x drawing and every printed page carry the attribute they always did.
 * Above 1 (which only ever happens in a browser, after the shaper zooms) the token's numbers are
 * read off the page's own stylesheet, so the token stays the one place the pattern is written.
 */
export function zoomDashToken(token: `--${string}`, zoomUnit: number): string {
  const literal = `var(${token})`;
  if (zoomUnit === 1 || typeof document === "undefined") return literal;
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return value ? (scaleDash(value, zoomUnit) ?? literal) : literal;
}

/**
 * P-3: on a touch screen only, an invisible 44 × 44 touch box centred on a 34-px button — the
 * idea `tabbed-panel.tsx` gives its tabs.
 */
const COARSE_TOUCH_BOX =
  "coarse:relative coarse:after:absolute coarse:after:-inset-[5px] coarse:after:content-['']";

/**
 * The zoom control (D8): zoom out, the level ("2.5x"), zoom in and reset, in its own small row
 * under the toolbar's icons (P2) — measured inside the icon row it ran under ROCKER's
 * blank-from-above picture. `corner` is for a viewer with no icon row (plan 02's FINS).
 *
 * The row is reversed like the toolbar's own, so the DOM order (reset, zoom in, level, zoom out)
 * reads − level + reset from left to right, pinned by its right edge. On a computer all four
 * always show — zoom out and reset dimmed at 1x, zoom in at the maximum — so the row never changes
 * width. On a touch screen (P3) a pinch does the zooming, so zoom out and zoom in are not drawn,
 * and the whole row is hidden at 1x — every phone's 1x screen stays exactly as it was; like the
 * Rotate button, this is the pointer deciding whether a control is drawn, decided in CSS by the
 * `coarse` variant, never by width.
 */
export function ViewerZoomControl({ placement = "under-toolbar" }: { placement?: "under-toolbar" | "corner" }) {
  const ctx = useContext(ZoomContext);
  if (!ctx) return null;
  const { controller, maxZoom } = ctx;
  const { zoom } = ctx.state;
  const atOne = zoom <= 1;
  const atMax = zoom >= snapZoom(maxZoom, maxZoom);

  function stepBy(steps: number) {
    const g = controller.geometry();
    if (!g) return;
    const current = controller.get();
    const next = stepZoom(current.zoom, steps, controller.maxZoom());
    if (next === current.zoom) return;
    controller.apply(zoomAt(g.base, g.client, current, next, g.client.width / 2, g.client.height / 2));
  }

  return (
    <div
      data-viewer-zoom
      data-at-one={atOne ? "" : undefined}
      role="group"
      aria-label="Zoom"
      className={cn(
        "absolute right-0 z-10 flex flex-row-reverse items-center gap-1.5 coarse:data-at-one:hidden",
        placement === "corner" ? "top-0" : "top-10",
      )}
    >
      <ViewerToolbarButton
        label="Back to 1x — the whole drawing"
        onClick={() => controller.apply(AT_ONE)}
        disabled={atOne}
        className={cn("disabled:cursor-default disabled:opacity-40 disabled:hover:bg-surf-ground disabled:hover:text-surf-ink-muted", COARSE_TOUCH_BOX)}
      >
        <ScanIcon className="size-6" />
      </ViewerToolbarButton>
      <ViewerToolbarButton
        label="Zoom in"
        onClick={() => stepBy(1)}
        disabled={atMax}
        className="coarse:hidden disabled:cursor-default disabled:opacity-40 disabled:hover:bg-surf-ground disabled:hover:text-surf-ink-muted"
      >
        <ZoomInIcon className="size-6" />
      </ViewerToolbarButton>
      <div
        data-zoom-level={String(zoom)}
        className="flex h-[34px] min-w-12 flex-none items-center justify-center rounded-md border border-surf-line bg-surf-ground px-2 text-sm font-semibold tabular-nums text-surf-ink-muted"
      >
        {formatZoomLevel(zoom)}
      </div>
      <ViewerToolbarButton
        label="Zoom out"
        onClick={() => stepBy(-1)}
        disabled={atOne}
        className="coarse:hidden disabled:cursor-default disabled:opacity-40 disabled:hover:bg-surf-ground disabled:hover:text-surf-ink-muted"
      >
        <ZoomOutIcon className="size-6" />
      </ViewerToolbarButton>
    </div>
  );
}
