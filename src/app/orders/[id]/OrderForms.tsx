"use client";

import { useActionState } from "react";

import { cancelMyOrder, type OrderFormState } from "@/lib/actions/orders";
import { submitReview, type CommunityFormState } from "@/lib/actions/community";

/**
 * The two things a customer can do to their own order.
 *
 * Both are thin: the rules about *when* they are allowed live in
 * `cancel_order()` and `submit_review()`, and the page only decides whether to
 * render the form at all.
 */

export function CancelOrderForm({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState<OrderFormState, FormData>(
    cancelMyOrder,
    {},
  );

  return (
    <form action={formAction}>
      <h2>Cancel this order</h2>
      {state.error ? <p role="alert">{state.error}</p> : null}
      {state.ok ? <p role="status">{state.ok}</p> : null}

      <input type="hidden" name="order_id" value={orderId} />

      <label htmlFor="cancel-reason">Reason (optional)</label>
      <input id="cancel-reason" name="reason" maxLength={300} />

      <button type="submit" disabled={pending}>
        {pending ? "Cancelling…" : "Cancel order"}
      </button>
      <p>If you&apos;ve already paid, we&apos;ll refund you automatically.</p>
    </form>
  );
}

export function ReviewForm({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState<CommunityFormState, FormData>(
    submitReview,
    {},
  );

  return (
    <form action={formAction}>
      <h2>How was it?</h2>
      {state.error ? <p role="alert">{state.error}</p> : null}
      {state.ok ? <p role="status">{state.ok}</p> : null}

      <input type="hidden" name="order_id" value={orderId} />

      <fieldset disabled={pending}>
        <legend>Rating</legend>
        {[1, 2, 3, 4, 5].map((value) => (
          <label key={value}>
            <input type="radio" name="rating" value={value} required />
            {value}
          </label>
        ))}

        <label htmlFor="review-body">Anything to add?</label>
        <textarea id="review-body" name="body" rows={4} maxLength={2000} />

        <button type="submit">{pending ? "Posting…" : "Post review"}</button>
      </fieldset>
    </form>
  );
}
