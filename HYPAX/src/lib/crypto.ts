import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (pw: string | Buffer, salt: Buffer, keylen: number, opts: object) => Promise<Buffer>;

// ── Passwörter: scrypt (N=2^15), Format: scrypt$N$r$p$salt$hash ──
const N = 2 ** 15, R = 8, P = 1, KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const dk = await scrypt(password, salt, KEYLEN, { N, r: R, p: P, maxmem: 128 * N * R * 2 });
  return ["scrypt", N, R, P, salt.toString("base64"), dk.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, "base64");
  const dk = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n), r: Number(r), p: Number(p), maxmem: 128 * Number(n) * Number(r) * 2,
  });
  return dk.length === expected.length && timingSafeEqual(dk, expected);
}

/** Mindestanforderungen: 10 Zeichen, mind. 3 von 4 Zeichenklassen. */
export function passwordProblems(pw: string): string[] {
  const problems: string[] = [];
  if (pw.length < 10) problems.push("mindestens 10 Zeichen");
  const classes = [/[a-zäöüß]/, /[A-ZÄÖÜ]/, /\d/, /[^A-Za-zÄÖÜäöüß\d]/].filter((re) => re.test(pw)).length;
  if (classes < 3) problems.push("mindestens drei Zeichenarten (Klein-, Großbuchstaben, Ziffern, Sonderzeichen)");
  return problems;
}

// ── Tokens & Hashes ──
export const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a), bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// ── Symmetrische Verschlüsselung (AES-256-GCM) für Dokumente und 2FA-Geheimnisse ──
let cachedKey: Buffer | null = null;
export function encryptionKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (raw) {
    const buf = Buffer.from(raw, "base64");
    if (buf.length !== 32) throw new Error("APP_ENCRYPTION_KEY muss 32 Byte (Base64) lang sein.");
    return (cachedKey = buf);
  }
  if (process.env.NODE_ENV === "production") throw new Error("APP_ENCRYPTION_KEY ist in Produktion Pflicht.");
  // Nur für Entwicklung/Tests: deterministischer Schlüssel
  return (cachedKey = createHash("sha256").update("hypax-dev-only-key").digest());
}

export function encryptBuffer(plain: Buffer): Buffer {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const enc = Buffer.concat([c.update(plain), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]);
}

export function decryptBuffer(blob: Buffer): Buffer {
  const iv = blob.subarray(0, 12), tag = blob.subarray(12, 28), enc = blob.subarray(28);
  const d = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]);
}

export const encryptString = (s: string) => encryptBuffer(Buffer.from(s, "utf8")).toString("base64");
export const decryptString = (s: string) => decryptBuffer(Buffer.from(s, "base64")).toString("utf8");
