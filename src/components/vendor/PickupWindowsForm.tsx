"use client";

import { useActionState } from "react";

import {
  addPickupWindow,
  removePickupWindow,
  finishWindowsStep,
  type VendorFormState,
} from "@/lib/actions/vendor-onboarding";
import { Field, FormError, SubmitButton, inputClass } from "@/components/ui/Form";
import { WEEKDAYS } from "@/lib/constants/taxonomy";
import { formatTime } from "@/lib/format";
import type { PickupWindow } from "@/lib/supabase/database.types";

const DAY_LABELS = new Map(WEEKDAYS.map((d) => [d.value as number, d.label]));

export function PickupWindowsForm({ windows }: { windows: PickupWindow[] }) {
  const [state, addAction] = useActionState<VendorFormState, FormData>(
    addPickupWindow,
    {},
  );
  const [removeState, removeAction] = useActionState<VendorFormState, FormData>(
    removePickupWindow,
    {},
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="font-mono text-[11px] tracking-[0.12em] text-ink-50">
          YOUR WEEK
        </span>
        {windows.length === 0 ? (
          <p className="text-sm text-ink-70">
            No pickup windows yet. Add the times you hand food off.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {windows.map((window) => (
              <li
                key={window.id}
                className="flex items-center justify-between rounded-xl border border-line bg-buttermilk px-4 py-3"
              >
                <span className="text-sm text-forest">
                  <span className="font-medium">
                    {DAY_LABELS.get(window.day_of_week) ?? window.day_of_week}
                  </span>
                  {"  ·  "}
                  {formatTime(window.start_time)} – {formatTime(window.end_time)}
                </span>
                <form action={removeAction}>
                  <input type="hidden" name="window_id" value={window.id} />
                  <button
                    type="submit"
                    className="text-[13px] font-medium text-persimmon"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        {removeState.error ? <FormError message={removeState.error} /> : null}
      </div>

      <form action={addAction} className="flex flex-col gap-5 border-t border-line pt-7">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Day">
            <select className={inputClass} name="day_of_week" defaultValue="3">
              {WEEKDAYS.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="From">
            <input className={inputClass} type="time" name="start_time" defaultValue="18:00" required />
          </Field>
          <Field label="To">
            <input className={inputClass} type="time" name="end_time" defaultValue="20:00" required />
          </Field>
        </div>

        {state.error ? <FormError message={state.error} /> : null}

        <div className="flex justify-start">
          <SubmitButton label="Add window" pendingLabel="Adding…" tone="outline" />
        </div>
      </form>

      <form action={finishWindowsStep} className="flex justify-end border-t border-line pt-7">
        <SubmitButton label="Continue" pendingLabel="Saving…" />
      </form>
    </div>
  );
}
