/**
 * The GUIDE's words (Phase 17, D-18): nineteen cards, three lines each — what the cut is and looks like, what it does,
 * and how it is shaped — copied word for word from the founder's page, `17-GUIDE-WORDS.md`.
 *
 * That page is the source of truth, and it is his to mark up: a correction lands in both files in one change, and
 * `bottom-guide-words.test.ts` reads the page and fails if a single line here differs from it. Nothing else lives
 * here — no drawing, no markup, no sum; the cards draw these strings as plain text.
 *
 * One figure in the words is said differently in each system (the founder, 2026-11-09) — see `GUIDE_SPACING` below.
 */
import type { BottomCutName, BottomSectionKey } from "@/lib/geometry/bottom";
import type { UnitsSystem } from "@/lib/geometry/units";

/** One GUIDE card's words. `key` is the cut's own name (or `Channels`); `section` is the group it is listed under. */
export interface BottomGuideCard {
  key: BottomCutName | "Channels";
  section: BottomSectionKey | "channels";
  /** What it is and looks like — drawn in ink. */
  is: string;
  /** What it does — drawn muted, after `is` in the same paragraph. */
  does: string;
  /** How to shape — the note under the dashed rule, as the page writes it (an Imperial shaper's reading). */
  how: string;
}

/**
 * How far apart a straightedge check, or a channel's layout station, is — the one figure in the GUIDE's words. Four
 * How to shape notes carry it: Flat Entry, Deep Single Concave, Shallow Single Concave and Channels.
 *
 * It is a rule of thumb said in prose, not a number off the board, so each system says it its own round way and
 * nothing is converted (the founder, 2026-11-09: "15 cm in Metric" — never `15.2 cm`). The page writes the notes in
 * inches; a Metric shaper reads the same notes with `15 cm` in that place.
 */
export const GUIDE_SPACING: Readonly<Record<UnitsSystem, string>> = { imperial: '6"', metric: "15 cm" };

/** A card's How to shape note as a shaper on `system` reads it: the page's own line in Imperial, and in Metric the
 * same line with the spacing said the Metric way. */
export function guideHow(card: BottomGuideCard, system: UnitsSystem): string {
  if (system === "imperial") return card.how;
  return card.how.split(GUIDE_SPACING.imperial).join(GUIDE_SPACING.metric);
}

/** The nineteen cards in the page's order: Nose, Center, Tail, then Channels (cut last, inside TAIL). */
export const BOTTOM_GUIDE_WORDS: readonly BottomGuideCard[] = [
  {
    key: "Flat Entry",
    section: "nose",
    is: "The planed bottom left alone from the nose back.",
    does: "Neutral and quick to plane; the work is left to the center.",
    how: "Nothing to cut: plane the bottom true and check it with a straightedge laid rail to rail every 6\".",
  },
  {
    key: "Rolled Belly Entry",
    section: "nose",
    is: "The bottom rounds from the stringer to the rails under the nose, like a boat's hull.",
    does: "Softens the entry in chop and lets the board roll into a turn, at the cost of some speed.",
    how: "Pencil Start and End on the rails. Roll the planer out from the stringer toward each rail in overlapping passes, most at the Deepest station, and screen it until a flexible batten touches everywhere — no flat left between stringer and rail.",
  },
  {
    key: "Teardrop Nose Concave",
    section: "nose",
    is: "A single concave widest under the nose, closing to a point before the center.",
    does: "A noserider's lift: it holds air and water under the nose so it rides high with you standing on it.",
    how: "Pencil the edge at Off Rail from the tip back and close it to a point at End. Hollow along the stringer in shallow planer passes from Start, deepest at Deepest, then blend out to the pencil line with a flexible pad; a straightedge across the nose shows the depth.",
  },
  {
    key: "Blended Nose Concave",
    section: "nose",
    is: "A shallow single under the nose that fades into the center without an edge.",
    does: "Lifts the entry of a longboard or mid-length without the teardrop's drag.",
    how: "As the teardrop, but with no edge: carry the hollow out to the pencil line with a soft pad so no step is left, and fade it to nothing by End.",
  },
  {
    key: "Slight Single Concave Entry",
    section: "nose",
    is: "The faintest single concave from the nose back, barely a gauge mark deep.",
    does: "Quickens the entry and leads the water into the center's concave.",
    how: "A few shallow planer passes along the stringer from Start, screened out to Off Rail — a straightedge should show the gap you set and no more.",
  },
  {
    key: "Reverse Vee Nose",
    section: "nose",
    is: "A vee under the nose — the stringer low, both rails lifted — flattening out toward the center.",
    does: "Lets the nose knife through chop and roll into a turn instead of catching.",
    how: "Pencil Start on the rails. Plane each side from the stringer out to the rail, most at the Deepest station and nothing at the stringer, and fade both panels to flat by End; a straightedge laid across should rock on the stringer by the lift you set.",
  },
  {
    key: "Flat Center",
    section: "center",
    is: "Nothing cut between the wide point and the fins.",
    does: "Fast and predictable; the classic partner to a vee or a double in the tail.",
    how: "Nothing to cut: plane true, and check with a straightedge rail to rail.",
  },
  {
    key: "Deep Single Concave",
    section: "center",
    is: "One trough across the center, deepest at the stringer, running out flat at the rails.",
    does: "Lift and drive: it sends the water straight down the board. The modern shortboard standard.",
    how: "Pencil the edge at Off Rail from Start to End. Hollow along the stringer in shallow planer passes, deepest at the Deepest station, then screen out to the edge with a flexible pad; check the gap with a straightedge every 6\" and keep both sides the same.",
  },
  {
    key: "Shallow Single Concave",
    section: "center",
    is: "The same single at half the depth.",
    does: "Some of the lift with less of the drag, and friendlier in bumpy water.",
    how: "The same cut with half the passes — most of it is in the screening. Check it with a straightedge every 6\".",
  },
  {
    key: "Early Double Concave",
    section: "center",
    is: "Two troughs either side of a flat at the stringer, starting ahead of the wide point.",
    does: "Splits the water early, loosens the board, and runs on into a tail double or vee.",
    how: "Pencil the flat at Off Stringer, the trough line at Trough At and the edge at Off Rail. Hollow each side along its trough line with a block or a small plane, leaving the stringer flat untouched, and blend both ways; a straightedge across shows the two gaps and the ridge.",
  },
  {
    key: "Continuous Belly / Rolled Mid",
    section: "center",
    is: "The bottom rounds from the stringer to the rails along the whole middle — a displacement hull.",
    does: "Glides through chop and rolls into turns, giving up speed and lift.",
    how: "Roll the planer out from the stringer to the rails in long overlapping passes from Start to End, most at Deepest, then screen until a flexible batten touches everywhere; no flat anywhere between the stringer and the rail.",
  },
  {
    key: "Tri-Plane Hull Center",
    section: "center",
    is: "A flat panel down the stringer with a flat plane each side, angled up to the rails.",
    does: "Fast off the panel, with a vee's ease rail to rail.",
    how: "Pencil the panel's edge at Off Stringer each side. Plane each outer plane flat from that line out to the rail at one angle, most at the rail, leaving the center panel untouched; check each plane with a straightedge along the board and the angle across.",
  },
  {
    key: "Flat Exit",
    section: "tail",
    is: "Nothing cut from the fins back.",
    does: "The cleanest release; the fins do the turning.",
    how: "Nothing to cut: plane true, and check with a straightedge rail to rail.",
  },
  {
    key: "Double Concave Exit",
    section: "tail",
    is: "Two troughs through the fins to the tail, a flat left at the stringer.",
    does: "Each fin sits in its own stream of water for drive, and the ridge at the stringer helps the board roll rail to rail.",
    how: "Pencil the stringer flat, the trough lines and the edges from DATA's marks. Hollow each side along its trough with a block or a small plane, deepest at the front fins, leaving the stringer flat as the ridge, and fade both out by End.",
  },
  {
    key: "Panel Vee",
    section: "tail",
    is: "Two flat planes meeting at the stringer and rising to the rails, from about the fins out the tail.",
    does: "The classic: lifted rails roll into a turn easily, trading away some speed.",
    how: "Pencil Start on the rails. Plane each panel flat from the stringer out to the rail, most at the Deepest station and nothing at the stringer; a straightedge laid across should rock on the stringer by the lift you set, the same both sides.",
  },
  {
    key: "Spiral Vee",
    section: "tail",
    is: "A double concave cut into a vee; the vee grows toward the tail as the double runs out, so the panels seem to twist.",
    does: "The double's drive through the fins with the vee's easy roll off the tail.",
    how: "Cut the vee first as a panel vee, then hollow the two concaves into its panels along the trough lines, deepest at the fins, and fade both by End.",
  },
  {
    key: "Rolled Vee",
    section: "tail",
    is: "A vee whose planes are rounded instead of flat, with no corner at the stringer.",
    does: "Softer than a panel vee: forgiving through a turn, a touch slower.",
    how: "Cut it as a panel vee, then screen the corner at the stringer and the panels round until a flexible batten rolls over them with no flat and no ridge.",
  },
  {
    key: "Extending Single Concave",
    section: "tail",
    is: "The center's single concave carried through the fins and out the tail.",
    does: "Drive and lift to the very end — fast, and stiffer rail to rail.",
    how: "Carry the center's edge line through the fins to End and hollow along the stringer the same way, deepest at the front fins; fade it to flat by End so the tail releases.",
  },
  {
    key: "Channels",
    section: "channels",
    is: "Four, six or eight troughs through the fins, each a ramp into a vertical wall at the rail side, cut last.",
    does: "Every wall grips like a small fin: drive and hold at speed in clean, powerful waves.",
    how: "Rule every wall off the stringer at each 6\" station from DATA's marks and join the marks with a straightedge. Cut each channel from its wall with a small plane or a block, the floor ramping up to the next peak and the wall square to the bottom, deepest at the front fins; sand the floors with paper on a dowel and keep every wall straight along the board.",
  },
];
