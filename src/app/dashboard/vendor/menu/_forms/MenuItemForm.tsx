"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { Camera } from "lucide-react";

import { createMenuItem, updateMenuItem } from "@/lib/actions/menu";
import { uploadFile } from "@/lib/supabase/upload";
import { ALLERGENS, DIETARY_TAGS } from "@/lib/constants/taxonomy";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
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
  const [preview, setPreview] = useState<string | null>(photoUrl ?? null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  async function onPhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadStatus("Uploading…");
    try {
      const path = await uploadFile("dish-photos", vendorId, file);
      setPhotoPath(path);
      setPreview(URL.createObjectURL(file));
      setUploadStatus(null);
    } catch (error) {
      setUploadStatus(error instanceof Error ? error.message : "Upload failed.");
    }
  }

  return (
    <form action={formAction} className="space-y-4">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}

      <div className="flex flex-col items-center gap-2">
        <label className="w-24 h-24 rounded-xl bg-secondary flex items-center justify-center border-2 border-dashed border-border cursor-pointer hover:bg-muted transition-colors overflow-hidden relative">
          <input type="file" accept="image/*" onChange={onPhotoChange} className="sr-only" />
          {preview ? (
            <Image src={preview} alt="" fill sizes="96px" className="object-cover" />
          ) : (
            <Camera className="w-6 h-6 text-muted-foreground" />
          )}
        </label>
        <input type="hidden" name="photo_path" value={photoPath} />
        {uploadStatus ? <p className="text-xs text-muted-foreground">{uploadStatus}</p> : null}
      </div>

      <Field label="Dish name">
        <Input name="name" defaultValue={item?.name ?? ""} placeholder="Doro Wat + Injera" required />
      </Field>
      <Field label="Menu section">
        <Input name="section" defaultValue={item?.section ?? "Mains"} placeholder="Mains" />
      </Field>
      <Field label="Description">
        <Textarea name="description" defaultValue={item?.description ?? ""} rows={3} placeholder="Describe your dish…" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Price">
          <Input
            name="price"
            inputMode="decimal"
            defaultValue={item ? (item.price_cents / 100).toString() : ""}
            placeholder="0.00"
            required
          />
        </Field>
        <Field label="Portions" hint="Blank = unlimited">
          <Input name="quantity_available" inputMode="numeric" defaultValue={item?.quantity_available?.toString() ?? ""} />
        </Field>
      </div>

      <Field label="Prep note">
        <Input name="prep_note" defaultValue={item?.prep_note ?? ""} placeholder="Order by 3 PM" />
      </Field>

      <TagGroup legend="Dietary" name="dietary_tags" options={DIETARY_TAGS} selected={item?.dietary_tags ?? []} />
      <TagGroup legend="Allergens" name="allergens" options={ALLERGENS} selected={item?.allergens ?? []} />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_available" defaultChecked={item?.is_available ?? true} className="w-4 h-4 accent-primary" />
        Available now — untick to hide it without deleting.
      </label>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="w-full">
        {item ? "Save dish" : "Add dish"}
      </Button>
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
    <fieldset className="space-y-2">
      <legend className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={selected.includes(option.value)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "block px-3 py-1 rounded-full text-xs border transition-colors",
                "peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary peer-checked:font-medium hover:bg-secondary",
              )}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
