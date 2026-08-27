import { redirect } from "next/navigation";

import { PayoutsForm } from "./PayoutsForm";
import { getOwnVendor } from "@/lib/vendors-data";
import { refreshStripeStatus } from "@/lib/vendor-stripe";
import { features } from "@/lib/env";

export const metadata = { title: "Payouts · FreshFork" };

export default async function PayoutsStepPage(props: PageProps<"/dashboard/vendor/onboarding/payouts">) {
  const params = await props.searchParams;
  const vendor = await getOwnVendor();
  if (!vendor) redirect("/dashboard/vendor/onboarding/business");

  const justReturned = params.return === "1";
  const current =
    justReturned && features.stripeConnect && vendor.stripe_account_id
      ? ((await refreshStripeStatus(vendor.id)) ?? vendor)
      : vendor;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold">Get paid for your cooking.</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Stripe runs the identity and bank checks. FreshFork takes a 12% platform fee on orders.
        </p>
      </div>
      <div className="bg-card rounded-2xl border border-border p-5">
        <PayoutsForm vendor={current} stripeReady={features.stripeConnect} justReturned={justReturned} />
      </div>
    </div>
  );
}
