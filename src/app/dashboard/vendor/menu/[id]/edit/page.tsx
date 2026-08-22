import { notFound, redirect } from "next/navigation";

import { MenuItemForm } from "@/components/vendor/MenuItemForm";
import { getMenuItem, getOwnVendor, publicPhotoUrl } from "@/lib/vendors-data";

export const metadata = { title: "Edit dish · FreshFork" };

export default async function EditMenuItemPage(
  props: PageProps<"/dashboard/vendor/menu/[id]/edit">,
) {
  const { id } = await props.params;
  const vendor = await getOwnVendor();
  if (!vendor) redirect("/dashboard/vendor/onboarding/business");

  const item = await getMenuItem(id);
  // RLS already hides other cooks' dishes; this turns that into a clean 404.
  if (!item || item.vendor_id !== vendor.id) notFound();

  const photoUrl = await publicPhotoUrl(item.photo_path);

  return (
    <section className="mx-auto w-full max-w-[820px] px-6 py-14">
      <h1 className="font-display text-[38px] font-semibold leading-[1.06] tracking-[-0.02em] text-forest">
        Edit {item.name}
      </h1>
      <div className="mt-9 rounded-3xl border border-line bg-card p-8">
        <MenuItemForm vendorId={vendor.id} item={item} photoUrl={photoUrl} />
      </div>
    </section>
  );
}
