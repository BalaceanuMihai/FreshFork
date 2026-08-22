import { redirect } from "next/navigation";

import { OnboardingShell } from "@/components/vendor/OnboardingShell";
import { PayoutsStep } from "@/components/vendor/PayoutsStep";
import { getOwnVendor } from "@/lib/vendors-data";
import { refreshStripeStatus } from "@/lib/actions/vendor-onboarding";
import { features } from "@/lib/env";

export const metadata = { title: "Payouts · FreshFork" };

export default async function PayoutsStepPage(
  props: PageProps<"/dashboard/vendor/onboarding/payouts">,
) {
  const params = await props.searchParams;
  const vendor = await getOwnVendor();
  if (!vendor) redirect("/dashboard/vendor/onboarding/business");

  const justReturned = params.return === "1";

  // Coming back from Stripe, pull the current state rather than waiting on the
  // webhook — the query param itself is never trusted to change status.
  const current =
    justReturned && features.stripeConnect && vendor.stripe_account_id
      ? ((await refreshStripeStatus(vendor.id)) ?? vendor)
      : vendor;

  return (
    <OnboardingShell
      vendor={current}
      current="payouts"
      title="Get paid for your cooking."
      intro="Stripe runs the identity and bank checks. FreshFork takes a 12% platform fee on orders; the rest lands in your account."
    >
      <PayoutsStep
        vendor={current}
        stripeReady={features.stripeConnect}
        justReturned={justReturned}
      />
    </OnboardingShell>
  );
}
