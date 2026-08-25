import { redirect } from "next/navigation";

import { MenuItemForm } from "../_forms/MenuItemForm";
import { getOwnVendor } from "@/lib/vendors-data";

export const metadata = { title: "Add a dish · FreshFork" };

export default async function NewMenuItemPage() {
  const vendor = await getOwnVendor();
  if (!vendor) redirect("/dashboard/vendor/onboarding/business");

  return (
    <div>
      <h1>Add a dish</h1>
      <MenuItemForm vendorId={vendor.id} />
    </div>
  );
}
