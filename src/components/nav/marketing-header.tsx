import Link from "next/link";

import { Logo } from "@/components/ui/logo";
import { buttonClasses } from "@/components/ui/button";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/pricing" className="hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link href="/browse" className="hover:text-foreground transition-colors">
            Browse
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/signin" className={buttonClasses("ghost", "text-sm")}>
            Sign in
          </Link>
          <Link href="/signup" className={buttonClasses("primary", "text-sm")}>
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
