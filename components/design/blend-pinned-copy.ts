/** Which tip a blend pair is measured from. */
export type BlendTip = "nose" | "tail";

/**
 * Why a tip rail's blend slider is grey (fast 221, the founder 2026-11-27: "grey out the slider with no handle, both
 * nose and tail"). The two sliders of a pair stay 2" apart, so one of them can run out of room: Blends From while
 * Ends At sits right behind it, and — on a short board — Ends At while Blends From sits 2" short of the centre. Each
 * line names the slider to move and which way, from the tip the pair is measured from. No figure, so nothing here
 * depends on Imperial or Metric.
 */
export const BLEND_PINNED_HINT = {
  blendsFrom: (tip: BlendTip) => `Move Ends At further from the ${tip} to move Blends From.`,
  endsAt: (tip: BlendTip) => `Move Blends From closer to the ${tip} to move Ends At.`,
} as const;
