"use client";

import { useMemo } from "react";
import { bandBoardName } from "@/components/design/board-name-copy";
import { useDesign } from "@/components/design/design-store";
import { useUnits } from "@/components/units-provider";
import type { GuidePageBuild } from "@/lib/geometry/guide-card";
import { buildRockerGuide, type RockerGuideInput } from "@/lib/geometry/guide-rocker";
import { guideBoardName, guideIntro } from "./guide-copy";
import { memoGuide } from "./guide-memo";
import { GuideTab } from "./guide-tab";
import { guideView } from "./guide-view";
import { ROCKER_GUIDE_GROUPS, ROCKER_GUIDE_INTRO, ROCKER_GUIDE_WORDS } from "./words/rocker";

/**
 * ROCKER's GUIDE (Phase 18): fourteen cards about the page's controls, each the open board seen from the side
 * in its blank, with that one setting pushed in muted dashes. It reads the board and never writes it: nothing
 * here calls a store action, so no card can change a board.
 */

/** ROCKER's worked-out cards, kept per board and system while that board is open (D-16). */
const BUILT = new WeakMap<object, Map<string, GuidePageBuild>>();

export function RockerGuide() {
  const { system } = useUnits();
  const { outline, rocker, foil, blank, sideProfile, modelId, boardName } = useDesign();

  // The store memoises `foil` and hands out a new `blank` on every edit, so this object is new exactly when
  // the board the cards are drawn from changes.
  const input = useMemo<RockerGuideInput>(
    () => ({ outline, rocker, foil, blank, sideProfile }),
    [outline, rocker, foil, blank, sideProfile],
  );
  const groups = useMemo(() => {
    const build = memoGuide(BUILT, input, system, () => buildRockerGuide(input, system));
    return guideView(ROCKER_GUIDE_GROUPS, ROCKER_GUIDE_WORDS, build, system);
  }, [input, system]);
  // The intro names the board and the blank it is cut from; a hand-set board names no maker.
  const blankName = blank ? `${blank.copy.vendor} ${blank.copy.name}` : "hand-set";
  const intro = guideIntro(
    ROCKER_GUIDE_INTRO,
    system,
    { board: guideBoardName(bandBoardName(modelId, boardName)), blank: blankName },
    "rocker",
  );

  return <GuideTab page="rocker" intro={intro} groups={groups} />;
}
