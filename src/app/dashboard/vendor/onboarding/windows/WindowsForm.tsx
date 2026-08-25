"use client";

import { useActionState } from "react";

import { addPickupWindow, removePickupWindow, finishWindowsStep } from "@/lib/actions/vendor-onboarding";
import { WEEKDAYS } from "@/lib/constants/taxonomy";
import { formatTime } from "@/lib/format";
import type { PickupWindow } from "@/lib/supabase/database.types";

const DAY_LABELS = new Map(WEEKDAYS.map((d) => [d.value as number, d.label]));

export function WindowsForm({ windows }: { windows: PickupWindow[] }) {
  const [state, addAction] = useActionState(addPickupWindow, {});
  const [removeState, removeAction] = useActionState(removePickupWindow, {});

  return (
    <div>
      {windows.length === 0 ? (
        <p>No pickup windows yet.</p>
      ) : (
        <ul>
          {windows.map((window) => (
            <li key={window.id}>
              {DAY_LABELS.get(window.day_of_week) ?? window.day_of_week} {formatTime(window.start_time)}–{formatTime(window.end_time)}{" "}
              <form action={removeAction} style={{ display: "inline" }}>
                <input type="hidden" name="window_id" value={window.id} />
                <button type="submit">Remove</button>
              </form>
            </li>
          ))}
        </ul>
      )}
      {removeState.error ? <p role="alert">{removeState.error}</p> : null}

      <form action={addAction}>
        <label>
          Day
          <select name="day_of_week" defaultValue="3">
            {WEEKDAYS.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          From
          <input type="time" name="start_time" defaultValue="18:00" required />
        </label>
        <label>
          To
          <input type="time" name="end_time" defaultValue="20:00" required />
        </label>
        {state.error ? <p role="alert">{state.error}</p> : null}
        <button type="submit">Add window</button>
      </form>

      <form action={finishWindowsStep}>
        <button type="submit">Continue</button>
      </form>
    </div>
  );
}
