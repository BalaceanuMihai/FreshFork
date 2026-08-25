"use client";

import { useActionState, useState } from "react";

import { createMenuItem, updateMenuItem } from "@/lib/actions/menu";
import { uploadFile } from "@/lib/supabase/upload";
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
  const [state, formAction] = useActionState(item ? updateMenuItem : createMenuItem, {});
  const [photoPath, setPhotoPath] = useState(item?.photo_path ?? "");
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  async function onPhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadStatus("Uploading…");
    try {
      const path = await uploadFile("dish-photos", vendorId, file);
      setPhotoPath(path);
      setUploadStatus(`${file.name} uploaded.`);
    } catch (error) {
      setUploadStatus(error instanceof Error ? error.message : "Upload failed.");
    }
  }

  return (
    <form action={formAction}>
      {item ? <input type="hidden" name="id" value={item.id} /> : null}

      <label>
        Dish name
        <input name="name" defaultValue={item?.name ?? ""} placeholder="Doro Wat + Injera" required />
      </label>
      <label>
        Menu section
        <input name="section" defaultValue={item?.section ?? "Mains"} placeholder="Mains" />
      </label>
      <label>
        Description
        <textarea name="description" defaultValue={item?.description ?? ""} />
      </label>
      <label>
        Price (dollars)
        <input name="price" inputMode="decimal" defaultValue={item ? (item.price_cents / 100).toString() : ""} required />
      </label>
      <label>
        Portions (blank for unlimited)
        <input name="quantity_available" inputMode="numeric" defaultValue={item?.quantity_available?.toString() ?? ""} />
      </label>
      <label>
        Prep note
        <input name="prep_note" defaultValue={item?.prep_note ?? ""} placeholder="Order by 3 PM" />
      </label>

      <label>
        Photo
        <input type="file" accept="image/*" onChange={onPhotoChange} />
      </label>
      <input type="hidden" name="photo_path" value={photoPath} />
      {uploadStatus ? <p>{uploadStatus}</p> : null}
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" width={100} />
      ) : null}

      <TagGroup legend="Dietary" name="dietary_tags" options={DIETARY_TAGS} selected={item?.dietary_tags ?? []} />
      <TagGroup legend="Allergens" name="allergens" options={ALLERGENS} selected={item?.allergens ?? []} />

      <label>
        <input type="checkbox" name="is_available" defaultChecked={item?.is_available ?? true} />
        Available now — untick to hide it without deleting.
      </label>

      {state.error ? <p role="alert">{state.error}</p> : null}

      <button type="submit">{item ? "Save dish" : "Add dish"}</button>
    </form>
  );
}

function TagGroup({
  legend,
  name,
  options,
  selected,
}: {
  legend: string;
  name: string;
  options: readonly { value: string; label: string }[];
  selected: string[];
}) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      {options.map((option) => (
        <label key={option.value}>
          <input type="checkbox" name={name} value={option.value} defaultChecked={selected.includes(option.value)} />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
