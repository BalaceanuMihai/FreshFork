"use client";

import { useActionState, useState } from "react";
import { Check, FileText, Upload } from "lucide-react";

import { saveCertification } from "@/lib/actions/vendor-onboarding";
import { uploadFile } from "@/lib/supabase/upload";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import type { Vendor } from "@/lib/supabase/database.types";

export function CertForm({ vendor }: { vendor: Vendor }) {
  const [state, formAction, pending] = useActionState(saveCertification, {});
  const [docPath, setDocPath] = useState(vendor.cert_doc_path ?? "");
  const [fileName, setFileName] = useState<string | null>(vendor.cert_doc_path ? "Certificate on file" : null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadStatus("Uploading…");
    try {
      const path = await uploadFile("vendor-docs", vendor.id, file);
      setDocPath(path);
      setFileName(file.name);
      setUploadStatus(null);
    } catch (error) {
      setUploadStatus(error instanceof Error ? error.message : "Upload failed.");
    }
  }

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Certification">
        <Input
          name="certification_label"
          defaultValue={vendor.certification_label ?? ""}
          placeholder="NYC Food Protection Certificate"
          required
        />
      </Field>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Certification document</label>
        <label className="flex flex-col items-center justify-center gap-1.5 h-24 rounded-xl border-2 border-dashed border-border bg-secondary cursor-pointer hover:bg-muted transition-colors">
          <input type="file" accept="application/pdf,image/*" onChange={onFileChange} className="sr-only" />
          {fileName ? (
            <>
              <Check className="w-5 h-5 text-green-600" />
              <span className="text-xs text-foreground font-medium">{fileName}</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">PDF, JPG or PNG · max 5 MB</span>
            </>
          )}
        </label>
        <input type="hidden" name="cert_doc_path" value={docPath} />
        {uploadStatus ? <p className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" />{uploadStatus}</p> : null}
      </div>

      <Field label="Expires on">
        <Input type="date" name="cert_expires_on" defaultValue={vendor.cert_expires_on ?? ""} />
      </Field>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
