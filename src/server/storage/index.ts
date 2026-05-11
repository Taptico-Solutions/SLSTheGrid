import { createSupabaseServiceClient } from "@/lib/supabase/server";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "grid-documents";

/**
 * Spec §4.6 — file bytes go to Supabase Storage (replaces AWS S3).
 * Returns the public URL plus the storage key.
 */
export async function uploadDocument(
  key: string,
  buffer: Buffer,
  contentType: string,
) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, buffer, { contentType, upsert: false });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return { url: publicUrl, key };
}

export async function removeDocument(key: string) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.storage.from(BUCKET).remove([key]);
  if (error) throw new Error(`Storage remove failed: ${error.message}`);
}

export async function signedDocumentUrl(key: string, expiresInSeconds = 60 * 60) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(key, expiresInSeconds);
  if (error || !data) throw new Error(`Signed URL failed: ${error?.message}`);
  return data.signedUrl;
}
