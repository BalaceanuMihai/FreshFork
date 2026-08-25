"use client";

import { useActionState } from "react";

import {
  advanceOrder,
  refundOrderAction,
  type OrderFormState,
} from "@/lib/actions/orders";
import type { OrderStatus } from "@/lib/supabase/database.types";

/**
 * The kitchen's controls for one order.
 *
 * Only the transitions `advance_order_status()` actually permits are offered.
 * The database would refuse anything else, but a button that always errors is
 * a worse experience than a button that isn't there.
 */
const TRANSITIONS: Partial<
  Record<OrderStatus, { next: string; label: string; needsNote?: boolean }[]>
> = {
  paid: [
    { next: "accepted", label: "Accept order" },
    { next: "rejected", label: "Decline and refund", needsNote: true },
  ],
  accepted: [
    { next: "ready", label: "Mark ready for pickup" },
    { next: "rejected", label: "Decline and refund", needsNote: true },
  ],
  ready: [{ next: "completed", label: "Handed over" }],
};

export function OrderActions({
  orderId,
  status,
  refundable,
}: {
  orderId: string;
  status: OrderStatus;
  refundable: boolean;
}) {
  const [state, formAction, pending] = useActionState<OrderFormState, FormData>(
    advanceOrder,
    {},
  );
  const [refundState, refundAction, refundPending] = useActionState<
    OrderFormState,
    FormData
  >(refundOrderAction, {});

  const options = TRANSITIONS[status] ?? [];

  return (
    <div>
      {state.error ? <p role="alert">{state.error}</p> : null}
      {state.ok ? <p role="status">{state.ok}</p> : null}

      {options.map((option) => (
        <form action={formAction} key={option.next}>
          <input type="hidden" name="order_id" value={orderId} />
          <input type="hidden" name="next" value={option.next} />

          {option.needsNote ? (
            <>
              <label htmlFor={`note-${orderId}-${option.next}`}>
                Tell the customer why
              </label>
              <input
                id={`note-${orderId}-${option.next}`}
                name="note"
                maxLength={300}
                required
              />
            </>
          ) : null}

          <button type="submit" disabled={pending}>
            {pending ? "Working…" : option.label}
          </button>
        </form>
      ))}

      {refundable ? (
        <form action={refundAction}>
          {refundState.error ? <p role="alert">{refundState.error}</p> : null}
          {refundState.ok ? <p role="status">{refundState.ok}</p> : null}

          <input type="hidden" name="order_id" value={orderId} />

          <label htmlFor={`refund-${orderId}`}>Refund amount</label>
          <input
            id={`refund-${orderId}`}
            name="amount"
            inputMode="decimal"
            placeholder="Leave blank to refund in full"
          />

          <label htmlFor={`refund-reason-${orderId}`}>Reason</label>
          <input id={`refund-reason-${orderId}`} name="reason" maxLength={300} />

          <button type="submit" disabled={refundPending}>
            {refundPending ? "Refunding…" : "Issue refund"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
