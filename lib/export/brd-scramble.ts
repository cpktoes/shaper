/**
 * AkuShaper's board-file scramble (quick 261110-tvk). A `.brd` file is the board's plain text locked the way
 * AkuShaper locks its own files: the 12 characters `%BRD-1.02s00`, then the text encrypted with Java's
 * PBEWithMD5AndDES — the password, the salt and the 20 rounds below are the format's own fixed constants,
 * published with the format. This is compatibility, not security: anyone can unlock these files, and the
 * program leaves a plain `_decrypt` copy beside any file it opens.
 *
 * The founder proved it on 2026-11-10: re-scrambling his unscrambled egg with exactly these settings
 * reproduced his file byte for byte.
 *
 * The key and the starting value come from MD5 run over the password and salt, then 19 more times over its own
 * result: the first 8 bytes are the DES key, the next 8 the CBC starting value. Pure and synchronous, because
 * the download has to start inside the tap (Safari).
 */
import { desCbcDecrypt, desCbcEncrypt } from "./des";
import { md5 } from "./md5";

/** The stamp every scrambled file starts with. */
export const BRD_MAGIC = "%BRD-1.02s00";

const PASSWORD = "deltaXTaildeltaXMiddle";
const SALT = Uint8Array.of(0xc7, 0x73, 0x21, 0x8c, 0x7e, 0xc8, 0xee, 0x99);
const ROUNDS = 20;

const asciiBytes = (text: string): Uint8Array => {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 0x7f) throw new Error("A board file is plain ASCII text.");
    out[i] = code;
  }
  return out;
};

let derived: { key: Uint8Array; iv: Uint8Array } | null = null;

/** The DES key and CBC starting value, worked out once. */
export function brdKeyAndIv(): { key: Uint8Array; iv: Uint8Array } {
  if (!derived) {
    const password = asciiBytes(PASSWORD);
    const seed = new Uint8Array(password.length + SALT.length);
    seed.set(password);
    seed.set(SALT, password.length);
    let digest = md5(seed);
    for (let i = 1; i < ROUNDS; i++) digest = md5(digest);
    derived = { key: digest.slice(0, 8), iv: digest.slice(8, 16) };
  }
  return { key: derived.key.slice(), iv: derived.iv.slice() };
}

/** The text as an AkuShaper file: the stamp, then the locked text. Refuses anything that is not ASCII. */
export function scrambleBrd(text: string): Uint8Array {
  const { key, iv } = brdKeyAndIv();
  const locked = desCbcEncrypt(key, iv, asciiBytes(text));
  const magic = asciiBytes(BRD_MAGIC);
  const out = new Uint8Array(magic.length + locked.length);
  out.set(magic);
  out.set(locked, magic.length);
  return out;
}

/** The text inside an AkuShaper file. Refuses bytes without the stamp. */
export function unscrambleBrd(data: Uint8Array): string {
  const magic = asciiBytes(BRD_MAGIC);
  if (data.length < magic.length || magic.some((byte, i) => data[i] !== byte)) {
    throw new Error("This is not a scrambled AkuShaper board file.");
  }
  const { key, iv } = brdKeyAndIv();
  const plain = desCbcDecrypt(key, iv, data.subarray(magic.length));
  let text = "";
  for (let i = 0; i < plain.length; i += 8192) text += String.fromCharCode(...plain.subarray(i, i + 8192));
  return text;
}
