import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";

import "./globals.css";
import { getViewer } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { signOut } from "@/lib/actions/auth";
import { MarketingHeader } from "@/components/nav/marketing-header";
import { AppTopNav } from "@/components/nav/app-top-nav";
import { BottomNav } from "@/components/nav/bottom-nav";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FreshFork — Dinner from the house three doors down.",
  description:
    "A local food marketplace connecting home cooks and small food producers with nearby customers who order dishes for pickup.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();
  const role = viewer?.profile?.role ?? (viewer ? "customer" : null);
  const basketCount = role === "customer" ? (await getCart()).itemCount : 0;

  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable}`} suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground min-h-screen">
        {role ? (
          <AppTopNav role={role} basketCount={basketCount} signOutAction={signOut} />
        ) : (
          <MarketingHeader />
        )}

        <main className={role ? "pb-20 md:pb-0" : undefined}>{children}</main>

        {role ? <BottomNav role={role} basketCount={basketCount} /> : null}
      </body>
    </html>
  );
}
