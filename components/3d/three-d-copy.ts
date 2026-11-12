/**
 * Every word the 3D screen says (Phase 16, UI-SPEC § Copywriting), verbatim, in the founder's Title Case — so the
 * screen, the later plans that add its switches, views and export, and the browser tests all read the same strings
 * instead of typing them. Keys are named for what the shaper reads, never for the machinery behind it, and no
 * value here names that machinery either.
 *
 * Pure: no React, browser or database import.
 */

export const THREE_D_COPY = {
  // Where the screen is named (D-02: "3D" everywhere).
  /** The desktop nav link, the phone tile's name and the one read-only tab. */
  tab: "3D",
  /** The phone tile's line under its name. */
  tileLine: "Spin and export",
  /** The page's `<title>` (the founder, 2026-11-03: a descriptive title like the other screens'). */
  pageTitle: "3D Board — Shaper Assistant",
  /** The page's description. */
  pageDescription:
    "See your surfboard as a solid shape under shaping-room lights, and export it for a CNC shaping program.",

  // The side panel, top to bottom.
  /** The panel title, drawn uppercase by the CSS. */
  title: "3D Board",
  subtitle: "3D board rendered under shaping bay lighting.",
  /** The bay's controls (D-43, D-44), each one plane, in the founder's own names. */
  raiseNose: "Raise the Nose",
  raiseTail: "Raise the Tail",
  onTheRack: "on the rack",
  rotateOnSide: "Rotate on Side",
  rollValue: (deg: number) => (deg === 0 ? "flat" : `${Math.abs(deg)}° ${deg < 0 ? "left" : "right"}`),
  raiseSpoken: (end: "nose" | "tail", height: string | null) =>
    height === null ? `${end === "nose" ? "Nose" : "Tail"} on its rack.` : `${end === "nose" ? "Nose" : "Tail"} ${height} off its rack.`,
  rollSpoken: (deg: number) =>
    deg === 0 ? "Flat on the racks." : `Rotated ${Math.abs(deg)} degrees ${deg < 0 ? "left" : "right"}.`,
  modeGroup: "What a drag does",
  modeTurn: "Turn the Board",
  modeWalk: "Walk Around",
  /** The view's own slider (D-44): a slight angle off the stringer's line, to look down a rail. */
  lookDownRail: "Look Down the Rail",
  lookLeft: "Left rail",
  lookRight: "Right rail",
  lookValue: (deg: number) => (deg === 0 ? "on the stringer" : `${Math.abs(deg)}° ${deg < 0 ? "left" : "right"}`),
  lookSpoken: (deg: number) =>
    deg === 0 ? "On the stringer's line." : `${Math.abs(deg)} degrees to the ${deg < 0 ? "left" : "right"} of the stringer's line.`,

  /** The tail rail's blend (D-30, D-32): the same two settings as RAILS' tail Advanced menu, the same words and
   * spoken names, so one control has one name wherever it is. They bound the tail's whole rail, so they are always
   * live; the nose's blend is automatic and has no control. */
  railBlendHeading: "Rail Blend Controls",
  railBlendNote: "These controls affect how you shape the board and corresponding controls are also on the RAILS page.",
  tailRailBlendsFrom: "Tail Rail Blends From",
  tailRailEndsAt: "Tail Rail Ends At",
  tailRailBlendsFromSlider: "Tail Rail blends from",
  tailRailEndsAtSlider: "Tail Rail ends at",
  tailRailFromTheTail: (distance: string) => `${distance} from the tail`,
  viewHeading: "View",
  viewsGroup: "Views",
  views: { deck: "Deck", bottom: "Bottom", side: "Side", nose: "Nose", tail: "Tail" },
  resetView: "Reset View",
  /** Side's tooltip and spoken reason on Turn the Board, where it is dimmed: that mode has the one view. */
  sideNeedsWalk: "Side works in Walk Around.",
  exportHeading: "Export",
  exportButton: "Export .brd File",
  /** The export's note (D-15, D-23; quick 261110-tvk — one AkuShaper board file, for AkuShaper or Shape3D). */
  exportNote: "A board file for AkuShaper or Shape3D.",
  /** Under the note on a swallow-tail board only (quick 261110-veo, brief decision 4): the file writes the tail square. */
  exportSwallowNote: "A swallow tail is written as a square tail at its points — cut the swallow by hand.",
  /** Under the note on a board with channels only (quick 261112-c2d): the file is the board before the channels are cut. */
  exportChannelsNote: "Channels are left out of the file — cut them by hand.",
  exportDone: (file: string, sections: number) =>
    `Downloaded ${file}. The outline, rocker, deck and ${sections} cross-sections.`,
  /** The preview dialog's title (quick 261112-dbi): Export .brd File opens it, and nothing is saved until its Save button. */
  previewTitle: "Board file preview",
  /** The one line saying the preview is read back from the file, never from the screen's board. */
  previewFromFile: "Drawn from the file itself — these are the slices AkuShaper and Shape3D will read.",
  /** The three drawings' small-caps captions, top to bottom. */
  previewTopView: "TOP VIEW",
  previewSlice: "SLICE",
  previewSideView: "SIDE VIEW",
  /** The dialog's two buttons. */
  previewSave: "Save .brd File",
  previewCancel: "Cancel",
  /** Under the SLICE caption: which slice is drawn, of how many, and where it stands along the board (a dim in the shaper's system). */
  previewSliceLine: (n: number, count: number, distance: string) => `Slice ${n} of ${count} · ${distance} from the tail`,
  /** Under the three drawings: how many slices the file holds, how far apart at most, and the file's own length × width × thickness. */
  previewFacts: (count: number, gap: string, dims: string) => `${count} slices · none more than ${gap} apart · ${dims}`,
  /** The ‹ and › buttons' spoken names: ‹ moves the marked slice toward the nose (the left), › toward the tail. */
  previewTowardNose: "Slice toward the nose",
  previewTowardTail: "Slice toward the tail",
  /** The three drawings' spoken names. */
  previewTopName: (count: number) => `The board file from above, with its ${count} slices`,
  previewSliceName: (n: number, count: number) => `Slice ${n} of ${count}, the whole cross-section`,
  previewSideName: (count: number) => `The board file from the side, with its ${count} slices`,
  exportWorking: "Making the file…",
  exportFailed: "Couldn't make the file — try again.",
  exportNothingYet: "There's nothing to export until the board can be drawn.",

  // The corner switches (D-35), each drawn as an icon over the canvas: these are their spoken names and tooltips.
  /** The Fins switch. */
  fins: "Fins",
  /** The Blank switch. */
  blank: "Blank",
  /** The Blank switch's tooltip and spoken description on a hand-set board, where it is dimmed. */
  noBlankHint: "No blank on this board — pick one on ROCKER to see it here.",
  /** The Contour Stripes switch. */
  contourStripes: "Contour Stripes",
  /** The Contour Stripes switch's tooltip and spoken description. */
  contourStripesTip: "Contour Stripes — bands of light that kink at a bump or a flat spot.",
  /** The # switch (D-42). */
  wireView: "Wire View",
  /** The # switch's tooltip and spoken description. */
  wireViewTip: "Wire View — the board drawn in very thin black lines across and along it.",

  /** The fifth corner switch (the founder, 2026-11-05). */
  room: "Room",
  /** The Room icon's tooltip and spoken description, one per step: each says what the next click does (quick 261106-ni6). */
  roomTip: {
    theme: "Room — click for the bright blue room.",
    blue: "Room — click for no room: a plain background and a free spin.",
    none: "Room — click for the room in this theme's colours.",
  },

  // On the canvas: each message is two lines.
  browserCantDraw: {
    line1: "This browser can't draw the board in 3D.",
    line2: "Export .brd File still works — the file doesn't need the drawing.",
  },
  boardCantBeDrawn: {
    line1: "This board can't be drawn in 3D.",
    line2: "Check its outline on TEMPLATE and its rocker on ROCKER.",
  },
  didntLoad: {
    line1: "The 3D view didn't load.",
    line2: "Check your connection, then reload the page.",
  },
  /** Under the loading picture, once it has been showing for a second. */
  gettingReady: "Getting the 3D view ready…",

  // Screen readers (not drawn).
  /** The canvas's spoken name: the band's board name, then "in 3D". */
  canvasName: (boardName: string) => `${boardName} in 3D`,
  canvasRole: "3D view",
  canvasDescription:
    "Drag to turn the board on its racks, scroll or pinch to zoom, and right-drag or use two fingers to slide it. The view stays where it is. With the keyboard: the arrow keys turn it, Shift with an arrow key slides it, plus and minus zoom, 0 goes back to 1x and Home resets the view. The sliders in the panel raise an end and rotate it on its side.",
  canvasDescriptionWalk:
    "Drag to walk around the board, scroll or pinch to zoom, and right-drag or use two fingers to slide the picture. With the keyboard: the arrow keys walk, Shift with an arrow key slides it, plus and minus zoom, 0 goes back to 1x and Home resets the view. The sliders in the panel still move the board.",
  viewSpoken: {
    deck: "Deck up on the racks.",
    bottom: "Bottom up on the racks.",
    side: "Standing at the rail.",
    nose: "Standing at the nose.",
    tail: "Standing at the tail.",
  },
  /** Nose and Tail on Turn the Board, where the board turns rather than the viewer walking. */
  endTowardYou: { nose: "Nose toward you.", tail: "Tail toward you." },
  resetSpoken: "Back to the first view.",
  oneXSpoken: "Back to 1x.",
} as const;
