"use client";

import { useActionState } from "react";

import { saveBusinessInfo, type VendorFormState } from "@/lib/actions/vendor-onboarding";
import { Field, FormError, SubmitButton, inputClass } from "@/components/ui/Form";
import { CUISINES } from "@/lib/constants/taxonomy";
import type { Vendor } from "@/lib/supabase/database.types";

export function BusinessInfoForm({ vendor }: { vendor: Vendor | null }) {
  const [state, formAction] = useActionState<VendorFormState, FormData>(
    saveBusinessInfo,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Field label="Business name" hint="This is what neighbors see on your listing.">
        <input
          className={inputClass}
          name="business_name"
          defaultValue={vendor?.business_name ?? ""}
          placeholder="Amina's Kitchen"
          required
        />
      </Field>

      <Field label="Cuisine">
        <select
          className={inputClass}
          name="cuisine"
          defaultValue={vendor?.cuisine ?? ""}
          required
        >
          <option value="" disabled>
            Choose a cuisine
          </option>
          {CUISINES.map((cuisine) => (
            <option key={cuisine} value={cuisine}>
              {cuisine}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Kitchen" hint="Where you cook — shown on your profile.">
        <input
          className={inputClass}
          name="kitchen_type"
          defaultValue={vendor?.kitchen_type ?? ""}
          placeholder="Home kitchen · inspected"
        />
      </Field>

      <Field label="Your story" hint="A few sentences on what you cook and why.">
        <textarea
          className={`${inputClass} min-h-[140px] resize-y`}
          name="story"
          defaultValue={vendor?.story ?? ""}
          placeholder="I've been cooking my grandmother's doro wat for twenty years…"
        />
      </Field>

      {state.error ? <FormError message={state.error} /> : null}

      <div className="flex justify-end">
        <SubmitButton label="Continue" pendingLabel="Saving…" />
      </div>
    </form>
  );
}
