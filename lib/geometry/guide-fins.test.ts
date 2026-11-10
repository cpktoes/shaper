import { describe, expect, it } from "vitest";
import { guideFinsInput } from "./__fixtures__/guide-fins-input";
import {
  computeFinPlacement,
  FIN_SETUPS,
  finRoundingGrain,
  isQuadRearModelAvailable,
  MIN_MCKEE_LONGBOARD_QUAD_LENGTH,
  QUAD_REAR_MODELS,
  resetAdvanced,
  THRUSTER_FRONT_MODELS,
  TWIN_TEMPLATES,
  type FinAdvancedSpec,
  type FinPlacementSpec,
} from "./fins";
import { guideCaptionText, guideCardId, GUIDE_MIN_FIT, GUIDE_TEXT_PX, GUIDE_VIEWBOX_WIDTH, type GuidePrim } from "./guide-card";
import { guideFigureBounds, guideLabelOverlaps, guideTextBox, guideX, guideY } from "./guide-draw";
import {
  buildFinsGuide,
  FINS_GUIDE_CARD_IDS,
  FINS_GUIDE_CARD_ORDER,
  FINS_GUIDE_GROUP_SIZES,
  FINS_GUIDE_PUSH_FIELDS,
  finsGuideDetailMap,
  finsGuideVariants,
  guideFinGrainTag,
} from "./guide-fins";
import { guideFrame, guidePush } from "./guide-push";
import { formatDim, formatLength, formatMark } from "./measure-display";
import { BOARD_PRESETS } from "./presets";
import { mm, UNITS_SYSTEMS } from "./units";

const ids = FINS_GUIDE_CARD_IDS;
const shortboard = guideFinsInput("shortboard");
const fish = guideFinsInput("fish");

/** The fins a card draws: its board's fin lines in the detail, in the order they were drawn. */
function finLines(prims: readonly GuidePrim[]) {
  return prims.filter((p): p is Extract<GuidePrim, { kind: "line" }> => p.kind === "line" && p.role === "fin");
}
function pushLines(prims: readonly GuidePrim[]) {
  return prims.filter((p): p is Extract<GuidePrim, { kind: "line" }> => p.kind === "line" && p.role === "push");
}

describe("FINS' 23 cards, in the words page's order", () => {
  it("lists 23 ids in eight groups of 1, 1, 1, 4, 5, 1, 6 and 4", () => {
    expect(FINS_GUIDE_CARD_ORDER).toHaveLength(23);
    expect(FINS_GUIDE_GROUP_SIZES).toEqual([1, 1, 1, 4, 5, 1, 6, 4]);
    expect([...buildFinsGuide(shortboard, "imperial").keys()]).toEqual(FINS_GUIDE_CARD_ORDER);
  });

  it("names the setups and models by the app's own labels, each group opening with its setup", () => {
    const setupIds = [ids.single, ids.twin, ids.thruster, ids.twoPlusOne, ids.quad];
    FIN_SETUPS.forEach((s, i) => expect(setupIds[i]).toBe(guideCardId("fins", s.label, s.label)));
    expect([ids.twinUpright, ids.twinKeel, ids.twinTrailer]).toEqual(TWIN_TEMPLATES.map((t) => guideCardId("fins", "Twin", t.label)));
    expect([ids.thrusterProportional, ids.thrusterBasic, ids.thrusterMcKeeSB, ids.thrusterMcKeeGun]).toEqual(
      THRUSTER_FRONT_MODELS.map((m) => guideCardId("fins", "Thruster", m.label)),
    );
    expect([ids.quadBasic, ids.quadBasicOffRail, ids.quadMcKeeSB, ids.quadMcKeeLB]).toEqual(
      QUAD_REAR_MODELS.map((m) => guideCardId("fins", "Quad", m.label)),
    );
  });
});

describe("every setup and model card is the open board's fins with that setup or model picked", () => {
  it("changes only the setup and its model or template, with advanced reset as the sidebar does", () => {
    for (const system of UNITS_SYSTEMS) {
      const variants = finsGuideVariants(shortboard, system);
      const base = shortboard.effectiveFins;
      const expectSpec = (id: string, patch: Partial<FinPlacementSpec>, setup: FinPlacementSpec["finSetup"], tt = base.twinTemplate) =>
        expect(variants[id], id).toEqual({ ...base, ...patch, finSetup: setup, advanced: resetAdvanced(setup, tt) });
      expectSpec(ids.single, {}, "single");
      expectSpec(ids.twin, {}, "twin");
      for (const [id, t] of [
        [ids.twinUpright, "upright"],
        [ids.twinKeel, "keel"],
        [ids.twinTrailer, "trailer"],
      ] as const)
        expectSpec(id, { twinTemplate: t }, "twin", t);
      expectSpec(ids.thruster, {}, "thruster");
      for (const [id, m] of [
        [ids.thrusterProportional, "proportional"],
        [ids.thrusterBasic, "basic"],
        [ids.thrusterMcKeeSB, "mckeeSB"],
        [ids.thrusterMcKeeGun, "mckeeGun"],
      ] as const)
        expectSpec(id, { frontModel: m }, "thruster");
      expectSpec(ids.twoPlusOne, {}, "2plus1");
      expectSpec(ids.quad, {}, "quad");
      for (const [id, m] of [
        [ids.quadBasic, "basic"],
        [ids.quadBasicOffRail, "basicOffRail"],
        [ids.quadMcKeeSB, "mckeeSB"],
        [ids.quadMcKeeLB, "mckeeLB"],
      ] as const)
        expectSpec(id, { quadRearModel: m, quadCenterFinOn: false }, "quad");
      expectSpec(ids.quadCenter, { quadCenterFinOn: true }, "quad");
      expect(variants[ids.importDesignedBoard]).toBeNull();
      expect(variants[ids.convention]).toBeNull();
    }
  });

  it("draws each card's fins as computeFinPlacement gives them, in its order, trailing edge to leading edge, signed as stored", () => {
    for (const system of UNITS_SYSTEMS) {
      const cards = buildFinsGuide(shortboard, system);
      const variants = finsGuideVariants(shortboard, system);
      const map = finsGuideDetailMap(shortboard, system);
      for (const id of FINS_GUIDE_CARD_ORDER) {
        const card = cards.get(id)!;
        const pushed = FINS_GUIDE_PUSH_FIELDS[id] !== undefined;
        const spec = pushed || variants[id] === null ? shortboard.effectiveFins : variants[id]!;
        const marks = computeFinPlacement(spec, shortboard.finImportedTail).marks;
        const lines = finLines(card.figure.windows[0].prims);
        expect(lines, id).toHaveLength(marks.length);
        marks.forEach((m, i) => {
          expect(lines[i].x1).toBeCloseTo(guideX(map, m.offTail), 6);
          expect(lines[i].y1).toBeCloseTo(guideY(map, m.lateral), 6);
          expect(lines[i].x2).toBeCloseTo(guideX(map, m.leadingOffTail), 6);
          expect(lines[i].y2).toBeCloseTo(guideY(map, m.leadingLateral), 6);
        });
      }
    }
  });

  it("puts a pair's two fins one each side of the stringer — a left fin draws left of it, never multiplied by its side", () => {
    for (const preset of BOARD_PRESETS) {
      const input = guideFinsInput(preset.id);
      const map = finsGuideDetailMap(input, "imperial");
      const cards = buildFinsGuide(input, "imperial");
      for (const id of FINS_GUIDE_CARD_ORDER) {
        const lines = finLines(cards.get(id)!.figure.windows[0].prims);
        const variants = finsGuideVariants(input, "imperial");
        const spec = variants[id] ?? input.effectiveFins;
        const marks = computeFinPlacement(spec, input.finImportedTail).marks;
        for (const role of ["front", "rear"] as const) {
          const pair = marks.map((m, i) => ({ m, line: lines[i] })).filter(({ m }) => m.role === role);
          if (pair.length === 0) continue;
          expect(pair, `${preset.id} ${id} ${role}`).toHaveLength(2);
          const [a, b] = pair;
          expect(Math.sign(a.line.y1 - map.oy)).toBe(Math.sign(a.m.lateral));
          expect(Math.sign(a.line.y1 - map.oy)).toBe(-Math.sign(b.line.y1 - map.oy));
          expect(Math.sign(a.line.y2 - map.oy)).toBe(-Math.sign(b.line.y2 - map.oy));
        }
      }
    }
  });

  it("captions every setup and model card with what it draws, by the app's own labels", () => {
    const cards = buildFinsGuide(shortboard, "imperial");
    const caption = (id: string) => guideCaptionText(cards.get(id)!.caption);
    expect(caption(ids.single)).toBe("drawn as · Single Fin");
    expect(caption(ids.twin)).toBe("drawn as · Twin — Modern/Upright");
    expect(caption(ids.twinUpright)).toBe("drawn as · Twin — Modern/Upright");
    expect(caption(ids.twinKeel)).toBe("drawn as · Twin — Keel");
    expect(caption(ids.twinTrailer)).toBe("drawn as · Twin — Upright + Trailer");
    expect(caption(ids.thruster)).toBe("drawn as · Thruster — Basic (Half Rate)");
    expect(caption(ids.thrusterProportional)).toBe("drawn as · Thruster — Proportional");
    expect(caption(ids.thrusterBasic)).toBe("drawn as · Thruster — Basic (Half Rate)");
    expect(caption(ids.thrusterMcKeeSB)).toBe("drawn as · Thruster — McKee Shortboard");
    expect(caption(ids.thrusterMcKeeGun)).toBe("drawn as · Thruster — McKee Gun");
    expect(caption(ids.twoPlusOne)).toBe("drawn as · 2+1");
    expect(caption(ids.quad)).toBe("drawn as · Quad — McKee SB/Gun");
    expect(caption(ids.quadBasic)).toBe("drawn as · Quad — Basic - Spread");
    expect(caption(ids.quadBasicOffRail)).toBe("drawn as · Quad — Basic - Off-Rail");
    expect(caption(ids.quadMcKeeSB)).toBe("drawn as · Quad — McKee SB/Gun");
    expect(caption(ids.quadMcKeeLB)).toBe("drawn as · Quad — McKee SB/Gun");
    expect(caption(ids.quadCenter)).toBe("drawn as · Quad — McKee SB/Gun + Center (Five-fin)");
    expect(caption(ids.importDesignedBoard)).toBe("");
    expect(caption(ids.convention)).toBe("");
    for (const id of FINS_GUIDE_CARD_ORDER) {
      const kind = cards.get(id)!.caption.kind;
      if (FINS_GUIDE_PUSH_FIELDS[id]) expect(kind, id).toBe("dashed");
      else if (id === ids.importDesignedBoard || id === ids.convention) expect(kind, id).toBe("none");
      else expect(kind, id).toBe("drawnAs");
    }
  });
});

describe("the Shortboard's tags, as the words page shows them", () => {
  it("in Imperial", () => {
    const cards = buildFinsGuide(shortboard, "imperial");
    const tag = (id: string) => cards.get(id)!.tag;
    expect(tag(ids.importDesignedBoard)).toEqual({ kind: "on", text: "On this board" });
    expect(tag(ids.convention).text).toBe('to 1/16"');
    expect(tag(ids.thruster)).toEqual({ kind: "on", text: "On this board" });
    expect(tag(ids.thrusterBasic)).toEqual({ kind: "on", text: "On this board" });
    expect(tag(ids.quadMcKeeLB)).toEqual({ kind: "na", text: `Needs 8'0"` });
    expect(tag(ids.finBase)).toEqual({ kind: "value", text: '4 1/2"' });
    expect(tag(ids.finForward)).toEqual({ kind: "value", text: '11"' });
    expect(tag(ids.finOffRail)).toEqual({ kind: "value", text: '1 3/16"' });
    expect(tag(ids.finToe)).toEqual({ kind: "value", text: '1/4"' });
    const tagged = new Set<string>([
      ids.importDesignedBoard,
      ids.convention,
      ids.thruster,
      ids.thrusterBasic,
      ids.quadMcKeeLB,
      ids.finBase,
      ids.finForward,
      ids.finOffRail,
      ids.finToe,
    ]);
    for (const id of FINS_GUIDE_CARD_ORDER) if (!tagged.has(id)) expect(tag(id).kind, id).toBe("none");
  });

  it("captions the four Advanced pushes with the pushed figure", () => {
    const cards = buildFinsGuide(shortboard, "imperial");
    const caption = (id: string) => guideCaptionText(cards.get(id)!.caption);
    expect(caption(ids.finBase)).toBe('dashed · 5 1/2" base');
    expect(caption(ids.finForward)).toBe('dashed · 1" forward');
    expect(caption(ids.finOffRail)).toBe('dashed · 7/8" off the rail');
    expect(caption(ids.finToe)).toBe('dashed · 1/2" toe-in');
  });

  it("in Metric: whole millimetres on every fin figure, the Convention to 1 mm, the window 60 cm", () => {
    const cards = buildFinsGuide(shortboard, "metric");
    expect(cards.get(ids.finBase)!.tag.text).toBe("114 mm");
    expect(cards.get(ids.convention)!.tag.text).toBe("to 1 mm");
    expect(cards.get(ids.quadMcKeeLB)!.tag.text).toBe("Needs 243.8 cm");
    for (const id of FINS_GUIDE_CARD_ORDER) {
      const card = cards.get(id)!;
      expect(card.tag.text, id).not.toContain('"');
      expect(guideCaptionText(card.caption), id).not.toContain('"');
      for (const win of card.figure.windows)
        for (const prim of win.prims) {
          if (prim.kind !== "text" && prim.kind !== "dim") continue;
          const text = prim.parts.map((p) => p.text).join("");
          expect(text, id).not.toContain('"');
        }
    }
    const name = cards.get(ids.convention)!.figure.windows[0].prims.find((p) => p.kind === "text" && p.role === "name");
    expect(name && name.kind === "text" && name.parts.map((p) => p.text).join("")).toBe(`Tail, ${formatDim(guideFrame("metric").finsTailWindow, "metric")} from above`);
    expect(formatDim(guideFrame("metric").finsTailWindow, "metric")).toBe("60.0 cm");
  });

  it("the Convention tag says the grain finRoundingGrain prints", () => {
    expect(guideFinGrainTag("imperial")).toBe(`to ${finRoundingGrain("imperial")}`);
    expect(guideFinGrainTag("metric")).toBe("to 1 mm");
  });
});

describe("the Advanced pushes change only the fields their card declares", () => {
  it("base lengths with their flags; the three positions; both off-rail nudges; both toes", () => {
    for (const system of UNITS_SYSTEMS) {
      const push = guidePush(system).fins;
      const variants = finsGuideVariants(shortboard, system);
      const adv = shortboard.effectiveFins.advanced;
      const expectAdvanced = (id: string, patch: Partial<FinAdvancedSpec>) => {
        expect(variants[id], id).toEqual({ ...shortboard.effectiveFins, advanced: { ...adv, ...patch } });
        expect([...FINS_GUIDE_PUSH_FIELDS[id]!].sort()).toEqual(Object.keys(patch).sort());
      };
      expectAdvanced(ids.finBase, {
        baseLenForward: mm(adv.baseLenForward + push.finBase),
        baseLenForwardOverridden: true,
        baseLenCenter: mm(adv.baseLenCenter + push.finBase),
        baseLenCenterOverridden: true,
        baseLenRear: mm(adv.baseLenRear + push.finBase),
        baseLenRearOverridden: true,
      });
      expectAdvanced(ids.finForward, {
        forwardPositionOffset: mm(adv.forwardPositionOffset + push.finForward),
        centerPositionOffset: mm(adv.centerPositionOffset + push.finForward),
        rearPositionOffset: mm(adv.rearPositionOffset + push.finForward),
      });
      expectAdvanced(ids.finOffRail, {
        forwardOffRailNudge: mm(adv.forwardOffRailNudge + push.finOffRail),
        rearOffRailNudge: mm(adv.rearOffRailNudge + push.finOffRail),
      });
      expectAdvanced(ids.finToe, { forwardToeOverride: mm(push.finToe), rearToeOverride: mm(push.finToe) });
    }
  });

  it("draws each push's fins in muted dashes over the board's own", () => {
    const cards = buildFinsGuide(shortboard, "imperial");
    const variants = finsGuideVariants(shortboard, "imperial");
    for (const id of Object.keys(FINS_GUIDE_PUSH_FIELDS)) {
      const marks = computeFinPlacement(variants[id]!, shortboard.finImportedTail).marks;
      expect(pushLines(cards.get(id)!.figure.windows[0].prims), id).toHaveLength(marks.length);
    }
    for (const id of FINS_GUIDE_CARD_ORDER) if (!FINS_GUIDE_PUSH_FIELDS[id]) expect(pushLines(cards.get(id)!.figure.windows[0].prims), id).toHaveLength(0);
  });

  it("on a single fin the base card is the Fin Box Length and the rail-fin cards say they do not apply", () => {
    const longboard = guideFinsInput("longboard");
    expect(longboard.effectiveFins.finSetup).toBe("single");
    const cards = buildFinsGuide(longboard, "imperial");
    expect(cards.get(ids.finBase)!.name).toBe("Fin Box Length");
    expect(cards.get(ids.finOffRail)!.tag).toEqual({ kind: "na", text: "—" });
    expect(cards.get(ids.finToe)!.tag).toEqual({ kind: "na", text: "—" });
    expect(cards.get(ids.finOffRail)!.caption.kind).toBe("none");
    expect(cards.get(ids.single)!.tag).toEqual({ kind: "on", text: "On this board" });
  });
});

describe("McKee Longboard and the eight-foot line", () => {
  const at = (length: number) =>
    guideFinsInput("shortboard", { importing: false, fins: { boardLength: mm(length), finSetup: "quad", quadRearModel: "mckeeSB" } });

  it("carries no Needs tag at exactly the model's own minimum, and draws the longboard model", () => {
    const input = at(MIN_MCKEE_LONGBOARD_QUAD_LENGTH);
    expect(isQuadRearModelAvailable("mckeeLB", input.effectiveFins.boardLength)).toBe(true);
    const card = buildFinsGuide(input, "imperial").get(ids.quadMcKeeLB)!;
    expect(card.tag.kind).toBe("none");
    expect(guideCaptionText(card.caption)).toBe("drawn as · Quad — McKee Longboard");
  });

  it("a sixteenth of an inch shorter reads Needs 8'0\" (Metric Needs 243.8 cm) and draws the SB/Gun fallback", () => {
    const sixteenth = formatMark(mm(MIN_MCKEE_LONGBOARD_QUAD_LENGTH - MIN_MCKEE_LONGBOARD_QUAD_LENGTH / 1536), "imperial");
    expect(sixteenth).toBe('95 15/16"');
    const input = at(MIN_MCKEE_LONGBOARD_QUAD_LENGTH - MIN_MCKEE_LONGBOARD_QUAD_LENGTH / 1536);
    expect(isQuadRearModelAvailable("mckeeLB", input.effectiveFins.boardLength)).toBe(false);
    const imperial = buildFinsGuide(input, "imperial").get(ids.quadMcKeeLB)!;
    expect(imperial.tag).toEqual({ kind: "na", text: `Needs ${formatLength(MIN_MCKEE_LONGBOARD_QUAD_LENGTH, "imperial")}` });
    expect(imperial.tag.text).toBe(`Needs 8'0"`);
    expect(buildFinsGuide(input, "metric").get(ids.quadMcKeeLB)!.tag.text).toBe("Needs 243.8 cm");
    expect(guideCaptionText(imperial.caption)).toBe("drawn as · Quad — McKee SB/Gun");
  });
});

describe("the Fish", () => {
  it("is On this board on Twin and Modern/Upright, and nowhere else among the setups and models", () => {
    const cards = buildFinsGuide(fish, "imperial");
    expect(fish.effectiveFins.finSetup).toBe("twin");
    expect(cards.get(ids.twin)!.tag).toEqual({ kind: "on", text: "On this board" });
    expect(cards.get(ids.twinUpright)!.tag).toEqual({ kind: "on", text: "On this board" });
    for (const id of [ids.single, ids.thruster, ids.thrusterBasic, ids.twinKeel, ids.quad, ids.quadCenter])
      expect(cards.get(id)!.tag.kind, id).toBe("none");
  });
});

describe("the drawings", () => {
  it("are the strip and the tail detail, 236 tall, every point inside the 300-wide box", () => {
    for (const preset of BOARD_PRESETS) {
      for (const system of UNITS_SYSTEMS) {
        const cards = buildFinsGuide(guideFinsInput(preset.id), system);
        for (const id of FINS_GUIDE_CARD_ORDER) {
          const figure = cards.get(id)!.figure;
          expect(figure.height).toBe(236);
          expect(figure.windows).toHaveLength(1);
          expect(figure.windows[0].box).toEqual({ x: 8, y: 66, w: 284, h: 170 });
          const b = guideFigureBounds(figure);
          expect(Number.isFinite(b.w) && Number.isFinite(b.h)).toBe(true);
          expect(b.x).toBeGreaterThanOrEqual(0);
          expect(b.x + b.w).toBeLessThanOrEqual(GUIDE_VIEWBOX_WIDTH);
          expect(b.y + b.h).toBeLessThanOrEqual(236);
        }
      }
    }
  });

  it("dimension every fin figure as a mark through formatMark", () => {
    const cards = buildFinsGuide(shortboard, "imperial");
    const front = shortboard.finPlacement.marks.find((m) => m.role === "front" && m.side === 1)!;
    const labels = cards
      .get(ids.convention)!
      .figure.windows[0].prims.filter((p) => p.kind === "dim")
      .map((p) => (p.kind === "dim" ? p.parts.map((q) => q.text).join("") : ""));
    expect(labels).toEqual(
      expect.arrayContaining([
        `${formatMark(front.offTail, "imperial")} off tail`,
        `${formatMark(front.lateralValue!, "imperial")} off rail`,
        `${formatMark(front.toe, "imperial")} toe`,
        `${formatMark(front.baseLength, "imperial")} base`,
      ]),
    );
  });

  it("keep every label clear of the others, of every fin dot and inside its window, on the narrowest card", () => {
    for (const preset of BOARD_PRESETS) {
      for (const importing of [true, false]) {
        const input = guideFinsInput(preset.id, { importing });
        for (const system of UNITS_SYSTEMS) {
          const cards = buildFinsGuide(input, system);
          for (const id of FINS_GUIDE_CARD_ORDER) {
            const figure = cards.get(id)!.figure;
            for (const fit of [GUIDE_MIN_FIT, 0.79, 1.26]) {
              expect(guideLabelOverlaps(figure, fit), `${preset.id} ${importing} ${system} ${id} @${fit}`).toEqual([]);
              const dots = figure.windows[0].prims.filter((p) => p.kind === "dot");
              for (const prim of figure.windows[0].prims) {
                const box = guideTextBox(prim, fit);
                if (!box) continue;
                for (const dot of dots) {
                  if (dot.kind !== "dot") continue;
                  const clear =
                    dot.x + dot.r <= box.x || dot.x - dot.r >= box.x + box.w || dot.y + dot.r <= box.y || dot.y - dot.r >= box.y + box.h;
                  expect(clear, `${preset.id} ${system} ${id} label over a fin dot`).toBe(true);
                }
              }
            }
          }
        }
      }
    }
  });

  it("text never sits on the board: every label is outside the tail's band", () => {
    for (const preset of BOARD_PRESETS) {
      const input = guideFinsInput(preset.id);
      for (const system of UNITS_SYSTEMS) {
        const map = finsGuideDetailMap(input, system);
        const cards = buildFinsGuide(input, system);
        const size = GUIDE_TEXT_PX / GUIDE_MIN_FIT;
        for (const id of FINS_GUIDE_CARD_ORDER) {
          for (const prim of cards.get(id)!.figure.windows[0].prims) {
            if (prim.kind === "text" && prim.role === "name") continue;
            const box = guideTextBox(prim, GUIDE_MIN_FIT);
            if (!box) continue;
            const above = box.y + box.h <= map.oy - map.k * map.bandHalf + 0.01;
            const below = box.y >= map.oy + map.k * map.bandHalf - 0.01;
            expect(above || below, `${preset.id} ${system} ${id} ${size}`).toBe(true);
          }
        }
      }
    }
  });
});
