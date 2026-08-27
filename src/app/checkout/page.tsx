import Link from "next/link";
import { ChefHat, Lock, ShoppingBag } from "lucide-react";

import { requireViewer } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { getPickupSlots } from "@/lib/orders";
import { formatPrice } from "@/lib/format";
import { features } from "@/lib/env";
import { CheckoutForm } from "./CheckoutForm";
import { BasketLines } from "./BasketLines";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";

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
      <div className="max-w-md mx-auto px-4 py-8">
        <h1 className="font-display text-2xl font-semibold mb-6">Your basket</h1>
        <EmptyState
          icon={ShoppingBag}
          title="Your basket is empty"
          body="Find something to eat and it'll show up here."
          action={
            <Link href="/browse" className={buttonClasses("primary")}>
              Browse kitchens
            </Link>
          }
        />
      </div>
    );
  }

  if (!features.ordering) {
    return (
      <div className="max-w-md mx-auto px-4 py-8 space-y-4">
        <h1 className="font-display text-2xl font-semibold">Checkout</h1>
        <p className="text-sm text-destructive" role="alert">
          Ordering is unavailable right now — payments aren&apos;t configured on this deployment.
        </p>
      </div>
    );
  }

  const vendor = cart.vendor;
  const slots = await getPickupSlots(vendor.id);

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-5">
      <h1 className="font-display text-2xl font-semibold">Your basket</h1>

      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary rounded-lg px-3 py-2">
        <ChefHat className="w-4 h-4 shrink-0" />
        <span>
          Ordering from{" "}
          <Link href={`/vendor/${vendor.handle}`} className="font-medium text-foreground hover:underline">
            {vendor.business_name}
          </Link>
          {vendor.pickup_city ? ` in ${vendor.pickup_city}` : ""}
        </span>
      </div>

      <BasketLines lines={cart.lines} currency={vendor.currency} />

      {cart.hasProblems ? (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm" role="alert">
          Something in your basket changed.{" "}
          <Link href={`/vendor/${vendor.handle}`} className="underline font-medium">
            Edit your basket
          </Link>
          .
        </div>
      ) : null}

      <div className="bg-secondary rounded-xl p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatPrice(cart.fees.subtotalCents, vendor.currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Service fee</span>
          <span className={cart.fees.serviceFeeCents === 0 ? "text-green-700 font-medium" : ""}>
            {cart.fees.serviceFeeCents === 0 ? "Waived with Plus" : formatPrice(cart.fees.serviceFeeCents, vendor.currency)}
          </span>
        </div>
        <div className="flex justify-between font-semibold border-t border-border pt-2">
          <span>Total</span>
          <span>{formatPrice(cart.fees.totalCents, vendor.currency)}</span>
        </div>
      </div>

      {slots.length === 0 ? (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm" role="alert">
          This kitchen has no pickup times available at the moment. Try again later.
        </div>
      ) : (
        <CheckoutForm slots={slots} disabled={cart.hasProblems} timezone={vendor.timezone} />
      )}

      <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5">
        <Lock className="w-3 h-3" /> You&apos;ll be taken to Stripe to pay. Nothing is charged until you confirm.
      </p>
    </div>
  );
}
