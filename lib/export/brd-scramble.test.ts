import { describe, expect, it } from "vitest";
import { desCbcDecrypt, desCbcEncrypt, desDecryptBlock, desEncryptBlock } from "./des";
import { BRD_MAGIC, brdKeyAndIv, scrambleBrd, unscrambleBrd } from "./brd-scramble";
import { md5 } from "./md5";

/**
 * AkuShaper's file scramble, piece by piece. Every expected value is a published standard or the output of an
 * independent implementation (RFC 1321's MD5 suite, FIPS 46's DES example, openssl's des-cbc), never a figure
 * the app produced.
 */

const ascii = (text: string) => Uint8Array.from(text, (c) => c.charCodeAt(0));
const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const bytesOf = (digits: string) => Uint8Array.from(digits.match(/../g) ?? [], (pair) => parseInt(pair, 16));

describe("MD5 (RFC 1321, appendix A.5)", () => {
  const suite: [string, string][] = [
    ["", "d41d8cd98f00b204e9800998ecf8427e"],
    ["a", "0cc175b9c0f1b6a831c399e269772661"],
    ["abc", "900150983cd24fb0d6963f7d28e17f72"],
    ["message digest", "f96b697d7cb7938d525a2f31aaf161d0"],
    ["abcdefghijklmnopqrstuvwxyz", "c3fcd3d76192e4007dfb496cca67e13b"],
    ["ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", "d174ab98d277d9f5a5611c2c9f419d9f"],
    ["1234567890".repeat(8), "57edf4a22be3c955ac49da2e2107b67a"],
  ];

  it.each(suite)("gives the published digest of %j", (text, digest) => {
    expect(hex(md5(ascii(text)))).toBe(digest);
  });

  it("is deterministic on a 1 MB input and keeps no state between calls", () => {
    const big = new Uint8Array(1_000_000).map((_, i) => (i * 31 + 7) & 0xff);
    const first = hex(md5(big));
    expect(first).toHaveLength(32);
    expect(hex(md5(big))).toBe(first);
    expect(hex(md5(ascii("abc")))).toBe("900150983cd24fb0d6963f7d28e17f72");
  });
});

describe("DES", () => {
  const key = bytesOf("133457799bbcdff1");
  const plain = bytesOf("0123456789abcdef");
  const cipher = bytesOf("85e813540f0ab405");

  it("encrypts the classic example block", () => {
    expect(hex(desEncryptBlock(key, plain))).toBe("85e813540f0ab405");
  });

  it("decrypts it back", () => {
    expect(hex(desDecryptBlock(key, cipher))).toBe("0123456789abcdef");
  });
});

describe("the .brd key and IV", () => {
  it("are the ones AkuShaper's own files were proven with", () => {
    const { key, iv } = brdKeyAndIv();
    expect(hex(key)).toBe("8c41236a7fc96bce");
    expect(hex(iv)).toBe("7aff2c48277a18dd");
  });
});

describe("DES-CBC with PKCS#5 padding under that key and IV", () => {
  const { key, iv } = brdKeyAndIv();
  const cases: [string, string][] = [
    ["p01 : 208.28\n", "82a16b4789bb100dbb642ceae88f2421"],
    ["ABCDEFGH", "9b48d016be96e15d8ccf4277b5e065af"],
    ["", "0511f47aaa0387ee"],
  ];

  it.each(cases)("matches openssl for %j", (text, expected) => {
    expect(hex(desCbcEncrypt(key, iv, ascii(text)))).toBe(expected);
  });

  it.each(cases)("decrypts %j back", (text, expected) => {
    expect(Array.from(desCbcDecrypt(key, iv, bytesOf(expected)))).toEqual(Array.from(ascii(text)));
  });

  it("grows a whole block to two and an empty input to one", () => {
    expect(desCbcEncrypt(key, iv, ascii("ABCDEFGH")).length).toBe(16);
    expect(desCbcEncrypt(key, iv, new Uint8Array(0)).length).toBe(8);
  });

  it("refuses a length that is not whole blocks, and bad padding", () => {
    expect(() => desCbcDecrypt(key, iv, new Uint8Array(7))).toThrow();
    expect(() => desCbcDecrypt(key, iv, new Uint8Array(0))).toThrow();
    // A valid block decrypted under the wrong IV gives garbage padding.
    const good = desCbcEncrypt(key, iv, ascii("p01 : 208.28\n"));
    const damaged = good.slice();
    damaged[damaged.length - 1] ^= 0x55;
    expect(() => desCbcDecrypt(key, iv, damaged)).toThrow();
  });
});

describe("scrambleBrd / unscrambleBrd", () => {
  it("starts with the 12-byte stamp and the rest is the DES-CBC of the text", () => {
    const text = "p01 : 208.28\n";
    const bytes = scrambleBrd(text);
    expect(BRD_MAGIC).toBe("%BRD-1.02s00");
    expect(Array.from(bytes.subarray(0, 12))).toEqual(Array.from(ascii(BRD_MAGIC)));
    const { key, iv } = brdKeyAndIv();
    expect(hex(bytes.subarray(12))).toBe(hex(desCbcEncrypt(key, iv, ascii(text))));
  });

  it("round-trips a one-line text and one of about 150 KB", () => {
    expect(unscrambleBrd(scrambleBrd("p01 : 1.0\n"))).toBe("p01 : 1.0\n");
    const big = Array.from({ length: 3000 }, (_, i) => `(cp [${i}.5,${i * 2}.25,0.0,0.0,1.0,2.0] true false)\n`).join("");
    expect(big.length).toBeGreaterThan(140_000);
    expect(unscrambleBrd(scrambleBrd(big))).toBe(big);
  });

  it("refuses bytes without the stamp, and a text that is not ASCII", () => {
    expect(() => unscrambleBrd(ascii("p01 : 1.0\n"))).toThrow();
    expect(() => scrambleBrd("Tail é")).toThrow();
  });

  it("always scrambles the same text to the same bytes", () => {
    expect(hex(scrambleBrd("p01 : 1.0\n"))).toBe(hex(scrambleBrd("p01 : 1.0\n")));
  });
});
