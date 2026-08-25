import { notFound, redirect } from "next/navigation";

import { MenuItemForm } from "../../_forms/MenuItemForm";
import { getMenuItem, getOwnVendor, publicPhotoUrl } from "@/lib/vendors-data";

export const metadata = { title: "Edit dish · FreshFork" };

export default async function EditMenuItemPage(props: PageProps<"/dashboard/vendor/menu/[id]/edit">) {
  const { id } = await props.params;
  const vendor = await getOwnVendor();
  if (!vendor) redirect("/dashboard/vendor/onboarding/business");

  const item = await getMenuItem(id);
  if (!item || item.vendor_id !== vendor.id) notFound();

  const photoUrl = await publicPhotoUrl(item.photo_path);

  return (
    <div>
      <h1>Edit {item.name}</h1>
      <MenuItemForm vendorId={vendor.id} item={item} photoUrl={photoUrl} />
    </div>
  );
}
