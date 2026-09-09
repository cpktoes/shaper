import { Slider as SliderPrimitive } from "@base-ui/react/slider"

import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderPrimitive.Root.Props) {
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
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col">
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
            key={index}
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
