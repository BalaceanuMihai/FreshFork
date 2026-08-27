import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ResolveReportForm } from "./ResolveReportForm";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill, type StatusTone } from "@/components/ui/badge";
import type { ReportReason, ReportStatus } from "@/lib/supabase/database.types";

export const metadata = { title: "Reports · FreshFork" };

const REASON_COPY: Record<ReportReason, string> = {
  food_safety: "Food safety",
  allergen_error: "Allergen listing is wrong",
  hygiene: "Hygiene",
  fraud: "Fraud",
  offensive: "Offensive content",
  other: "Other",
};

const STATUS_TONE: Record<ReportStatus, StatusTone> = {
  open: "danger",
  reviewing: "warning",
  resolved: "success",
  dismissed: "neutral",
};

/**
 * The moderation queue.
 *
 * Ordered by reason, not by date: a food-safety or allergen report is a health
 * matter and should not sit behind a week of "offensive content" complaints.
 */
const PRIORITY: ReportReason[] = ["food_safety", "allergen_error", "hygiene", "fraud", "offensive", "other"];

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("admin", "/dashboard/admin/reports");
  const query = await searchParams;
  const showAll = query.all === "1";

  const supabase = await createClient();
  let request = supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(200);

  if (!showAll) request = request.in("status", ["open", "reviewing"]);

  const { data: reports, error } = await request;

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="font-display text-2xl font-semibold mb-4">Reports</h1>
        <p className="text-sm text-destructive" role="alert">
          Could not load the queue. Try again shortly.
        </p>
      </div>
    );
  }

  const sorted = [...(reports ?? [])].sort((a, b) => PRIORITY.indexOf(a.reason) - PRIORITY.indexOf(b.reason));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Reports</h1>
        <Link href={showAll ? "/dashboard/admin/reports" : "/dashboard/admin/reports?all=1"} className="text-sm text-primary font-medium hover:underline">
          {showAll ? "Only open reports" : "Show every report"}
        </Link>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={TriangleAlert} title="Nothing in the queue" body="Reports will appear here as they're filed." />
      ) : (
        <div className="space-y-3">
          {sorted.map((report) => (
            <div key={report.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <StatusPill label={report.status} tone={STATUS_TONE[report.status]} />
                  <span className="text-xs border border-border px-2 py-0.5 rounded-full text-muted-foreground">
                    {REASON_COPY[report.reason]}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(report.created_at).toLocaleString("en-GB")}</span>
              </div>

              <p className="text-sm">
                {report.subject_type} · <span className="font-mono text-xs">{report.subject_id}</span>
              </p>
              {report.detail ? <p className="text-sm text-muted-foreground leading-relaxed">{report.detail}</p> : null}
              {report.resolution_note ? (
                <p className="text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2">
                  Resolution: {report.resolution_note}
                </p>
              ) : null}

              <ResolveReportForm reportId={report.id} status={report.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
