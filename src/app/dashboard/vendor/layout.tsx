import { requireRole } from "@/lib/auth";

export default async function VendorDashboardLayout({ children }: LayoutProps<"/dashboard/vendor">) {
  await requireRole("vendor", "/dashboard/vendor/onboarding/business");
  return <>{children}</>;
}
