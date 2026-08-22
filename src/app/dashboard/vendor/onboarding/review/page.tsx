import Link from "next/link";
import { redirect } from "next/navigation";

import { OnboardingShell } from "@/components/vendor/OnboardingShell";
import { ReviewSubmit } from "@/components/vendor/ReviewSubmit";
import { Pill } from "@/components/marketplace/Pill";
import { getOwnVendor } from "@/lib/vendors-data";
import type { VendorStatus } from "@/lib/supabase/database.types";

export const metadata = { title: "Submit for review · FreshFork" };

const STATUS_COPY: Record<VendorStatus, string> = {
  draft: "Not submitted yet.",
  pending_review: "With our team. We usually get back within two business days.",
  changes_requested: "We need a change before we can approve you — see the note below.",
  approved: "Approved by our team.",
  suspended: "Suspended. See the note below.",
};

export default async function ReviewStepPage(
  props: PageProps<"/dashboard/vendor/onboarding/review">,
) {
  const params = await props.searchParams;
  const vendor = await getOwnVendor();
  if (!vendor) redirect("/dashboard/vendor/onboarding/business");

  const adminGate = vendor.status === "approved";
  const stripeGate = vendor.stripe_connect_status === "complete";

  return (
    <OnboardingShell
      vendor={vendor}
      current="review"
      title={vendor.is_live ? "You're live." : "Ready for review?"}
      intro={
        vendor.is_live
          ? "Neighbors can find you in search right now."
          : "A person on our team reads every application. Both gates below have to clear before your listing appears in search."
      }
    >
      <div className="flex flex-col gap-8">
        {params.submitted === "1" ? (
          <p className="rounded-xl border border-sage bg-sage/15 px-4 py-3 text-sm text-forest">
            Submitted. We&apos;ll email you when a reviewer has looked at it.
          </p>
        ) : null}

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line">
          <Gate
            label="Admin review"
            state={adminGate ? "done" : "waiting"}
            detail={STATUS_COPY[vendor.status]}
          />
          <Gate
            label="Stripe payouts"
            state={stripeGate ? "done" : "waiting"}
            detail={
              stripeGate
                ? "Connected."
                : "Not connected yet — you can do this before or after review."
            }
          />
        </dl>

        {vendor.status_note ? (
          <div className="rounded-xl border border-persimmon/40 bg-persimmon/10 px-4 py-3">
            <p className="font-mono text-[11px] tracking-[0.12em] text-cocoa">
              FROM THE REVIEW TEAM
            </p>
            <p className="mt-2 text-sm text-cocoa">{vendor.status_note}</p>
          </div>
        ) : null}

        <ReviewSubmit vendor={vendor} />

        {vendor.is_live ? (
          <Link
            href={`/vendor/${vendor.handle}`}
            className="inline-flex self-start rounded-full bg-forest px-7 py-3.5 text-sm font-semibold text-buttermilk"
          >
            View your public page →
          </Link>
        ) : null}

        <Link
          href="/dashboard/vendor/menu"
          className="text-sm font-medium text-forest underline"
        >
          Manage your menu
        </Link>
      </div>
    </OnboardingShell>
  );
}

function Gate({
  label,
  state,
  detail,
}: {
  label: string;
  state: "done" | "waiting";
  detail: string;
}) {
  return (
    <div className="flex flex-col gap-2 bg-card px-6 py-5">
      <dt className="font-mono text-[11px] tracking-[0.12em] text-ink-50">
        {label.toUpperCase()}
      </dt>
      <dd className="flex flex-col gap-2">
        <Pill tone={state === "done" ? "solid" : "outline"}>
          {state === "done" ? "Cleared" : "Waiting"}
        </Pill>
        <span className="text-[13px] leading-[1.5] text-ink-70">{detail}</span>
      </dd>
    </div>
  );
}
