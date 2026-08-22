"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Discover", href: "/" },
  { label: "Browse", href: "/browse" },
  { label: "Orders", href: "/orders" },
  { label: "Saved", href: "/saved" },
];

export function Nav({ variant = "guest" }: { variant?: "guest" | "account" }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-10 border-b border-line px-16 py-5 bg-buttermilk">
      <Link href="/" className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-persimmon" aria-hidden />
        <span className="font-display text-[22px] font-semibold tracking-tight text-forest">
          FreshFork
        </span>
      </Link>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-forest px-3 py-1.5 text-xs font-medium text-forest">
        Brooklyn, NY · 3 mi ⌄
      </span>
      <div className="flex flex-1 items-center justify-center gap-8 text-sm font-medium text-forest">
        {TABS.map((tab) => (
          <NavTab key={tab.href} {...tab} active={pathname === tab.href} />
        ))}
      </div>
      {variant === "account" ? (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-forest">Sara P.</span>
          <span className="h-8 w-8 rounded-full bg-sage" aria-hidden />
        </div>
      ) : (
        <div className="flex items-center gap-5">
          <Link href="#" className="text-sm font-medium text-forest">
            Sign in
          </Link>
          <Link
            href="#"
            className="rounded-full bg-forest px-4 py-2.5 text-[13px] font-semibold text-buttermilk"
          >
            Cook with us
          </Link>
        </div>
      )}
    </nav>
  );
}

function NavTab({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1.5">
      <span className={active ? "font-semibold" : ""}>{label}</span>
      <span
        className={`h-0.5 w-5 rounded-full ${active ? "bg-persimmon" : "bg-transparent"}`}
        aria-hidden
      />
    </Link>
  );
}
