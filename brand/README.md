# Brand files (quick 261010-km7)

Nothing in this folder is served by the site. It is where the founder's logo sources live, so a
future size or a new file can be made again from the originals.

What is here:

- wordmark-black-on-white-source.jpg: the founder's "shaperassistant.com" logo, black on white.
  This is the master the traced logo was made from.
- wordmark-white-on-grey-source.jpg: the same logo in white on grey. It is a reference for how
  the dark themes look, not a second asset. The dark themes draw the one traced shape in light ink.
- circle-logo-source.jpg: the founder's circle logo, as he sent it.
- circle-logo-clean-2000.png: the circle logo through a levels curve, 2000 pixels square: pure
  black below 40, pure white above 225, a straight ramp between. It removes the grey haze and the
  JPEG fuzz so small sizes stay crisp.
- wordmark.svg: the black-on-white JPEG traced into one single-colour, even-odd shape. The
  picture was put through the same levels curve (0 below 40, 255 above 225), outlines were found
  along the 50 percent line, and curves were fitted to within 0.6 of a source pixel, with numbers
  to one decimal. The picture box is 806.1 by 100, cut to the letters' own bounds (top of the h to
  the bottom of the p), and the baseline sits at 79.6. No point of it is more than one source
  pixel away from the JPEG.

What is made from them:

- components/wordmark-path.ts is a verbatim copy of the path in wordmark.svg. A unit test fails if
  the two ever differ by a single character.
- app/apple-icon.png (180 square), public/home-screen-icon-192.png and
  public/home-screen-icon-512.png are downscales of circle-logo-clean-2000.png. They are the
  Home Screen icons on iPhone, iPad and Android. The browser tab keeps the board drawing
  (app/icon.svg and app/favicon.ico), which is not made from anything here.

The tracer that made wordmark.svg, and the check that compares it back to the JPEG, are archived
at .planning/quick/261010-km7-new-logo-top-bar-order-form-and-home-scr/trace-scripts.tar.gz. Run
on the black-on-white JPEG with a tolerance of 0.6, no padding and one decimal, they produce
wordmark.svg byte for byte. They are kept as an archive, not as loose scripts, because the
project's type check and lint would read loose scripts.
