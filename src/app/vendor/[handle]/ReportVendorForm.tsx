"use client";

import { useActionState, useState } from "react";
import { Flag } from "lucide-react";

import { submitReport, type CommunityFormState } from "@/lib/actions/community";
import { REPORT_REASON_OPTIONS } from "@/lib/constants/taxonomy";
import { Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

/**
 * The homepage promises "if something's wrong, you can report it instantly"
 * — this is that instant route. `submitReport()` and the whole admin
 * moderation queue behind it have existed since Phase 5 with nothing in the
 * customer-facing UI ever calling them; a wrong allergen list or a hygiene
 * concern had no way to reach a human short of finding support some other
 * way.
 */
export function ReportVendorForm({ vendorId }: { vendorId: string }) {
  const [state, formAction, pending] = useActionState<CommunityFormState, FormData>(submitReport, {});
  const [open, setOpen] = useState(false);

  if (state.ok) {
    return <p className="text-xs text-muted-foreground">{state.ok}</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
      >
        <Flag className="w-3.5 h-3.5" /> Report this kitchen
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 space-y-3 max-w-md"
    >
      <p className="text-sm font-medium">Report this kitchen</p>

      <input type="hidden" name="subject_type" value="vendor" />
      <input type="hidden" name="subject_id" value={vendorId} />

      <fieldset disabled={pending} className="space-y-3">
        <Select name="reason" required defaultValue="">
          <option value="" disabled>
            Choose a reason
          </option>
          {REPORT_REASON_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Textarea name="detail" rows={3} maxLength={2000} placeholder="What happened? (optional)" />

        {state.error ? (
          <p className="text-xs text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1 text-xs py-1.5">
            Never mind
          </Button>
          <Button type="submit" variant="destructive" disabled={pending} className="flex-1 text-xs py-1.5">
            {pending ? "Sending…" : "Send report"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
