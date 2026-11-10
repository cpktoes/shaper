"use client";

import { useMemo } from "react";
import { bandBoardName } from "@/components/design/board-name-copy";
import { useDesign } from "@/components/design/design-store";
import { useUnits } from "@/components/units-provider";
import type { GuidePageBuild } from "@/lib/geometry/guide-card";
import { buildRailsGuide, type RailsGuideInput } from "@/lib/geometry/guide-rails";
import { guideBoardName, guideIntro } from "./guide-copy";
import { memoGuide } from "./guide-memo";
import { GuideTab } from "./guide-tab";
import { guideView } from "./guide-view";
import { RAILS_GUIDE_GROUPS, RAILS_GUIDE_INTRO, RAILS_GUIDE_WORDS } from "./words/rails";

/**
 * RAILS' GUIDE (Phase 18): seventeen cards about the page's controls, each drawn from the rails of the board that
 * is open — the same rails VIEWER draws. It reads the board and never writes it: nothing here calls a store
 * action, so no card can change a board.
 *
 * Merge note (D-19, RESEARCH Finding 10): once Phase 17's BOTTOM page is on main, RAILS draws the rail the bottom
 * leaves (`railsOnBottom` / `railBandsOnBottom`); this GUIDE then reads those two in place of `effectiveRails` and
 * `railBands` below, so its cards keep following what the page draws.
 */

/** RAILS' worked-out cards, kept per board and system while that board is open (D-16). */
const BUILT = new WeakMap<object, Map<string, GuidePageBuild>>();

export function RailsGuide() {
  const { system } = useUnits();
  const { effectiveRails, railBands, railsImportFoilThickness, outlineGeometry, outline, modelId, boardName } = useDesign();

  const input = useMemo<RailsGuideInput>(
    () => ({ effectiveRails, railBands, railsImportFoilThickness, outlineGeometry, boardLength: outline.length }),
    [effectiveRails, railBands, railsImportFoilThickness, outlineGeometry, outline.length],
  );
  const groups = useMemo(() => {
    const build = memoGuide(BUILT, input, system, () => buildRailsGuide(input, system));
    return guideView(RAILS_GUIDE_GROUPS, RAILS_GUIDE_WORDS, build, system);
  }, [input, system]);
  const intro = guideIntro(RAILS_GUIDE_INTRO, system, { board: guideBoardName(bandBoardName(modelId, boardName)) }, "rails");

  return <GuideTab page="rails" intro={intro} groups={groups} />;
}
