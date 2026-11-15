/**
 * What a screen reader hears for a slider row (quick 261115-dv3; the to-do of 2026-10-02 from Phase 14's review,
 * WR-01): a name and a value worded exactly as the row's label line prints them, so a Metric shaper hears
 * `Center Thickness, 6.4 cm` and not `slider, 64`.
 *
 * Every row in the app writes its label line one of three ways — a bare name with the value beside it
 * (`label` + `displayValue`, or `valueBox`), or the name and value folded into one string with the house
 * separator (`Center Thickness — 2 1/2"`). This reads the name and the value back out of whichever the row
 * used, so no caller has to say the same thing twice; a row may still hand in `sliderLabel` and
 * `sliderValueText` to say something else (the hand-set grid's rows, whose label line is empty).
 *
 * A row whose label has no value in it (VOLUME's Board Type, with only its two hints) speaks its name alone
 * and leaves the value to the slider's own number.
 */

/** The house separator between a label's name and its value: an em dash with a space either side. */
export const LABEL_VALUE_SEPARATOR = " — ";

export interface SpokenSliderInput {
  label: string;
  displayValue?: string;
  valueBox?: string;
  sliderLabel?: string;
  sliderValueText?: string;
}

export interface SpokenSlider {
  /** The slider's accessible name — never empty for a row with any words on it. */
  name: string | undefined;
  /** The value as the row prints it, or undefined when the row prints none. */
  valueText: string | undefined;
}

export function spokenSlider({ label, displayValue, valueBox, sliderLabel, sliderValueText }: SpokenSliderInput): SpokenSlider {
  const at = label.indexOf(LABEL_VALUE_SEPARATOR);
  const folded = displayValue === undefined && valueBox === undefined && at > 0;
  const name = sliderLabel ?? (folded ? label.slice(0, at) : label).trim();
  const printed = displayValue ?? valueBox ?? (folded ? label.slice(at + LABEL_VALUE_SEPARATOR.length).trim() : undefined);
  const valueText = sliderValueText ?? (printed !== undefined && printed !== "" ? printed : undefined);
  return { name: name === "" ? undefined : name, valueText };
}
