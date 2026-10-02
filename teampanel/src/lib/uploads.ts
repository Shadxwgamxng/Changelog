import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { env } from "./env";

export const UPLOAD_KINDS = ["avatars", "equipment", "announcements", "team", "shopping"] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

const TYPES = {
  png: { mime: "image/png", test: (b: Buffer) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  jpg: { mime: "image/jpeg", test: (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  webp: { mime: "image/webp", test: (b: Buffer) => b.length > 12 && b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
  gif: { mime: "image/gif", test: (b: Buffer) => b.length > 6 && ["GIF87a", "GIF89a"].includes(b.subarray(0, 6).toString()) },
} as const;

const MIME_BY_EXT: Record<string, string> = Object.fromEntries(Object.entries(TYPES).map(([ext, t]) => [ext, t.mime]));

export class UploadError extends Error {}

function root() {
  return path.resolve(env.uploadsDir);
}

/** Prüft Dateityp anhand der Magic Bytes (nicht anhand des Dateinamens). SVG ist bewusst nicht erlaubt (XSS). */
export async function saveImage(file: File, kind: UploadKind): Promise<string> {
  if (file.size === 0) throw new UploadError("Die Datei ist leer.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("Die Datei ist zu groß (maximal 3 MB).");
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = (Object.keys(TYPES) as (keyof typeof TYPES)[]).find((e) => TYPES[e].test(buffer));
  if (!ext) throw new UploadError("Nur PNG-, JPG-, WebP- und GIF-Bilder sind erlaubt.");
  const name = `${randomBytes(16).toString("hex")}.${ext}`;
  const dir = path.join(root(), kind);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buffer, { mode: 0o640 });
  return `/api/files/${kind}/${name}`;
}

function resolveFile(segments: string[]) {
  if (segments.length !== 2) return null;
  const [kind, name] = segments as [string, string];
  if (!(UPLOAD_KINDS as readonly string[]).includes(kind)) return null;
  if (!/^[a-f0-9]{32}\.(png|jpg|webp|gif)$/.test(name)) return null;
  return { full: path.join(root(), kind, name), ext: name.split(".")[1]! };
}

export async function readUpload(segments: string[]) {
  const target = resolveFile(segments);
  if (!target) return null;
  try {
    const data = await readFile(target.full);
    return { data, mime: MIME_BY_EXT[target.ext]! };
  } catch {
    return null;
  }
}

/** Entfernt eine zuvor hochgeladene Datei (best effort). Externe URLs werden ignoriert. */
export async function deleteUpload(url: string | null | undefined) {
  if (!url?.startsWith("/api/files/")) return;
  const target = resolveFile(url.replace("/api/files/", "").split("/"));
  if (!target) return;
  await unlink(target.full).catch(() => undefined);
}
