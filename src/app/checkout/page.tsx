import Link from "next/link";

import { requireViewer } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { getPickupSlots } from "@/lib/orders";
import { formatPrice } from "@/lib/format";
import { features } from "@/lib/env";
import { CheckoutForm } from "./CheckoutForm";

export const metadata = { title: "Checkout · FreshFork" };

/**
 * Checkout is deliberately a plain server-rendered page.
 *
 * Every number on it is derived from the database, not from the basket cookie,
 * and every number is derived a second time by `create_order()` before a card
 * is charged. Nothing here is authoritative — it is a quote.
 */
export default async function CheckoutPage() {
  await requireViewer("/checkout");

  const cart = await getCart();

  if (!cart.vendor || cart.lines.length === 0) {
    return (
      <div>
        <h1>Your basket is empty</h1>
        <p>Find something to eat and it&apos;ll show up here.</p>
        <Link href="/browse">Browse kitchens</Link>
      </div>
    );
  }

  if (!features.ordering) {
    return (
      <div>
        <h1>Checkout</h1>
        <p role="alert">
          Ordering is unavailable right now — payments aren&apos;t configured on this
          deployment.
        </p>
      </div>
    );
  }

  // Narrowed above, but hoisted so TypeScript can see it inside the JSX.
  const vendor = cart.vendor;
  const slots = await getPickupSlots(vendor.id);

  return (
    <div>
      <h1>Checkout</h1>
      <p>
        Picking up from{" "}
        <Link href={`/vendor/${vendor.handle}`}>{vendor.business_name}</Link>
        {vendor.pickup_address_line
          ? ` · ${vendor.pickup_address_line}${vendor.pickup_city ? `, ${vendor.pickup_city}` : ""}`
          : null}
      </p>

      <h2>Your order</h2>
      <ul>
        {cart.lines.map((line) => (
          <li key={line.menuItem.id}>
            {line.menuItem.name} × {line.quantity} — {formatPrice(line.lineTotalCents, vendor.currency)}
            {line.problem ? <strong role="alert"> · {line.problem}</strong> : null}
          </li>
        ))}
      </ul>

      <dl>
        <dt>Subtotal</dt>
        <dd>{formatPrice(cart.fees.subtotalCents, vendor.currency)}</dd>
        <dt>Service fee</dt>
        <dd>
          {cart.fees.serviceFeeCents === 0
            ? "Waived with Plus"
            : formatPrice(cart.fees.serviceFeeCents, vendor.currency)}
        </dd>
        <dt>Total</dt>
        <dd>{formatPrice(cart.fees.totalCents, vendor.currency)}</dd>
      </dl>

      {cart.hasProblems ? (
        <p role="alert">
          Something in your basket changed. Adjust it before checking out.{" "}
          <Link href={`/vendor/${vendor.handle}`}>Edit your basket</Link>
        </p>
      ) : null}

      {slots.length === 0 ? (
        <p role="alert">
          This kitchen has no pickup times available at the moment. Try again later.
        </p>
      ) : (
        <CheckoutForm slots={slots} disabled={cart.hasProblems} timezone={vendor.timezone} />
      )}
    </div>
  );
}
