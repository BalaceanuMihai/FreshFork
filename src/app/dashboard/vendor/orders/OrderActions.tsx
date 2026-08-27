"use client";

import { useActionState, useState } from "react";
import { Banknote } from "lucide-react";

import {
  advanceOrder,
  refundOrderAction,
  type OrderFormState,
} from "@/lib/actions/orders";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import type { OrderStatus } from "@/lib/supabase/database.types";

/**
 * The kitchen's controls for one order.
 *
 * Only the transitions `advance_order_status()` actually permits are offered.
 * The database would refuse anything else, but a button that always errors is
 * a worse experience than a button that isn't there.
 */
const TRANSITIONS: Partial<
  Record<OrderStatus, { next: string; label: string; variant: "primary" | "destructive"; needsNote?: boolean }[]>
> = {
  paid: [
    { next: "accepted", label: "Accept order", variant: "primary" },
    { next: "rejected", label: "Decline and refund", variant: "destructive", needsNote: true },
  ],
  accepted: [
    { next: "ready", label: "Mark ready for pickup", variant: "primary" },
    { next: "rejected", label: "Decline and refund", variant: "destructive", needsNote: true },
  ],
  ready: [{ next: "completed", label: "Handed over", variant: "primary" }],
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
  const [state, formAction, pending] = useActionState<OrderFormState, FormData>(advanceOrder, {});
  const [refundState, refundAction, refundPending] = useActionState<OrderFormState, FormData>(refundOrderAction, {});
  const [showRefund, setShowRefund] = useState(false);

  const options = TRANSITIONS[status] ?? [];

  return (
    <div className="space-y-2 pt-1">
      {state.error ? (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="text-xs text-green-700" role="status">
          {state.ok}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {options.map((option) =>
          option.needsNote ? (
            <DeclineForm key={option.next} orderId={orderId} next={option.next} label={option.label} formAction={formAction} pending={pending} />
          ) : (
            <form action={formAction} key={option.next} className="flex-1 min-w-[10rem]">
              <input type="hidden" name="order_id" value={orderId} />
              <input type="hidden" name="next" value={option.next} />
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Working…" : option.label}
              </Button>
            </form>
          ),
        )}
      </div>

      {refundable ? (
        <div className="pt-1">
          {!showRefund ? (
            <button
              type="button"
              onClick={() => setShowRefund(true)}
              className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
            >
              <Banknote className="w-3.5 h-3.5" /> Issue refund
            </button>
          ) : (
            <form action={refundAction} className="bg-secondary rounded-lg p-3 space-y-2">
              {refundState.error ? (
                <p className="text-xs text-destructive" role="alert">
                  {refundState.error}
                </p>
              ) : null}
              {refundState.ok ? (
                <p className="text-xs text-green-700" role="status">
                  {refundState.ok}
                </p>
              ) : null}
              <input type="hidden" name="order_id" value={orderId} />
              <Input name="amount" inputMode="decimal" placeholder="Amount — blank for full refund" className="text-sm" />
              <Input name="reason" maxLength={300} placeholder="Reason" className="text-sm" />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowRefund(false)} className="flex-1 text-xs py-1.5">
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={refundPending} className="flex-1 text-xs py-1.5">
                  {refundPending ? "Refunding…" : "Issue refund"}
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}

function DeclineForm({
  orderId,
  next,
  label,
  formAction,
  pending,
}: {
  orderId: string;
  next: string;
  label: string;
  formAction: (formData: FormData) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
      >
        {label}
      </button>
    );
  }

  return (
    <form action={formAction} className="w-full bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-2">
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="next" value={next} />
      <Input name="note" maxLength={300} required placeholder="Tell the customer why" className="text-sm" />
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1 text-xs py-1.5">
          Never mind
        </Button>
        <Button type="submit" variant="destructive" disabled={pending} className="flex-1 text-xs py-1.5">
          {pending ? "Working…" : label}
        </Button>
      </div>
    </form>
  );
}
