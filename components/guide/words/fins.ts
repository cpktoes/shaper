/**
 * FINS' GUIDE words (Phase 18, D-09, D-12, D-13): the intro, the eight groups and the 23 cards, copied character for
 * character from `## FINS` on `18-GUIDE-WORDS.md` — the founder's page, and the source of truth. Fourteen cards carry
 * a Model info note: the old MODEL INFO tab's own words, verbatim, each on the card of the setup or model it describes
 * (the tab itself is gone). `fins.test.ts` holds every line here to that page and holds every sentence the MODEL INFO
 * tab said to these lines. Every other sentence is a first draft for the founder's pen.
 */
import { guideCardId } from "@/lib/geometry/guide-card";
import type { GuideWordsCard, GuideWordsGroup } from "../guide-copy";

/** The intro under the GUIDE heading; `{board}` is the open board's name (the page's *Shortboard*). */
export const FINS_GUIDE_INTRO =
  "Each fin setup with its models or templates: what it is, what it does to the ride, where its numbers come from (the MODEL INFO notes, now on the cards) and how the marks are laid out. Every card is your {board}'s tail the way VIEWER draws it — the last 24\" from above, the fins as lines from trailing edge to leading edge — each setup and model drawn on this board, and the Advanced settings pushed in muted dashes. No cant: the page has none.";

const INPUTS = "Inputs";
const CONVENTION = "Convention";
const SINGLE = "Single Fin";
const TWIN = "Twin";
const THRUSTER = "Thruster";
const TWO_PLUS_ONE = "2+1";
const QUAD = "Quad";
const ADVANCED = "Advanced";

export const FINS_GUIDE_GROUPS: readonly GuideWordsGroup[] = [
  { name: INPUTS, note: null },
  { name: CONVENTION, note: "how every mark below is measured" },
  { name: SINGLE, note: "one box on the stringer" },
  { name: TWIN, note: "two rail fins, placed by one of three templates" },
  {
    name: THRUSTER,
    note: "the front pair by one of four front models (the quad's front pair uses them too), the center fin behind",
  },
  { name: TWO_PLUS_ONE, note: "a single's center box with two side bites" },
  {
    name: QUAD,
    note: "the rear pair by one of four rear models, each bringing its matching front model; a fifth box behind if you want it",
  },
  {
    name: ADVANCED,
    note: "the forward fins'; the rear pair and the center fin have the same",
  },
];

function card(
  group: string,
  name: string,
  lines: Omit<GuideWordsCard, "id" | "page" | "group" | "name">,
): GuideWordsCard {
  return {
    id: guideCardId("fins", group, name),
    page: "fins",
    group,
    name,
    ...lines,
  };
}

export const FINS_GUIDE_WORDS: readonly GuideWordsCard[] = [
  card(INPUTS, "Import Designed Board", {
    is: "Takes the board's length, its tail width at 12\" and its tail shape from TEMPLATE — the three numbers every fin position is worked from.",
    does: "The fins follow the outline as you change it; untick to place fins for a board you know only by those three numbers.",
    info: null,
    how: "Leave it ticked and finish TEMPLATE first — the fin marks are measured from the tail tip and in from the rail you drew.",
  }),
  card(CONVENTION, "Trailing-edge convention", {
    is: "All positions use the trailing-edge convention: off-tail and off-rail are measured to the trailing edge of the fin base, and toe-in is the leading edge's inward offset from that trailing edge (regardless of fin base length).",
    does: 'Rears are often defined by a trailing edge spread rather than off-tail measurement, and every value is rounded to the nearest 1/16".',
    info: null,
    how: "Mark the trailing edge first — off the tail along the stringer, squared across, then in from the rail — and lay the leading edge from it with the toe; the base length moves the leading-edge mark, never the trailing edge.",
  }),
  card(SINGLE, "Single Fin", {
    is: "One fin on the stringer in a long box, set well forward of the tail.",
    does: "Pivot and glide: a single fin trims and carves long arcs and holds a straight line; it does not want to be pumped.",
    info: 'Single fin box placement comes from an established fixed range rather than a length equation — the default value is in a common working range (4 1/2" to 6") and can be fine-tuned by the forward/aft slider in the advanced menu, rather than solved for.',
    how: "Mark the box's centre on the stringer at the off-tail distance from DATA and route the box square to the stringer, the length of the box.",
  }),
  card(TWIN, "Twin", {
    is: "Two fins out by the rails and nothing on the stringer.",
    does: "Loose and fast: twins skate and release off the tail and love small, soft waves; they slide out when pushed hard.",
    info: 'All twin placements come from established fixed ranges rather than a length equation — they\'re centered in a working range (Modern = 7" to 8", Keel = 6" to 6 1/2", and Upright+Trailer = at ~10") and can be adjusted by the forward/aft slider in the advanced menu, rather than solved for.',
    how: "Mark each fin's trailing edge off the tail on the stringer and square across, then measure in from the rail at that mark; mark the leading edge with the toe and join the two for the box.",
  }),
  card(TWIN, "Modern/Upright", {
    is: "The modern twin: upright fins by the rails, toed in.",
    does: "Fast and loose with more drive than a keel; the everyday twin.",
    info: 'Good for shorter base (generally ≤ 5 1/2"), more upright twin fins.',
    how: "Mark the trailing edges off the tail and in from the rail, then the leading edges with the toe, and join them for the boxes.",
  }),
  card(TWIN, "Keel", {
    is: "Keel fins: long, low bases set further back with little toe.",
    does: "The retro fish feel: glide and down-the-line speed, long drawn turns, little pivot.",
    info: 'Use for wide base (generally > 5 1/2"), retro-style twin fins.',
    how: "As the upright twin, with the keel's longer base: mark both ends of the base and keep the toe small.",
  }),
  card(TWIN, "Upright + Trailer", {
    is: "Upright twins with a small trailer fin behind them on the stringer.",
    does: "A twin's speed with a touch of hold at the tail, so it releases less when pushed.",
    info: "Typically used with shorter-base, thruster-like, twins with a small trailer fin for added hold and drive.",
    how: "Mark the twins as uprights, then the trailer's trailing edge on the stringer four inches off the tail.",
  }),
  card(THRUSTER, "Thruster", {
    is: "Two front fins by the rails and a centre fin behind them.",
    does: "The all-rounder: the centre fin holds what the twins give away, so it drives through turns and pumps for speed.",
    info: null,
    how: "Mark the two front trailing edges off the tail and in from the rail, their leading edges with the toe, then the centre fin's trailing edge on the stringer.",
  }),
  card(THRUSTER, "Proportional", {
    is: "Front fins placed at a fixed share of the board's length, so a longer board puts them further up.",
    does: "A simple rule that keeps the cluster in proportion to the board; a touch further forward than the other models on a long board.",
    info: "A straightforward linear length-scaled placement based on a smaller range of short board. It's the simplest of the four and the least tuned for longer boards.",
    how: "Use DATA's marks for this model — off tail, off rail and toe — and check both sides measure the same before routing.",
  }),
  card(THRUSTER, "Basic (Half Rate)", {
    is: "Front fins placed by a straight-line rule that moves them up at half the rate of the board's length.",
    does: "Conservative: the cluster stays nearer the tail as the board grows, for a tighter, more pivoty feel.",
    info: 'Also scales linearly with length, but more slowly. It follows a "half rate convention" based on the idea that stance width scales slower than board length.',
    how: "Use DATA's marks for this model and check both sides the same; the toe is a quarter inch here.",
  }),
  card(THRUSTER, "McKee Shortboard", {
    is: "Rusty's and McKee's shortboard numbers: the front fins by the board's length and the tail's width, with a McKee toe aimed at a point near the nose.",
    does: "The modern performance standard — drive with release; a narrow tail pulls the cluster back.",
    info: 'Fitted to Greg McKee\'s published fin-placement guidance for shortboards and guns respectively. Also follows a "half rate" style convention.',
    how: "Use DATA's marks; for the toe, aim each fin's leading edge at the point the McKee table gives near the nose and check with a straightedge laid along the fin's base.",
  }),
  card(THRUSTER, "McKee Gun", {
    is: "McKee's gun placement: the cluster set for long, drawn-out turns at speed.",
    does: "Fins further up and toed for hold on a big, fast face; less pivot, more drive.",
    info: 'Fitted to Greg McKee\'s published fin-placement guidance for shortboards and guns respectively. Also follows a "half rate" style convention.',
    how: "As the shortboard model, aimed with the table; keep the cluster symmetrical with a straightedge from each fin to its aim point.",
  }),
  card(TWO_PLUS_ONE, "2+1", {
    is: "A long centre box with two small side bites ahead of it.",
    does: "A single fin's glide and trim with the side bites' extra hold through a turn — the mid-length and longboard standard.",
    info: 'The center fin box placement follows the Single Model above. Side bite placements come from an established fixed range, scaled off a length anchor of 9\' rather than a length equation — the default value is centered in a working range (15" to 16 1/2") and can be adjusted by the forward/aft slider in the advanced menu, rather than solved for.',
    how: "Mark the centre box as a single, then the two side bites off the tail and in from the rail with their toe.",
  }),
  card(QUAD, "Quad", {
    is: "Two pairs of rail fins, front and rear, and nothing on the stringer.",
    does: "Fast and holding: the rear pair carries the drive down the line and bites in a hollow face; looser than a thruster off the top.",
    info: null,
    how: "Mark the front pair as a thruster's fronts, then the rear pair off the tail and in from the rail (or out from the stringer, as DATA gives it) with their toe.",
  }),
  card(QUAD, "Basic - Spread", {
    is: "The rear pair placed by a spread from the stringer, a set distance forward of the tail.",
    does: "A classic quad spread: the rears sit inside the fronts for drive down the line.",
    info: "Uses the front Basic Model as input. Rears are placed at 1/2 the front distance from tail as default. Rears use common spread values which tend to put the fins closer to the stringer than the Off-Rail Model, resulting in a looser board.",
    how: "Mark the rear pair's trailing edges off the tail and out from the stringer by the half spread in DATA, square across, then their toe.",
  }),
  card(QUAD, "Basic - Off-Rail", {
    is: "The rear pair placed in from the rail, half a front base plus a quarter inch behind the fronts.",
    does: "Rears close to the rail and close behind the fronts: loose and quick, the fins working as a pair.",
    info: 'Uses the front Basic Model as input. Rears are placed at 1/2 the front distance +1/4" from tail as default. Rears use common Off-Rail values which tend to put the fins closer to the rail (wider spread) than the Spread Model, resulting in a board with extra drive. The slightly farther forward rear fins help to avoid feeling tracky.',
    how: "Mark the rear pair in from the rail at their off-tail mark; the toe and base as DATA gives them.",
  }),
  card(QUAD, "McKee SB/Gun", {
    is: "McKee's shortboard and gun quad numbers: the rears spread by the tail's width and toed to aim near the nose.",
    does: "A balanced quad that holds in a hollow wave and still pivots.",
    info: "McKee's shortboard/gun rear-pair guidance, paired with the matching front model.",
    how: "Mark the rears by DATA's half spread and off-tail, and aim their leading edges with the McKee table.",
  }),
  card(QUAD, "McKee Longboard", {
    is: "McKee's longboard quad: the rears set further up and spread for a board eight feet or longer.",
    does: "Drive and hold for a long board without the centre fin's drag; it needs the length to work.",
    info: "McKee's dedicated longboard front-and-rear guidance, for boards 8'0\" and longer. On a shorter board the app uses McKee SB/Gun instead.",
    how: "As McKee SB/Gun, with the longboard table's aim points; the board must be eight feet or longer.",
  }),
  card(QUAD, "Add 5th/Center fin", {
    is: "A fifth box on the stringer behind the quad's rear pair.",
    does: "Ride it as a quad, a thruster or a five-fin — the box costs nothing when empty and adds a centre fin's hold when you want it.",
    info: null,
    how: "Mark a centre box behind the rears at DATA's off-tail distance, square to the stringer.",
  }),
  card(ADVANCED, "Fin Base Length", {
    is: "The length of the fin's base along the board — the fin's footprint, trailing edge to leading edge.",
    does: "A longer base drives and holds more; a shorter one pivots. The leading-edge mark moves with it.",
    info: null,
    how: "Mark both ends of the base on the board — trailing edge first, then the base length forward along the toe line — and route the box to those marks.",
  }),
  card(ADVANCED, "Aft/Forward position", {
    is: "Slides a fin set forward or back from where its model puts it, up to an inch and a half either way.",
    does: "Back is drivey — the fins hold and the board tracks; forward is loose and quick to pivot.",
    info: null,
    how: "Move both trailing-edge marks the same amount along the board before marking the leading edges; measure from the tail tip each time.",
  }),
  card(ADVANCED, "Off-Rail", {
    is: "How far in from the rail the fins' trailing edges sit.",
    does: "Closer to the rail bites earlier and feels looser; closer to the stringer is more forgiving and drives straighter.",
    info: null,
    how: "Measure in from the rail at each trailing-edge mark with a rule held square to the stringer; mark both sides and check them against each other.",
  }),
  card(ADVANCED, "Toe-In", {
    is: "How much the leading edge points in toward the stringer, as a distance at the leading edge.",
    does: "More toe-in is looser and turns easier at the cost of speed; less is drivey and fast down the line.",
    info: null,
    how: "Mark the leading edge the toe distance further in from the rail than the trailing edge, then lay a straightedge through the two marks to pencil the box line.",
  }),
];
