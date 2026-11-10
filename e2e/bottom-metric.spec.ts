import { expect, test, type Page } from "@playwright/test";
import {
  BOTTOM_COPY,
  CHANNELS_COPY,
  channelSmoothnessWords,
  channelWidthLabel,
  channelWidthWords,
  dataFloorNote,
  floorWarning,
  layoutMarkColumnName,
  layoutMarksNote,
  referenceRowsNote,
  staggerLabel,
  staggerWords,
} from "../components/bottom/bottom-copy";
import { bottomStationSlider, formatBottomStation } from "../lib/geometry/blank-reasons";
import {
  BOTTOM_DATA_DEPTH_SHOWN,
  BOTTOM_SECTIONS,
  DEFAULT_BOTTOM,
  bottomDataRows,
  bottomFloorFlags,
  bottomLayoutMarks,
  bottomLitresLine,
  channelReadout,
  resolveBottom,
  stationFromNearestTip,
  stringerAtCenter,
  type BoardBottom,
  type BottomDataRow,
  type BottomSectionKey,
  type ResolvedCut,
} from "../lib/geometry/bottom";
import { bottomSection, sectionGauges, sectionRuler, topViewMarks, type BottomCutKey, type Gauge } from "../lib/geometry/bottom-draw";
import { bottomTileLine } from "../lib/geometry/bottom-tile-art";
import {
  LIVE_DESIGN_RULES,
  designBottomBoard,
  designCrossSectionInput,
  designFinPlacement,
  designSideProfile,
  deriveEffectiveRails,
  summarizeDesign,
  type DesignSummaryFields,
} from "../lib/geometry/design";
import { bottomImportedReadout } from "../lib/geometry/imported-readout";
import { columnUnitSuffix, formatDim, formatDimBare, formatLength, formatMark, formatMarkBare, measureSlider } from "../lib/geometry/measure-display";
import { buildOutline } from "../lib/geometry/outline";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { mm, type Mm, type UnitsSystem } from "../lib/geometry/units";
import { boardSections } from "../lib/geometry/volume";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { forgetOpenBoardOnEveryLoad, storedOpenBoard } from "./helpers/open-board";
import { goToScreen, openPhoneMenu, screenTile } from "./helpers/screens";
import { openAppSettings } from "./helpers/settings";

/**
 * BOTTOM in Metric (Phase 17, plan 17-13; R13, D-26; CLAUDE.md Rule 2).
 *
 * A Metric shaper reads BOTTOM all-metric: every depth and layout mark in whole millimetres, every station, width and
 * the board's size in centimetres to one decimal, and no inch figure anywhere on the page — the panel's readout and
 * slider rows, the two drawings, DATA's line, tables and notes, and the GUIDE.
 *
 * No Metric figure is typed here. The board this browser keeps is read back out of the page, the same pure maths the
 * screen uses (`lib/geometry/`) rebuilds its bottom, and every string is written by the app's own unit rule
 * (`measure-display.ts`, `formatBottomStation`) and the page's own words (`bottom-copy.ts`). The page must then say
 * exactly that — in Imperial first, which proves this file reads the page and rebuilds the board correctly before
 * Metric is judged by it. Switching back restores every label and writes nothing to the board.
 */

const SECTION_WORD: Record<BottomSectionKey, string> = { nose: "Nose", center: "Center", tail: "Tail" };
const SHORTBOARD = BOARD_PRESETS.find((p) => p.id === "shortboard")!;

/**
 * The panel's mark sliders (17-UI-SPEC §1's slider table): each one's track in inches, as the panel declares it. The
 * Imperial pass proves every row of this table against the page's own sliders before Metric is worked out from it — a
 * Metric track is these ends rounded inward onto whole millimetres by `measureSlider`, never typed.
 */
const MARK_ROWS = {
  offRail: { label: BOTTOM_COPY.offRail, rangeIn: { min: 0, max: 6 }, leftHint: BOTTOM_COPY.offRailLeft },
  offStringer: { label: BOTTOM_COPY.offStringer, rangeIn: { min: 0, max: 9 }, leftHint: BOTTOM_COPY.offStringerLeft },
  troughAt: { label: BOTTOM_COPY.troughAt, rangeIn: { min: 0.5, max: 8 }, leftHint: undefined },
  depth: { label: BOTTOM_COPY.depth, rangeIn: { min: 0, max: 0.5 }, leftHint: BOTTOM_COPY.depthLeft },
  veeLift: { label: BOTTOM_COPY.veeLift, rangeIn: { min: 0, max: 0.5 }, leftHint: undefined },
} as const;
type MarkField = keyof typeof MARK_ROWS;
/** A mark slider steps 1/16", or 1 mm. */
const MARK_STEP_IN = 1 / 16;
const CHANNEL_WIDTH_RANGE_IN = { min: 0.5, max: 4 };
/** Stagger is a dim: 1/2" steps, or 10 mm. */
const STAGGER = { rangeIn: { min: 0, max: 8 }, stepIn: 0.5, stepMm: 10 };
const STATION_FIELDS = ["start", "deepest", "end"] as const;
type StationField = (typeof STATION_FIELDS)[number];
const STATION_LABEL: Record<StationField, string> = { start: BOTTOM_COPY.start, deepest: BOTTOM_COPY.deepestAt, end: BOTTOM_COPY.end };
/** The section's Height pick when the page opens. */
const OPENING_HEIGHT = 4;
/** A ruler value's width, as the section estimates it (6.2 dots a figure). */
const rulerValueWidth = (text: string) => text.length * 6.2;

/** Every kind of space (a non-breaking one included) read as one plain space. */
const fold = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();
/** A slider's number, to four decimals — the page hands them back as text. */
const round = (n: number) => Math.round(n * 10_000) / 10_000;

/* ============ The board, rebuilt from the copy this browser keeps ============ */

/** The store's own chain, in pure code: the kept design's bottom read against the board's facts. */
function boardOf(design: DesignSummaryFields) {
  const geometry = buildOutline(design.outline);
  const profile = designSideProfile(design, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(design.rails, profile.effectiveFoil, design.railsImportFoilThickness);
  const placement = designFinPlacement(design);
  // The Shortboard has no wings, so its outline as kept is the outline the store reads the bottom against.
  const board = designBottomBoard(design.outline, geometry, profile, placement);
  const bottom: BoardBottom = design.bottom ?? DEFAULT_BOTTOM;
  const resolved = resolveBottom(bottom, board);
  const sections = boardSections(designCrossSectionInput(geometry, profile, rails, design.outline.length, { bottom, board }));
  return {
    design,
    bottom,
    board,
    resolved,
    placement,
    thickness: rails.center.boardThickness,
    flags: bottomFloorFlags(resolved, board, sections),
    litresNow: summarizeDesign(design).volumeLitres,
    litresBefore: summarizeDesign({ ...design, bottom: undefined }).volumeLitres,
  };
}
type Model = ReturnType<typeof boardOf>;

/* ============ What the page should say, by the app's own rules ============ */

interface SliderWords {
  /** The slider's spoken name. */
  name: string;
  /** What it says for its value. */
  words: string;
  /** The label line above the track. */
  line: string;
  min: number;
  max: number;
  step: number;
  value: number;
  /** The two hints under the track, or none. */
  hints: string[];
}

function slid(view: { value: number; min: number; max: number; step: number }) {
  return { value: round(view.value), min: round(view.min), max: round(view.max), step: round(view.step) };
}

function markRow(name: string, field: MarkField, value: Mm, system: UnitsSystem): SliderWords {
  const row = MARK_ROWS[field];
  const view = measureSlider(value, row.rangeIn, MARK_STEP_IN, 1, system);
  const mark = formatMark(value, system);
  const words = field === "troughAt" ? BOTTOM_COPY.fromStringer(mark) : mark;
  return {
    name,
    words,
    line: `${row.label} — ${words}`,
    ...slid(view),
    hints: row.leftHint ? [row.leftHint, formatMark(view.toMm(view.max), system)] : [],
  };
}

function stationRow(name: string, field: StationField, station: Mm, words: string, length: Mm, system: UnitsSystem): SliderWords {
  return {
    name,
    words,
    line: `${STATION_LABEL[field]} — ${words}`,
    ...slid(bottomStationSlider(station, length, system)),
    hints: [BOTTOM_COPY.stationLeft, BOTTOM_COPY.stationRight],
  };
}

function smoothnessRow(name: string, value: number, words: string, hints: string[]): SliderWords {
  return { name, words, line: `${BOTTOM_COPY.smoothness} — ${words}`, value, min: 0, max: 100, step: 5, hints };
}

/** Which rows a cut shows, in the panel's order (17-UI-SPEC §1, the "Shown for" column). */
function cutFields(cut: ResolvedCut): (MarkField | StationField | "smoothness")[] {
  if (cut.kind === "flat") return [];
  const rows: (MarkField | StationField | "smoothness")[] = [];
  if (cut.kind === "single" || cut.kind === "double") rows.push("offRail");
  if (cut.kind === "double" || cut.name === "Tri-Plane Hull Center") rows.push("offStringer");
  if (cut.kind === "double") rows.push("troughAt");
  rows.push(...STATION_FIELDS, "depth");
  if (cut.spiral) rows.push("veeLift");
  rows.push("smoothness");
  return rows;
}

/** Every slider row of the three cards and the channels, in the panel's order. */
function sliderWords(m: Model, system: UnitsSystem): SliderWords[] {
  const { board, resolved, bottom } = m;
  const rows: SliderWords[] = [];
  for (const section of BOTTOM_SECTIONS) {
    const cut = resolved[section];
    for (const field of cutFields(cut)) {
      if (field === "smoothness") {
        rows.push(
          smoothnessRow(BOTTOM_COPY.sliderName(section, BOTTOM_COPY.smoothness), cut.smoothness, BOTTOM_COPY.percent(cut.smoothness), [
            BOTTOM_COPY.smoothnessLeft,
            BOTTOM_COPY.smoothnessRight,
          ]),
        );
      } else if (field === "start" || field === "deepest" || field === "end") {
        const words = BOTTOM_COPY.fromTip(section, formatBottomStation(stationFromNearestTip(section, cut[field], board), system));
        rows.push(stationRow(BOTTOM_COPY.sliderName(section, STATION_LABEL[field]), field, cut[field], words, board.length, system));
      } else {
        rows.push(markRow(BOTTOM_COPY.sliderName(section, MARK_ROWS[field].label), field, cut[field], system));
      }
    }
  }

  const spec = bottom.channels;
  if (spec.count > 0) {
    const ch = resolved.channels;
    const readout = channelReadout(ch, board, resolved.wingRule);
    const width = measureSlider(spec.width, CHANNEL_WIDTH_RANGE_IN, MARK_STEP_IN, 1, system);
    rows.push({
      name: CHANNELS_COPY.sliderName(CHANNELS_COPY.width),
      words: channelWidthWords(readout, system),
      line: channelWidthLabel(readout, system),
      ...slid(width),
      hints: [],
    });
    rows.push(markRow(CHANNELS_COPY.sliderName(BOTTOM_COPY.offStringer), "offStringer", spec.offStringer, system));
    const fromTail = (field: StationField) => BOTTOM_COPY.fromTip("tail", formatBottomStation(ch[field], system));
    const channelStation = (field: StationField) =>
      stationRow(
        CHANNELS_COPY.sliderName(STATION_LABEL[field]),
        field,
        ch[field],
        field === "start" ? CHANNELS_COPY.startWords(fromTail(field), spec.longest) : fromTail(field),
        board.length,
        system,
      );
    rows.push(channelStation("start"));
    const staggerLine = staggerLabel(spec, readout, system);
    if (staggerLine !== null) {
      const stagger = measureSlider(spec.stagger, STAGGER.rangeIn, STAGGER.stepIn, STAGGER.stepMm, system);
      rows.push({
        name: CHANNELS_COPY.sliderName(CHANNELS_COPY.stagger),
        words: staggerWords(spec, readout, system) ?? "",
        line: staggerLine,
        ...slid(stagger),
        hints: [CHANNELS_COPY.staggerLeft, formatDim(stagger.toMm(stagger.max), system)],
      });
    }
    rows.push(channelStation("deepest"), channelStation("end"));
    rows.push(markRow(CHANNELS_COPY.sliderName(BOTTOM_COPY.depth), "depth", spec.depth, system));
    rows.push(
      smoothnessRow(CHANNELS_COPY.sliderName(BOTTOM_COPY.smoothness), spec.smoothness, channelSmoothnessWords(spec.smoothness), [
        CHANNELS_COPY.smoothnessLeft,
        CHANNELS_COPY.smoothnessRight,
      ]),
    );
  }
  return rows.map((row) => ({ ...row, name: fold(row.name), words: fold(row.words), line: fold(row.line), hints: row.hints.map(fold) }));
}

/** The floor sentences under the Depth rows, in the panel's order: Nose, Center, Tail, the channels. */
function floorLines(m: Model, system: UnitsSystem): string[] {
  return [...BOTTOM_SECTIONS, "channels" as const]
    .map((section) => floorWarning(m.flags.find((flag) => flag.section === section), m.board, system))
    .filter((line): line is string => line !== null)
    .map(fold);
}

function gaugeWords(gauge: Gauge, words: boolean, system: UnitsSystem): string {
  const value = formatMark(gauge.value, system);
  if (!words) return value;
  switch (gauge.kind) {
    case "stringer":
      return BOTTOM_COPY.gaugeAtStringer(value);
    case "railLift":
      return BOTTOM_COPY.gaugeRailLift(value);
    case "stringerLeft":
      return BOTTOM_COPY.gaugeStringerLeft(value);
    case "channel":
      return BOTTOM_COPY.gaugeInChannel(value);
    case "trough":
      return BOTTOM_COPY.gaugeInTrough(value);
  }
}

/** Everything the panel and the two drawings write, for the section's own box and live cut as the page has them. */
function viewerWords(m: Model, system: UnitsSystem, box: { width: number; height: number }, live: BottomCutKey) {
  const { board, resolved, design } = m;
  const readout = bottomImportedReadout(design.outline.length, design.outline.widePointWidth, m.thickness, system);
  // The section follows the channels just opened: their deepest station.
  const station = resolved.channels.deepest;
  const stationText = formatBottomStation(station, system);
  const drawing = bottomSection(resolved, board, mm(station), OPENING_HEIGHT, box, { live });
  const ruler = sectionRuler(drawing, resolved, board, live, system, rulerValueWidth);
  const marks = topViewMarks(board, resolved, live, m.placement, system);
  const railMarks: Record<string, string> = {};
  for (const mark of marks.upper) railMarks[mark.key] = fold(`${mark.name} · ${mark.value}`);
  for (const mark of marks.lower?.marks ?? []) railMarks[mark.key] = fold(`${mark.name} ${mark.value}`);
  return {
    readout: readout.items.map((item) => [fold(item.label), fold(item.value)]),
    sliders: sliderWords(m, system),
    floors: floorLines(m, system),
    noseLeft: fold(BOTTOM_COPY.topViewNoseLeft(formatLength(design.outline.length, system), [])),
    railMarks,
    caption: fold(BOTTOM_COPY.sectionCaption(stationText) + BOTTOM_COPY.sectionCaptionWidth(formatDim(drawing.widthAtStation, system))),
    sectionName: fold(BOTTOM_COPY.sectionName(stationText, formatDim(drawing.widthAtStation, system))),
    gauges: sectionGauges(drawing, resolved, board, system).map((gauge) => ({
      kind: gauge.kind,
      texts: gauge.labels.map((label) => fold(gaugeWords(gauge, label.words, system))),
    })),
    ruler: ruler
      ? {
          kind: ruler.caption === null ? "bare" : "captioned",
          caption: ruler.caption === null ? null : fold(ruler.caption),
          ticks: ruler.ticks.map((tick) => [String(tick.column), fold(tick.text)]),
        }
      : null,
    sectionAt: fold(BOTTOM_COPY.sectionAtValue(stationText)),
  };
}

/** DATA: the litres line, the depths table, the layout marks and the notes. */
function dataWords(m: Model, system: UnitsSystem) {
  const { board, resolved } = m;
  const rows = bottomDataRows(resolved, board);
  const marks = bottomLayoutMarks(resolved, board);
  const litres = bottomLitresLine(m.litresNow, m.litresBefore);
  const stringer = stringerAtCenter(resolved, board);
  const columns = BOTTOM_COPY.depthsColumns;
  const rowLabel = (row: BottomDataRow) =>
    row.label === "tail" ? BOTTOM_COPY.rowTail : row.label === "nose" ? BOTTOM_COPY.rowNoseTip : formatDimBare(row.station, system);
  const depth = (value: Mm) => (value < BOTTOM_DATA_DEPTH_SHOWN ? BOTTOM_COPY.emptyCell : formatMarkBare(value, system));
  const frontPair = m.placement.marks.some((mark) => mark.role === "front");
  const floorNotes = [...BOTTOM_SECTIONS, "channels" as const]
    .map((section) =>
      dataFloorNote(
        m.flags.find((flag) => flag.section === section),
        section === "channels" ? "" : resolved[section].name,
        board,
        system,
      ),
    )
    .filter((note): note is string => note !== null);
  const hasMarks = marks.columns.length > 0;
  return {
    litres: fold(
      BOTTOM_COPY.dataFirstLine(litres.foamOff, litres.now, litres.before, formatMark(stringer.left, system), formatMark(stringer.planed, system)),
    ),
    depthHeaders: [
      `${columns.station}${columnUnitSuffix("dim", system)}`,
      `${columns.width}${columnUnitSuffix("dim", system)}`,
      `${columns.deepest}${columnUnitSuffix("mark", system)}`,
      `${columns.railLift}${columnUnitSuffix("mark", system)}`,
      `${columns.stringerLeft}${columnUnitSuffix("mark", system)}`,
    ].map(fold),
    depthRows: rows.map((row) =>
      [
        rowLabel(row),
        row.width === null ? BOTTOM_COPY.emptyCell : formatDimBare(row.width, system),
        depth(row.deepest),
        depth(row.railLift),
        row.stringerLeft === null ? BOTTOM_COPY.emptyCell : formatMarkBare(row.stringerLeft, system),
      ].map(fold),
    ),
    marksHeading: hasMarks ? fold(BOTTOM_COPY.marksHeading(system === "metric")) : null,
    markHeaders: hasMarks
      ? [`${columns.station}${columnUnitSuffix("dim", system)}`, ...marks.columns.map((column) => layoutMarkColumnName(column))].map(fold)
      : [],
    markRows: hasMarks
      ? marks.rows.map((markRow, r) =>
          [rowLabel(rows[r]), ...markRow.cells.map((value) => (value === null ? BOTTOM_COPY.emptyCell : formatMarkBare(value, system)))].map(fold),
        )
      : [],
    notes: [
      BOTTOM_COPY.depthsNote,
      ...(hasMarks ? [layoutMarksNote(resolved.channels, system)] : []),
      referenceRowsNote(board, frontPair, system),
      ...floorNotes,
    ].map(fold),
  };
}

/* ============ What the page does say ============ */

/** The panel and the two drawings, read straight out of the page — every word as written, shown or not. */
async function readViewer(page: Page) {
  return page.evaluate(() => {
    const fold = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();
    const round = (n: number) => Math.round(n * 10_000) / 10_000;
    const all = (root: ParentNode, selector: string) => Array.from(root.querySelectorAll(selector));

    const card = all(document, '[role="group"]').find((el) => el.querySelector("dt") !== null) ?? null;
    const readout = card
      ? all(card, "dt").map((dt, i) => [fold(dt.textContent), fold(all(card, "dd")[i]?.textContent)])
      : [];

    const sliders = all(document, '[data-bottom-card] input[type="range"]').map((node) => {
      const input = node as HTMLInputElement;
      // The row: the nearest box above the slider whose first line is words and does not hold the slider itself.
      let row: Element | null = null;
      for (let el: Element | null = input; el?.parentElement; el = el.parentElement) {
        const first = el.parentElement.firstElementChild;
        if (first && !first.contains(input) && fold(first.textContent) !== "") {
          row = el.parentElement;
          break;
        }
      }
      const last = row?.lastElementChild ?? null;
      const hints =
        row && last && row.children.length > 2 && !last.contains(input) && last.className.includes("justify-between")
          ? all(last, ":scope > span").map((span) => fold(span.textContent))
          : [];
      return {
        name: fold(input.getAttribute("aria-label")),
        words: fold(input.getAttribute("aria-valuetext")),
        line: fold(row?.firstElementChild?.textContent),
        min: round(Number(input.min)),
        max: round(Number(input.max)),
        step: round(Number(input.step)),
        // The thumb says its true value; the bare input would round it onto the track's steps.
        value: round(Number(input.getAttribute("aria-valuenow") ?? input.value)),
        hints,
      };
    });

    const railMarks: Record<string, string | null> = {};
    for (const mark of all(document, "[data-bottom-rail-mark]")) {
      const text = mark.querySelector("text");
      railMarks[mark.getAttribute("data-bottom-rail-mark") ?? ""] = text ? fold(text.textContent) : null;
    }

    const svg = document.querySelector("svg[data-bottom-section]");
    const rect = svg?.getBoundingClientRect();
    const ruler = document.querySelector("[data-bottom-ruler]");
    const sectionAt = document.querySelector('[data-bottom-section-at] input[type="range"]');
    return {
      live: document.querySelector("[data-bottom-live]")?.getAttribute("data-bottom-live") ?? null,
      cutAt: document.querySelector("[data-bottom-cut-at]")?.getAttribute("data-bottom-cut-at") ?? null,
      box: { width: rect?.width ?? 0, height: rect?.height ?? 0 },
      shown: {
        readout,
        sliders,
        floors: all(document, "[data-bottom-card] [data-bottom-floor]").map((el) => fold(el.textContent)),
        noseLeft: fold(document.querySelector("[data-bottom-top-view-note]")?.textContent),
        railMarks,
        caption: fold(svg?.parentElement?.previousElementSibling?.firstElementChild?.textContent),
        sectionName: fold(svg?.getAttribute("aria-label")),
        gauges: all(document, "svg[data-bottom-section] [data-gauge]").map((gauge) => ({
          kind: gauge.getAttribute("data-gauge"),
          texts: all(gauge, "text").map((text) => fold(text.textContent)),
        })),
        ruler: ruler
          ? {
              kind: ruler.getAttribute("data-bottom-ruler"),
              caption: ruler.querySelector("[data-bottom-ruler-caption]") ? fold(ruler.querySelector("[data-bottom-ruler-caption]")?.textContent) : null,
              ticks: all(ruler, "[data-bottom-ruler-tick]").map((tick) => [
                tick.getAttribute("data-bottom-ruler-tick") ?? "",
                fold(tick.querySelector("text")?.textContent),
              ]),
            }
          : null,
        sectionAt: fold(sectionAt?.getAttribute("aria-valuetext")),
      },
    };
  });
}

/** DATA, read straight out of the page. */
async function readData(page: Page) {
  return page.evaluate(() => {
    const fold = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();
    const all = (root: ParentNode | null, selector: string) => (root ? Array.from(root.querySelectorAll(selector)) : []);
    const cells = (row: Element) => all(row, "th, td").map((cell) => fold(cell.textContent));
    const depths = document.querySelector("[data-bottom-depths]");
    const marks = document.querySelector("[data-bottom-marks]");
    return {
      litres: fold(document.querySelector("[data-bottom-litres]")?.textContent),
      depthHeaders: all(depths, "thead th").map((th) => fold(th.textContent)),
      depthRows: all(depths, "tbody tr").map(cells),
      // The heading stands just above the table's sideways scroller.
      marksHeading: marks ? fold(marks.parentElement?.parentElement?.previousElementSibling?.textContent) : null,
      markHeaders: all(marks, "thead th").map((th) => fold(th.textContent)),
      markRows: all(marks, "tbody tr").map(cells),
      notes: all(document, "[data-bottom-notes] p").map((p) => fold(p.textContent)),
    };
  });
}

/**
 * Every inch or foot figure on BOTTOM — a digit with a `"` or `'` straight after it — in the words drawn and in what a
 * screen reader is told, across the panel and whichever tab is open. Metric must find none.
 */
async function inchFigures(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const panel = document.querySelector("[data-bottom-card]");
    const folder = document.querySelector("[data-bottom-live], [data-bottom-data], [data-bottom-guide]");
    if (!panel || !folder) return ["BOTTOM's panel or its open tab was not found"];
    // The screen: the smallest box that holds both the panel and the open tab.
    let screen: Element = panel;
    while (!screen.contains(folder) && screen.parentElement) screen = screen.parentElement;
    const texts: string[] = [];
    const walker = document.createTreeWalker(screen, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) texts.push(node.textContent ?? "");
    for (const el of Array.from(screen.querySelectorAll("[aria-label], [aria-valuetext], [title]"))) {
      for (const name of ["aria-label", "aria-valuetext", "title"]) texts.push(el.getAttribute(name) ?? "");
    }
    return texts.filter((text) => /\d\s?["'′″]/.test(text)).map((text) => text.replace(/\s+/g, " ").trim());
  });
}

/* ============ Getting there ============ */

async function dismissStrips(page: Page) {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => window.localStorage.setItem(key, "true"), TOOLBAR_TIP_DISMISSAL_KEY);
}

/** Opens the Shortboard from the home page and walks to BOTTOM, so the board stays the one opened. */
async function openShortboardOnBottom(page: Page) {
  await page.goto("/");
  const card = page
    .getByRole("button")
    .filter({ hasText: SHORTBOARD.name })
    .filter({ hasText: /Start Shaping|\d\.\d L/ })
    .first();
  await expect(async () => {
    if (!/\/design\/outline$/.test(page.url()) && (await card.count()) > 0) {
      await card.scrollIntoViewIfNeeded({ timeout: 2_000 });
      await card.click({ timeout: 2_000 });
    }
    await expect(page).toHaveURL(/\/design\/outline$/, { timeout: 5_000 });
  }).toPass({ timeout: 90_000 });
  await goToScreen(page, "BOTTOM");
}

/** Picks a name from a section's Cut menu, retried until React owns the menu so a click before hydration is never lost. */
async function pick(page: Page, section: BottomSectionKey, name: string) {
  const echo = page.locator(`[data-bottom-card="${section}"] [data-bottom-cut-echo]`);
  await expect(async () => {
    await page.getByRole("combobox", { name: `${SECTION_WORD[section]} Cut` }).click();
    await page.getByRole("option", { name, exact: true }).click({ timeout: 2_000 });
    await expect(echo).toHaveText(name, { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
}

/** Picks an option from one of BOTTOM's other menus by its spoken name, the same way. */
async function pickFrom(page: Page, menu: string, option: string) {
  const trigger = page.getByRole("combobox", { name: menu, exact: true });
  await expect(async () => {
    await trigger.click();
    await page.getByRole("option", { name: option, exact: true }).click({ timeout: 2_000 });
    await expect(trigger.locator("[data-slot=select-value]")).toHaveText(option, { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
}

/** The design in the copy this browser keeps of the open board. */
async function keptDesign(page: Page): Promise<DesignSummaryFields | undefined> {
  const kept = await storedOpenBoard(page);
  return kept?.snapshot.design as unknown as DesignSummaryFields | undefined;
}

/** Picks a units system in App Default Settings, as a shaper does, and closes the pop-up. */
async function pickUnits(page: Page, system: UnitsSystem) {
  const dialog = await openAppSettings(page);
  const button = dialog.getByRole("group", { name: "Units" }).getByRole("button", { name: system === "metric" ? /^Metric/ : /^Imperial/ });
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden();
}

const openTab = (page: Page, name: string) => page.getByRole("tab", { name, exact: true }).click();

/** The VIEWER tab says exactly what the app's own rules write for this board, and returns what it said. */
async function expectViewer(page: Page, m: Model, system: UnitsSystem) {
  let said: Awaited<ReturnType<typeof readViewer>>["shown"] | undefined;
  await expect(async () => {
    const read = await readViewer(page);
    expect(read.live, "the channels are the live cut").toBe("channels");
    expect(read.cutAt, "the section follows the channels' deepest station").toBe(m.resolved.channels.deepest.toFixed(1));
    const want = viewerWords(m, system, read.box, "channels");
    // A rail label is dropped where it would touch its neighbour; every one that is drawn must read as worked out.
    const drawn = Object.fromEntries(Object.entries(read.shown.railMarks).filter(([, text]) => text !== null));
    const wantDrawn = Object.fromEntries(Object.entries(want.railMarks).filter(([key]) => key in drawn));
    expect(Object.keys(read.shown.railMarks).sort()).toEqual(Object.keys(want.railMarks).sort());
    expect(drawn).toEqual(wantDrawn);
    expect({ ...read.shown, railMarks: null }).toEqual({ ...want, railMarks: null });
    said = read.shown;
  }).toPass({ timeout: 30_000 });
  return said!;
}

/** DATA says exactly what the app's own rules write for this board, and returns what it said. */
async function expectData(page: Page, m: Model, system: UnitsSystem) {
  await openTab(page, BOTTOM_COPY.dataTab);
  await expect(page.locator("[data-bottom-data]")).toBeVisible();
  let said: Awaited<ReturnType<typeof readData>> | undefined;
  await expect(async () => {
    said = await readData(page);
    expect(said).toEqual(dataWords(m, system));
  }).toPass({ timeout: 30_000 });
  return said!;
}

/** The BOTTOM tile's line in the ☰ sheet (a phone's top bar only), then the sheet shut again. */
async function tileLine(page: Page): Promise<string> {
  await openPhoneMenu(page);
  const line = fold(await screenTile(page, "BOTTOM").locator("[data-tile-line]").innerText());
  await page.keyboard.press("Escape");
  await expect(page.locator('[role="menu"]')).toHaveCount(0);
  return line;
}

test.describe("BOTTOM in Metric: marks in millimetres, sizes and stations in centimetres", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "iphone", "one phone is enough for the words; the iPhone's own BOTTOM layout is 17-14's");
    test.setTimeout(420_000);
    await dismissStrips(page);
    await forgetOpenBoardOnEveryLoad(page);
  });

  test("a Deep Single, a Spiral Vee and six channels read all-metric, and switching back restores every label and writes nothing", async ({
    page,
  }, testInfo) => {
    const phone = testInfo.project.name !== "desktop";
    await openShortboardOnBottom(page);
    await pick(page, "center", "Deep Single Concave");
    await pick(page, "tail", "Spiral Vee");
    await pickFrom(page, CHANNELS_COPY.countSelectName, CHANNELS_COPY.countOption(6));

    // The board as this browser keeps it, once the three picks have landed in it.
    await expect.poll(async () => (await keptDesign(page))?.bottom?.channels.count, { timeout: 30_000 }).toBe(6);
    const kept = await storedOpenBoard(page);
    const design = (await keptDesign(page))!;
    expect(design.bottom?.center.name).toBe("Deep Single Concave");
    expect(design.bottom?.tail.name).toBe("Spiral Vee");
    const m = boardOf(design);

    // Imperial first: the page says what this file works out, so the same working can judge Metric.
    const imperialViewer = await expectViewer(page, m, "imperial");
    expect(imperialViewer.sliders.length, "every row of the two cuts and the channels was read").toBeGreaterThanOrEqual(22);
    expect(imperialViewer.gauges.length, "the section draws its gauges").toBeGreaterThan(0);
    expect(imperialViewer.floors.length, "the floor is named in words under a Depth row").toBeGreaterThan(0);
    const railLabels = Object.values(imperialViewer.railMarks).filter((text) => text !== null);
    expect(railLabels.length, "the top view writes its stations along the rail").toBeGreaterThanOrEqual(phone ? 1 : 2);
    expect(await inchFigures(page), "Imperial shows inch figures, so the Metric check below can find one").not.toEqual([]);
    const tile = phone ? await tileLine(page) : null;
    if (phone) expect(tile).toBe(fold(bottomTileLine(m.resolved)));
    const imperialData = await expectData(page, m, "imperial");
    expect(imperialData.markRows.length, "the layout marks are tabled").toBeGreaterThan(0);
    expect(imperialData.notes.length).toBeGreaterThanOrEqual(3);
    await openTab(page, BOTTOM_COPY.viewerTab);

    // Metric, picked the way a shaper picks it.
    await pickUnits(page, "metric");
    const metricViewer = await expectViewer(page, m, "metric");
    expect(await inchFigures(page), "no inch figure on the panel or the drawings").toEqual([]);

    // The house rule, said plainly: the size reads in centimetres, a station in centimetres, a mark in whole
    // millimetres, and Depth's track stops at the last whole millimetre inside 1/2" with its hint agreeing.
    for (const [, value] of metricViewer.readout) expect(value).toMatch(/^\d+\.\d\scm$/);
    const row = (name: string) => metricViewer.sliders.find((s) => s.name === name)!;
    const depthRow = row(BOTTOM_COPY.sliderName("center", BOTTOM_COPY.depth));
    const depthTrack = measureSlider(m.resolved.center.depth, MARK_ROWS.depth.rangeIn, MARK_STEP_IN, 1, "metric");
    expect(depthRow.max).toBe(depthTrack.max);
    expect(depthRow.step).toBe(1);
    expect(Number.isInteger(depthRow.max)).toBe(true);
    expect(depthRow.hints[1]).toBe(fold(formatMark(depthTrack.toMm(depthTrack.max), "metric")));
    expect(depthRow.hints[1]).toMatch(/^\d+\smm$/);
    expect(depthRow.words).toMatch(/^\d+\smm$/);
    expect(row(BOTTOM_COPY.sliderName("center", BOTTOM_COPY.start)).words).toMatch(/^\d+\.\d\scm\s/);
    expect(row(BOTTOM_COPY.sliderName("tail", BOTTOM_COPY.veeLift)).words).toMatch(/^\d+\smm$/);
    for (const gauge of metricViewer.gauges) for (const text of gauge.texts) expect(text).toMatch(/^\d+\smm(\s|$)/);
    for (const line of metricViewer.floors) expect(line).toMatch(/\d+\smm/);
    if (metricViewer.ruler) for (const [, text] of metricViewer.ruler.ticks) expect(text).toMatch(/^\d+$/);
    if (phone) expect(await tileLine(page), "the tile's line carries no measure, so it reads the same").toBe(tile);

    const metricData = await expectData(page, m, "metric");
    expect(await inchFigures(page), "no inch figure in DATA").toEqual([]);
    expect(metricData.depthHeaders[0]).toMatch(/cm/);
    expect(metricData.depthHeaders[2]).toMatch(/mm/);
    expect(metricData.marksHeading).toMatch(/mm/);
    expect(metricData.litres).toMatch(/finishes \d+\smm at the center, planed \d+\smm ·/);

    await openTab(page, BOTTOM_COPY.guideTab);
    await expect(page.locator("[data-bottom-guide]")).toBeVisible();
    expect(await inchFigures(page), "no inch figure in the GUIDE").toEqual([]);
    await openTab(page, BOTTOM_COPY.viewerTab);

    // Back to Imperial: every label exactly as it was, and the board not written.
    await pickUnits(page, "imperial");
    expect(await expectViewer(page, m, "imperial")).toEqual(imperialViewer);
    expect(await expectData(page, m, "imperial")).toEqual(imperialData);
    expect(await storedOpenBoard(page), "switching systems writes nothing to the board").toEqual(kept);

    // A Depth kept at the full 1/2", which is 12.7 mm: in Metric its label rounds to the nearest whole millimetre while
    // the thumb rests at the last whole millimetre inside the range — and showing it that way writes nothing.
    const depthName = BOTTOM_COPY.sliderName("center", BOTTOM_COPY.depth);
    const inchTrack = measureSlider(m.resolved.center.depth, MARK_ROWS.depth.rangeIn, MARK_STEP_IN, 1, "imperial");
    const fullDepth = inchTrack.toMm(inchTrack.max);
    await page.getByRole("slider", { name: depthName, exact: true }).focus();
    await page.keyboard.press("End");
    await expect.poll(async () => (await keptDesign(page))?.bottom?.center.depth, { timeout: 30_000 }).toBeCloseTo(fullDepth, 6);
    const keptFull = await storedOpenBoard(page);
    await pickUnits(page, "metric");
    const fullRow = markRow(depthName, "depth", fullDepth, "metric");
    const want = { ...fullRow, name: fold(fullRow.name), words: fold(fullRow.words), line: fold(fullRow.line), hints: fullRow.hints.map(fold) };
    await expect
      .poll(async () => (await readViewer(page)).shown.sliders.find((slider) => slider.name === want.name), { timeout: 30_000 })
      .toEqual(want);
    expect(want.value, "the thumb rests at the end of its track").toBe(want.max);
    const metricTrack = measureSlider(fullDepth, MARK_ROWS.depth.rangeIn, MARK_STEP_IN, 1, "metric");
    expect(fullDepth, "the kept depth is past the track's last whole millimetre").toBeGreaterThan(metricTrack.toMm(metricTrack.max));
    expect(want.words, "the label says the kept depth, rounded").not.toBe(want.hints[1]);
    expect(want.words).toMatch(/^\d+\smm$/);
    expect(await storedOpenBoard(page), "showing a kept depth in Metric writes nothing").toEqual(keptFull);
  });
});
