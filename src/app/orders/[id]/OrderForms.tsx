"use client";

import { useActionState, useState } from "react";
import { Star, X } from "lucide-react";

import { cancelMyOrder, type OrderFormState } from "@/lib/actions/orders";
import { submitReview, type CommunityFormState } from "@/lib/actions/community";
import { Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * The two things a customer can do to their own order.
 *
 * Both are thin: the rules about *when* they are allowed live in
 * `cancel_order()` and `submit_review()`, and the page only decides whether to
 * render the form at all.
 */

export function CancelOrderForm({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState<OrderFormState, FormData>(cancelMyOrder, {});
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="w-full text-center text-sm text-destructive hover:underline py-2 flex items-center justify-center gap-1.5"
      >
        <X className="w-4 h-4" /> Cancel order
      </button>
    );
  }

  return (
    <form action={formAction} className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 space-y-3">
      <p className="text-sm text-destructive font-medium">Cancel this order?</p>
      <p className="text-xs text-muted-foreground">If you&apos;ve already paid, we&apos;ll refund you automatically.</p>

      <input type="hidden" name="order_id" value={orderId} />
      <Input name="reason" maxLength={300} placeholder="Reason (optional)" />

      {state.error ? (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => setConfirming(false)} className="flex-1">
          Keep order
        </Button>
        <Button type="submit" variant="destructive" disabled={pending} className="flex-1">
          {pending ? "Cancelling…" : "Yes, cancel"}
        </Button>
      </div>
    </form>
  );
}

export function ReviewForm({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState<CommunityFormState, FormData>(submitReview, {});
  const [rating, setRating] = useState(5);

  if (state.ok) {
    return (
      <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm" role="status">
        {state.ok}
      </div>
    );
  }

  return (
    <form action={formAction} className="bg-card rounded-xl border border-border p-4 space-y-3">
      <h2 className="font-display text-lg font-semibold">How was it?</h2>

      <input type="hidden" name="order_id" value={orderId} />

      <fieldset disabled={pending} className="space-y-3">
        <div className="space-y-1.5">
          <legend className="text-sm font-medium">Your rating</legend>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <label key={value} className="cursor-pointer">
                <input
                  type="radio"
                  name="rating"
                  value={value}
                  checked={rating === value}
                  onChange={() => setRating(value)}
                  required
                  className="sr-only"
                />
                <Star className={cn("w-7 h-7", value <= rating ? "fill-primary text-primary" : "text-muted")} />
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="review-body" className="text-sm font-medium">
            Anything to add?
          </label>
          <Textarea id="review-body" name="body" rows={3} maxLength={2000} placeholder="What did you think of the food and experience?" />
        </div>

        {state.error ? (
          <p className="text-xs text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" className="w-full">
          {pending ? "Posting…" : "Post review"}
        </Button>
      </fieldset>
    </form>
  );
}
