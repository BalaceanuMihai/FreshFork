import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";
import { displayName, getViewer } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";

export const metadata: Metadata = {
  title: "FreshFork — Dinner from the house three doors down.",
  description:
    "A local food marketplace connecting home cooks and small food producers with nearby customers who order dishes for pickup.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();
  const role = viewer?.profile?.role ?? "customer";

  return (
    <html lang="en">
      <body>
        <nav>
          <Link href="/">FreshFork</Link>
          {" | "}
          <Link href="/browse">Browse</Link>
          {" | "}
          <Link href="/orders">Orders</Link>
          {" | "}
          <Link href="/pricing">Pricing</Link>
          {" | "}
          {viewer ? (
            <>
              {role === "vendor" ? (
                <>
                  <Link href="/dashboard/vendor/menu">Cook dashboard</Link>
                  {" | "}
                </>
              ) : null}
              {role === "admin" ? (
                <>
                  <Link href="/dashboard/admin/vendors">Admin</Link>
                  {" | "}
                </>
              ) : null}
              <Link href="/account">{displayName(viewer)}</Link>
              {" | "}
              <form action={signOut} style={{ display: "inline" }}>
                <button type="submit">Sign out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/signin">Sign in</Link>
              {" | "}
              <Link href="/signup">Cook with us</Link>
            </>
          )}
        </nav>
        <hr />
        {children}
      </body>
    </html>
  );
}
