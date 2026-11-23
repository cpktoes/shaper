---
quick_id: 261123-dn6
date: 2026-11-23
source: the founder, 2026-11-23 — his ask to redraw the logos in Inter, two rounds of looks at old-vs-new comparisons, and his word to put them on the site
---

# Put the Inter logos on the site in place of the Helvetica ones — decisions (locked)

## The founder's words

1. "Can you recreate the round and inline logos using Inter font for me?"
2. After the first comparison: "thicken the ring to match the original, and it's OK to get a little closer to the circle
   too. In both styles, reduce the size of the .com a little."
3. "put these on the site in place of the old logos and I'll need a copy of the logos that I can upload to canva and edit if
   desired. I want to make one with a ring in our sandy color and assistant in our accent green. Can you also give me a
   phosphor logo that I could print on a black shirt?"
4. Asked mid-way: "your updating the site with just the black text versions, right?" — answered yes: the site gets the
   one-colour logos only, in exactly the places the old ones are drawn today.

## The finished drawings (made by the orchestrator, approved by the founder's word above)

All in the main checkout at `/Users/kontoes/Code/shaper/brand/inter-draft/` (UNTRACKED — an executor worktree will not have
them; copy them in from that absolute path). Every SVG has every letter as an outline (no font needed), overlaps merged,
each part its own `<path id="shaper|assistant|com">` (+ `<circle id="ring">` on the round one) inside one `<g transform>`.

- `plain/` — `round-` and `inline-` × `black-on-white`, `white-on-black`, `transparent`, each `.svg` + `.png`
  (round 2000×2000; inline 1730×289 with a 50-unit pad round the letters).
- `canva/` — round + inline, see-through, each part a near-identical dark shade (#111111 shaper, #121212 assistant,
  #131313 .com, #141414 ring) so Canva offers each part as its own colour swatch.
- `sand-and-green/` — ring in Daylight's line sand #897c58 (the founder's pick, 2026-11-23: "use the darker sand ring";
  the pale canvas-sand version was dropped), "assistant" in Daylight's accent #8ec1b8, "shaper" and ".com" #111111, on
  white. Inline has no ring.
- `phosphor-shirt/` — everything in Phosphor's ink #26d026: see-through SVG, a 3600-px (12 in at 300 dpi) see-through PNG,
  and an on-black mock-up.
- `compare/` — the old-vs-new pictures the founder looked at.

How they were made: `logo-scripts.tar.gz` in this folder (`make2.py`, `compare.py`, `HOW-TO-RUN.txt`) — Inter is the app's
own next/font copy (Inter 4.001 variable), instanced at wght 700 ("shaper") and 300 ("assistant", ".com"), tracking
−0.02 em, shaped by HarfBuzz with kerning. Round: ring stroke 15.5 on a 2000 box (the original's 15 px on its 1930-px ring);
the words span 0.85 of the box; "assistant" is 0.80 of "shaper"'s size, stepped in so its i's dot sits just right of the p's
tail; ".com" 0.31 of "shaper", right-aligned under "assistant". Inline: ".com" 0.43 of the word size on the same baseline.

## Decisions

- **D-01 — One colour on the site, in today's places only.** Every place the site draws the old logo gets the Inter one in
  the same colour it uses today: the top bar and printed pages' wordmark (theme ink via `currentColor`), the Home Screen
  icons (black on white, from the round logo), the 3D room's walls (white), and anything else the planner finds drawn from
  the old logo files. No colour version (sand-and-green, phosphor, canva) is ever served by the site.
- **D-02 — The browser-tab icon stays** (`app/icon.svg`, `app/favicon.ico` — the board drawing, not a logo). The planner
  checks `app/opengraph-image.png` (the link-preview picture) and says whether it carries the old logo; if it does, it is
  redrawn with the new one, otherwise left alone.
- **D-03 — The wordmark stays one inline shape** (the reasons in `components/wordmark.tsx` hold: prints without background
  graphics, takes the theme's ink, works on the founder's older iPad). Its outline becomes the Inter inline logo's three
  parts joined into one path, cut to the letters' own bounds the way `brand/wordmark.svg` is, with the baseline form still
  cutting at the letters' baseline. The new letters' proportions differ from 806.1×100 / baseline 79.6; the planner works
  out the new box and checks every caller that sizes it (top bar, phone top bar, order form, summary preview, anywhere
  `Wordmark` is used), so the logo keeps its width and nothing on those screens moves more than the new letters' own
  height difference. `components/wordmark-path.ts` stays a verbatim copy of the new `brand/wordmark.svg` (the test holds).
  Even-odd still fills correctly (the overlaps are merged — the planner confirms counters such as the e, a, p, o stay open).
- **D-04 — The founder's logo files go into `brand/` and are committed** as the new sources, replacing the old masters'
  role (the old JPEGs and the old `wordmark.svg` history stay findable in git; keep the old source JPEGs in place, since
  `components/wordmark.test.ts` names them — the planner decides whether that test's list changes). Folder layout under
  `brand/` is the planner's call (e.g. `brand/inter/plain|canva|sand-and-green|phosphor-shirt`); `compare/` need not be
  committed. `brand/README.md` is rewritten to say what each file is and how it was made (pointing at
  `logo-scripts.tar.gz`), in plain words like today's.
- **D-05 — Every derived picture is remade from the new round/inline drawings** exactly the way the README says the old
  ones were (Home Screen icons as downscales of the round black-on-white; `bay-logo-circle.png` the round logo white on
  nothing cut to the ring's own bounds at 1024 square; `bay-logo-wordmark.png` the inline logo white on nothing at 2048
  wide), keeping each file's name and pixel size so nothing that loads them changes.
- **D-06 — Tests and reference pictures.** Unit tests that pin the old outline or pictures are re-pointed at the new
  files, not deleted. Desktop baseline screenshots that change because the top bar's logo changed are re-recorded
  (`diff.png` → update-snapshots → re-run) and the before/after pictures saved to this folder for the founder.
  The Home Screen icon and 3D room specs (`e2e/home-screen-icon.spec.ts`, `e2e/three-d-bay.spec.ts`) and
  `e2e/summary-preview.spec.ts` must pass.
- **D-07 — Pictures for the founder:** the top bar on a computer and a phone (a light and a dark theme), the printed order
  form's logo, the 3D room's walls, and the Home Screen icon, saved in this folder's `pictures/`.

## Out of scope

Any colour change on the site; the browser-tab icon; new logo placements; pushing (the founder says when).
