"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Field } from "@/components/ui/Form";

/**
 * Uploads straight from the browser to Supabase Storage, then hands the
 * resulting object path to the surrounding form via a hidden input.
 *
 * Going direct keeps file bytes out of the server action body; storage RLS
 * enforces that the `{vendor_id}/…` prefix belongs to the caller.
 */
export function FileUploadField({
  bucket,
  vendorId,
  name,
  label,
  hint,
  accept,
  defaultPath = "",
  previewUrl = null,
}: {
  bucket: "vendor-docs" | "dish-photos";
  vendorId: string;
  name: string;
  label: string;
  hint?: string;
  accept: string;
  defaultPath?: string;
  previewUrl?: string | null;
}) {
  const [path, setPath] = useState(defaultPath);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(previewUrl);

  async function upload(file: File) {
    setStatus("uploading");
    setMessage(null);

    const supabase = createClient();
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const objectPath = `${vendorId}/${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage.from(bucket).upload(objectPath, file, {
      upsert: false,
      contentType: file.type || undefined,
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setPath(objectPath);
    setStatus("idle");
    setMessage(`${file.name} uploaded.`);

    if (bucket === "dish-photos") {
      setLocalPreview(supabase.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label={label} hint={hint}>
        <input
          type="file"
          accept={accept}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
          className="w-full rounded-xl border border-dashed border-line bg-buttermilk px-4 py-3 text-sm text-ink-70 file:mr-4 file:rounded-full file:border-0 file:bg-forest file:px-4 file:py-2 file:text-[13px] file:font-semibold file:text-buttermilk"
        />
      </Field>

      <input type="hidden" name={name} value={path} />

      {status === "uploading" ? (
        <p className="text-xs text-ink-50">Uploading…</p>
      ) : null}
      {message ? (
        <p
          className={`text-xs ${status === "error" ? "text-persimmon" : "text-ink-50"}`}
        >
          {message}
        </p>
      ) : null}
      {!message && path ? (
        <p className="text-xs text-ink-50">A file is already on record.</p>
      ) : null}

      {localPreview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={localPreview}
          alt=""
          className="h-32 w-32 rounded-xl border border-line object-cover"
        />
      ) : null}
    </div>
  );
}
