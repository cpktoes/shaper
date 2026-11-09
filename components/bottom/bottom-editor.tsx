"use client";

import { useState } from "react";
import { useDesign } from "@/components/design/design-store";
import { DesignScreenShell } from "@/components/design/design-screen-shell";
import { BoardNameTab } from "@/components/design/board-name-tab";
import { bandBoardName } from "@/components/design/board-name-copy";
import { TabbedPanel } from "@/components/viewer/tabbed-panel";
import { cutKind, type BottomChannelsSpec, type BottomCutName, type BottomSectionKey } from "@/lib/geometry/bottom";
import { sectionOpeningStation, type BottomCutKey, type SectionHeight } from "@/lib/geometry/bottom-draw";
import type { Mm } from "@/lib/geometry/units";
import { BOTTOM_COPY } from "./bottom-copy";
import { BottomControls } from "./bottom-controls";
import { BottomData } from "./bottom-data";
import { BottomSection } from "./bottom-section";
import { BottomTopView } from "./bottom-top-view";

type BottomPage = "viewer" | "data";

/**
 * Where the section is taken: the wide point (where the page opens, sketch line 437), the deepest station of the cut a
 * shaper just picked, or of the channels just opened (it follows that cut's own numbers as they change), or a station
 * set by hand (17-10's drag and
 * `Section at`). Derived on every render from the board, never copied into state, so it can never go stale.
 */
type SectionStation = { follow: "wide" } | { follow: BottomCutKey } | { at: Mm };

/**
 * BOTTOM, the eighth design screen (Phase 17, D-01): the board's bottom contours — pick a cut for the nose, the center
 * and the tail, and see it from below, across the board at a station, and in DATA's numbers.
 *
 * Everything drawn comes from the store's one bottom (`resolvedBottom`, `bottomBoard`) through the pure drawings in
 * `lib/geometry/bottom-draw.ts` and DATA's numbers in `bottom.ts` — no foam off is worked out here or in any component
 * below (D-05, CLAUDE.md Rule 1). The panel writes the store through its BOTTOM actions only.
 *
 * View state stays here, never in the store, the way RAILS keeps its own (`rail-band-editor.tsx`): which tab is open,
 * which cut is live (the last section touched — it owns the drawings' lower-rail marks; the page opens on CENTER), where
 * the section is taken (the wide point when the page opens) and the Height (×4 when the page opens). None of it is saved
 * with the board or is an undo step. The Height buttons, the cutting line's drag, `Section at`, the ruler and the
 * finished rail join in 17-10; GUIDE in 17-11; the phone's NOSE · CENTER · TAIL row in 17-14.
 */
export function BottomEditor() {
  const { bottom, bottomBoard, resolvedBottom, pickBottomCut, setChannelCount, boardName, modelId } = useDesign();
  const [activePage, setActivePage] = useState<BottomPage>("viewer");
  // The live cut: the page opens on CENTER (UI-SPEC §1); a press in a card, or a pick, makes that section live.
  const [live, setLive] = useState<BottomCutKey>("center");
  const [sectionStation, setSectionStation] = useState<SectionStation>({ follow: "wide" });
  // ×4 when the page opens (D-13); its buttons are 17-10's.
  const height: SectionHeight = 4;

  const followed = "follow" in sectionStation ? sectionStation.follow : null;
  const station: Mm =
    "at" in sectionStation
      ? sectionStation.at
      : followed === "channels" && resolvedBottom.channels.count > 0
        ? resolvedBottom.channels.deepest
        : followed !== null && followed !== "wide" && followed !== "channels" && resolvedBottom[followed].kind !== "flat"
          ? resolvedBottom[followed].deepest
          : sectionOpeningStation(bottomBoard);

  function handlePick(section: BottomSectionKey, name: BottomCutName) {
    pickBottomCut(section, name);
    setLive(section);
    // A cut picked moves the section to its deepest (sketch lines 1120-1121); a flat leaves the section where it is.
    if (cutKind(name) !== "flat") setSectionStation({ follow: section });
  }

  // A count picked in the CHANNELS block (D-10): the channels become the live cut, and opening a set from None moves the
  // section to their Deepest (sketch line 1127); switching between counts, or to None, leaves the section where it is.
  function handleChannelCount(count: BottomChannelsSpec["count"]) {
    const opening = bottom.channels.count === 0 && count > 0;
    setChannelCount(count);
    setLive("channels");
    if (opening) setSectionStation({ follow: "channels" });
  }

  const shownName = bandBoardName(modelId, boardName);

  return (
    <DesignScreenShell
      // Two drawings to hold, so the sketch's 66% (UI-SPEC § Already done) — the phone's own layout is 17-14's.
      phonePinned="66dvh"
      controls={<BottomControls live={live} onLive={setLive} onPick={handlePick} onChannelCount={handleChannelCount} />}
      canvas={
        <TabbedPanel
          tabs={[
            { id: "viewer" as const, label: BOTTOM_COPY.viewerTab },
            { id: "data" as const, label: BOTTOM_COPY.dataTab },
          ]}
          active={activePage}
          onSelect={setActivePage}
          compactOnPhone={activePage === "viewer" ? "drawing" : "text"}
          trailing={(strip) => <BoardNameTab touchClearance={strip.touchClearance} />}
        >
          {activePage === "viewer" && (
            // The two drawings share the card, the top view a little the larger (sketch line 299-311). BOTTOM is not
            // printable: a shaper's paper is the order form (UI-SPEC §13).
            <div data-bottom-live={live} className="flex min-h-0 flex-1 flex-col gap-2 print:hidden">
              <BottomTopView live={live} station={station} boardName={shownName} />
              <BottomSection station={station} height={height} />
            </div>
          )}
          {activePage === "data" && (
            <div className="flex min-h-0 flex-1 flex-col print:hidden">
              <BottomData />
            </div>
          )}
        </TabbedPanel>
      }
    />
  );
}
