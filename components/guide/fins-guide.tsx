"use client";

import { useMemo } from "react";
import { bandBoardName } from "@/components/design/board-name-copy";
import { useDesign } from "@/components/design/design-store";
import { useUnits } from "@/components/units-provider";
import type { GuidePageBuild } from "@/lib/geometry/guide-card";
import { buildFinsGuide, type FinsGuideInput } from "@/lib/geometry/guide-fins";
import { guideBoardName, guideIntro } from "./guide-copy";
import { memoGuide } from "./guide-memo";
import { GuideTab } from "./guide-tab";
import { guideView } from "./guide-view";
import { FINS_GUIDE_GROUPS, FINS_GUIDE_INTRO, FINS_GUIDE_WORDS } from "./words/fins";

/**
 * FINS' GUIDE (Phase 18): 23 cards, setup by setup, each setup and model drawn on the open board's own tail, the old
 * Model info notes on the cards they describe. It reads the board and never writes it: nothing here calls a store
 * action, so no card can change a board.
 */

/** FINS' worked-out cards, kept per board and system while that board is open (D-16). */
const BUILT = new WeakMap<object, Map<string, GuidePageBuild>>();

export function FinsGuide() {
  const { system } = useUnits();
  const {
    effectiveFins,
    finImportedTail,
    finPlacement,
    finTailOutline,
    outlineGeometry,
    finsImportTemplate,
    modelId,
    boardName,
  } = useDesign();

  const input = useMemo<FinsGuideInput>(
    () => ({ effectiveFins, finImportedTail, finPlacement, finTailOutline, outlineGeometry, finsImportTemplate }),
    [effectiveFins, finImportedTail, finPlacement, finTailOutline, outlineGeometry, finsImportTemplate],
  );
  const groups = useMemo(() => {
    const build = memoGuide(BUILT, input, system, () => buildFinsGuide(input, system));
    return guideView(FINS_GUIDE_GROUPS, FINS_GUIDE_WORDS, build, system);
  }, [input, system]);
  const intro = guideIntro(FINS_GUIDE_INTRO, system, { board: guideBoardName(bandBoardName(modelId, boardName)) }, "fins");

  return <GuideTab page="fins" intro={intro} groups={groups} />;
}
