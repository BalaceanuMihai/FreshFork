"use client";

import { useActionState } from "react";

import { saveBusinessInfo } from "@/lib/actions/vendor-onboarding";
import { CUISINES } from "@/lib/constants/taxonomy";
import type { Vendor } from "@/lib/supabase/database.types";

export function BusinessForm({ vendor }: { vendor: Vendor | null }) {
  const [state, formAction] = useActionState(saveBusinessInfo, {});

  return (
    <form action={formAction}>
      <label>
        Business name
        <input name="business_name" defaultValue={vendor?.business_name ?? ""} placeholder="Amina's Kitchen" required />
      </label>
      <label>
        Cuisine
        <select name="cuisine" defaultValue={vendor?.cuisine ?? ""} required>
          <option value="" disabled>
            Choose a cuisine
          </option>
          {CUISINES.map((cuisine) => (
            <option key={cuisine} value={cuisine}>
              {cuisine}
            </option>
          ))}
        </select>
      </label>
      <label>
        Kitchen
        <input name="kitchen_type" defaultValue={vendor?.kitchen_type ?? ""} placeholder="Home kitchen · inspected" />
      </label>
      <label>
        Your story
        <textarea name="story" defaultValue={vendor?.story ?? ""} placeholder="I've been cooking my grandmother's doro wat for twenty years…" />
      </label>

      {state.error ? <p role="alert">{state.error}</p> : null}
      <button type="submit">Continue</button>
    </form>
  );
}
