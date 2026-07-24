import { supabase } from "./supabase.js";

// Single public bucket, split into folders by purpose. Keeping one bucket
// keeps the Supabase Storage setup (and its policies) simple — see
// storage-setup.sql for the bucket + RLS policies this relies on.
const BUCKET = "media";

function extensionFor(file) {
  const fromName = file.name?.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  const fromType = file.type?.split("/").pop();
  return fromType || "jpg";
}

/**
 * Uploads an image file to Supabase Storage under `folder/` and returns its
 * public URL. Throws on failure so callers can surface the error message.
 */
export async function uploadImage(file, folder, ownerId) {
  if (!file) return null;
  const ext = extensionFor(file);
  const path = `${folder}/${ownerId}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
