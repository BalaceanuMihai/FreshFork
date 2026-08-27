import { redirect } from "next/navigation";

import { MenuItemForm } from "../_forms/MenuItemForm";
import { getOwnVendor } from "@/lib/vendors-data";

export const metadata = { title: "Add a dish · FreshFork" };

export default async function NewMenuItemPage() {
  const vendor = await getOwnVendor();
  if (!vendor) redirect("/dashboard/vendor/onboarding/business");

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <h1 className="font-display text-xl font-semibold">Add a dish</h1>
      <div className="bg-card rounded-2xl border border-border p-5">
        <MenuItemForm vendorId={vendor.id} />
      </div>
    </div>
  );
}
