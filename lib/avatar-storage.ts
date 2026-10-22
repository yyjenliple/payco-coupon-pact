import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const BUCKET = "avatars";
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const CONTENT_TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
/** Only names we generated ourselves are ever stored or served. */
export const AVATAR_NAME = /^[0-9]+-[0-9]+\.(jpg|png|webp)$/;
const LOCAL_DIR = path.join(process.cwd(), "data", "uploads");

export function validateAvatar(file: { type: string; size: number }): string | null {
  if (!TYPES[file.type]) return "JPG, PNG, WebP 사진만 올릴 수 있어요";
  if (file.size > AVATAR_MAX_BYTES) return "5MB 이하 사진만 올릴 수 있어요";
  return null;
}

function supabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

let client: SupabaseClient | null = null;
let bucketReady: Promise<void> | null = null;

function storage() {
  const config = supabaseConfig();
  if (!config) return null;
  client ??= createClient(config.url, config.key, { auth: { persistSession: false } });
  bucketReady ??= (async () => {
    const { data } = await client!.storage.getBucket(BUCKET);
    if (data) return;
    const { error } = await client!.storage.createBucket(BUCKET, {
      public: true,
      allowedMimeTypes: Object.keys(TYPES),
      fileSizeLimit: AVATAR_MAX_BYTES,
    });
    if (error && !/already exists/i.test(error.message)) throw error;
  })().catch((error) => {
    bucketReady = null;
    throw error;
  });
  return { client, url: config.url, ready: bucketReady };
}

/** Stores the image and returns the generated file name to keep in users.avatar_path. */
export async function saveAvatar(userId: number, file: File): Promise<string> {
  const name = `${userId}-${Date.now()}.${TYPES[file.type]}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const remote = storage();
  if (remote) {
    await remote.ready;
    const { error } = await remote.client.storage
      .from(BUCKET)
      .upload(name, bytes, { contentType: file.type, cacheControl: "31536000", upsert: false });
    if (error) throw error;
    return name;
  }
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_DIR, name), bytes);
  return name;
}

/** Best-effort removal of a replaced photo; a leftover file is harmless, a failed upload is not. */
export async function deleteAvatar(name: string | null): Promise<void> {
  if (!name || !AVATAR_NAME.test(name)) return;
  try {
    const remote = storage();
    if (remote) {
      await remote.ready;
      await remote.client.storage.from(BUCKET).remove([name]);
    } else {
      await rm(path.join(LOCAL_DIR, name), { force: true });
    }
  } catch (error) {
    console.warn("old avatar not removed:", name, error);
  }
}

/** Where /avatars/[file] should send the browser: a Supabase public URL or the local bytes. */
export async function resolveAvatar(name: string): Promise<{ redirect: string } | { bytes: Buffer; type: string } | null> {
  const match = name.match(AVATAR_NAME);
  if (!match) return null;
  const config = supabaseConfig();
  if (config) return { redirect: `${config.url}/storage/v1/object/public/${BUCKET}/${name}` };
  try {
    return { bytes: await readFile(path.join(LOCAL_DIR, name)), type: CONTENT_TYPES[match[1]] };
  } catch {
    return null;
  }
}
