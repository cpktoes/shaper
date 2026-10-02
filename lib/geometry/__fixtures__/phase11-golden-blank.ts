import { isWellFormedBlankRecord } from "@/lib/blanks/catalog";
import type { BlankRecord } from "../blank";
import pinned from "./phase11-foil-golden-blanks.json";

/**
 * The foam blanks Phase 11's recorded boards (`phase11-foil-golden.json`) were recorded on, exactly
 * as the catalogue held them at that time — generated out of git by
 * `scripts/extract-phase11-golden-blanks.ts`. A board saved under Phase 11 carries its blank by
 * value, so the tests that replay those recorded numbers read the blank from here and never from
 * today's catalogue: a catalogue correction (a mistyped rocker figure fixed, say) is a data change,
 * and must not be able to fail a test that proves the CODE still reproduces numbers recorded on the
 * old data. Test-only: nothing outside the test suites imports this file.
 */
export function phase11GoldenBlank(vendor: string, name: string): BlankRecord {
  const record: unknown = pinned.blanks.find((blank) => blank.vendor === vendor && blank.name === name);
  if (!record) {
    throw new Error(
      `${vendor} ${name} is not in phase11-foil-golden-blanks.json — re-run scripts/extract-phase11-golden-blanks.ts`,
    );
  }
  if (!isWellFormedBlankRecord(record)) {
    throw new Error(`${vendor} ${name} in phase11-foil-golden-blanks.json is not a well-formed blank record`);
  }
  return record;
}
