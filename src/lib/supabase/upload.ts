import { createClient } from "@/lib/supabase/client";

/**
 * Uploads straight from the browser to Supabase Storage and returns the
 * object path. Storage RLS enforces that the `{vendorId}/…` prefix belongs
 * to the caller, so the server action never has to trust the client's path.
 */
export async function uploadFile(
  bucket: "vendor-docs" | "dish-photos",
  vendorId: string,
  file: File,
): Promise<string> {
  const supabase = createClient();
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const objectPath = `${vendorId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(bucket).upload(objectPath, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);

  return objectPath;
}

export function publicUrlFor(bucket: "vendor-docs" | "dish-photos", path: string): string {
  return createClient().storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
