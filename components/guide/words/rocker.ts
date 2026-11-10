/**
 * ROCKER's GUIDE words (Phase 18, D-09): the intro, the four groups and the fourteen cards, copied character
 * for character from `## ROCKER` on `18-GUIDE-WORDS.md` — the founder's page, and the source of truth.
 * `rocker.test.ts` holds every line here to that page; a correction lands on the page and here in one
 * change. Every sentence is a first draft for the founder's pen.
 */
import { guideCardId } from "@/lib/geometry/guide-card";
import type { GuideWordsCard, GuideWordsGroup } from "../guide-copy";

/** The intro under the GUIDE heading; `{board}` is the open board's name (the page's *Shortboard*) and
 * `{blank}` its blank's (the page's *US Blanks 6'3"RP*). */
export const ROCKER_GUIDE_INTRO =
  "What each control on this page is, what it does to the board, and how it is shaped. Every card is drawn from your {board} in its {blank} blank, the way VIEWER draws it — the whole board, then the part the control touches, closer, with the setting pushed in muted dashes so you can see which way it moves. The number beside each name is this board's own.";

const INPUTS = "Inputs";
const BLANK = "Blank";
const ROCKER = "Rocker";
const FOIL = "Foil";

export const ROCKER_GUIDE_GROUPS: readonly GuideWordsGroup[] = [
  { name: INPUTS, note: null },
  { name: BLANK, note: null },
  { name: ROCKER, note: "read off the blank — hand-set until you pick one" },
  { name: FOIL, note: null },
];

function card(group: string, name: string, lines: Omit<GuideWordsCard, "id" | "page" | "group" | "name" | "info">): GuideWordsCard {
  return { id: guideCardId("rocker", group, name), page: "rocker", group, name, info: null, ...lines };
}

export const ROCKER_GUIDE_WORDS: readonly GuideWordsCard[] = [
  card(INPUTS, "Center Thickness", {
    is: "The board's thickness at its centre, deck to bottom — the one number the whole foil is scaled to.",
    does: "More centre means more float and paddle and a steadier, stiffer board; less means a livelier board that sits lower in the water and buries its rail more easily. It also sets how much foam comes off the blank's bottom.",
    how: "Set it here, then plane the blank's bottom flat until a caliper at the centre reads this number — the PLANING tab counts the passes. Check it again after the deck skin comes off: the centre is measured deck to bottom.",
  }),
  card(INPUTS, "Nose Tip · Tail Tip", {
    is: "How thick the board finishes at its two tips, measured at the very end of the stringer.",
    does: "A thin nose tip lightens the swing weight and knifes in; a thin tail tip sinks and releases for sharper turns, while a fuller one floats the tail and planes earlier.",
    how: "Mark each tip's thickness on the stringer, then taper the foam from the Thinning Starts line down to the mark with the planer and a long block, checking with calipers every few inches.",
  }),
  card(BLANK, "Blank", {
    is: "The foam your board is cut from: a maker's blank with its own rocker, thickness and width printed at five stations. Your board lies inside it, the foam to come off shaded.",
    does: "Pick a blank and your rocker is its rocker — the nose and tail lift come from the foam, not a slider. A close blank means little planing and the maker's curve under your board; a fat one means more work and more room to change things.",
    how: "Choose a blank a little longer than the board, with the nose and tail rocker you want to end with, then check its printed rocker on the foam itself — a straightedge on the stringer, tip to tip — before you cut; a real blank can differ from the page by an eighth.",
  }),
  card(BLANK, "Placement", {
    is: "Where the board sits along its blank: centred, or slid toward the nose or the tail by as much as the blank leaves at each end.",
    does: "Slide toward the nose and the board takes more of the blank's nose curve — more nose rocker, less tail; slide toward the tail for the opposite. Every rocker number moves, and the thickness under the board with it.",
    how: "Mark the board's centre on the blank's stringer where you placed it, lay the template from that mark, and measure both tip rockers off a flat bench before you commit to the outline cut.",
  }),
  card(BLANK, "Deck Skin", {
    is: "The layer the planer takes off the blank's deck everywhere, the same depth at every station — a pass or two of crust.",
    does: "A deeper skin sits the board lower in the blank and leaves clean foam under the glass, and brings a little nose and tail with it as the deck comes down; too little leaves the blank's dense skin and its lumps in your deck.",
    how: "Set the planer shallow and take the deck off in long, overlapping passes tail to nose, then screen it flat; the PLANING tab gives the passes at your Planer Max Depth.",
  }),
  card(BLANK, "Customize Rocker", {
    is: "The blank's rocker as you would order it from the maker — more or less at the nose or tail, the bend starting at the centre or a set distance in from the tip.",
    does: "A bend from the centre lifts the whole curve gently; one that starts 18 inches in kicks the tip up and leaves the middle flat and fast. The board follows the blank, so every rocker number updates.",
    how: "Order the blank with that note, or on a stock blank check the natural rocker with a straightedge, mark where the bend starts, and plane the extra off the bottom toward the tip in tapering passes; check the new tip height against the DATASHEET.",
  }),
  card(ROCKER, "Nose Rocker", {
    is: "How high the nose tip rises above the flat the board lies on, with the 12-inch station saying how the curve gets there.",
    does: "More nose rocker keeps the nose from pearling on steep drops and loosens the board, at the cost of paddle speed and glide; a flatter nose planes faster and catches waves earlier but can catch on late drops.",
    how: "Lay the blank bottom-up on a flat bench, set a long straightedge on the stringer's low point and measure up to the nose tip; plane the bottom toward the tip to bring it to the number, checking the 12-inch station on the way.",
  }),
  card(ROCKER, "Tail Rocker", {
    is: "How high the tail tip rises above the flat, and the 12-inch station that shapes the kick.",
    does: "More tail rocker pivots tighter and holds in the pocket but drags on the flats; a flatter tail is faster and drives down the line, and takes more effort to turn.",
    how: "Measure as for the nose, from the straightedge up to the tail tip; the last 12 inches hold the kick, so take the bottom down in short passes and keep the curve continuous — no flat spot under the fins.",
  }),
  card(FOIL, "Pin tips to · Deck", {
    is: "The tips are thinned from the bottom: the deck keeps the blank's curve and the foam at each tip comes off below it, so the tip rocker rises.",
    does: "A lifted, fine tip with the deck line untouched — more rocker at the ends than the blank printed, and a flatter deck to stand on.",
    how: "Pencil the Thinning Starts line across the bottom, then plane the bottom toward each tip, most at the tip and nothing at the line; check the tip thickness with calipers and the new tip rocker against the DATASHEET.",
  }),
  card(FOIL, "Pin tips to · Bottom", {
    is: "The tips are thinned from the deck: the bottom keeps the blank's rocker exactly and the foam comes off the deck toward each tip.",
    does: "The blank's rocker to the inch and a deck that rolls down into the tips — the tips' thinness in the deck rather than in the rocker.",
    how: "Pencil the Thinning Starts line across the deck and plane from it toward each tip, most at the tip and nothing at the line; leave the bottom untouched and check the tip thickness with calipers.",
  }),
  card(FOIL, "Nose Thinning Starts", {
    is: "Where the nose stops being the planed blank and starts tapering down to the tip thickness — 12 inches from the tip unless the board cannot run down steadily from there, or wherever you set it.",
    does: "Start it further in and the taper is longer and gentler, the nose lighter and finer; start it near the tip and the board keeps its full foil to within a foot of the nose, fuller and more forgiving.",
    how: "Pencil a line across the board at the start, then plane from that line toward the tip in tapering passes down to the tip mark; nothing comes off inside the line.",
  }),
  card(FOIL, "Tail Thinning Starts", {
    is: "Where the tail stops being the planed blank and starts tapering down to the tip thickness — 12 inches from the tip unless the board cannot run down steadily from there, or wherever you set it.",
    does: "Start it further in for a thinner, more sensitive tail that sinks into turns; near the tip for a fuller tail that floats and planes early.",
    how: "Pencil a line across the board at the start, then plane from that line toward the tip in tapering passes down to the tip mark; nothing comes off inside the line.",
  }),
  card(FOIL, "Nose @ 12\" · Tail @ 12\"", {
    is: "A fine-tune of the thickness at the two 12-inch stations, up to a quarter inch either way on top of what the blank gives there.",
    does: "A touch more at the tail 12 adds float under your back foot; a touch less at the nose 12 lightens the entry — without changing the centre or the tips.",
    how: "Check the 12-inch thicknesses with calipers after planing: a plus means leave that much more at the station, a minus a shallow extra pass there, feathered out over a couple of feet so no step shows.",
  }),
  card(FOIL, "Fine tune from", {
    is: "Which surface a 12-inch fine-tune moves: the Deck, so the rocker stays the blank's, or the Bottom, so the bottom moves and the rocker re-levels.",
    does: "On the Deck nothing under the board changes; on the Bottom a lower 12-inch station flattens the rocker there and every rocker number can shift.",
    how: "Take the fine-tune off whichever surface you chose — off the deck with a light pass feathered both ways, or off the bottom with a straightedge along the stringer afterward to confirm what the rocker did.",
  }),
];
