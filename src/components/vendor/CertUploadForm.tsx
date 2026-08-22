"use client";

import { useActionState } from "react";

import { saveCertification, type VendorFormState } from "@/lib/actions/vendor-onboarding";
import { Field, FormError, SubmitButton, inputClass } from "@/components/ui/Form";
import { FileUploadField } from "./FileUploadField";
import type { Vendor } from "@/lib/supabase/database.types";

export function CertUploadForm({ vendor }: { vendor: Vendor }) {
  const [state, formAction] = useActionState<VendorFormState, FormData>(
    saveCertification,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Field label="Certification" hint="The permit or food-handler card you hold.">
        <input
          className={inputClass}
          name="certification_label"
          defaultValue={vendor.certification_label ?? ""}
          placeholder="NYC Food Protection Certificate"
          required
        />
      </Field>

      <FileUploadField
        bucket="vendor-docs"
        vendorId={vendor.id}
        name="cert_doc_path"
        label="Certification document"
        hint="PDF or a photo. Only you and our review team can open this."
        accept="application/pdf,image/*"
        defaultPath={vendor.cert_doc_path ?? ""}
      />

      <Field label="Expires on" hint="Optional — we'll remind you before it lapses.">
        <input
          className={inputClass}
          type="date"
          name="cert_expires_on"
          defaultValue={vendor.cert_expires_on ?? ""}
        />
      </Field>

      {state.error ? <FormError message={state.error} /> : null}

      <div className="flex justify-end">
        <SubmitButton label="Continue" pendingLabel="Saving…" />
      </div>
    </form>
  );
}
