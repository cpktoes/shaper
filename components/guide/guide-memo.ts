/**
 * The GUIDE's cards, kept for as long as the board they were worked out from is the one open (Phase 18,
 * D-16; Phase 17's `bottom-cartoon.tsx` pattern). The cache is keyed on the page's own stable object — the
 * page's input, made with `useMemo` over the store's own objects, so it is new exactly when one of them is —
 * and, inside it, on the shaper's system. So flipping back to GUIDE, or switching Imperial and Metric and
 * back, never works a page out twice; a slider moved hands out a new object and the old one's cards go with
 * it.
 */
import type { GuidePageBuild } from "@/lib/geometry/guide-card";
import type { UnitsSystem } from "@/lib/geometry/units";

export function memoGuide(
  cache: WeakMap<object, Map<string, GuidePageBuild>>,
  key: object,
  system: UnitsSystem,
  build: () => GuidePageBuild,
): GuidePageBuild {
  let ofBoard = cache.get(key);
  if (!ofBoard) {
    ofBoard = new Map();
    cache.set(key, ofBoard);
  }
  let built = ofBoard.get(system);
  if (!built) {
    built = build();
    ofBoard.set(system, built);
  }
  return built;
}
