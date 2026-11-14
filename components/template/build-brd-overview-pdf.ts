/**
 * The one-page overview of a `.brd`'s closest fit (quick 261113-et0, E2; the founder, 2026-11-13: "the preview should have a
 * printable overview with enough info that the user can save it, continue with the board as close as possible under our
 * controls, then add the fine tune adjustments to get even closer"). Built in the browser with jsPDF and printed through
 * `print-pdf.ts`, the way the Overview Sheet, the Full Sized Template and the Paper Saver are: the page behind it is never
 * printed, so nothing on the home page has to be hidden, and the print window's own Save as PDF is how a shaper keeps it.
 *
 * The page is A4's width by Letter's height — the smaller of the two on each axis, so it fits either paper at 100% with no
 * paper picker (the same principle `use-print-fit.ts` uses for the order form). Black ink on white whatever the theme, nose
 * on the left. This file names no inch figure and no conversion: every figure and word arrives already written, in the
 * shaper's own system, from the one `BrdFitSheet` the preview dialog is also painted from (`lib/export/brd-fit-preview.ts`),
 * so the screen and the paper cannot disagree. All it does is lay them out.
 *
 * Nothing is clipped, ever: the text under the drawings is measured first, the two drawings are given whatever height is
 * left, and a sheet that still would not fit throws — the dialog then says so — rather than print a line off its foot.
 * One page is the aim. The BOTTOM block (quick 261113-gwr: three cross-sections and a table of what the file measures and what
 * we fitted) stays on the page when the two views keep at least `minViewsWithBottom` millimetres; when it would squeeze them
 * below that, the BOTTOM block moves to a second page of its own, drawn from the top margin. The RAILS block (quick 261113-kvo:
 * the same three cross-sections at true height with the rail drawn, and a table of the fitted settings) always rides with the
 * BOTTOM block, after it: on the first page when that holds both, else on the second. Only if the second page cannot hold the
 * RAILS block as well does it take a third page of its own, which none of the app's own boards nor the founder's four AkuShaper
 * files have needed.
 */
import jsPDF from "jspdf";
import { THREE_D_COPY } from "@/components/3d/three-d-copy";
import { printPdf } from "@/components/template/print-pdf";
import { sectionHeightLabel, type SectionHeight } from "@/lib/geometry/bottom-draw";
import { PAPER_MM, TEMPLATE_MARGIN_MM } from "@/lib/geometry/template";
import type { BrdBlankWords } from "@/lib/export/brd-blank-words";
import {
  BRD_BOTTOM_DRAWING_WIDTH,
  BRD_FIT_COPY,
  brdBottomFrames,
  brdBottomRows,
  brdFitFramesInBox,
  brdRailFrames,
  brdRailRows,
  type BrdFitLook,
  type BrdFitSheet,
  type BrdFitTable,
} from "@/lib/export/brd-fit-preview";
import { brdBoardName } from "@/lib/models/brd-board";

/** The page: A4's width by Letter's height (millimetres), the smaller of the two papers on each axis. */
export const BRD_OVERVIEW_PAGE: { width: number; height: number } = {
  width: Math.min(PAPER_MM.letter.width, PAPER_MM.a4.width),
  height: Math.min(PAPER_MM.letter.height, PAPER_MM.a4.height),
};

const MARGIN: number = TEMPLATE_MARGIN_MM;
const CONTENT_WIDTH = BRD_OVERVIEW_PAGE.width - 2 * MARGIN;

/** Every size on the sheet (millimetres, points). Exported so the tests read the same numbers the builder lays out with. */
export const BRD_OVERVIEW_LAYOUT = {
  margin: MARGIN,
  contentWidth: CONTENT_WIDTH,
  fonts: { title: 13, body: 8.5, caption: 7, table: 8 },
  pitch: { title: 6.5, body: 3.9, caption: 3.6, row: 4.2 },
  gap: 3,
  /** The table's label column; the five stations share the rest of the width. */
  labelColumn: 24,
  /** The smallest the two drawings may be squeezed to before the sheet is refused: they would no longer be a drawing. */
  minDrawingHeight: 30,
  /** The least the two views may be given while the BOTTOM block shares their page; under it the block goes to a second page. */
  minViewsWithBottom: 45,
  /** The BOTTOM table's label column, and the gap between its three drawings. */
  bottomLabelColumn: 30,
  bottomGap: 4,
  strokes: {
    // The file is a wide mid-grey line and our fit a thin black dashed one drawn over it, so where the two lie within a
    // hair of each other (most of the way round a close fit) the dashes still show inside the grey, and where they part both read.
    file: { width: 0.55, dash: [] as number[], grey: 150 },
    fit: { width: 0.25, dash: [1.6, 1.1], grey: 0 },
    stringer: { width: 0.15, dash: [4, 2], grey: 160 },
  },
  keyLine: 10,
} as const;

const L = BRD_OVERVIEW_LAYOUT;

/** A character a printer's standard font can draw: Latin-1, or the em dash the words use. Anything else prints as a `?`. */
function drawable(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\u0000-ÿ—]/g, "?");
}

type FontStyle = "normal" | "bold";

/** Word-wraps `text` to `maxWidth` at the font already set on `doc`; a single word wider than the line is broken by letters. */
function wrap(doc: jsPDF, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = "";
  const push = () => {
    if (current.length > 0) lines.push(current);
    current = "";
  };
  for (const word of text.split(" ")) {
    let rest = word;
    // A word too wide for a line on its own is cut where it fills one.
    while (doc.getTextWidth(rest) > maxWidth && rest.length > 1) {
      push();
      let cut = rest.length - 1;
      while (cut > 1 && doc.getTextWidth(rest.slice(0, cut)) > maxWidth) cut--;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    const candidate = current.length > 0 ? `${current} ${rest}` : rest;
    if (current.length > 0 && doc.getTextWidth(candidate) > maxWidth) {
      push();
      current = rest;
    } else {
      current = candidate;
    }
  }
  push();
  return lines;
}

/** One thing under the drawings: a run of wrapped text, a table, the key, or blank space. */
type Item =
  | { kind: "text"; lines: string[]; style: FontStyle; size: number; pitch: number }
  | { kind: "table"; table: BrdFitTable }
  | { kind: "key" }
  | { kind: "gap"; height: number }
  /** The BOTTOM block's three cross-sections in one row. */
  | { kind: "sections"; height: number }
  /** The BOTTOM block's table: a header row, then each row's cells wrapped to their column (a row is as tall as its tallest cell). */
  | { kind: "bottomTable"; header: string[]; rows: { label: string; cells: string[][]; size: number }[]; height: number }
  /** The RAILS block's three cross-sections in one row (the same table kind, `bottomTable`, then carries its words). */
  | { kind: "railSections"; height: number };

const TABLE_HEIGHT = L.pitch.caption + 3 * L.pitch.row + 1.5;
const KEY_HEIGHT = L.pitch.body + 1;

function heightOf(item: Item): number {
  switch (item.kind) {
    case "text":
      return item.lines.length * item.pitch;
    case "table":
      return TABLE_HEIGHT;
    case "key":
      return KEY_HEIGHT;
    case "gap":
    case "sections":
    case "bottomTable":
    case "railSections":
      return item.height;
  }
}

export interface BuildBrdOverviewPdfOptions {
  /** The file as read and our closest fit to it: what the two drawings draw. */
  look: BrdFitLook;
  /** Every line and table, built once for the preview and handed here, so the paper says what the screen says. */
  sheet: BrdFitSheet;
  /** The picked file's name; the sheet's own From line is what prints, this names the PDF. */
  fileName: string;
  /** How many times true height the side view is drawn: the dialog's current pick. */
  height: SectionHeight;
  /** How many times true height the BOTTOM block's cross-sections are drawn: the dialog's own pick for them (it opens at x4). */
  sectionHeight?: SectionHeight;
  /**
   * The SUGGESTED BLANKS block (quick 261113-gwo), worded for the shaper's system. Printed after the point notes when it is given
   * and ready or quiet; left off when absent or still loading (the dialog passes null until the suggestions are worked out).
   */
  blanks?: BrdBlankWords | null;
}

/** Builds the one-page overview. Throws when it cannot fit its words on one page (never prints a clipped one). */
export function buildBrdOverviewPdf(options: BuildBrdOverviewPdfOptions): jsPDF {
  const { look, sheet, height, blanks } = options;
  const sectionHeight = options.sectionHeight ?? 4;
  const doc = new jsPDF({ unit: "mm", format: [BRD_OVERVIEW_PAGE.width, BRD_OVERVIEW_PAGE.height], orientation: "portrait" });
  doc.setDrawColor(0);
  doc.setTextColor(0);

  const setFont = (style: FontStyle, size: number) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
  };
  const footLimit = BRD_OVERVIEW_PAGE.height - MARGIN + 0.01;
  let lastBaseline = 0;
  /** One line of text whose top is `y`: the baseline sits just under the top, and the sheet's foot is checked as it goes. */
  const line = (text: string, x: number, y: number, pitch: number, options?: { align?: "left" | "right" }) => {
    const baseline = y + pitch * 0.78;
    lastBaseline = Math.max(lastBaseline, baseline);
    doc.text(drawable(text), x, baseline, options);
  };
  const wrapped = (text: string, style: FontStyle, size: number, pitch: number): Item => {
    setFont(style, size);
    return { kind: "text", lines: wrap(doc, drawable(text), CONTENT_WIDTH), style, size, pitch };
  };

  // The head: title, then the file's name and size.
  const head: Item[] = [
    { kind: "text", lines: [drawable(sheet.title)], style: "bold", size: L.fonts.title, pitch: L.pitch.title },
    wrapped(sheet.from, "normal", L.fonts.body, L.pitch.body),
    wrapped(sheet.size, "normal", L.fonts.body, L.pitch.body),
    { kind: "gap", height: L.gap },
  ];

  // Everything under the drawings, measured before anything is drawn so the drawings can be given what is left.
  const body = (text: string) => wrapped(text, "normal", L.fonts.body, L.pitch.body);
  /** The SUGGESTED BLANKS block: a gap, its caption, the intro when there is one, then every maker's lines as body text. */
  const blankItems = (words: BrdBlankWords): Item[] => [
    { kind: "gap", height: L.gap },
    { kind: "text", lines: [words.caption], style: "bold", size: L.fonts.caption, pitch: L.pitch.caption },
    ...(words.intro === null ? [] : [body(words.intro)]),
    ...words.lines.flat().map(body),
  ];
  /**
   * The BOTTOM block (quick 261113-gwr): its caption, then the cross-sections' caption, the three drawings, the table and the notes;
   * or the caption and the one line saying the bottom could not be read.
   */
  const bottomItems = (): Item[] => {
    const caption: Item = { kind: "text", lines: [sheet.bottom.caption], style: "bold", size: L.fonts.caption, pitch: L.pitch.caption };
    if (!sheet.bottom.read) return [{ kind: "gap", height: L.gap }, caption, body(sheet.bottom.line)];
    const items: Item[] = [{ kind: "gap", height: L.gap }, caption];
    if (bottomFrames.drawings.length > 0) {
      items.push({ kind: "text", lines: [BRD_FIT_COPY.bottomSectionsCaption(sectionHeightLabel(bottomFrames))], style: "bold", size: L.fonts.caption, pitch: L.pitch.caption });
      items.push({ kind: "sections", height: L.pitch.caption + bottomFrames.height * bottomCell.scale + 1.5 });
    }
    items.push(bottomTable(sheet.bottom));
    items.push(...sheet.bottom.notes.map(body));
    return items;
  };
  const bottomCell = (() => {
    const width = (CONTENT_WIDTH - 2 * L.bottomGap) / 3;
    return { width, scale: width / BRD_BOTTOM_DRAWING_WIDTH };
  })();
  /** The table: each cell wrapped to its column at the table's size, up to two lines, the size shrunk a little if a cell would not fit in two. */
  const bottomTable = (block: { columns: { label: string }[]; rows: { label: string; cells: string[] }[] }): Item => {
    const column = (CONTENT_WIDTH - L.bottomLabelColumn) / 3;
    const rows = block.rows.map((row) => {
      let size: number = L.fonts.table;
      let cells: string[][] = [];
      for (;;) {
        setFont("normal", size);
        cells = row.cells.map((text) => wrap(doc, drawable(text), column - 2));
        if (Math.max(...cells.map((c) => c.length)) <= 2 || size <= 5) break;
        size -= 0.25;
      }
      return { label: row.label, cells, size };
    });
    const height = L.pitch.row + rows.reduce((sum, row) => sum + Math.max(...row.cells.map((c) => c.length)) * L.pitch.row, 0) + 1.5;
    return { kind: "bottomTable", header: block.columns.map((c) => c.label), rows, height };
  };
  const bottomFrames = brdBottomFrames(brdBottomRows(look), sectionHeight);
  /** The RAILS block (quick 261113-kvo): its caption, the cross-sections' caption, the three drawings, the table and the notes; or the caption and the one unread line. */
  const railItems = (): Item[] => {
    const caption: Item = { kind: "text", lines: [sheet.rails.caption], style: "bold", size: L.fonts.caption, pitch: L.pitch.caption };
    if (!sheet.rails.read) return [{ kind: "gap", height: L.gap }, caption, body(sheet.rails.line)];
    const items: Item[] = [{ kind: "gap", height: L.gap }, caption];
    if (railFrames.drawings.length > 0) {
      items.push({ kind: "text", lines: [sheet.rails.drawingsCaption], style: "bold", size: L.fonts.caption, pitch: L.pitch.caption });
      items.push({ kind: "railSections", height: L.pitch.caption + railFrames.height * bottomCell.scale + 1.5 });
    }
    items.push(bottomTable(sheet.rails));
    items.push(...sheet.rails.notes.map(body));
    return items;
  };
  const railFrames = brdRailFrames(brdRailRows(look), look);

  const underBefore: Item[] = [
    { kind: "key" },
    { kind: "gap", height: L.gap },
    { kind: "text", lines: [BRD_FIT_COPY.howClose], style: "bold", size: L.fonts.caption, pitch: L.pitch.caption },
    body(sheet.closeness.outline),
    body(sheet.closeness.rocker),
    body(sheet.closeness.thickness),
    ...(sheet.closeness.bottom === null ? [] : [body(sheet.closeness.bottom)]),
    ...(sheet.closeness.rails === null ? [] : [body(sheet.closeness.rails)]),
    ...sheet.wings.map(body),
    body(sheet.tipsNote),
    { kind: "gap", height: L.gap },
    ...sheet.tables.map((table): Item => ({ kind: "table", table })),
    body(sheet.rockerUse),
    ...sheet.pointNotes.map(body),
    body(sheet.rockerLines),
    ...(sheet.stringerNote === null ? [] : [body(sheet.stringerNote)]),
  ];
  const underBlanks: Item[] = blanks && blanks.status !== "loading" ? blankItems(blanks) : [];
  const underBottomOnly = bottomItems();
  const underRails = railItems();
  const underBottom = [...underBottomOnly, ...underRails];
  const underAfter: Item[] = [
    { kind: "gap", height: L.gap },
    { kind: "text", lines: [BRD_FIT_COPY.controls], style: "bold", size: L.fonts.caption, pitch: L.pitch.caption },
    body(sheet.controls.outline),
    body(sheet.controls.nose),
    body(sheet.controls.tail),
    body(sheet.controls.rocker),
    body(sheet.controls.thickness),
    ...(sheet.controls.bottom === null ? [] : [body(sheet.controls.bottom)]),
    ...(sheet.controls.rails === null ? [] : [body(sheet.controls.rails)]),
    { kind: "gap", height: L.gap },
    body(sheet.notRead),
  ];

  const headHeight = head.reduce((sum, item) => sum + heightOf(item), 0);
  const sum = (items: readonly Item[]) => items.reduce((total, item) => total + heightOf(item), 0);
  const top = MARGIN;
  const captionGap = L.pitch.caption + 2.5;
  const boxFor = (under: readonly Item[]) => BRD_OVERVIEW_PAGE.height - MARGIN - top - headHeight - sum(under) - L.pitch.caption;
  // One page when the two views keep their room beside the BOTTOM block; otherwise the block goes to a page of its own, and
  // when the views are still under the plain minimum the SUGGESTED BLANKS go with it (a long block of makers on a board whose
  // numbers read long, in Metric, is the case that needs it). (The one line saying the bottom could not be read moves only when
  // even the plain minimum of room would be lost.)
  let onSecondPage: "none" | "bottom" | "blanks and bottom" = "none";
  let under = [...underBefore, ...underBlanks, ...underBottom, ...underAfter];
  let boxHeight = boxFor(under);
  if (boxHeight - captionGap < (sheet.bottom.read ? L.minViewsWithBottom : L.minDrawingHeight)) {
    onSecondPage = "bottom";
    under = [...underBefore, ...underBlanks, ...underAfter];
    boxHeight = boxFor(under);
    if (boxHeight - captionGap < L.minDrawingHeight && underBlanks.length > 0) {
      onSecondPage = "blanks and bottom";
      under = [...underBefore, ...underAfter];
      boxHeight = boxFor(under);
    }
  }
  if (boxHeight - captionGap < L.minDrawingHeight) throw new Error("The overview's words leave no room for the two drawings.");
  const frames = brdFitFramesInBox(look, { width: CONTENT_WIDTH, height: boxHeight }, height, captionGap);

  // ---- Head.
  let y = top;
  const drawText = (item: Extract<Item, { kind: "text" }>) => {
    setFont(item.style, item.size);
    for (const text of item.lines) {
      line(text, MARGIN, y, item.pitch);
      y += item.pitch;
    }
  };
  for (const item of head) {
    if (item.kind === "text") drawText(item);
    else y += heightOf(item);
  }

  // ---- The two drawings.
  setFont("bold", L.fonts.caption);
  line(THREE_D_COPY.previewTopView, MARGIN, y, L.pitch.caption);
  y += L.pitch.caption;
  const originX = MARGIN;
  const topY = y;
  /** A polyline as one path, so a dash runs unbroken round the whole curve rather than starting over at every point. */
  const stroke = (
    points: readonly (readonly [number, number])[],
    at: number,
    closed: boolean,
    spec: { width: number; dash: readonly number[]; grey: number },
    from: number = originX,
  ) => {
    if (points.length < 2) return;
    doc.setDrawColor(spec.grey);
    doc.setLineWidth(spec.width);
    doc.setLineDashPattern([...spec.dash], 0);
    const [x0, y0] = points[0];
    const steps = points.slice(1).map(([x, py], i): [number, number] => [x - points[i][0], py - points[i][1]]);
    doc.lines(steps, from + x0, at + y0, [1, 1], "S", closed);
    doc.setLineDashPattern([], 0);
    doc.setDrawColor(0);
  };
  stroke(frames.top.file, topY, true, L.strokes.file);
  doc.setDrawColor(L.strokes.stringer.grey);
  doc.setLineWidth(L.strokes.stringer.width);
  doc.setLineDashPattern([...L.strokes.stringer.dash], 0);
  doc.line(
    originX + frames.top.stringer.x1,
    topY + frames.top.stringer.y,
    originX + frames.top.stringer.x2,
    topY + frames.top.stringer.y,
  );
  doc.setLineDashPattern([], 0);
  stroke(frames.top.fit, topY, true, L.strokes.fit);

  const sideCaptionY = topY + frames.top.height + 0.5;
  setFont("bold", L.fonts.caption);
  line(THREE_D_COPY.previewSideViewAt(sectionHeightLabel({ heightAsked: height, heightDrawn: height })), MARGIN, sideCaptionY, L.pitch.caption);
  const sideY = topY + frames.top.height + captionGap;
  stroke(frames.side.file, sideY, true, L.strokes.file);
  stroke(frames.side.fitBottom, sideY, false, L.strokes.fit);
  stroke(frames.side.fitDeck, sideY, false, L.strokes.fit);
  y = sideY + frames.side.height;

  // ---- Under the drawings.
  const drawKey = () => {
    const keyY = y + 0.5;
    const middle = keyY + L.pitch.body * 0.5;
    setFont("normal", L.fonts.body);
    let x = MARGIN;
    for (const [dashed, word] of [[false, BRD_FIT_COPY.keyFile], [true, BRD_FIT_COPY.keyOurs]] as const) {
      const spec = dashed ? L.strokes.fit : L.strokes.file;
      doc.setDrawColor(spec.grey);
      doc.setLineWidth(spec.width);
      doc.setLineDashPattern([...spec.dash], 0);
      doc.line(x, middle, x + L.keyLine, middle);
      doc.setLineDashPattern([], 0);
      doc.setDrawColor(0);
      line(word, x + L.keyLine + 2, keyY, L.pitch.body);
      x += L.keyLine + 2 + doc.getTextWidth(word) + 8;
    }
    y += KEY_HEIGHT;
  };

  /** Cell text at the table's size, shrunk a little if a long figure would otherwise run into the next column. */
  const cell = (text: string, style: FontStyle, x: number, rowY: number, width: number) => {
    let size: number = L.fonts.table;
    setFont(style, size);
    while (doc.getTextWidth(drawable(text)) > width && size > 5) {
      size -= 0.25;
      doc.setFontSize(size);
    }
    line(text, x, rowY, L.pitch.row);
  };
  const drawTable = (table: BrdFitTable) => {
    const column = (CONTENT_WIDTH - L.labelColumn) / 5;
    setFont("bold", L.fonts.caption);
    line(table.caption, MARGIN, y, L.pitch.caption);
    y += L.pitch.caption;
    table.rows.forEach((row, i) => cell(row.label, "bold", MARGIN + L.labelColumn + i * column + 1, y, column - 2));
    y += L.pitch.row;
    doc.setLineWidth(0.15);
    doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y);
    for (const [which, word] of [["file", BRD_FIT_COPY.columnFile], ["fit", BRD_FIT_COPY.columnFit]] as const) {
      cell(word, "normal", MARGIN, y, L.labelColumn - 1);
      table.rows.forEach((row, i) => cell(row[which], "normal", MARGIN + L.labelColumn + i * column + 1, y, column - 2));
      y += L.pitch.row;
    }
    y += 1.5;
  };

  /** The BOTTOM block's three cross-sections in a row: each with its own caption over it, the file solid and ours dashed. */
  const drawSections = () => {
    const columns = sheet.bottom.read ? sheet.bottom.columns : [];
    const keys = ["nose", "center", "tail"] as const;
    const rowTop = y;
    for (const drawing of bottomFrames.drawings) {
      const index = keys.indexOf(drawing.key);
      const x = MARGIN + index * (bottomCell.width + L.bottomGap);
      const caption = (columns[index]?.drawingCaption ?? "").toUpperCase();
      let size: number = L.fonts.caption;
      setFont("bold", size);
      while (doc.getTextWidth(drawable(caption)) > bottomCell.width && size > 4.5) {
        size -= 0.25;
        doc.setFontSize(size);
      }
      line(caption, x, rowTop, L.pitch.caption);
      const at = rowTop + L.pitch.caption;
      const k = bottomCell.scale;
      const scaled = (points: readonly (readonly [number, number])[]) => points.map(([px, py]): [number, number] => [px * k, py * k]);
      doc.setDrawColor(L.strokes.stringer.grey);
      doc.setLineWidth(L.strokes.stringer.width);
      doc.setLineDashPattern([...L.strokes.stringer.dash], 0);
      doc.line(x + drawing.straightedge.x1 * k, at + drawing.straightedge.y * k, x + drawing.straightedge.x2 * k, at + drawing.straightedge.y * k);
      doc.line(x + drawing.stringer.x * k, at + drawing.stringer.y1 * k, x + drawing.stringer.x * k, at + drawing.stringer.y2 * k);
      doc.setLineDashPattern([], 0);
      stroke(scaled(drawing.file), at, false, L.strokes.file, x);
      stroke(scaled(drawing.fit), at, false, L.strokes.fit, x);
      lastBaseline = Math.max(lastBaseline, at + bottomFrames.height * k);
    }
    y += heightOf({ kind: "sections", height: L.pitch.caption + bottomFrames.height * bottomCell.scale + 1.5 });
  };

  /** The RAILS block's three cross-sections in a row: each with its own caption over it, the file solid and ours dashed, the rail at the right. */
  const drawRailSections = () => {
    const columns = sheet.rails.read ? sheet.rails.columns : [];
    const keys = ["nose", "center", "tail"] as const;
    const rowTop = y;
    for (const drawing of railFrames.drawings) {
      const index = keys.indexOf(drawing.key);
      const x = MARGIN + index * (bottomCell.width + L.bottomGap);
      const caption = (columns[index]?.drawingCaption ?? "").toUpperCase();
      let size: number = L.fonts.caption;
      setFont("bold", size);
      while (doc.getTextWidth(drawable(caption)) > bottomCell.width && size > 4.5) {
        size -= 0.25;
        doc.setFontSize(size);
      }
      line(caption, x, rowTop, L.pitch.caption);
      const at = rowTop + L.pitch.caption;
      const k = bottomCell.scale;
      const scaled = (points: readonly (readonly [number, number])[]) => points.map(([px, py]): [number, number] => [px * k, py * k]);
      doc.setDrawColor(L.strokes.stringer.grey);
      doc.setLineWidth(L.strokes.stringer.width);
      doc.setLineDashPattern([...L.strokes.stringer.dash], 0);
      doc.line(x + drawing.bottomLine.x1 * k, at + drawing.bottomLine.y * k, x + drawing.bottomLine.x2 * k, at + drawing.bottomLine.y * k);
      doc.setLineDashPattern([], 0);
      stroke(scaled(drawing.file), at, false, L.strokes.file, x);
      stroke(scaled(drawing.fit), at, false, L.strokes.fit, x);
      lastBaseline = Math.max(lastBaseline, at + railFrames.height * k);
    }
    y += heightOf({ kind: "railSections", height: L.pitch.caption + railFrames.height * bottomCell.scale + 1.5 });
  };

  /** The BOTTOM block's table: a header, then each row's wrapped cells in their columns. */
  const drawBottomTable = (item: Extract<Item, { kind: "bottomTable" }>) => {
    const column = (CONTENT_WIDTH - L.bottomLabelColumn) / 3;
    item.header.forEach((word, i) => cell(word, "bold", MARGIN + L.bottomLabelColumn + i * column + 1, y, column - 2));
    y += L.pitch.row;
    doc.setLineWidth(0.15);
    doc.setDrawColor(0);
    doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y);
    for (const row of item.rows) {
      const lines = Math.max(...row.cells.map((c) => c.length));
      setFont("normal", row.size);
      cell(row.label, "bold", MARGIN, y, L.bottomLabelColumn - 1);
      row.cells.forEach((cellLines, i) => {
        setFont("normal", row.size);
        cellLines.forEach((text, n) => line(text, MARGIN + L.bottomLabelColumn + i * column + 1, y + n * L.pitch.row, L.pitch.row));
      });
      y += lines * L.pitch.row;
    }
    y += 1.5;
  };

  const drawItems = (items: readonly Item[]) => {
    for (const item of items) {
      switch (item.kind) {
        case "text":
          drawText(item);
          break;
        case "table":
          drawTable(item.table);
          break;
        case "key":
          drawKey();
          break;
        case "gap":
          y += item.height;
          break;
        case "sections":
          drawSections();
          break;
        case "bottomTable":
          drawBottomTable(item);
          break;
        case "railSections":
          drawRailSections();
          break;
      }
    }
  };
  drawItems(under);

  // A sheet whose last line would fall off its foot is never printed.
  if (lastBaseline > footLimit) throw new Error("The overview does not fit on one page.");
  if (onSecondPage !== "none") {
    // What did not fit takes a page of its own, from the top margin, in the order the screen shows it: a second page is the most
    // there ever is.
    doc.addPage([BRD_OVERVIEW_PAGE.width, BRD_OVERVIEW_PAGE.height], "portrait");
    doc.setDrawColor(0);
    doc.setTextColor(0);
    lastBaseline = 0;
    y = MARGIN;
    // The RAILS block rides with BOTTOM on this page; when this page cannot hold both, RAILS alone takes a page of its own.
    const lead = onSecondPage === "blanks and bottom" ? [...underBlanks.slice(1), ...underBottomOnly] : underBottomOnly.slice(1);
    const railsOwnPage = MARGIN + sum(lead) + sum(underRails) > footLimit;
    drawItems(railsOwnPage ? lead : [...lead, ...underRails]);
    if (lastBaseline > footLimit) throw new Error("The overview's second page does not fit.");
    if (railsOwnPage) {
      doc.addPage([BRD_OVERVIEW_PAGE.width, BRD_OVERVIEW_PAGE.height], "portrait");
      doc.setDrawColor(0);
      doc.setTextColor(0);
      lastBaseline = 0;
      y = MARGIN;
      drawItems(underRails.slice(1));
      if (lastBaseline > footLimit) throw new Error("The overview's third page does not fit.");
    }
  }
  return doc;
}

/** The PDF's file name: the picked file's name, slugged to letters, digits and dashes, then `-closest-fit.pdf`. */
export function brdOverviewFileName(fileName: string): string {
  const slug = brdBoardName(fileName)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? `${slug}-closest-fit.pdf` : "board-file-closest-fit.pdf";
}

/** Builds the overview then prints it (`print-pdf.ts`). `tab` is the one `openPrintTab` opened for a finger, or `null`. */
export function printBrdOverviewPdf(options: BuildBrdOverviewPdfOptions, tab: Window | null): void {
  printPdf(buildBrdOverviewPdf(options), brdOverviewFileName(options.fileName), tab);
}
