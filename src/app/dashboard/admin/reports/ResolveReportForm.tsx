"use client";

import { useActionState } from "react";

import { resolveReport, type CommunityFormState } from "@/lib/actions/community";
import { Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import type { ReportStatus } from "@/lib/supabase/database.types";

/**
 * Triage controls for one report.
 *
 * `reports_guard` stamps `resolved_by` and `resolved_at` itself when the status
 * moves to resolved or dismissed, so this form never sends them — a reporter
 * must not be able to hand themselves a resolution.
 */
export function ResolveReportForm({ reportId, status }: { reportId: string; status: ReportStatus }) {
  const [state, formAction, pending] = useActionState<CommunityFormState, FormData>(resolveReport, {});

  return (
    <form action={formAction} className="border-t border-border pt-3 flex flex-wrap gap-2 items-end">
      {state.error ? (
        <p className="text-xs text-destructive w-full" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="text-xs text-green-700 w-full" role="status">
          {state.ok}
        </p>
      ) : null}

      <input type="hidden" name="report_id" value={reportId} />

      <Select name="status" defaultValue={status} className="w-auto text-sm py-2">
        <option value="open">Open</option>
        <option value="reviewing">Reviewing</option>
        <option value="resolved">Resolved</option>
        <option value="dismissed">Dismissed</option>
      </Select>
      <Input name="resolution_note" maxLength={1000} placeholder="What did you do?" className="flex-1 min-w-[10rem] text-sm py-2" />

      <Button type="submit" variant="outline" disabled={pending} className="text-sm">
        {pending ? "Saving…" : "Update"}
      </Button>
    </form>
  );
}
