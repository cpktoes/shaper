"use client";

import { useMemo } from "react";
import { bandBoardName } from "@/components/design/board-name-copy";
import { useDesign } from "@/components/design/design-store";
import { useUnits } from "@/components/units-provider";
import type { GuidePageBuild } from "@/lib/geometry/guide-card";
import { buildTemplateGuide, type TemplateGuideInput } from "@/lib/geometry/guide-outline";
import { guideBoardName, guideIntro } from "./guide-copy";
import { memoGuide } from "./guide-memo";
import { GuideTab } from "./guide-tab";
import { guideView } from "./guide-view";
import { TEMPLATE_GUIDE_GROUPS, TEMPLATE_GUIDE_INTRO, TEMPLATE_GUIDE_WORDS } from "./words/template";

/**
 * TEMPLATE's GUIDE (Phase 18): 22 cards about the page's controls and the WINGS tab's, each drawn from the
 * board that is open — its outline from above, nose left, with the one setting pushed in muted dashes. It
 * reads the board and never writes it: nothing here calls a store action, so no card can change a board.
 */

/** TEMPLATE's worked-out cards, kept per board and system while that board is open (D-16). */
const BUILT = new WeakMap<object, Map<string, GuidePageBuild>>();

export function TemplateGuide() {
  const { system } = useUnits();
  const { outline, outlineGeometry, wingFinEdges, finPlacement, modelId, boardName } = useDesign();

  const input = useMemo<TemplateGuideInput>(
    () => ({ outline, outlineGeometry, wingFinEdges, finMarks: finPlacement.marks }),
    [outline, outlineGeometry, wingFinEdges, finPlacement.marks],
  );
  const groups = useMemo(() => {
    const build = memoGuide(BUILT, input, system, () => buildTemplateGuide(input, system));
    return guideView(TEMPLATE_GUIDE_GROUPS, TEMPLATE_GUIDE_WORDS, build, system);
  }, [input, system]);
  const intro = guideIntro(TEMPLATE_GUIDE_INTRO, system, { board: guideBoardName(bandBoardName(modelId, boardName)) }, "template");

  return <GuideTab page="template" intro={intro} groups={groups} />;
}
