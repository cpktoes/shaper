"use client";

import { useMemo } from "react";
import { bandBoardName } from "@/components/design/board-name-copy";
import { useDesign } from "@/components/design/design-store";
import { useUnits } from "@/components/units-provider";
import type { GuidePageBuild } from "@/lib/geometry/guide-card";
import { buildVolumeGuide, type VolumeGuideInput } from "@/lib/geometry/guide-volume";
import { guideBoardName, guideIntro } from "./guide-copy";
import { memoGuide } from "./guide-memo";
import { GuideTab } from "./guide-tab";
import { guideView } from "./guide-view";
import { VOLUME_GUIDE_GROUPS, VOLUME_GUIDE_INTRO, VOLUME_GUIDE_WORDS } from "./words/volume";

/**
 * VOLUME's GUIDE (Phase 18): eight cards about the page's controls and the figures its ESTIMATE card reads,
 * each drawn from the board that is open. It reads the board and never writes it: nothing here calls a
 * store action, so no card can change a board.
 */

/** VOLUME's worked-out cards, kept per board and system while that board is open (D-16). */
const BUILT = new WeakMap<object, Map<string, GuidePageBuild>>();

export function VolumeGuide() {
  const { system } = useUnits();
  const {
    outline,
    outlineGeometry,
    effectiveRails,
    railBands,
    effectiveVolume,
    volumeResult,
    quotedVolumeLitres,
    modelId,
    boardName,
  } = useDesign();

  const input = useMemo<VolumeGuideInput>(
    () => ({
      outline,
      outlineGeometry,
      effectiveRails,
      railBands,
      effectiveVolume,
      volumeResult,
      quotedVolumeLitres,
      importing: effectiveVolume.importTemplateDimensions,
    }),
    [outline, outlineGeometry, effectiveRails, railBands, effectiveVolume, volumeResult, quotedVolumeLitres],
  );
  const groups = useMemo(() => {
    const build = memoGuide(BUILT, input, system, () => buildVolumeGuide(input, system));
    return guideView(VOLUME_GUIDE_GROUPS, VOLUME_GUIDE_WORDS, build, system);
  }, [input, system]);
  const intro = guideIntro(VOLUME_GUIDE_INTRO, system, { board: guideBoardName(bandBoardName(modelId, boardName)) }, "volume");

  return <GuideTab page="volume" intro={intro} groups={groups} />;
}
