import {
  BadgeCheck,
  ChefHat,
  ClipboardList,
  Home,
  Package,
  Settings,
  ShoppingBag,
  Star,
  TriangleAlert,
  User,
  type LucideIcon,
} from "lucide-react";

import type { UserRole } from "@/lib/supabase/database.types";

export type NavTab = { href: string; label: string; icon: LucideIcon };

export const ROLE_HOME: Record<UserRole, string> = {
  customer: "/browse",
  vendor: "/dashboard/vendor/menu",
  admin: "/dashboard/admin/vendors",
};

export const ROLE_TABS: Record<UserRole, NavTab[]> = {
  customer: [
    { href: "/browse", label: "Browse", icon: Home },
    { href: "/checkout", label: "Basket", icon: ShoppingBag },
    { href: "/orders", label: "Orders", icon: Package },
    { href: "/account", label: "Account", icon: User },
  ],
  vendor: [
    { href: "/dashboard/vendor/menu", label: "Menu", icon: ChefHat },
    { href: "/dashboard/vendor/orders", label: "Orders", icon: ClipboardList },
    { href: "/dashboard/vendor/reviews", label: "Reviews", icon: Star },
  ],
  admin: [
    { href: "/dashboard/admin/vendors", label: "Vendors", icon: BadgeCheck },
    { href: "/dashboard/admin/reports", label: "Reports", icon: TriangleAlert },
    { href: "/dashboard/admin/settings", label: "Settings", icon: Settings },
  ],
};
