/**
 * DES (FIPS 46-3) and DES in CBC mode with PKCS#5 padding, pure and synchronous, written from the standard.
 * AkuShaper's board files are scrambled with Java's PBEWithMD5AndDES, and a browser's Web Crypto has no DES.
 * It is used for that compatibility only — DES is no protection by today's standards.
 *
 * Speed: a board file is 100-200 KB, so 15-25 thousand blocks. The sixteen subkeys are built once per call,
 * the S-boxes and the P permutation are folded into eight 64-entry tables once at load, and a round is eight
 * lookups on 32-bit halves.
 */

const IP = [
  58, 50, 42, 34, 26, 18, 10, 2, 60, 52, 44, 36, 28, 20, 12, 4, 62, 54, 46, 38, 30, 22, 14, 6, 64, 56, 48, 40, 32, 24, 16, 8,
  57, 49, 41, 33, 25, 17, 9, 1, 59, 51, 43, 35, 27, 19, 11, 3, 61, 53, 45, 37, 29, 21, 13, 5, 63, 55, 47, 39, 31, 23, 15, 7,
];
const P = [
  16, 7, 20, 21, 29, 12, 28, 17, 1, 15, 23, 26, 5, 18, 31, 10, 2, 8, 24, 14, 32, 27, 3, 9, 19, 13, 30, 6, 22, 11, 4, 25,
];
const PC1 = [
  57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35, 27, 19, 11, 3, 60, 52, 44, 36, 63, 55, 47, 39,
  31, 23, 15, 7, 62, 54, 46, 38, 30, 22, 14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 28, 20, 12, 4,
];
const PC2 = [
  14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10, 23, 19, 12, 4, 26, 8, 16, 7, 27, 20, 13, 2, 41, 52, 31, 37, 47, 55, 30, 40, 51,
  45, 33, 48, 44, 49, 39, 56, 34, 53, 46, 42, 50, 36, 29, 32,
];
const KEY_SHIFTS = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1];
const SBOXES = [
  [
    14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7, 0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8, 4, 1, 14, 8, 13,
    6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0, 15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13,
  ],
  [
    15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10, 3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10, 6, 9, 11, 5, 0, 14, 7, 11, 10,
    4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15, 13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9,
  ],
  [
    10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8, 13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1, 13, 6, 4, 9, 8,
    15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7, 1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12,
  ],
  [
    7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15, 13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9, 10, 6, 9, 0, 12,
    11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4, 3, 15, 0, 6, 10, 1, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14,
  ],
  [
    2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9, 14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6, 4, 2, 1, 11, 10,
    13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14, 11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3,
  ],
  [
    12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11, 10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8, 9, 14, 15, 5, 2,
    8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6, 4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13,
  ],
  [
    4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1, 13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6, 1, 4, 11, 13, 12,
    3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2, 6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12,
  ],
  [
    13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7, 1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2, 7, 11, 4, 1, 9,
    12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8, 2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11,
  ],
];

/** Bit `n` (1 = most significant) of a `width`-bit number held as a plain number (width up to 32). */
const bitOf = (value: number, n: number, width: number) => (value >>> (width - n)) & 1;

/** S-box j and the P permutation folded together: SP[j][six-bit input] is the 32-bit word that box adds to the round's output. */
const SP: Uint32Array[] = SBOXES.map((box, j) =>
  Uint32Array.from({ length: 64 }, (_, input) => {
    const row = ((input & 0x20) >> 4) | (input & 1);
    const column = (input >> 1) & 15;
    const placed = (box[row * 16 + column] << (28 - 4 * j)) >>> 0; // the box's four output bits, before P
    let out = 0;
    for (let i = 0; i < 32; i++) out = (out << 1) | bitOf(placed, P[i], 32);
    return out >>> 0;
  }),
);

/** The initial permutation and its inverse, as source-bit tables (index = output bit, value = input bit, both 1-based). */
const FP = (() => {
  const inverse = new Array<number>(64);
  IP.forEach((from, i) => {
    inverse[from - 1] = i + 1;
  });
  return inverse;
})();

/** Permutes a 64-bit block held as [hi, lo] by a table of 1-based source bits. */
function permute64(hi: number, lo: number, table: readonly number[]): [number, number] {
  let outHi = 0;
  let outLo = 0;
  for (let i = 0; i < 64; i++) {
    const from = table[i];
    const bit = from <= 32 ? (hi >>> (32 - from)) & 1 : (lo >>> (64 - from)) & 1;
    if (i < 32) outHi = (outHi << 1) | bit;
    else outLo = (outLo << 1) | bit;
  }
  return [outHi >>> 0, outLo >>> 0];
}

/** The sixteen 48-bit subkeys of an 8-byte key, each as eight six-bit values. Parity bits are ignored, as Java does. */
function subkeys(key: Uint8Array): Uint8Array[] {
  if (key.length !== 8) throw new Error("A DES key is 8 bytes.");
  const view = new DataView(key.buffer, key.byteOffset, 8);
  const [hi, lo] = [view.getUint32(0), view.getUint32(4)];
  const keyBit = (n: number) => (n <= 32 ? (hi >>> (32 - n)) & 1 : (lo >>> (64 - n)) & 1);
  let c = 0;
  let d = 0;
  for (let i = 0; i < 28; i++) c = (c << 1) | keyBit(PC1[i]);
  for (let i = 28; i < 56; i++) d = (d << 1) | keyBit(PC1[i]);
  const rotate28 = (v: number, s: number) => ((v << s) | (v >>> (28 - s))) & 0x0fffffff;
  return KEY_SHIFTS.map((shift) => {
    c = rotate28(c, shift);
    d = rotate28(d, shift);
    const cd = (n: number) => (n <= 28 ? (c >>> (28 - n)) & 1 : (d >>> (56 - n)) & 1);
    const six = new Uint8Array(8);
    for (let j = 0; j < 8; j++) {
      let v = 0;
      for (let k = 0; k < 6; k++) v = (v << 1) | cd(PC2[6 * j + k]);
      six[j] = v;
    }
    return six;
  });
}

/** The 16 rounds on one block already put through the initial permutation, with subkeys in the order given. */
function rounds(hi: number, lo: number, keys: readonly Uint8Array[]): [number, number] {
  let left = hi;
  let right = lo;
  for (let r = 0; r < 16; r++) {
    const k = keys[r];
    let f = 0;
    for (let j = 0; j < 8; j++) {
      const s = (4 * j + 5) & 31;
      const expanded = (((right << s) | (right >>> (32 - s))) & 0x3f) ^ k[j]; // the expansion E, group j
      f |= SP[j][expanded];
    }
    const next = (left ^ f) >>> 0;
    left = right;
    right = next;
  }
  // The halves swap before the final permutation.
  return [right >>> 0, left >>> 0];
}

function cryptBlock(keys: readonly Uint8Array[], block: Uint8Array, offset: number): [number, number] {
  const view = new DataView(block.buffer, block.byteOffset + offset, 8);
  const [hi, lo] = permute64(view.getUint32(0), view.getUint32(4), IP);
  const [a, b] = rounds(hi, lo, keys);
  return permute64(a, b, FP);
}

function blockFrom(pair: readonly [number, number]): Uint8Array {
  const out = new Uint8Array(8);
  const view = new DataView(out.buffer);
  view.setUint32(0, pair[0]);
  view.setUint32(4, pair[1]);
  return out;
}

/** Encrypts one 8-byte block under an 8-byte key. */
export function desEncryptBlock(key: Uint8Array, block: Uint8Array): Uint8Array {
  if (block.length !== 8) throw new Error("A DES block is 8 bytes.");
  return blockFrom(cryptBlock(subkeys(key), block, 0));
}

/** Decrypts one 8-byte block under an 8-byte key. */
export function desDecryptBlock(key: Uint8Array, block: Uint8Array): Uint8Array {
  if (block.length !== 8) throw new Error("A DES block is 8 bytes.");
  return blockFrom(cryptBlock(subkeys(key).reverse(), block, 0));
}

/** DES-CBC with PKCS#5 padding: always 1-8 bytes added, each equal to the pad length. */
export function desCbcEncrypt(key: Uint8Array, iv: Uint8Array, plain: Uint8Array): Uint8Array {
  if (iv.length !== 8) throw new Error("A DES IV is 8 bytes.");
  const keys = subkeys(key);
  const pad = 8 - (plain.length % 8);
  const padded = new Uint8Array(plain.length + pad).fill(pad);
  padded.set(plain);
  const out = new Uint8Array(padded.length);
  const outView = new DataView(out.buffer);
  const inView = new DataView(padded.buffer);
  let previousHi = new DataView(iv.buffer, iv.byteOffset, 8).getUint32(0);
  let previousLo = new DataView(iv.buffer, iv.byteOffset, 8).getUint32(4);
  for (let offset = 0; offset < padded.length; offset += 8) {
    const hi = (inView.getUint32(offset) ^ previousHi) >>> 0;
    const lo = (inView.getUint32(offset + 4) ^ previousLo) >>> 0;
    const [ip0, ip1] = permute64(hi, lo, IP);
    const [a, b] = rounds(ip0, ip1, keys);
    [previousHi, previousLo] = permute64(a, b, FP);
    outView.setUint32(offset, previousHi);
    outView.setUint32(offset + 4, previousLo);
  }
  return out;
}

/** The reverse of `desCbcEncrypt`. Throws on a length that is not whole blocks and on padding that is not valid. */
export function desCbcDecrypt(key: Uint8Array, iv: Uint8Array, cipher: Uint8Array): Uint8Array {
  if (iv.length !== 8) throw new Error("A DES IV is 8 bytes.");
  if (cipher.length === 0 || cipher.length % 8 !== 0) throw new Error("DES-CBC data is a whole number of 8-byte blocks.");
  const keys = subkeys(key).reverse();
  const out = new Uint8Array(cipher.length);
  const outView = new DataView(out.buffer);
  const inView = new DataView(cipher.buffer, cipher.byteOffset, cipher.length);
  let previousHi = new DataView(iv.buffer, iv.byteOffset, 8).getUint32(0);
  let previousLo = new DataView(iv.buffer, iv.byteOffset, 8).getUint32(4);
  for (let offset = 0; offset < cipher.length; offset += 8) {
    const blockHi = inView.getUint32(offset);
    const blockLo = inView.getUint32(offset + 4);
    const [ip0, ip1] = permute64(blockHi, blockLo, IP);
    const [a, b] = rounds(ip0, ip1, keys);
    const [hi, lo] = permute64(a, b, FP);
    outView.setUint32(offset, (hi ^ previousHi) >>> 0);
    outView.setUint32(offset + 4, (lo ^ previousLo) >>> 0);
    previousHi = blockHi;
    previousLo = blockLo;
  }
  const pad = out[out.length - 1];
  if (pad < 1 || pad > 8) throw new Error("DES-CBC padding is not valid.");
  for (let i = out.length - pad; i < out.length; i++) if (out[i] !== pad) throw new Error("DES-CBC padding is not valid.");
  return out.slice(0, out.length - pad);
}
