import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // The touch text-size override below is pointer-keyed, not width-keyed: any touch pointer
        // gets 16px text (the fix for iOS zoom-on-focus) even on a touchscreen laptop at desktop
        // width; the existing sub-md width step below stays untouched for a mouse. The touch
        // height override (coarse:h-11) is pointer-keyed for the same reason: it brings this
        // shared field up to the 44px standard `e2e/touch-sizing.spec.ts` already enforces for
        // every typed field on the design screens (measure-field.tsx already carried both rules
        // at its own call sites) — a mouse at any window width still gets the unchanged h-8 height.
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm coarse:h-11 coarse:text-base dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
