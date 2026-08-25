"use client";

import { useActionState } from "react";

import { resolveReport, type CommunityFormState } from "@/lib/actions/community";
import type { ReportStatus } from "@/lib/supabase/database.types";

/**
 * Triage controls for one report.
 *
 * `reports_guard` stamps `resolved_by` and `resolved_at` itself when the status
 * moves to resolved or dismissed, so this form never sends them — a reporter
 * must not be able to hand themselves a resolution.
 */
export function ResolveReportForm({
  reportId,
  status,
}: {
  reportId: string;
  status: ReportStatus;
}) {
  const [state, formAction, pending] = useActionState<CommunityFormState, FormData>(
    resolveReport,
    {},
  );

  return (
    <form action={formAction}>
      {state.error ? <p role="alert">{state.error}</p> : null}
      {state.ok ? <p role="status">{state.ok}</p> : null}

      <input type="hidden" name="report_id" value={reportId} />

      <label htmlFor={`status-${reportId}`}>Status</label>
      <select id={`status-${reportId}`} name="status" defaultValue={status}>
        <option value="open">Open</option>
        <option value="reviewing">Reviewing</option>
        <option value="resolved">Resolved</option>
        <option value="dismissed">Dismissed</option>
      </select>

      <label htmlFor={`note-${reportId}`}>What did you do?</label>
      <input id={`note-${reportId}`} name="resolution_note" maxLength={1000} />

      <button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Update"}
      </button>
    </form>
  );
}
