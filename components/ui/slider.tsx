import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { useLayoutEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

/**
 * Remount the dot the moment its slider first gets a size on screen.
 *
 * With `thumbAlignment="edge"` Base UI (1.7.0, unchanged in 1.8.0) places the dot from a
 * measurement of the control's box, taken in a layout effect right after mount and again whenever
 * a ResizeObserver it attaches to the control fires. Two things go wrong for a slider that is
 * `display: none` when the page loads — every row folded behind the phone's Fine adjust header,
 * and any slider inside a tab panel that is not the open one:
 *
 * 1. the mount-time measurement reads a zero-width box, so the dot gets no position and Base UI
 *    keeps it `visibility: hidden`;
 * 2. the ResizeObserver that should fix that once the row is shown is attached inside a layout
 *    effect of the DOT, which runs before the CONTROL's ref exists (children's layout effects run
 *    before their parent's ref is attached), so the effect bails out and no observer is ever made.
 *
 * On the dev server React's StrictMode runs every effect twice, and the second run sees the ref —
 * which is why this never showed up in development or in the browser suite, and only on the
 * production build: measured on the live site, every folded slider on TEMPLATE sat at
 * `--position: NaN%` and stayed hidden until its value changed, since a value change is the one
 * other thing that re-measures. A shaper saw sliders with no dot, "greyed out until touched".
 *
 * This hook owns the observer Base UI failed to attach. It watches the control's width from the
 * PARENT's layout effect (which runs after the control's ref is set), and when the width goes from
 * zero to something — the fold opening, the tab switching in — it bumps an epoch that is keyed
 * onto the dot, so the dot remounts. A freshly mounted dot measures a real box, gets its position,
 * and attaches its own observer normally, because by then the control's ref has long existed.
 * Nothing remounts for a slider that is visible from the start, and nothing remounts on ordinary
 * resizes, so a drag in progress is never interrupted.
 */
function useRemountThumbWhenShown(): [React.RefObject<HTMLDivElement | null>, number] {
  const controlRef = useRef<HTMLDivElement>(null)
  const [epoch, setEpoch] = useState(0)
  useLayoutEffect(() => {
    const control = controlRef.current
    if (!control || typeof ResizeObserver !== "function") return undefined
    let wasHidden = control.getBoundingClientRect().width === 0
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? control.getBoundingClientRect().width
      const hidden = width === 0
      if (wasHidden && !hidden) setEpoch((n) => n + 1)
      wasHidden = hidden
    })
    observer.observe(control)
    return () => observer.disconnect()
  }, [])
  return [controlRef, epoch]
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderPrimitive.Root.Props) {
  const [controlRef, thumbEpoch] = useRemountThumbWhenShown()
  // Every slider in this app gets exactly one dot. It used to get two, one hidden exactly
  // underneath the other — this fallback used to build a two-entry [min, max] array whenever
  // `value`/`defaultValue` was a plain number rather than a two-ended range, and this app never
  // hands it anything else (`grep -rn 'value={\[' components/` finds no range slider at all).
  // Base UI only ever tracks the one real value, so the moment a finger (or a mouse) pressed
  // anywhere but a dot, it looked up the wrong one of the two and quietly gave up — a finger
  // landing anywhere on a 151px bar except the 12px dot did nothing. Measured live on the running
  // app before this change: 22 thumbs for 11 sliders on TEMPLATE, 24 for 12 on RAILS. After: 11
  // and 12. Two side benefits for free, because each duplicate dot also carried its own hidden
  // range input: the keyboard now stops once per slider instead of twice, and a screen reader
  // announces each slider once instead of twice.
  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [value ?? defaultValue ?? min]

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control
        ref={controlRef}
        className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col"
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          // touch-none belt and braces: the Control above already says this, and a browser is
          // supposed to honour a parent's touch-action when a finger lands on a child — Chromium
          // demonstrably does, which is why a drag with 60px of vertical wander never scrolled the
          // controls list. `touch-action` isn't inherited, though, so saying it here too costs
          // nothing where the parent is already honoured and closes the gap where it isn't. A
          // mouse never sees this — the property only describes touch.
          className="relative grow touch-none overflow-hidden rounded-full bg-muted select-none data-horizontal:h-1 data-horizontal:w-full data-vertical:h-full data-vertical:w-1"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-primary select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            // The epoch in the key is what remounts the dot when its row first comes on screen
            // (see useRemountThumbWhenShown above); `index` alone would keep the stuck dot.
            key={`${index}-${thumbEpoch}`}
            // The touch hit-ring override below is pointer-keyed, not width-keyed: it grows only
            // the invisible ring (8px/side to 16px/side, making a 44px target) for a finger; the
            // visible 12px dot is unchanged, and a fine-pointer mouse never sees the wider ring.
            // touch-none here is the same belt-and-braces as the Track above, for the same reason.
            className="relative block size-3 shrink-0 touch-none rounded-full border border-ring bg-surf-ground ring-ring/50 transition-[color,box-shadow] select-none after:absolute after:-inset-2 coarse:after:-inset-4 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 disabled:pointer-events-none disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
