import { SiteNav } from "@/components/marketplace/SiteNav";
import { requireRole } from "@/lib/auth";

export default async function VendorDashboardLayout({
  children,
}: LayoutProps<"/dashboard/vendor">) {
  // Every page under /dashboard/vendor is cook-only.
  await requireRole("vendor", "/dashboard/vendor/onboarding/business");

  return (
    <div className="flex flex-1 flex-col">
      <SiteNav />
      {children}
    </div>
  );
}
