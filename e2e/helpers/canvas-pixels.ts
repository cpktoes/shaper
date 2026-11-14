import { inflateSync } from "node:zlib";

/**
 * Reads a Playwright screenshot's pixels (Phase 16, plan 06), so a browser test can tell a drawn board from an
 * empty canvas without a picture library: 8-bit RGB or RGBA PNGs, not interlaced, every row filter (0–4).
 */
export function decodePng(png: Buffer): { width: number; height: number; rgba: Uint8Array } {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((b, i) => png[i] === b)) throw new Error("not a PNG");
  let offset = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  const data: Buffer[] = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const body = png.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const depth = body[8];
      const colourType = body[9];
      if (depth !== 8 || body[12] !== 0) throw new Error("only 8-bit, non-interlaced PNGs");
      if (colourType === 6) channels = 4;
      else if (colourType === 2) channels = 3;
      else throw new Error(`PNG colour type ${colourType} not read`);
    } else if (type === "IDAT") {
      data.push(body);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(data));
  const stride = width * channels;
  const pixels = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = y * stride;
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? pixels[out + x - channels] : 0;
      const up = y > 0 ? pixels[out - stride + x] : 0;
      const upLeft = y > 0 && x >= channels ? pixels[out - stride + x - channels] : 0;
      let value = row[x];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        value += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      } else if (filter !== 0) throw new Error(`PNG row filter ${filter}`);
      pixels[out + x] = value & 0xff;
    }
  }
  if (channels === 4) return { width, height, rgba: pixels };
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba.set([pixels[3 * i], pixels[3 * i + 1], pixels[3 * i + 2], 255], 4 * i);
  }
  return { width, height, rgba };
}

/** How many pixels differ from `rgb` by more than `tolerance` in any channel. */
export function countUnlike(rgba: Uint8Array, rgb: readonly [number, number, number], tolerance: number): number {
  let count = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    if (
      Math.abs(rgba[i] - rgb[0]) > tolerance ||
      Math.abs(rgba[i + 1] - rgb[1]) > tolerance ||
      Math.abs(rgba[i + 2] - rgb[2]) > tolerance
    ) {
      count++;
    }
  }
  return count;
}

/** How many pixels differ between two pictures of the same size, by more than `tolerance` in any channel. */
export function countDifferent(a: Uint8Array, b: Uint8Array, tolerance: number): number {
  if (a.length !== b.length) throw new Error("pictures of different sizes");
  let count = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (Math.abs(a[i] - b[i]) > tolerance || Math.abs(a[i + 1] - b[i + 1]) > tolerance || Math.abs(a[i + 2] - b[i + 2]) > tolerance) {
      count++;
    }
  }
  return count;
}

/** A `#rrggbb` colour as its three channels. */
export function hexToRgb(hex: string): [number, number, number] {
  const text = hex.trim();
  // The short form too (`#fff`): the dev server's own stylesheet shortens `#ffffff` to it, so a token read off the page
  // can arrive either way.
  const short = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(text);
  if (short) return [parseInt(short[1] + short[1], 16), parseInt(short[2] + short[2], 16), parseInt(short[3] + short[3], 16)];
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(text);
  if (!m) throw new Error(`not a #rrggbb colour: ${hex}`);
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}
