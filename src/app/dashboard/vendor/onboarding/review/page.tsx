import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, CheckCircle, Clock } from "lucide-react";

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
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-semibold">{vendor.is_live ? "You're live." : "Ready for review?"}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {vendor.is_live
            ? "Neighbors can find you in search right now."
            : "A person on our team reads every application. Both gates below have to clear."}
        </p>
      </div>

      {params.submitted === "1" ? (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm">
          Submitted. We&apos;ll email you when a reviewer has looked at it.
        </div>
      ) : null}

      <div className="bg-card rounded-2xl border border-border divide-y divide-border">
        <GateRow label="Admin review" cleared={adminGate} detail={STATUS_COPY[vendor.status]} />
        <GateRow
          label="Stripe payouts"
          cleared={stripeGate}
          detail={stripeGate ? "Connected." : "Not connected yet — you can do this before or after review."}
        />
      </div>

      {vendor.status_note ? (
        <div className="bg-secondary rounded-xl p-4 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">From the review team</p>
          <p className="text-sm">{vendor.status_note}</p>
        </div>
      ) : null}

      <ReviewSubmitForm vendor={vendor} />

      <div className="space-y-1.5 pt-2">
        {vendor.is_live ? (
          <Link href={`/vendor/${vendor.handle}`} className="block text-sm text-primary font-medium hover:underline">
            View your public page →
          </Link>
        ) : null}
        <Link href="/dashboard/vendor/menu" className="block text-sm text-muted-foreground hover:text-foreground">
          Manage your menu →
        </Link>
      </div>
    </div>
  );
}

function GateRow({ label, cleared, detail }: { label: string; cleared: boolean; detail: string }) {
  return (
    <div className="flex items-start gap-3 p-4">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${cleared ? "bg-green-500" : "bg-muted border-2 border-border"}`}
      >
        {cleared ? <Check className="w-3.5 h-3.5 text-white" /> : <Clock className="w-3 h-3 text-muted-foreground" />}
      </div>
      <div>
        <p className="text-sm font-medium flex items-center gap-1.5">
          {label}
          {cleared ? <CheckCircle className="w-3.5 h-3.5 text-green-600" /> : null}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
      </div>
    </div>
  );
}
