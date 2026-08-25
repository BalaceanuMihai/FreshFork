import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ResolveReportForm } from "./ResolveReportForm";
import type { ReportReason } from "@/lib/supabase/database.types";

export const metadata = { title: "Reports · FreshFork" };

const REASON_COPY: Record<ReportReason, string> = {
  food_safety: "Food safety",
  allergen_error: "Allergen listing is wrong",
  hygiene: "Hygiene",
  fraud: "Fraud",
  offensive: "Offensive content",
  other: "Other",
};

/**
 * The moderation queue.
 *
 * Ordered by reason, not by date: a food-safety or allergen report is a health
 * matter and should not sit behind a week of "offensive content" complaints.
 */
const PRIORITY: ReportReason[] = [
  "food_safety",
  "allergen_error",
  "hygiene",
  "fraud",
  "offensive",
  "other",
];

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("admin", "/dashboard/admin/reports");
  const query = await searchParams;
  const showAll = query.all === "1";

  const supabase = await createClient();
  let request = supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (!showAll) request = request.in("status", ["open", "reviewing"]);

  const { data: reports, error } = await request;

  if (error) {
    return (
      <div>
        <h1>Reports</h1>
        <p role="alert">Could not load the queue. Try again shortly.</p>
      </div>
    );
  }

  const sorted = [...(reports ?? [])].sort(
    (a, b) => PRIORITY.indexOf(a.reason) - PRIORITY.indexOf(b.reason),
  );

  return (
    <div>
      <h1>Reports</h1>
      <p>
        {showAll ? (
          <a href="/dashboard/admin/reports">Show only open reports</a>
        ) : (
          <a href="/dashboard/admin/reports?all=1">Show every report</a>
        )}
      </p>

      {sorted.length === 0 ? (
        <p>Nothing in the queue.</p>
      ) : (
        <ul>
          {sorted.map((report) => (
            <li key={report.id}>
              <h2>{REASON_COPY[report.reason]}</h2>
              <p>
                {report.subject_type} · {report.subject_id} · {report.status}
              </p>
              <p>{new Date(report.created_at).toLocaleString("en-GB")}</p>
              {report.detail ? <p>{report.detail}</p> : null}
              {report.resolution_note ? (
                <p>Resolution: {report.resolution_note}</p>
              ) : null}

              <ResolveReportForm reportId={report.id} status={report.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
