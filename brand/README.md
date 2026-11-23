# Brand files

Nothing in this folder is served by the site. It is where the founder's logo sources live, so a
future size or a new file can be made again from the originals.

## 1. The logo since 2026-11-23, in Inter (quick 261123-dn6)

The founder asked for the round and inline logos redrawn in Inter and approved them after two
looks. Inter is the app's own copy (Inter 4.001): "shaper" at weight 700, "assistant" and ".com" at
300, letters spaced -0.02 em, shaped with kerning. Every letter is an outline, so no font is needed
to open them. Each part is its own path (id `shaper`, `assistant`, `com`; the round one adds a
`ring`).

- Round: a 2000 square, the ring 15.5 wide (the original's 15 on its 1930 ring), the words across
  0.85 of the box, "assistant" at 0.80 of "shaper"'s size, ".com" at 0.31 right under "assistant".
- Inline: ".com" at 0.43 of the words' size on their baseline, a 50-unit margin round the letters.

## 2. What is in inter/

- plain/: round and inline, each black on white, white on black and see-through, each as an .svg
  and a .png (round 2000 square, inline 1730 by 289). These are the masters the site's pictures are
  made from.
- canva/: round and inline, see-through, for uploading to Canva. Each part is a near-identical dark
  shade (#111111 shaper, #121212 assistant, #131313 .com, #141414 ring) so Canva offers each as
  its own colour to change.
- sand-and-green/: round and inline on white. The ring is Daylight's line sand (#897c58), "assistant"
  is Daylight's accent green (#8ec1b8), the rest is #111111. The inline one has no ring.
- phosphor-shirt/: everything in Phosphor's ink (#26d026), for a black shirt: see-through .svg files,
  a 3600-pixel see-through .png of each (12 inches at 300 dpi), and on-black mock-ups.

The canva, sand-and-green and phosphor-shirt files are for the founder's own use. The site serves
none of the colour files.

## 3. wordmark.svg

The inline logo's three parts joined into one shape and moved so the letters' own box starts at the
corner: 1629.93 by 188.77, from the top of the dot of the i in "assistant" to the bottom of the p's
tail, with the baseline at 147.95. Nothing is scaled or redrawn; every number is the drawing's own,
moved by whole hundredths. No letter overlaps another, so filled even-odd every hole stays open
(checked: the even-odd and nonzero fills cover exactly the same area).

## 4. What is made from them

- components/wordmark-path.ts is a verbatim copy of the path in wordmark.svg. A unit test fails if
  the two ever differ by a single character, and a second test re-makes the path from
  inter/plain/inline-transparent.svg and expects it equal.
- app/apple-icon.png (180 square), public/home-screen-icon-192.png and public/home-screen-icon-512.png
  are downscales of inter/plain/round-black-on-white.png. They are the Home Screen icons on iPhone,
  iPad and Android. The browser tab keeps the board drawing (app/icon.svg and app/favicon.ico),
  which is not made from anything here.
- public/bay-logo-circle.png is the round logo drawn white on nothing, cut to the ring's outer edge,
  1024 square. It is the logo on the 3D room's side walls.
- public/bay-logo-wordmark.png is wordmark.svg drawn white on nothing, 2048 by 237. It is the logo
  on the 3D room's two end walls.

## 5. How they were made

The drawings were made by the scripts archived at
.planning/quick/261123-dn6-put-the-inter-logos-on-the-site-in-place/logo-scripts.tar.gz (make2.py,
compare.py, HOW-TO-RUN.txt). The joined shape and the site's pictures were made by the scripts in
site-pictures-scripts.tar.gz in the same folder. They are kept as archives, not as loose scripts,
because the project's type check and lint would read loose scripts.

## 6. The old Helvetica logo, kept for the record

These are the files the founder sent and the cleaned circle (quick 261010-km7). The site no longer
draws anything made from them.

- wordmark-black-on-white-source.jpg: the old "shaperassistant.com" logo, black on white.
- wordmark-white-on-grey-source.jpg: the same logo in white on grey.
- circle-logo-source.jpg: the old circle logo, as he sent it.
- circle-logo-clean-2000.png: the old circle logo through a levels curve, 2000 pixels square.
- circle-logo-white-on-black-source.jpg: the old circle logo in white on black, as he sent it for
  the shaping room's walls (2026-11-06).

The traced Helvetica wordmark.svg and its tracer are in git history and in
.planning/quick/261010-km7-new-logo-top-bar-order-form-and-home-scr/trace-scripts.tar.gz.
