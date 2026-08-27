"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";

import { addPickupWindow, removePickupWindow, finishWindowsStep } from "@/lib/actions/vendor-onboarding";
import { WEEKDAYS } from "@/lib/constants/taxonomy";
import { formatTime } from "@/lib/format";
import { Field, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import type { PickupWindow } from "@/lib/supabase/database.types";

const DAY_LABELS = new Map(WEEKDAYS.map((d) => [d.value as number, d.label]));

export function WindowsForm({ windows }: { windows: PickupWindow[] }) {
  const [state, addAction, addPending] = useActionState(addPickupWindow, {});
  const [removeState, removeAction] = useActionState(removePickupWindow, {});

  return (
    <div className="space-y-5">
      {windows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pickup windows yet.</p>
      ) : (
        <ul className="space-y-2">
          {windows.map((window) => (
            <li
              key={window.id}
              className="flex items-center justify-between gap-3 bg-secondary rounded-lg px-3 py-2.5 text-sm"
            >
              <span className="font-medium">
                {DAY_LABELS.get(window.day_of_week) ?? window.day_of_week} · {formatTime(window.start_time)}–
                {formatTime(window.end_time)}
              </span>
              <form action={removeAction}>
                <input type="hidden" name="window_id" value={window.id} />
                <button type="submit" className="text-muted-foreground hover:text-destructive transition-colors p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      {removeState.error ? (
        <p className="text-sm text-destructive" role="alert">
          {removeState.error}
        </p>
      ) : null}

      <form action={addAction} className="grid grid-cols-3 gap-2 items-end">
        <Field label="Day" className="col-span-1">
          <Select name="day_of_week" defaultValue="3">
            {WEEKDAYS.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="From">
          <input
            type="time"
            name="start_time"
            defaultValue="18:00"
            required
            className="w-full border border-border rounded-lg px-2 py-2.5 bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </Field>
        <Field label="To">
          <input
            type="time"
            name="end_time"
            defaultValue="20:00"
            required
            className="w-full border border-border rounded-lg px-2 py-2.5 bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </Field>
        <div className="col-span-3 space-y-2">
          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
          <Button type="submit" variant="outline" disabled={addPending} className="w-full">
            {addPending ? "Adding…" : "Add window"}
          </Button>
        </div>
      </form>

      <form action={finishWindowsStep}>
        <Button type="submit" className="w-full">
          Continue
        </Button>
      </form>
    </div>
  );
}
