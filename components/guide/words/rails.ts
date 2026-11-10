/**
 * RAILS' GUIDE words (Phase 18, D-09): the intro, the three groups and the seventeen cards, copied character for
 * character from `## RAILS` on `18-GUIDE-WORDS.md` — the founder's page, and the source of truth.
 * `rails.test.ts` holds every line here to that page; a correction lands on the page and here in one change.
 * Every sentence is a first draft for the founder's pen.
 */
import { guideCardId } from "@/lib/geometry/guide-card";
import type { GuideWordsCard, GuideWordsGroup } from "../guide-copy";

/** The intro under the GUIDE heading; `{board}` is the open board's name (the page's *Shortboard*). */
export const RAILS_GUIDE_INTRO =
  "What each control on this page is, what it does to the rail, and how it is shaped. Every card is your {board}'s own rail the way VIEWER draws it — the board from above with the three stations, then the cross-section at one of them: the bands in their colours, the finished rail in ink, with the setting pushed in muted dashes. Each rail has the same controls; the cards draw the center's, and the tail's where only the tail has the control.";

const INPUTS = "Inputs";
const RAILS = "Nose Rail · Center Rail · Tail Rail";
const ADVANCED = "Advanced";

export const RAILS_GUIDE_GROUPS: readonly GuideWordsGroup[] = [
  { name: INPUTS, note: null },
  { name: RAILS, note: "every rail has these; drawn at the center, the tail for Hard Edge" },
  { name: ADVANCED, note: "each rail's fold" },
];

function card(group: string, name: string, lines: Omit<GuideWordsCard, "id" | "page" | "group" | "name" | "info">): GuideWordsCard {
  return { id: guideCardId("rails", group, name), page: "rails", group, name, info: null, ...lines };
}

export const RAILS_GUIDE_WORDS: readonly GuideWordsCard[] = [
  card(INPUTS, "Import Rocker & Foil Values", {
    is: `Takes each rail's thickness from ROCKER & FOIL — the nose 12", centre and tail 12" thicknesses the foil gives — instead of three sliders here.`,
    does: "Every mark below is worked from the thickness, so the rails follow the foil as you change it; untick it to set the three thicknesses by hand.",
    how: "Leave it ticked and set the thicknesses on ROCKER; untick only when you want a rail worked from a thickness the foil does not give.",
  }),
  card(INPUTS, 'Board Thickness · Thickness @12"', {
    is: "The board's thickness at this station, deck to bottom — the number every rail mark is a share of.",
    does: "A thicker rail carries more foam and float and forgives a clumsy edge; a thinner rail bites and rolls over quicker.",
    how: 'Check the planed thickness with calipers at the 12" stations and the centre before marking the rails; every band mark is laid out from it.',
  }),
  card(RAILS, "Deck Profile", {
    is: "How much the deck domes down toward the rail: flat leaves the full thickness out to the rail, heavily domed tapers it to three quarters.",
    does: "Doming thins the rail without thinning the stringer — a lively, sensitive rail under a thick, floaty board — and sets the Tapered Thickness the marks are worked from.",
    how: "Pencil the Domed Deck Band mark in from the rail on the deck and plane the deck down from that line to the Tapered Thickness at the rail, checking with calipers.",
  }),
  card(RAILS, "Family", {
    is: "The rail's character from boxy to knifey: how much of the thickness is apex.",
    does: "Boxy is full and forgiving with lots of foam at the edge; knifey is pinched and sharp, quick to bury and quick to release.",
    how: "Lay out the apex marks from DATA on the rail's side and cut the rail bands to them; a knifey rail takes the bands further, a boxy one leaves more of the side standing.",
  }),
  card(RAILS, "Ratio", {
    is: "How the rail's thickness splits above and below the apex: 60/40 puts the apex low with more deck above it, 50/50 centres it.",
    does: "A low apex (more above) turns more of the rail downward for bite and hold; a high apex gives a fuller, more forgiving edge in the water.",
    how: "Mark the Apex Center up from the bottom on the rail's side at each station and join the marks with a batten; the bands above and below meet on that line.",
  }),
  card(RAILS, "Symmetrical", {
    is: "Makes the bottom tucks mirror the deck marks, so the rail is the same above and below the apex.",
    does: "An even rail that rolls the same both ways and is simple to shape; off, the bottom tuck follows the apex instead for a harder working edge.",
    how: "Mark the bottom tucks from DATA, which now equal the deck marks, and cut the bottom bands to mirror the deck bands.",
  }),
  card(RAILS, "Hard Edge", {
    is: "A sharp corner where the bottom meets the rail, instead of a tuck — tail only.",
    does: "Water lets go cleanly off a hard edge, so the tail is faster and releases in a turn; a tucked edge holds on and forgives.",
    how: "Plane the bottom flat right out to the rail through the tail and cut the rail band down to meet it in a corner; keep the corner crisp with a block and no sanding.",
  }),
  card(ADVANCED, "Scaled from center by", {
    is: "Shrinks every mark of a nose or tail rail to a share of what the centre's rule would give — 1.00 is the full rule.",
    does: "Scaling down keeps the thin ends' bands from running too far across a narrow nose or tail; 1.00 shapes them by the same rule as the centre.",
    how: "Lay out the nose and tail marks from DATA — they are already scaled — and cut the bands to them rather than carrying the centre's marks to the ends.",
  }),
  card(ADVANCED, "Apex Thickness", {
    is: "Adds to or takes from the apex band's thickness — how much of the rail's edge is the near-vertical apex.",
    does: "A thicker apex is a fuller, more forgiving edge; a thinner one is a sharper, more sensitive rail.",
    how: "Mark Rail Mark 1 and Rail Tuck 1 on the rail's side from DATA and leave the band between them standing when the deck and bottom bands are cut.",
  }),
  card(ADVANCED, "Deck Mark 1", {
    is: "Moves the first deck mark — how far in from the rail the first deck band is laid out.",
    does: "Further in cuts a wider first band and a flatter deck roll; nearer the rail keeps more deck and a quicker turn-down.",
    how: "Pencil Deck Mark 1 in from the rail along the deck and cut the first deck band from that line down to Rail Mark 1 with the planer.",
  }),
  card(ADVANCED, "Deck Mark 3", {
    is: "Moves the third deck mark — the farthest the deck bands reach toward the stringer.",
    does: "Further in blends the deck down over a wider band for a softer, rounder rail; nearer keeps the deck flat for longer.",
    how: "Pencil Deck Mark 3 in from the rail and cut the second deck band from it down to the first, blending the two bands with a screen.",
  }),
  card(ADVANCED, "Domed Deck Band", {
    is: "Moves where the domed deck starts dropping from the full thickness toward the rail.",
    does: "Further in domes more of the deck for a thinner rail under a thicker centre; nearer keeps the deck flat almost to the rail.",
    how: "Pencil the Domed Deck Band line and plane the deck from it out to the rail in long passes until the rail reads the Tapered Thickness.",
  }),
  card(ADVANCED, "Use Single Tuck", {
    is: "Cuts the bottom with one tuck band instead of two.",
    does: "One wider band is quicker to shape and softer in the water; two give a tighter, more controlled tuck.",
    how: "Pencil one Bottom Tuck mark and cut a single band from it up to Rail Tuck 1, then round it with a screen.",
  }),
  card(ADVANCED, "Bottom Tuck 1", {
    is: "Moves the first bottom tuck mark — how far in from the rail the first tuck band is laid out.",
    does: "Further in tucks more of the bottom for a softer, more forgiving edge; nearer keeps the bottom flat out to the edge.",
    how: "Pencil Bottom Tuck 1 in from the rail on the bottom and cut the first tuck band from it up to Rail Tuck 1.",
  }),
  card(ADVANCED, "Bottom Tuck 3", {
    is: "Moves the last bottom tuck mark — where the bottom band stops and the flat bottom begins.",
    does: "Further in rolls more of the bottom into the rail; nearer leaves a flatter, faster bottom.",
    how: "Pencil Bottom Tuck 3 on the bottom and cut the second tuck band from it to the first; leave the bottom flat inside the line.",
  }),
  card(ADVANCED, "Sharp Bottom Tuck", {
    is: "Leaves the last bottom tuck as a corner instead of blending it round.",
    does: "A crisp line where the tuck meets the bottom releases water sooner — a touch of hard edge along the whole rail.",
    how: "Cut the last tuck band but do not round where it meets the flat bottom; a light pass with a block keeps the line straight.",
  }),
  card(ADVANCED, "Tail Rail Blends From · Tail Rail Ends At", {
    is: "Where the tail's hard edge fades into the tucked rail: it runs sharp from the tail to Blends From, fades, and is fully tucked by Ends At.",
    does: "A longer hard edge drives further up the rail for speed and release; a shorter one hands over to the tuck sooner for a smoother rail through the turn.",
    how: "Pencil Blends From and Ends At on the rail from the tail; cut the edge hard behind the first mark and screen it progressively rounder until it is the tucked rail at the second.",
  }),
];
