"use client";

import { useActionState } from "react";

import { saveBusinessInfo } from "@/lib/actions/vendor-onboarding";
import { CUISINES } from "@/lib/constants/taxonomy";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import type { Vendor } from "@/lib/supabase/database.types";

export function BusinessForm({ vendor }: { vendor: Vendor | null }) {
  const [state, formAction, pending] = useActionState(saveBusinessInfo, {});

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Business name">
        <Input name="business_name" defaultValue={vendor?.business_name ?? ""} placeholder="Amina's Kitchen" required />
      </Field>
      <Field label="Cuisine">
        <Select name="cuisine" defaultValue={vendor?.cuisine ?? ""} required>
          <option value="" disabled>
            Choose a cuisine
          </option>
          {CUISINES.map((cuisine) => (
            <option key={cuisine} value={cuisine}>
              {cuisine}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Kitchen">
        <Input name="kitchen_type" defaultValue={vendor?.kitchen_type ?? ""} placeholder="Home kitchen · inspected" />
      </Field>
      <Field label="Your story">
        <Textarea
          name="story"
          defaultValue={vendor?.story ?? ""}
          rows={4}
          placeholder="I've been cooking my grandmother's doro wat for twenty years…"
        />
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
