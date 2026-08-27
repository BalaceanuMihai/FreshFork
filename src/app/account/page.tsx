import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";

import { displayName, requireViewer } from "@/lib/auth";
import { getMyMembership } from "@/lib/membership";
import { openBillingPortal } from "@/lib/actions/membership";
import { features } from "@/lib/env";
import { DeleteAccountForm } from "./DeleteAccountForm";
import { buttonClasses, Button } from "@/components/ui/button";

export const metadata = { title: "Your account · FreshFork" };

const ROLE_COPY: Record<string, { label: string; blurb: string; cta?: { href: string; label: string } }> = {
  customer: {
    label: "Customer",
    blurb: "Order from verified cooks nearby and pick up on your way home.",
    cta: { href: "/browse", label: "Browse tonight's kitchens" },
  },
  vendor: {
    label: "Cook",
    blurb: "Manage your listings, pickup windows, and payouts from the cook dashboard.",
    cta: { href: "/dashboard/vendor/menu", label: "Go to your menu" },
  },
  admin: {
    label: "Admin",
    blurb: "Platform moderation and vendor verification.",
  },
};

export default async function AccountPage(props: PageProps<"/account">) {
  const params = await props.searchParams;
  const viewer = await requireViewer("/account");
  const role = viewer.profile?.role ?? "customer";
  const copy = ROLE_COPY[role];
  const denied = params.denied === "1";
  const welcome = typeof params.welcome === "string";
  const upgraded = params.upgraded === "1";
  const membership = await getMyMembership();
  const isPlus = membership?.plan === "plus";

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      {denied ? (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm" role="alert">
          That area is for a different kind of account.
        </div>
      ) : null}
      {welcome ? (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm">
          Welcome to FreshFork. Your account is live.
        </div>
      ) : null}
      {upgraded ? (
        <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 text-sm">
          You&apos;re on FreshFork Plus. Special offers will show up on future orders.
        </div>
      ) : null}

      <h1 className="font-display text-2xl font-semibold">Hi, {displayName(viewer)}.</h1>

      {/* Profile */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-semibold font-display text-primary shrink-0">
            {displayName(viewer)[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{viewer.profile?.full_name ?? displayName(viewer)}</p>
            <p className="text-sm text-muted-foreground truncate">{viewer.user.email ?? "—"}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground pt-2 border-t border-border">
          <div>
            <p className="font-medium text-foreground text-sm">{copy.label}</p>
            <p>Role</p>
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">
              {new Date(viewer.user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
            <p>Member since</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground border-t border-border pt-3">{copy.blurb}</p>
      </div>

      {/* Membership */}
      <div className={`rounded-xl border p-5 space-y-3 ${isPlus ? "bg-primary/5 border-primary/30" : "bg-card border-border"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className={`w-5 h-5 ${isPlus ? "text-primary" : "text-muted-foreground"}`} />
            <span className="font-medium">FreshFork Plus</span>
            {isPlus ? <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">Active</span> : null}
          </div>
        </div>
        {isPlus && membership?.current_period_end ? (
          <p className="text-sm text-muted-foreground">
            {membership.cancel_at_period_end ? "Ends" : "Renews"}{" "}
            {new Date(membership.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
          </p>
        ) : null}
        {isPlus ? (
          features.membership ? (
            <form action={openBillingPortal}>
              <Button type="submit" variant="outline" className="w-full">
                Manage billing
              </Button>
            </form>
          ) : null
        ) : (
          <Link href="/pricing" className={buttonClasses("primary", "w-full")}>
            Upgrade to Plus
          </Link>
        )}
      </div>

      {copy.cta ? (
        <Link href={copy.cta.href} className="flex items-center justify-between bg-card rounded-xl border border-border px-4 py-3.5 hover:bg-secondary transition-colors">
          <span className="text-sm font-medium">{copy.cta.label}</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
      ) : null}

      <Link href="/orders" className="flex items-center justify-between bg-card rounded-xl border border-border px-4 py-3.5 hover:bg-secondary transition-colors">
        <span className="text-sm font-medium">Your orders</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </Link>

      <DeleteAccountForm />
    </div>
  );
}
