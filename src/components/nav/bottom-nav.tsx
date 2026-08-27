"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";
import { ROLE_TABS } from "./tabs";
import type { UserRole } from "@/lib/supabase/database.types";

export function BottomNav({ role, basketCount = 0 }: { role: UserRole; basketCount?: number }) {
  const pathname = usePathname();
  const tabs = ROLE_TABS[role];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border">
      <div className={cn("grid", tabs.length === 3 ? "grid-cols-3" : "grid-cols-4")}>
        {tabs.map((tab) => {
          const active = pathname?.startsWith(tab.href);
          const badge = tab.href === "/checkout" ? basketCount : 0;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors relative",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span className="relative">
                <tab.icon className="w-5 h-5" />
                {badge > 0 ? (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                    {badge}
                  </span>
                ) : null}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
