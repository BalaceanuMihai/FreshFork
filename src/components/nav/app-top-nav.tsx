"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, ShoppingBag } from "lucide-react";

import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/cn";
import { ROLE_HOME, ROLE_TABS } from "./tabs";
import type { UserRole } from "@/lib/supabase/database.types";

export function AppTopNav({
  role,
  basketCount = 0,
  signOutAction,
}: {
  role: UserRole;
  basketCount?: number;
  signOutAction: () => Promise<void>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const tabs = ROLE_TABS[role];

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href={ROLE_HOME[role]} className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {tabs.map((tab) => {
            const active = pathname?.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          {role === "customer" ? (
            <Link href="/checkout" className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
              <ShoppingBag className="w-5 h-5" />
              {basketCount > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {basketCount}
                </span>
              ) : null}
            </Link>
          ) : null}
          <form action={signOutAction} className="hidden md:block">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </form>
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="md:hidden p-2 rounded-lg hover:bg-secondary"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="md:hidden border-t border-border bg-background py-2 px-4 space-y-1">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={() => setMenuOpen(false)}
              className="block w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-secondary transition-colors"
            >
              {tab.label}
            </Link>
          ))}
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-secondary transition-colors text-muted-foreground flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </form>
        </div>
      ) : null}
    </header>
  );
}
