"use client";

import { useActionState, useState } from "react";

import { saveCertification } from "@/lib/actions/vendor-onboarding";
import { uploadFile } from "@/lib/supabase/upload";
import type { Vendor } from "@/lib/supabase/database.types";

export function CertForm({ vendor }: { vendor: Vendor }) {
  const [state, formAction] = useActionState(saveCertification, {});
  const [docPath, setDocPath] = useState(vendor.cert_doc_path ?? "");
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadStatus("Uploading…");
    try {
      const path = await uploadFile("vendor-docs", vendor.id, file);
      setDocPath(path);
      setUploadStatus(`${file.name} uploaded.`);
    } catch (error) {
      setUploadStatus(error instanceof Error ? error.message : "Upload failed.");
    }
  }

  return (
    <form action={formAction}>
      <label>
        Certification
        <input name="certification_label" defaultValue={vendor.certification_label ?? ""} placeholder="NYC Food Protection Certificate" required />
      </label>

      <label>
        Certification document (PDF or photo)
        <input type="file" accept="application/pdf,image/*" onChange={onFileChange} />
      </label>
      <input type="hidden" name="cert_doc_path" value={docPath} />
      {uploadStatus ? <p>{uploadStatus}</p> : null}

      <label>
        Expires on
        <input type="date" name="cert_expires_on" defaultValue={vendor.cert_expires_on ?? ""} />
      </label>

      {state.error ? <p role="alert">{state.error}</p> : null}
      <button type="submit">Continue</button>
    </form>
  );
}
