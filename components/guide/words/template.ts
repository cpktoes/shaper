/**
 * TEMPLATE's GUIDE words (Phase 18, D-09): the intro, the five groups and the 22 cards, copied character
 * for character from `## TEMPLATE` on `18-GUIDE-WORDS.md` — the founder's page, and the source of truth.
 * `template.test.ts` holds every line here to that page; a correction lands on the page and here in one
 * change. Every sentence is a first draft for the founder's pen.
 */
import { guideCardId } from "@/lib/geometry/guide-card";
import type { GuideWordsCard, GuideWordsGroup } from "../guide-copy";

/** The intro under the GUIDE heading; `{board}` is the open board's name (the page's *Shortboard*). */
export const TEMPLATE_GUIDE_INTRO =
  "What each control on this page is, what it does to the board, and how it is shaped. Every card is your {board}'s outline the way VIEWER draws it, nose left — the whole board, then the part the control shapes, closer, with the setting pushed in muted dashes. The tail shapes are each drawn on this board; the wing cards draw the board with the wing the WINGS tab would add first.";

const LENGTH = "Board Length";
const NOSE = "Nose Controls";
const WIDE = "Widepoint Controls";
const TAIL = "Tail Controls";
const WINGS = "Wings";

export const TEMPLATE_GUIDE_GROUPS: readonly GuideWordsGroup[] = [
  { name: LENGTH, note: null },
  { name: NOSE, note: null },
  { name: WIDE, note: null },
  { name: TAIL, note: null },
  { name: WINGS, note: "the WINGS tab's own sidebar" },
];

function card(group: string, name: string, lines: Omit<GuideWordsCard, "id" | "page" | "group" | "name" | "info">): GuideWordsCard {
  return { id: guideCardId("template", group, name), page: "template", group, name, info: null, ...lines };
}

export const TEMPLATE_GUIDE_WORDS: readonly GuideWordsCard[] = [
  card(LENGTH, "Board Length", {
    is: "How long the board is, tip to tip along the stringer — the number every other template number hangs from.",
    does: 'A longer board paddles and glides more and holds a line; a shorter one turns quicker and fits a tighter pocket. The 12" stations and the wide point move with it.',
    how: "Mark the length on the stringer and square both tips; every station is measured from the tail tip, so get that mark first.",
  }),
  card(NOSE, "Nose Angle", {
    is: "How sharp the nose comes to its point: pointy at 35°, round at 90°.",
    does: "A pointy nose cuts into a steep face and trims the swing weight; a round nose carries foam forward for paddling and noseriding.",
    how: "Trace the template to the nose and fair the last foot with a long batten; sand the tip to the angle by eye against the drawing, keeping both sides the same.",
  }),
  card(NOSE, "Fullness", {
    is: "How much the curve bellies out between the wide point and the nose — thin keeps it straight, full pushes the width forward.",
    does: "Fullness up front adds paddle and planing area ahead of your chest; thinner keeps the entry rail curved and easier to set.",
    how: "Spring a batten through the wide point and the nose mark and check the curve has no flat spot; fullness is set in the template, not after cutting.",
  }),
  card(WIDE, "Width", {
    is: "The board's full width at its widest point.",
    does: "Wider floats, paddles and planes earlier and is steadier under foot; narrower rolls rail to rail quicker and holds a steeper face.",
    how: "Mark half the width each side of the stringer at the wide point station and spring the batten through it; a true wide point reads the same both sides.",
  }),
  card(WIDE, "Offset", {
    is: "Where the wide point sits along the board: at the centre, or slid toward the nose (+) or the tail (−).",
    does: "Forward carries the width into the front half for paddle and trim; back tightens the nose and loads the tail for drive and pivot.",
    how: "Measure the wide point station from the tail tip before marking the width; the curve either side follows from where this mark lands.",
  }),
  card(WIDE, "Tail Rail", {
    is: "How far the tail's rail runs straight before it curves in — short bends early, long keeps the width back.",
    does: "A long tail rail holds the width into the tail for speed and planing; a short one pulls the tail in for a tighter turning arc.",
    how: "Lay a straightedge along the tail rail and mark where it leaves the straight; trim the template so the curve starts there and runs clean to the tail.",
  }),
  card(WIDE, "Nose Rail", {
    is: "How far the nose's rail runs before it curves to the tip.",
    does: "A long nose rail carries width forward and straightens the entry; a short one lets the nose curve in sooner.",
    how: "As the tail rail: a straightedge along the nose rail shows where the curve begins; fair the template so it bends there and nowhere else.",
  }),
  card(TAIL, "Pin", {
    is: "A tail that closes to a point, no block.",
    does: "The least area in the tail: holds in big, steep surf and sinks easily into a turn, but gives up planing speed in small waves.",
    how: "Cut the outline to a point on the stringer, then round the tip with a block so the glass can wrap it.",
  }),
  card(TAIL, "Round", {
    is: "A tail that closes in one continuous curve, no corners.",
    does: "Smooth and forgiving rail to rail; carries more area than a pin and releases softly.",
    how: "Cut the curve through and fair it with a batten so no flat or corner is left anywhere around the tail.",
  }),
  card(TAIL, "Diamond", {
    is: "A tail cut to a point behind two corners, the diamond's depth setting how far the point runs back.",
    does: "The corners give a release point like a squash while the point keeps the outline shorter and the rail line clean.",
    how: "Mark the block width and the depth, cut the two straight edges to the point, and keep the corners crisp with a block.",
  }),
  card(TAIL, "Squash", {
    is: "A tail cut square across a block, the corners rounded.",
    does: "The planing area and two hard release points of most modern shortboards: fast in small waves, quick off the top.",
    how: "Mark the block width across the tail, cut square, and round the two corners to a small radius with a block.",
  }),
  card(TAIL, "Swallow", {
    is: "A tail cut into two points with a crotch between them.",
    does: "Each tip holds like a pin while the width between them keeps the planing speed — the fish's tail.",
    how: "Mark the block width and the crotch depth on the stringer, cut the V with a saw and clean it with a file, then round the two tips.",
  }),
  card(TAIL, "Tail Block", {
    is: "The width of the tail across its block, on a squash, diamond or swallow.",
    does: "A wider block means more area and lift in the tail; narrower tightens the turn and the bite.",
    how: "Mark half the block each side of the stringer at the tail and cut across; check the width with a square before rounding the corners.",
  }),
  card(TAIL, "Depth", {
    is: "Only a diamond or swallow tail has a depth: how far the cut runs in — the diamond's point behind its corners, the swallow's crotch between its tips.",
    does: "On a pin, round or squash tail the slider is greyed out. Deeper makes each tip more its own pin and loosens the tail; shallower keeps more of the block's area working.",
    how: "On a diamond or swallow, mark the depth on the stringer from the tail and saw the cut in to the mark; a file squares the inside corners.",
  }),
  card(TAIL, "Tail Angle", {
    is: "How sharp the tail curve comes to the block or point: pointy at 30°, round at 90°.",
    does: "A pointier tail pulls the outline in through the fins for hold; a rounder one keeps width behind the fins for speed and release.",
    how: "Fair the last foot of the tail curve with a batten through the block corners; the angle sets itself once the batten lies clean.",
  }),
  card(TAIL, "Fullness", {
    is: "How much the curve bellies out between the wide point and the tail.",
    does: "Fuller carries width into the tail for planing and drive; thinner straightens the tail rail for a cleaner line and a tighter arc.",
    how: "Spring a batten through the wide point and the tail block and look for flats; adjust the template before cutting.",
  }),
  card(WINGS, "+ Add a wing", {
    is: "A step in the outline ahead of the fins where the rail jumps in toward the stringer — up to two.",
    does: "The step lets the tail behind it run narrower and release while the width ahead keeps planing; the corner gives the rail a bite point.",
    how: "Cut the outline to the wingless curve first, mark the wing's station on both rails, then cut the step in with a saw and square it with a block.",
  }),
  card(WINGS, "Position from tail", {
    is: "Where the wing's corner sits along the board, from the tail.",
    does: "Further back puts the step on top of the fins for a sharper release; further forward shortens the planing tail behind it.",
    how: "Measure the station from the tail tip on both rails with a square and mark it before cutting; both wings must land at the same station.",
  }),
  card(WINGS, "Depth", {
    is: "How far the rail steps in at the wing, toward the stringer.",
    does: "A deeper wing narrows the tail more and bites harder; a shallow one is a hint of a corner.",
    how: "Mark the depth in from the rail at the wing's station and cut back to it, checking both sides against the template.",
  }),
  card(WINGS, "Vertical run", {
    is: "How long the step takes along the board: square at zero, a slanted step at two inches.",
    does: "A square step is a hard corner that releases sharply; a longer run blends the wing into the rail for a softer break.",
    how: "Mark where the step starts and ends along the rail; cut the slant between them with a saw and fair it with a block.",
  }),
  card(WINGS, "Corner radius", {
    is: "How round the wing's corner is, from a sharp point to the largest radius that fits.",
    does: "Sharp bites and releases; round softens the corner so the water lets go gradually.",
    how: "Round the corner with a block or a dowel wrapped in paper to the radius; a sharp wing is left as the saw cut it.",
  }),
  card(WINGS, "Lock to front fin · Offset from the fin", {
    is: "Ties the wing to the front fin's trailing-edge mark, so it follows the fins; the offset sets how far ahead or behind it sits.",
    does: "A wing at the fins releases water right where the fins hold; move the fins on FINS and the wing moves with them.",
    how: "Mark the front fin's trailing edge on the rail from the FINS page, measure the offset from it, and cut the wing there.",
  }),
];
