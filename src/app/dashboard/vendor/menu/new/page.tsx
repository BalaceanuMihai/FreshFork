import { redirect } from "next/navigation";

import { MenuItemForm } from "@/components/vendor/MenuItemForm";
import { getOwnVendor } from "@/lib/vendors-data";

export const metadata = { title: "Add a dish · FreshFork" };

export default async function NewMenuItemPage() {
  const vendor = await getOwnVendor();
  if (!vendor) redirect("/dashboard/vendor/onboarding/business");

  return (
    <section className="mx-auto w-full max-w-[820px] px-6 py-14">
      <h1 className="font-display text-[38px] font-semibold leading-[1.06] tracking-[-0.02em] text-forest">
        Add a dish
      </h1>
      <div className="mt-9 rounded-3xl border border-line bg-card p-8">
        <MenuItemForm vendorId={vendor.id} />
      </div>
    </section>
  );
}
