import Link from "next/link";
import { redirect } from "next/navigation";

import { ReviewSubmitForm } from "./ReviewSubmitForm";
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

export default async function ReviewStepPage(props: PageProps<"/dashboard/vendor/onboarding/review">) {
  const params = await props.searchParams;
  const vendor = await getOwnVendor();
  if (!vendor) redirect("/dashboard/vendor/onboarding/business");

  const adminGate = vendor.status === "approved";
  const stripeGate = vendor.stripe_connect_status === "complete";

  return (
    <div>
      <h1>{vendor.is_live ? "You're live." : "Ready for review?"}</h1>
      <p>
        {vendor.is_live
          ? "Neighbors can find you in search right now."
          : "A person on our team reads every application. Both gates below have to clear."}
      </p>

      {params.submitted === "1" ? <p>Submitted. We&apos;ll email you when a reviewer has looked at it.</p> : null}

      <dl>
        <dt>Admin review</dt>
        <dd>
          {adminGate ? "Cleared" : "Waiting"} — {STATUS_COPY[vendor.status]}
        </dd>
        <dt>Stripe payouts</dt>
        <dd>
          {stripeGate ? "Cleared" : "Waiting"} —{" "}
          {stripeGate ? "Connected." : "Not connected yet — you can do this before or after review."}
        </dd>
      </dl>

      {vendor.status_note ? (
        <div>
          <p>From the review team</p>
          <p>{vendor.status_note}</p>
        </div>
      ) : null}

      <ReviewSubmitForm vendor={vendor} />

      {vendor.is_live ? (
        <p>
          <Link href={`/vendor/${vendor.handle}`}>View your public page →</Link>
        </p>
      ) : null}
      <p>
        <Link href="/dashboard/vendor/menu">Manage your menu</Link>
      </p>
    </div>
  );
}
