import Link from "next/link";

import { displayName, requireViewer } from "@/lib/auth";
import { getMyMembership } from "@/lib/membership";
import { openBillingPortal } from "@/lib/actions/membership";
import { features } from "@/lib/env";
import { DeleteAccountForm } from "./DeleteAccountForm";

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

  return (
    <div>
      {denied ? <p role="alert">That area is for a different kind of account.</p> : null}
      {welcome ? <p>Welcome to FreshFork. Your account is live.</p> : null}
      {upgraded ? <p>You&apos;re on FreshFork Plus. Special offers will show up on future orders.</p> : null}

      <h1>Hi, {displayName(viewer)}.</h1>
      <p>{copy.blurb}</p>

      <dl>
        <dt>Email</dt>
        <dd>{viewer.user.email ?? "—"}</dd>
        <dt>Role</dt>
        <dd>{copy.label}</dd>
        <dt>Name</dt>
        <dd>{viewer.profile?.full_name ?? "Not set yet"}</dd>
        <dt>Member since</dt>
        <dd>
          {new Date(viewer.user.created_at).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </dd>
      </dl>

      <h2>Membership: {membership?.plan === "plus" ? "FreshFork Plus" : "Free"}</h2>
      {membership?.plan === "plus" && membership.current_period_end ? (
        <p>
          {membership.cancel_at_period_end ? "Ends" : "Renews"}{" "}
          {new Date(membership.current_period_end).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
          })}
        </p>
      ) : null}
      {membership?.plan === "plus" ? (
        features.membership ? (
          <form action={openBillingPortal}>
            <button type="submit">Manage billing</button>
          </form>
        ) : null
      ) : (
        <p>
          <Link href="/pricing">Upgrade to Plus →</Link>
        </p>
      )}

      {copy.cta ? (
        <p>
          <Link href={copy.cta.href}>{copy.cta.label}</Link>
        </p>
      ) : null}

      <p>
        <Link href="/orders">Your orders</Link>
      </p>

      <DeleteAccountForm />
    </div>
  );
}
