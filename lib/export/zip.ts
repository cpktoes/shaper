/**
 * A store-only zip with no dependency (Phase 16, D-26; research §E): the CNC export's one download. Each
 * file is stored as it is (method 0, no compression), with a local header, a central directory and an end
 * record (PKWARE APPNOTE 6.3), a CRC-32 per entry, the UTF-8 flag (bit 11) set so a board's name reads the
 * same on any computer, and one fixed DOS date — so the same board always zips to the same bytes.
 *
 * `readZip` is this writer's own reader, for the tests: it walks the central directory and checks each
 * entry's CRC against its bytes.
 *
 * Pure: no React, browser or database import.
 */

/** Version 2.0: what a store-only archive with a CRC needs to be read. */
const ZIP_VERSION = 20;
/** General-purpose flag bit 11: the entry's name is UTF-8. */
const UTF8_NAMES = 0x0800;
/** Method 0: stored, not compressed. */
const STORED = 0;
const LOCAL_HEADER = 0x04034b50;
const CENTRAL_HEADER = 0x02014b50;
const END_RECORD = 0x06054b50;
const LOCAL_HEADER_BYTES = 30;
const CENTRAL_HEADER_BYTES = 46;
const END_RECORD_BYTES = 22;
/** The largest entry count and byte size a zip without its 64-bit extension can say. */
const MAX_ENTRIES = 0xffff;
const MAX_BYTES = 0xffffffff;

/**
 * Every entry's date: 1 January 2026, midnight, in DOS form (years since 1980 in bits 9–15, the month in
 * 5–8, the day in 0–4; the time 0). Fixed so the same board always zips to the same bytes.
 */
export const ZIP_DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;
const DOS_TIME = 0;

/** The CRC-32 table (the zip's reflected polynomial 0xEDB88320). */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** The CRC-32 of some bytes, as the zip format stores it. */
export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** One file in an archive: its name inside the zip and its bytes. */
export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

/** The files as one store-only zip, in the order given. */
export function writeZip(files: readonly ZipEntry[]): Uint8Array {
  if (files.length > MAX_ENTRIES) throw new Error(`A zip holds at most ${MAX_ENTRIES} files`);
  const encoder = new TextEncoder();
  const entries = files.map((file) => ({ name: encoder.encode(file.name), data: file.data, crc: crc32(file.data) }));

  let localBytes = 0;
  let centralBytes = 0;
  for (const entry of entries) {
    localBytes += LOCAL_HEADER_BYTES + entry.name.length + entry.data.length;
    centralBytes += CENTRAL_HEADER_BYTES + entry.name.length;
  }
  if (localBytes + centralBytes + END_RECORD_BYTES > MAX_BYTES) throw new Error("The files are too big for one zip");

  const out = new Uint8Array(localBytes + centralBytes + END_RECORD_BYTES);
  const view = new DataView(out.buffer);
  let at = 0;
  const offsets: number[] = [];
  for (const entry of entries) {
    offsets.push(at);
    view.setUint32(at, LOCAL_HEADER, true);
    view.setUint16(at + 4, ZIP_VERSION, true);
    view.setUint16(at + 6, UTF8_NAMES, true);
    view.setUint16(at + 8, STORED, true);
    view.setUint16(at + 10, DOS_TIME, true);
    view.setUint16(at + 12, ZIP_DOS_DATE, true);
    view.setUint32(at + 14, entry.crc, true);
    view.setUint32(at + 18, entry.data.length, true);
    view.setUint32(at + 22, entry.data.length, true);
    view.setUint16(at + 26, entry.name.length, true);
    view.setUint16(at + 28, 0, true);
    at += LOCAL_HEADER_BYTES;
    out.set(entry.name, at);
    at += entry.name.length;
    out.set(entry.data, at);
    at += entry.data.length;
  }
  const centralStart = at;
  entries.forEach((entry, i) => {
    view.setUint32(at, CENTRAL_HEADER, true);
    view.setUint16(at + 4, ZIP_VERSION, true);
    view.setUint16(at + 6, ZIP_VERSION, true);
    view.setUint16(at + 8, UTF8_NAMES, true);
    view.setUint16(at + 10, STORED, true);
    view.setUint16(at + 12, DOS_TIME, true);
    view.setUint16(at + 14, ZIP_DOS_DATE, true);
    view.setUint32(at + 16, entry.crc, true);
    view.setUint32(at + 20, entry.data.length, true);
    view.setUint32(at + 24, entry.data.length, true);
    view.setUint16(at + 28, entry.name.length, true);
    // Extra field, comment, disk number, internal and external attributes: all 0.
    view.setUint32(at + 42, offsets[i], true);
    at += CENTRAL_HEADER_BYTES;
    out.set(entry.name, at);
    at += entry.name.length;
  });
  view.setUint32(at, END_RECORD, true);
  view.setUint16(at + 8, entries.length, true);
  view.setUint16(at + 10, entries.length, true);
  view.setUint32(at + 12, at - centralStart, true);
  view.setUint32(at + 16, centralStart, true);
  return out;
}

/** One entry read back: its name, its bytes, and whether they match the CRC the archive recorded. */
export interface ZipEntryRead {
  name: string;
  data: Uint8Array;
  crcOk: boolean;
}

/**
 * Reads a store-only zip with no archive comment (what `writeZip` makes): every entry from the central
 * directory, with its CRC checked. Throws on anything else.
 */
export function readZip(bytes: Uint8Array): ZipEntryRead[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.byteLength - END_RECORD_BYTES;
  if (end < 0 || view.getUint32(end, true) !== END_RECORD) throw new Error("Not a zip: no end record");
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const out: ZipEntryRead[] = [];
  for (let i = 0; i < count; i++) {
    if (view.getUint32(at, true) !== CENTRAL_HEADER) throw new Error(`Zip entry ${i}: no central header`);
    if (view.getUint16(at + 10, true) !== STORED) throw new Error(`Zip entry ${i}: not stored`);
    const crc = view.getUint32(at + 16, true);
    const size = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    const name = decoder.decode(bytes.subarray(at + CENTRAL_HEADER_BYTES, at + CENTRAL_HEADER_BYTES + nameLength));
    if (view.getUint32(local, true) !== LOCAL_HEADER) throw new Error(`Zip entry ${name}: no local header`);
    const start = local + LOCAL_HEADER_BYTES + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const data = bytes.subarray(start, start + size);
    out.push({ name, data, crcOk: data.length === size && crc32(data) === crc });
    at += CENTRAL_HEADER_BYTES + nameLength + extraLength + commentLength;
  }
  return out;
}
