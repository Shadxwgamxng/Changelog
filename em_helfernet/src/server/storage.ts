// Dateispeicher-Abstraktion. Standard: lokales Verzeichnis, jede Datei AES-256-GCM-verschlüsselt (Ruhezustand).
// Ein S3-kompatibler Object Storage lässt sich über dasselbe Interface anbinden (getStorage()).
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { decryptBuffer, encryptBuffer } from "@/lib/crypto";
import { env } from "./env";

export interface ObjectStorage {
  put(data: Buffer): Promise<string>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

class EncryptedLocalStorage implements ObjectStorage {
  private file(key: string) {
    if (!/^[0-9a-f-]{36}$/.test(key)) throw new Error("Ungültiger Speicherschlüssel");
    return path.join(path.resolve(env.storageDir), key.slice(0, 2), key);
  }
  async put(data: Buffer) {
    const key = randomUUID();
    const f = this.file(key);
    await fs.mkdir(path.dirname(f), { recursive: true, mode: 0o700 });
    await fs.writeFile(f, encryptBuffer(data), { mode: 0o600 });
    return key;
  }
  async get(key: string) {
    return decryptBuffer(await fs.readFile(this.file(key)));
  }
  async delete(key: string) {
    await fs.rm(this.file(key), { force: true });
  }
}

let instance: ObjectStorage | null = null;
export const getStorage = (): ObjectStorage => (instance ??= new EncryptedLocalStorage());
export function setStorage(s: ObjectStorage) { instance = s; }

/** Erlaubte Upload-Typen (Magic-Bytes werden zusätzlich geprüft). */
export const ALLOWED_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "text/plain": "txt",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function sniffMatches(mime: string, buf: Buffer): boolean {
  switch (mime) {
    case "application/pdf": return buf.subarray(0, 5).toString() === "%PDF-";
    case "image/png": return buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "image/jpeg": return buf[0] === 0xff && buf[1] === 0xd8;
    case "text/plain": return !buf.subarray(0, 4096).includes(0);
    default: return buf[0] === 0x50 && buf[1] === 0x4b; // docx/xlsx = ZIP
  }
}
