"use client";

import Link from "next/link";
import { useActionState } from "react";

import { createMenuItem, updateMenuItem, type MenuFormState } from "@/lib/actions/menu";
import { Field, FormError, SubmitButton, inputClass } from "@/components/ui/Form";
import { FileUploadField } from "./FileUploadField";
import { ALLERGENS, DIETARY_TAGS } from "@/lib/constants/taxonomy";
import type { MenuItem } from "@/lib/supabase/database.types";

export function MenuItemForm({
  vendorId,
  item,
  photoUrl,
}: {
  vendorId: string;
  item?: MenuItem;
  photoUrl?: string | null;
}) {
  const [state, formAction] = useActionState<MenuFormState, FormData>(
    item ? updateMenuItem : createMenuItem,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}

      <div className="grid grid-cols-2 gap-5">
        <Field label="Dish name">
          <input
            className={inputClass}
            name="name"
            defaultValue={item?.name ?? ""}
            placeholder="Doro Wat + Injera"
            required
          />
        </Field>
        <Field label="Menu section" hint="Groups dishes on your public page.">
          <input
            className={inputClass}
            name="section"
            defaultValue={item?.section ?? "Mains"}
            placeholder="Mains"
          />
        </Field>
      </div>

      <Field label="Description">
        <textarea
          className={`${inputClass} min-h-[110px] resize-y`}
          name="description"
          defaultValue={item?.description ?? ""}
          placeholder="Slow-cooked chicken in berbere, served with house injera."
        />
      </Field>

      <div className="grid grid-cols-3 gap-5">
        <Field label="Price" hint="In dollars.">
          <input
            className={inputClass}
            name="price"
            inputMode="decimal"
            defaultValue={item ? (item.price_cents / 100).toString() : ""}
            placeholder="16"
            required
          />
        </Field>
        <Field label="Portions" hint="Leave blank for unlimited.">
          <input
            className={inputClass}
            name="quantity_available"
            inputMode="numeric"
            defaultValue={item?.quantity_available?.toString() ?? ""}
            placeholder="8"
          />
        </Field>
        <Field label="Prep note" hint="Shown on the card.">
          <input
            className={inputClass}
            name="prep_note"
            defaultValue={item?.prep_note ?? ""}
            placeholder="Order by 3 PM"
          />
        </Field>
      </div>

      <FileUploadField
        bucket="dish-photos"
        vendorId={vendorId}
        name="photo_path"
        label="Photo"
        hint="One good daylight photo beats three bad ones."
        accept="image/*"
        defaultPath={item?.photo_path ?? ""}
        previewUrl={photoUrl ?? null}
      />

      <TagGroup
        legend="Dietary"
        hint="Shown as badges. Only tick what's true for every portion."
        name="dietary_tags"
        options={DIETARY_TAGS}
        selected={item?.dietary_tags ?? []}
      />

      <TagGroup
        legend="Allergens"
        hint="Structured, never buried in the description — this is what neighbors filter on."
        name="allergens"
        options={ALLERGENS}
        selected={item?.allergens ?? []}
      />

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          name="is_available"
          defaultChecked={item?.is_available ?? true}
          className="h-4 w-4 accent-persimmon"
        />
        <span className="text-sm text-forest">
          Available now — untick to hide it without deleting.
        </span>
      </label>

      {state.error ? <FormError message={state.error} /> : null}

      <div className="flex items-center justify-end gap-4 border-t border-line pt-7">
        <Link href="/dashboard/vendor/menu" className="text-sm font-medium text-ink-70">
          Cancel
        </Link>
        <SubmitButton
          label={item ? "Save dish" : "Add dish"}
          pendingLabel="Saving…"
        />
      </div>
    </form>
  );
}

function TagGroup({
  legend,
  hint,
  name,
  options,
  selected,
}: {
  legend: string;
  hint: string;
  name: string;
  options: readonly { value: string; label: string }[];
  selected: string[];
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-[13px] font-medium text-forest">{legend}</legend>
      <p className="text-xs text-ink-50">{hint}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line bg-buttermilk px-3.5 py-2 text-xs font-medium text-forest has-[:checked]:border-forest has-[:checked]:bg-forest has-[:checked]:text-buttermilk"
          >
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={selected.includes(option.value)}
              className="h-3 w-3 accent-persimmon"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
