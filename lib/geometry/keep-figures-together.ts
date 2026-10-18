/**
 * Keeps a station like `30.5 cm` in one piece when a readout card's label wraps (quick 261018-fg1;
 * first made for the INPUTS sentences, quick 261017-vdh): in a narrow sidebar `Nose @ 30.5 cm` may
 * break between words but never between `30.5` and `cm`. The space inside a whole-and-fraction
 * figure (`2 1/2"`) and the space between a number and its unit (`33 mm`, `30.5 cm`, `30.1 L`)
 * become non-breaking spaces, so the text can only wrap between words. The card's figures themselves
 * never wrap (they are drawn on one line); this is for the labels under them.
 *
 * Display-only: it never changes what the text says, only where it may break, so the readout builders
 * (and their tests) keep plain spaces and the card applies this as it draws a label.
 *
 * Pure — no React, browser or database import (CLAUDE.md Rule 1).
 */
const NBSP = " ";

export function keepFiguresTogether(text: string): string {
  return text.replace(/(\d) (?=\d+\/\d+)/g, `$1${NBSP}`).replace(/(\d) (?=(?:mm|cm|L)\b)/g, `$1${NBSP}`);
}
