import { describe, expect, it } from "vitest";
import { readGuideWordsPage } from "@/components/guide/words/read-words-page";
import { guideTemplateInput, guideTemplateInputWithWings } from "./__fixtures__/guide-template-input";
import { TAIL_PRESETS, type OutlineSpec, type TailShape } from "./board";
import { guideCaptionText, guideCardId, GUIDE_MIN_FIT, type GuideFigure, type GuidePrim } from "./guide-card";
import { guideLabelOverlaps, guideStripInset, guideTextBox } from "./guide-draw";
import {
  buildTemplateGuide,
  TEMPLATE_GUIDE_CARD_IDS,
  TEMPLATE_GUIDE_CARD_ORDER,
  TEMPLATE_GUIDE_PUSH_FIELDS,
  templateGuideVariants,
  type TemplateGuideInput,
} from "./guide-outline";
import { formatDim, formatLength, formatMark } from "./measure-display";
import { buildOutline, DIAMOND_BLOCK_MARGIN_MM } from "./outline";
import { BOARD_PRESETS } from "./presets";
import { mm, UNITS_SYSTEMS, type UnitsSystem } from "./units";
import { nextWing, wingRadiusTop } from "./wings";

const ids = TEMPLATE_GUIDE_CARD_IDS;
const words = readGuideWordsPage().pages.find((p) => p.page === "template")!;
const shortboard = guideTemplateInput("shortboard");
const fish = guideTemplateInput("fish");
const onTail = (kind: TailShape["kind"]) => guideTemplateInput("shortboard", TAIL_PRESETS[kind]);

const allPrims = (figure: GuideFigure): GuidePrim[] => [...figure.strip, ...figure.windows.flatMap((w) => w.prims)];
const pushPaths = (figure: GuideFigure) => allPrims(figure).filter((p) => p.kind === "path" && p.role === "push");
const labels = (figure: GuideFigure) => allPrims(figure).filter((p) => p.kind === "text" || p.kind === "dim");
/** A path's corners, from the absolute `M`/`L` pairs the builder writes. */
const corners = (d: string) => (d.match(/[ML]/g) ?? []).length;

/** The fixture boards every layout check runs on. */
function boards(system: UnitsSystem): [string, TemplateGuideInput][] {
  return [
    ...BOARD_PRESETS.map((p) => [p.id, guideTemplateInput(p.id)] as [string, TemplateGuideInput]),
    ["diamond", onTail("diamond")],
    ["pin", onTail("pin")],
    ["round", onTail("round")],
    ["one wing", guideTemplateInputWithWings("shortboard", 1, system)],
    ["two wings", guideTemplateInputWithWings("shortboard", 2, system)],
  ];
}

describe("TEMPLATE's 22 cards", () => {
  it("are the words page's 22, in its order, the two Fullness and the two Depth four distinct ids", () => {
    expect(TEMPLATE_GUIDE_CARD_ORDER).toEqual(words.cards.map((card) => guideCardId("template", card.group, card.name)));
    expect(TEMPLATE_GUIDE_CARD_ORDER).toHaveLength(22);
    expect(new Set(TEMPLATE_GUIDE_CARD_ORDER).size).toBe(22);
    const fullness = [ids.noseFullness, ids.tailFullness];
    const depth = [ids.tailDepth, ids.wingDepth];
    expect(new Set([...fullness, ...depth]).size).toBe(4);
    expect([...buildTemplateGuide(shortboard, "imperial").keys()]).toEqual(TEMPLATE_GUIDE_CARD_ORDER);
  });

  it("on the Shortboard in Imperial gives exactly the words page's tag and caption on every card", () => {
    const built = buildTemplateGuide(shortboard, "imperial");
    for (const card of words.cards) {
      const model = built.get(guideCardId("template", card.group, card.name))!;
      if (card.tag === null) expect(model.tag.kind, `${card.name} tag`).toBe("none");
      else expect(model.tag.text, `${card.group} ${card.name} tag`).toBe(card.tag);
      expect(guideCaptionText(model.caption), `${card.group} ${card.name} caption`).toBe(card.caption ?? "");
    }
    expect(built.get(ids.squash)!.tag.kind).toBe("on");
    expect(built.get(ids.tailDepth)!.tag.kind).toBe("na");
  });

  it("changes only each card's own fields, and draws its push as buildOutline of that variant", () => {
    for (const system of UNITS_SYSTEMS) {
      for (const [label, input] of boards(system)) {
        const variants = templateGuideVariants(input, system);
        const built = buildTemplateGuide(input, system);
        for (const cardId of TEMPLATE_GUIDE_CARD_ORDER) {
          const fields = TEMPLATE_GUIDE_PUSH_FIELDS[cardId];
          const { base, push } = variants[cardId];
          for (const spec of push ? [base, push] : [base]) {
            const rest = (o: OutlineSpec) => Object.fromEntries(Object.entries(o).filter(([k]) => !fields.includes(k as keyof OutlineSpec)));
            expect(rest(spec), `${label} ${cardId}`).toEqual(rest(input.outline));
          }
          const paths = pushPaths(built.get(cardId)!.figure);
          if (!push) {
            expect(paths, `${label} ${cardId}`).toHaveLength(0);
            continue;
          }
          expect(push, `${label} ${cardId}`).not.toEqual(base);
          expect(paths, `${label} ${cardId}`).toHaveLength(1);
          const pushed = buildOutline(push);
          const closes = Math.abs(pushed.centreCloseStation - pushed.points[0].station) > 0.5 ? 1 : 0;
          expect(corners((paths[0] as { d: string }).d), `${label} ${cardId}`).toBe(2 * pushed.points.length + closes);
        }
      }
    }
  });

  it("never says dashed with nothing dashed, and always says it when something is (D-26)", () => {
    for (const system of UNITS_SYSTEMS) {
      for (const [label, input] of boards(system)) {
        for (const card of buildTemplateGuide(input, system).values()) {
          expect(card.caption.kind === "dashed", `${label} ${card.id}`).toBe(pushPaths(card.figure).length > 0);
        }
      }
    }
  });
});

describe("TEMPLATE's tail cards", () => {
  it("draws each of the five tails on this board with its preset, nothing pushed, tagged only on the board's own tail", () => {
    for (const [input, own] of [
      [shortboard, "squash"],
      [fish, "swallow"],
    ] as const) {
      const variants = templateGuideVariants(input, "imperial");
      const built = buildTemplateGuide(input, "imperial");
      for (const kind of ["pin", "round", "diamond", "squash", "swallow"] as const) {
        const cardId = ids[kind];
        const preset = TAIL_PRESETS[kind];
        expect(variants[cardId]).toEqual({
          base: { ...input.outline, tail: preset.tail, tailAngle: preset.tailAngle, tailFullness: preset.tailFullness },
          push: null,
        });
        expect(built.get(cardId)!.tag, kind).toEqual(kind === own ? { kind: "on", text: "On this board" } : { kind: "none", text: "" });
        expect(built.get(cardId)!.caption.kind).toBe("none");
      }
    }
  });

  it("tags Tail Block — on a pin and a round tail, and Tail Angle — on a diamond, each drawn as it is with no caption", () => {
    for (const kind of ["pin", "round"] as const) {
      const card = buildTemplateGuide(onTail(kind), "imperial").get(ids.tailBlock)!;
      expect(card.tag).toEqual({ kind: "na", text: "—" });
      expect(card.caption.kind).toBe("none");
      expect(pushPaths(card.figure)).toHaveLength(0);
    }
    const diamond = buildTemplateGuide(onTail("diamond"), "imperial");
    expect(diamond.get(ids.tailAngle)!.tag).toEqual({ kind: "na", text: "—" });
    expect(diamond.get(ids.tailAngle)!.caption.kind).toBe("none");
    expect(pushPaths(diamond.get(ids.tailAngle)!.figure)).toHaveLength(0);
  });

  it("tags Swallow On this board on the Fish and Depth its own crotch depth as a mark, pushed deeper", () => {
    for (const system of UNITS_SYSTEMS) {
      const built = buildTemplateGuide(fish, system);
      const tail = fish.outline.tail as Extract<TailShape, { kind: "swallow" }>;
      expect(tail.kind).toBe("swallow");
      expect(built.get(ids.swallow)!.tag.kind).toBe("on");
      expect(built.get(ids.tailDepth)!.tag).toEqual({ kind: "value", text: formatMark(tail.crotchDepth, system) });
      const pushed = templateGuideVariants(fish, system)[ids.tailDepth].push!.tail as Extract<TailShape, { kind: "swallow" }>;
      expect(pushed.crotchDepth).toBeGreaterThan(tail.crotchDepth);
      expect(guideCaptionText(built.get(ids.tailDepth)!.caption)).toBe(`dashed · ${formatMark(pushed.crotchDepth, system)} deep`);
    }
  });

  it("on a diamond reads the depth the outline allows, and never pushes past it", () => {
    for (const input of [
      onTail("diamond"),
      // A diamond held short by its tail block (its depth already the block less the margin the outline
      // keeps): deeper has no room, so the push is drawn shallower (D-26).
      guideTemplateInput("shortboard", {
        ...TAIL_PRESETS.diamond,
        tail: { kind: "diamond", endWidth: mm(3 * DIAMOND_BLOCK_MARGIN_MM), depth: mm(2 * DIAMOND_BLOCK_MARGIN_MM) },
      }),
    ]) {
      for (const system of UNITS_SYSTEMS) {
        const built = buildTemplateGuide(input, system);
        const card = built.get(ids.tailDepth)!;
        expect(card.tag).toEqual({ kind: "value", text: formatMark(input.outlineGeometry.effectiveDiamondDepth, system) });
        const push = templateGuideVariants(input, system)[ids.tailDepth].push!;
        const allowed = buildOutline(push).effectiveDiamondDepth;
        expect(allowed).not.toBeCloseTo(input.outlineGeometry.effectiveDiamondDepth, 6);
        expect(allowed).toBeLessThanOrEqual((push.tail as Extract<TailShape, { kind: "diamond" }>).depth + 1e-9);
        expect(guideCaptionText(card.caption)).toBe(`dashed · ${formatMark(allowed, system)} deep`);
      }
    }
  });

  it("on a squash, pin and round tail says Depth is a diamond's or a swallow's, and draws the board as a swallow", () => {
    const swallow = TAIL_PRESETS.swallow;
    const crotch = (swallow.tail as Extract<TailShape, { kind: "swallow" }>).crotchDepth;
    for (const kind of ["squash", "pin", "round"] as const) {
      const input = kind === "squash" ? shortboard : onTail(kind);
      for (const system of UNITS_SYSTEMS) {
        const card = buildTemplateGuide(input, system).get(ids.tailDepth)!;
        expect(card.tag).toEqual({ kind: "na", text: "Diamond & swallow only" });
        expect(guideCaptionText(card.caption)).toBe(`dashed · as a swallow, ${formatMark(crotch, system)} deep`);
        const ghost = buildOutline({ ...input.outline, tail: swallow.tail, tailAngle: swallow.tailAngle, tailFullness: swallow.tailFullness });
        expect(templateGuideVariants(input, system)[ids.tailDepth].push).toEqual({
          ...input.outline,
          tail: swallow.tail,
          tailAngle: swallow.tailAngle,
          tailFullness: swallow.tailFullness,
        });
        const path = pushPaths(card.figure)[0] as { d: string };
        expect(corners(path.d)).toBe(2 * ghost.points.length + 1);

        const win = card.figure.windows[0];
        const dims = win.prims.filter((p) => p.kind === "dim");
        expect(dims.map((d) => d.parts.map((part) => part.text).join(""))).toContain(formatMark(crotch, system));
        // The note names the board's own tail, inside the window and above the board — never over it.
        const note = win.prims.find((p) => p.kind === "text" && p.role === "note")!;
        expect(note.kind === "text" && note.parts.map((part) => part.text).join("")).toBe(`no depth on a ${kind} tail`);
        const box = guideTextBox(note, GUIDE_MIN_FIT)!;
        const board = win.prims.find((p) => p.kind === "path" && p.role === "board") as { d: string };
        const ys = [...board.d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)]
          .map((m) => [Number(m[1]), Number(m[2])])
          .filter(([x]) => x >= win.box.x && x <= win.box.x + win.box.w)
          .map(([, y]) => y);
        expect(box.y + box.h).toBeLessThanOrEqual(Math.min(...ys));
      }
    }
  });
});

describe("TEMPLATE's wing cards", () => {
  it("draw a wingless board with the wing + Add a wing would add first, in the live system", () => {
    for (const system of UNITS_SYSTEMS) {
      const first = nextWing([], shortboard.wingFinEdges, shortboard.outlineGeometry, system);
      const variants = templateGuideVariants(shortboard, system);
      expect(variants[ids.addWing]).toEqual({ base: shortboard.outline, push: { ...shortboard.outline, wings: [first] } });
      for (const cardId of [ids.wingPosition, ids.wingDepth, ids.wingRun, ids.wingRadius, ids.wingLock]) {
        expect(variants[cardId].base, cardId).toEqual({ ...shortboard.outline, wings: [first] });
      }
      expect(variants[ids.wingRadius].push!.wings![0].radius).toBe(wingRadiusTop(first, system));
      const built = buildTemplateGuide(shortboard, system);
      expect(built.get(ids.addWing)!.tag).toEqual({ kind: "na", text: "None yet" });
      expect(built.get(ids.wingPosition)!.tag.text).toBe(formatDim(first.station, system));
      expect(built.get(ids.wingLock)!.tag).toEqual({ kind: "on", text: "Locked" });
    }
  });

  it("with wings, read wing 1's own values; with two, + Add a wing draws the board as it is with no caption", () => {
    for (const system of UNITS_SYSTEMS) {
      const one = guideTemplateInputWithWings("shortboard", 1, system);
      expect(buildTemplateGuide(one, system).get(ids.addWing)!.tag).toEqual({ kind: "value", text: "1 wing" });
      expect(buildTemplateGuide(one, system).get(ids.addWing)!.caption.kind).toBe("dashed");
      const two = guideTemplateInputWithWings("shortboard", 2, system);
      const built = buildTemplateGuide(two, system);
      const add = built.get(ids.addWing)!;
      expect(add.tag).toEqual({ kind: "value", text: "2 wings" });
      expect(add.caption.kind).toBe("none");
      expect(pushPaths(add.figure)).toHaveLength(0);
      const variants = templateGuideVariants(two, system);
      expect(variants[ids.wingDepth].base).toBe(two.outline);
      expect(variants[ids.wingDepth].push!.wings![1]).toEqual(two.outline.wings![1]);
      expect(built.get(ids.wingDepth)!.tag.text).toBe(formatMark(two.outline.wings![0].depth, system));
    }
  });
});

describe("TEMPLATE's figures in both systems", () => {
  it("print every tag, caption and label through the page's formatters; Metric has no inch or foot mark", () => {
    const preset = BOARD_PRESETS.find((p) => p.id === "shortboard")!;
    const metric = buildTemplateGuide(shortboard, "metric");
    expect(metric.get(ids.boardLength)!.tag.text).toBe(formatLength(preset.outline.length, "metric"));
    expect(metric.get(ids.boardLength)!.tag.text).toMatch(/^\d+\.\d cm$/);
    expect(metric.get(ids.width)!.tag.text).toBe(formatDim(preset.outline.widePointWidth, "metric"));
    expect(metric.get(ids.width)!.tag.text).toMatch(/^\d+\.\d cm$/);
    for (const [label, input] of boards("metric")) {
      for (const card of buildTemplateGuide(input, "metric").values()) {
        const texts = [card.tag.text, guideCaptionText(card.caption), ...labels(card.figure).map((p) => (p.kind === "text" || p.kind === "dim" ? p.parts.map((x) => x.text).join("") : ""))];
        for (const text of texts) expect(text, `${label} ${card.id}`).not.toMatch(/["″]|\d'/);
        // Every number in a caption is a figure part, so the painter keeps its unit in its own case.
        for (const part of card.caption.parts) if (/\d/.test(part.text)) expect(part.figure, `${label} ${card.id}`).toBe(true);
      }
    }
  });

  it("keeps every window inside the strip and every label inside its window, clear of the others", () => {
    for (const system of UNITS_SYSTEMS) {
      for (const [label, input] of boards(system)) {
        for (const card of buildTemplateGuide(input, system).values()) {
          const inset = guideStripInset(card.figure.windows[0].box.y - 6);
          for (const rect of card.figure.strip.filter((p) => p.kind === "rect")) {
            if (rect.kind !== "rect") continue;
            expect(rect.x, `${label} ${card.id}`).toBeGreaterThanOrEqual(inset.x - 1e-9);
            expect(rect.y, `${label} ${card.id}`).toBeGreaterThanOrEqual(inset.y - 1e-9);
            expect(rect.x + rect.w, `${label} ${card.id}`).toBeLessThanOrEqual(inset.x + inset.w + 1e-9);
            expect(rect.y + rect.h, `${label} ${card.id}`).toBeLessThanOrEqual(inset.y + inset.h + 1e-9);
          }
          for (const fit of [GUIDE_MIN_FIT, 0.79, 1.26]) {
            expect(guideLabelOverlaps(card.figure, fit), `${label} ${system} ${card.id} ${fit}`).toEqual([]);
          }
        }
      }
    }
  });
});
