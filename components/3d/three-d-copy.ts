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
  subtitle: "Spin it under shaping-room lights, then export it for a CNC.",
  showHeading: "Show",
  fins: "Fins",
  blank: "Blank",
  noBlankHint: "No blank on this board — pick one on ROCKER to see it here.",
  contourStripes: "Contour Stripes",
  contourStripesHint: "Bands of light that kink at a bump or a flat spot.",
  viewHeading: "View",
  viewsGroup: "Views",
  views: { deck: "Deck", bottom: "Bottom", side: "Side", nose: "Nose", tail: "Tail" },
  resetView: "Reset View",
  exportHeading: "Export",
  exportButton: "Export for CNC…",
  /** The export's note (D-15, D-23 — Shape3D only). */
  exportNote: "Shape3D reads this as a guide and fits its own curves to it.",
  exportDone: (file: string, slices: number) =>
    `Downloaded ${file}. The outline, the profile and ${slices} slices, in millimetres.`,
  exportWorking: "Making the files…",
  exportFailed: "Couldn't make the files — try again.",
  exportNothingYet: "There's nothing to export until the board can be drawn.",

  // On the canvas: each message is two lines.
  browserCantDraw: {
    line1: "This browser can't draw the board in 3D.",
    line2: "Export for CNC… still works — the files don't need the drawing.",
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
    "Drag to turn the board, scroll or pinch to zoom, and right-drag or use two fingers to slide it. With the keyboard: the arrow keys turn it, Shift with an arrow key slides it, plus and minus zoom, 0 goes back to 1x and Home resets the view.",
  viewSpoken: {
    deck: "Deck view.",
    bottom: "Bottom view.",
    side: "Side view.",
    nose: "Nose view.",
    tail: "Tail view.",
  },
  resetSpoken: "Back to the first view.",
  oneXSpoken: "Back to 1x.",
} as const;
