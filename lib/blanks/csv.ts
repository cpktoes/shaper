/**
 * A small RFC-4180 CSV reader for the three committed blank catalogues under `db/seed/blanks/`.
 *
 * Hand-rolled on purpose (D-20: no new dependency): the catalogue files only need the core of the
 * RFC — fields wrapped in double quotes may hold commas, line breaks and doubled `""` quotes (a
 * blank called `5'8" SB` is written `"5'8"" SB"`), a record ends at CRLF or LF, a leading UTF-8
 * byte-order mark is skipped, and a trailing line break does not add an empty record.
 *
 * This file only splits text into string cells. Turning cells into numbers is the catalogue
 * mapping's job (`lib/blanks/catalog.ts`), which checks every row strictly.
 *
 * No React/browser/database import — pure text handling, unit-tested in csv.test.ts.
 */

/**
 * Splits CSV text into records of string fields. Throws if a quoted field is never closed or if
 * a closing quote is followed by anything other than a comma or a line break — a malformed file
 * must fail loudly rather than shift every following cell into the wrong column.
 */
export function parseCsv(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  // True once the current record has seen any character, so a final line break adds no record.
  let recordStarted = false;
  let line = 1;

  const endField = () => {
    record.push(field);
    field = "";
  };
  const endRecord = () => {
    endField();
    records.push(record);
    record = [];
    recordStarted = false;
  };

  while (i < text.length) {
    const char = text[i];

    if (char === '"' && field.length === 0) {
      // A quoted field: read to the closing quote, turning each doubled quote into one.
      recordStarted = true;
      const openedOnLine = line;
      i++;
      for (;;) {
        if (i >= text.length) {
          throw new Error(`CSV: quoted field opened on line ${openedOnLine} is never closed`);
        }
        const inner = text[i];
        if (inner === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          i++;
          break;
        }
        if (inner === "\n") line++;
        field += inner;
        i++;
      }
      const next = text[i];
      if (next !== undefined && next !== "," && next !== "\r" && next !== "\n") {
        throw new Error(`CSV: unexpected character after a closing quote on line ${line}`);
      }
      continue;
    }

    if (char === ",") {
      recordStarted = true;
      endField();
      i++;
      continue;
    }

    if (char === "\r" || char === "\n") {
      endRecord();
      i += char === "\r" && text[i + 1] === "\n" ? 2 : 1;
      line++;
      continue;
    }

    recordStarted = true;
    field += char;
    i++;
  }

  if (recordStarted) endRecord();
  return records;
}
