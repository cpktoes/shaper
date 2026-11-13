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
 * There is only ever one page.
 */
import jsPDF from "jspdf";
import { THREE_D_COPY } from "@/components/3d/three-d-copy";
import { printPdf } from "@/components/template/print-pdf";
import { sectionHeightLabel, type SectionHeight } from "@/lib/geometry/bottom-draw";
import { PAPER_MM, TEMPLATE_MARGIN_MM } from "@/lib/geometry/template";
import { BRD_FIT_COPY, brdFitFramesInBox, type BrdFitLook, type BrdFitSheet, type BrdFitTable } from "@/lib/export/brd-fit-preview";
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
  | { kind: "gap"; height: number };

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
}

/** Builds the one-page overview. Throws when it cannot fit its words on one page (never prints a clipped one). */
export function buildBrdOverviewPdf(options: BuildBrdOverviewPdfOptions): jsPDF {
  const { look, sheet, height } = options;
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
  const under: Item[] = [
    { kind: "key" },
    { kind: "gap", height: L.gap },
    { kind: "text", lines: [BRD_FIT_COPY.howClose], style: "bold", size: L.fonts.caption, pitch: L.pitch.caption },
    body(sheet.closeness.outline),
    body(sheet.closeness.rocker),
    body(sheet.closeness.thickness),
    body(sheet.tipsNote),
    { kind: "gap", height: L.gap },
    ...sheet.tables.map((table): Item => ({ kind: "table", table })),
    body(sheet.rockerUse),
    ...sheet.pointNotes.map(body),
    { kind: "gap", height: L.gap },
    { kind: "text", lines: [BRD_FIT_COPY.controls], style: "bold", size: L.fonts.caption, pitch: L.pitch.caption },
    body(sheet.controls.outline),
    body(sheet.controls.nose),
    body(sheet.controls.tail),
    body(sheet.controls.rocker),
    body(sheet.controls.thickness),
    { kind: "gap", height: L.gap },
    body(sheet.notRead),
  ];

  const headHeight = head.reduce((sum, item) => sum + heightOf(item), 0);
  const underHeight = under.reduce((sum, item) => sum + heightOf(item), 0);
  const top = MARGIN;
  const boxHeight = BRD_OVERVIEW_PAGE.height - MARGIN - top - headHeight - underHeight - L.pitch.caption;
  const captionGap = L.pitch.caption + 2.5;
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
  ) => {
    if (points.length < 2) return;
    doc.setDrawColor(spec.grey);
    doc.setLineWidth(spec.width);
    doc.setLineDashPattern([...spec.dash], 0);
    const [x0, y0] = points[0];
    const steps = points.slice(1).map(([x, py], i): [number, number] => [x - points[i][0], py - points[i][1]]);
    doc.lines(steps, originX + x0, at + y0, [1, 1], "S", closed);
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

  for (const item of under) {
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
    }
  }

  // A sheet whose last line would fall off its foot is never printed.
  if (lastBaseline > footLimit) throw new Error("The overview does not fit on one page.");
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
