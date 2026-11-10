/**
 * Every kind of board the five GUIDEs must hold their rules on (Phase 18, plan 18-08, R13): the four
 * presets as their cards open them (the Fish among them, a swallow), the Shortboard re-cut with each of the
 * other tails (a diamond, a pin, a round, a swallow — each through its TAIL_PRESETS button), the Shortboard
 * ordering a custom rocker from its blank's maker, the Longboard cut just under the length McKee Longboard
 * quad rears need and set up as that quad, the Shortboard with the two wings "+ Add a wing" adds, and the
 * board a fresh, unsaved `/design/outline` opens (the store's own defaults, no blank picked).
 *
 * Each board is its fields, one field replaced from a preset; each page's input is then worked out from
 * those fields by that page's own fixture helper, which makes the design store's memo calls in order.
 * Nothing here is a typed number: the custom rocker is the Customize Rocker card's own push, the short
 * length is a centimetre under the fin maths' own minimum, the wings are the app's own next wings.
 */
import { presetDesignFields } from "../../blanks/preset-blanks";
import type { BoardBlank } from "../blank";
import { DEFAULT_BOARD_SPEC, TAIL_PRESETS, type OutlineSpec, type TailShape } from "../board";
import { DEFAULT_FIN_PLACEMENT_SPEC, MIN_MCKEE_LONGBOARD_QUAD_LENGTH, type FinPlacementSpec } from "../fins";
import type { FinsGuideInput } from "../guide-fins";
import type { TemplateGuideInput } from "../guide-outline";
import { guidePush } from "../guide-push";
import type { RailsGuideInput } from "../guide-rails";
import type { RockerGuideInput } from "../guide-rocker";
import type { VolumeGuideInput } from "../guide-volume";
import type { FoilSpec } from "../foil";
import { BOARD_PRESETS, type BoardPreset } from "../presets";
import type { FiveStationRocker } from "../rocker";
import { DEFAULT_RAIL_BAND_SPEC, type RailBandSpec } from "../rail-bands";
import { mm, type UnitsSystem } from "../units";
import { nextWing } from "../wings";
import { finsGuideInputFromFields } from "./guide-fins-input";
import { railsGuideInputFromFields } from "./guide-rails-input";
import { rockerGuideInputFromFields } from "./guide-rocker-input";
import { templateGuideInputFromFields } from "./guide-template-input";
import { volumeGuideInputFromFields } from "./guide-volume-input";

/** A board's fields as the design store holds them, as far as the five GUIDEs read them. */
export interface GuideFixtureFields {
  outline: OutlineSpec;
  rocker: FiveStationRocker;
  foil: FoilSpec;
  rails: RailBandSpec;
  fins: FinPlacementSpec;
  blank: BoardBlank | null;
}

/** One fixture board and each page's GUIDE input for it. */
export interface GuideFixtureBoard {
  label: string;
  fields: GuideFixtureFields;
  template: TemplateGuideInput;
  rocker: RockerGuideInput;
  rails: RailsGuideInput;
  volume: VolumeGuideInput;
  fins: FinsGuideInput;
}

function preset(id: BoardPreset["id"]): GuideFixtureFields {
  const found = BOARD_PRESETS.find((p) => p.id === id);
  if (!found) throw new Error(`no preset ${id}`);
  return presetDesignFields(found);
}

function withTail(fields: GuideFixtureFields, kind: TailShape["kind"]): GuideFixtureFields {
  const tail = TAIL_PRESETS[kind];
  return { ...fields, outline: { ...fields.outline, tail: tail.tail, tailAngle: tail.tailAngle, tailFullness: tail.tailFullness } };
}

/** The board a fresh `/design/outline` opens: the store's own defaults, no blank, nothing picked. */
function stockBoard(): GuideFixtureFields {
  return {
    outline: DEFAULT_BOARD_SPEC.outline,
    rocker: DEFAULT_BOARD_SPEC.rocker,
    foil: DEFAULT_BOARD_SPEC.foil,
    rails: DEFAULT_RAIL_BAND_SPEC,
    fins: DEFAULT_FIN_PLACEMENT_SPEC,
    blank: null,
  };
}

/** The Shortboard ordering the change the Customize Rocker card pushes (`+1/2"N18"`) from its blank's maker. */
function customRocker(): GuideFixtureFields {
  const fields = preset("shortboard");
  const push = guidePush("imperial").rocker;
  return { ...fields, blank: { ...fields.blank!, rocker: { changes: [{ end: "nose", amount: mm(push.bend), fromTip: mm(push.bendFrom) }] } } };
}

/** The Longboard a centimetre short of what McKee Longboard rears need, set up as that quad. */
function shortMcKeeQuad(): GuideFixtureFields {
  const fields = preset("longboard");
  return {
    ...fields,
    outline: { ...fields.outline, length: mm(MIN_MCKEE_LONGBOARD_QUAD_LENGTH - 10) },
    fins: { ...fields.fins, finSetup: "quad", quadRearModel: "mckeeLB" },
  };
}

/** The Shortboard with the two wings "+ Add a wing" adds, one press at a time (the first wing's radius
 * follows the live system, so the board is the system's own). */
function twoWings(system: UnitsSystem): GuideFixtureFields {
  const fields = preset("shortboard");
  let outline = fields.outline;
  for (let i = 0; i < 2; i++) {
    const input = templateGuideInputFromFields({ outline, fins: fields.fins });
    const wings = input.outline.wings ?? [];
    outline = { ...input.outline, wings: [...wings, nextWing(wings, input.wingFinEdges, input.outlineGeometry, system)] };
  }
  return { ...fields, outline };
}

function board(label: string, fields: GuideFixtureFields): GuideFixtureBoard {
  return {
    label,
    fields,
    template: templateGuideInputFromFields({ outline: fields.outline, fins: fields.fins }),
    rocker: rockerGuideInputFromFields({ outline: fields.outline, rocker: fields.rocker, foil: fields.foil, blank: fields.blank }),
    rails: railsGuideInputFromFields(fields),
    volume: volumeGuideInputFromFields(fields),
    fins: finsGuideInputFromFields({ outline: fields.outline, fins: fields.fins }),
  };
}

/** The twelve fixture boards, each page's input worked out, for one system. */
export function guideFixtureBoards(system: UnitsSystem): GuideFixtureBoard[] {
  return [
    ...BOARD_PRESETS.map((p) => board(p.id, preset(p.id))),
    ...(["diamond", "pin", "round", "swallow"] as const).map((kind) => board(`shortboard on a ${kind} tail`, withTail(preset("shortboard"), kind))),
    board("shortboard ordering a custom rocker", customRocker()),
    board("longboard under 8'0 as a McKee Longboard quad", shortMcKeeQuad()),
    board("shortboard with two wings", twoWings(system)),
    board("the unsaved stock board", stockBoard()),
  ];
}
