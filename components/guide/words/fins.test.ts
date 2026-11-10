import { describe, expect, it } from "vitest";
import { guideFinsInput } from "@/lib/geometry/__fixtures__/guide-fins-input";
import { guideCaptionText, guideCardId } from "@/lib/geometry/guide-card";
import { buildFinsGuide, FINS_GUIDE_CARD_ORDER, FINS_GUIDE_GROUP_SIZES } from "@/lib/geometry/guide-fins";
import { QUAD_REAR_MODELS, THRUSTER_FRONT_MODELS, TWIN_TEMPLATES, FIN_SETUPS } from "@/lib/geometry/fins";
import { guideIntro } from "../guide-copy";
import { FINS_GUIDE_GROUPS, FINS_GUIDE_INTRO, FINS_GUIDE_WORDS } from "./fins";
import { readGuideWordsPage } from "./read-words-page";

/**
 * FINS' words are the founder's, line for line (Phase 18, D-09, D-13, R6, R9): the module the page reads is held to
 * `18-GUIDE-WORDS.md` by exact string equality, card by card in order — and every sentence the old MODEL INFO tab said
 * is held to the cards, so none can be lost, reworded or moved off the model it credits.
 */

const page = readGuideWordsPage();
const fins = page.pages.find((p) => p.page === "fins")!;

describe("FINS' words module equals the words page", () => {
  it("card for card, in order: id, group, name, is, does, info and how", () => {
    expect(FINS_GUIDE_WORDS.map((card) => [card.id, card.page, card.group, card.name, card.is, card.does, card.info, card.how])).toEqual(
      fins.cards.map((card) => [guideCardId("fins", card.group, card.name), "fins", card.group, card.name, card.is, card.does, card.info, card.how]),
    );
  });

  it("its intro, with the Shortboard's name filled in, is the page's intro", () => {
    expect(guideIntro(FINS_GUIDE_INTRO, "imperial", { board: "Shortboard" })).toBe(fins.intro);
  });

  it("its eight groups and their qualifiers are the page's headings", () => {
    expect(FINS_GUIDE_GROUPS).toEqual(fins.groups);
    expect(FINS_GUIDE_GROUPS.map((g) => FINS_GUIDE_WORDS.filter((c) => c.group === g.name).length)).toEqual(FINS_GUIDE_GROUP_SIZES);
  });

  it("its ids are the builder's 23, in order", () => {
    expect(FINS_GUIDE_WORDS.map((card) => card.id)).toEqual(FINS_GUIDE_CARD_ORDER);
  });

  it("names every setup and model by the app's own label", () => {
    const names = FINS_GUIDE_WORDS.map((c) => c.name);
    for (const label of [...FIN_SETUPS, ...TWIN_TEMPLATES, ...THRUSTER_FRONT_MODELS, ...QUAD_REAR_MODELS].map((o) => o.label))
      expect(names, label).toContain(label);
  });

  it("carries fourteen Model info notes, McKee Shortboard's and McKee Gun's the same sentence", () => {
    expect(FINS_GUIDE_WORDS.filter((c) => c.info !== null)).toHaveLength(14);
    const info = (name: string) => FINS_GUIDE_WORDS.find((c) => c.name === name)!.info;
    expect(info("McKee Shortboard")).toBe(info("McKee Gun"));
    expect(info("McKee Shortboard")).toContain("Greg McKee's published fin-placement guidance");
  });

  it("the Shortboard in Imperial gives exactly the page's tag and caption on every card that shows one", () => {
    const built = buildFinsGuide(guideFinsInput("shortboard"), "imperial");
    let tags = 0;
    let captions = 0;
    for (const card of fins.cards) {
      const model = built.get(guideCardId("fins", card.group, card.name))!;
      if (card.tag !== null) {
        expect(model.tag.text, `${card.name} tag`).toBe(card.tag);
        tags++;
      } else {
        expect(model.tag.kind, `${card.name} tag`).toBe("none");
      }
      expect(guideCaptionText(model.caption), `${card.name} caption`).toBe(card.caption ?? "");
      if (card.caption !== null) captions++;
    }
    expect(tags).toBe(9);
    expect(captions).toBe(21);
  });
});

/**
 * Every sentence the MODEL INFO tab said (`components/fins/fin-model-info.tsx`, removed with the tab in plan 18-06),
 * apart from its title (`Model Info`), its one-line note (`Reference note on where each model's placement guidance comes
 * from.`) and its block headings, each model's bold name and dash dropped, its rounding grain the Imperial one it
 * printed. Read from the file itself before it was deleted (a check run then proved this list equal to the file), and
 * kept here so no sentence can quietly go missing from the cards, or lose Greg McKee's name, now the file is gone.
 */
const MODEL_INFO_SENTENCES: readonly string[] = [
  'All positions use the trailing-edge convention: off-tail and off-rail are measured to the trailing edge of the fin base, toe-in is the leading edge\'s inward offset from that trailing edge (regardless of fin base length), rears are often defined by a trailing edge spread rather than off-tail measurement, and every value is rounded to the nearest 1/16".',
  'Single fin box placement comes from an established fixed range rather than a length equation — the default value is in a common working range (4 1/2" to 6") and can be fine-tuned by the forward/aft slider in the advanced menu, rather than solved for.',
  'Good for shorter base (generally ≤ 5 1/2"), more upright twin fins.',
  'Use for wide base (generally > 5 1/2"), retro-style twin fins.',
  "Typically used with shorter-base, thruster-like, twins with a small trailer fin for added hold and drive.",
  'All twin placements come from established fixed ranges rather than a length equation — they\'re centered in a working range (Modern = 7" to 8", Keel = 6" to 6 1/2", and Upright+Trailer = at ~10") and can be adjusted by the forward/aft slider in the advanced menu, rather than solved for.',
  "The center fin box placement follows the Single Model above.",
  'Side bite placements come from an established fixed range, scaled off a length anchor of 9\' rather than a length equation — the default value is centered in a working range (15" to 16 1/2") and can be adjusted by the forward/aft slider in the advanced menu, rather than solved for.',
  "A straightforward linear length-scaled placement based on a smaller range of short board.",
  "It's the simplest of the four and the least tuned for longer boards.",
  "Also scales linearly with length, but more slowly.",
  'It follows a "half rate convention" based on the idea that stance width scales slower than board length.',
  "Fitted to Greg McKee's published fin-placement guidance for shortboards and guns respectively.",
  'Also follows a "half rate" style convention.',
  "Uses the front Basic Model as input.",
  "Rears are placed at 1/2 the front distance from tail as default.",
  "Rears use common spread values which tend to put the fins closer to the stringer than the Off-Rail Model, resulting in a looser board.",
  "Uses the front Basic Model as input.",
  'Rears are placed at 1/2 the front distance +1/4" from tail as default.',
  "Rears use common Off-Rail values which tend to put the fins closer to the rail (wider spread) than the Spread Model, resulting in a board with extra drive.",
  "The slightly farther forward rear fins help to avoid feeling tracky.",
  "McKee's shortboard/gun rear-pair guidance, paired with the matching front model.",
  'McKee\'s dedicated longboard front-and-rear guidance, for boards 8\'0" and longer.',
  "On a shorter board the app uses McKee SB/Gun instead.",
];

/**
 * The Convention card splits the tab's first paragraph in two, with the two small edits that takes and nothing else
 * (RESEARCH Finding 6): an *and* before *toe-in*, and a capital *Rears* starting the second sentence.
 */
function asTheCardsSayIt(sentence: string): string[] {
  if (!sentence.startsWith("All positions use the trailing-edge convention")) return [sentence];
  const edited = sentence
    .replace(", toe-in is the leading edge's", ", and toe-in is the leading edge's")
    .replace("(regardless of fin base length), rears are", "(regardless of fin base length). Rears are");
  return edited.split(/(?<=\.)\s+(?=[A-Z])/);
}

describe("no sentence of the MODEL INFO tab is lost", () => {
  it("every sentence it said is on a FINS card's is, does or Model info line", () => {
    expect(MODEL_INFO_SENTENCES).toHaveLength(24);
    const lines = FINS_GUIDE_WORDS.flatMap((c) => [c.is, c.does, c.info ?? ""]).join("\n");
    for (const sentence of MODEL_INFO_SENTENCES) for (const said of asTheCardsSayIt(sentence)) expect(lines, said).toContain(said);
  });

  it("each model's note sits on that model's own card, Greg McKee credited where the tab credited him", () => {
    const info = (name: string) => FINS_GUIDE_WORDS.find((c) => c.name === name)!.info ?? "";
    expect(info("Single Fin")).toContain("Single fin box placement");
    expect(info("Modern/Upright")).toBe(MODEL_INFO_SENTENCES[2]);
    expect(info("Keel")).toBe(MODEL_INFO_SENTENCES[3]);
    expect(info("Upright + Trailer")).toBe(MODEL_INFO_SENTENCES[4]);
    expect(info("McKee Shortboard")).toBe(`${MODEL_INFO_SENTENCES[12]} ${MODEL_INFO_SENTENCES[13]}`);
    expect(info("McKee Longboard")).toBe(`${MODEL_INFO_SENTENCES[22]} ${MODEL_INFO_SENTENCES[23]}`);
    expect(info("McKee SB/Gun")).toBe(MODEL_INFO_SENTENCES[21]);
  });
});
