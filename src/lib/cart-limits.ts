/**
 * Basket limits.
 *
 * A separate module from `cart.ts` purely so they can be imported without
 * dragging in `server-only` — the validation schemas need them, and the
 * validation schemas need to be unit-testable.
 */
export const CART_LIMITS = {
  /** Distinct dishes in one basket. Mirrors the cap in `create_order()`. */
  maxLines: 25,
  /** Portions of any one dish. Mirrors `order_items.quantity`'s CHECK. */
  maxQuantity: 20,
} as const;
