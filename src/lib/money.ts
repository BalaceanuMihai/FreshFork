/**
 * Parsing a typed amount into cents.
 *
 * The obvious implementation — strip everything that isn't a digit or a dot,
 * then `parseFloat` — silently turns "-5" into 5 and "1.2.3" into 1.2. Both
 * produce a plausible number from input the user did not mean, which for a
 * price or a refund is exactly the wrong failure mode: it charges or returns
 * an amount nobody asked for instead of showing an error.
 *
 * So: normalise only the decorations people actually type (currency symbols,
 * thousands separators, spaces), then require what remains to be a plain
 * positive decimal.
 */

/** Currency symbols, grouping separators, and whitespace — safe to discard. */
const DECORATION = /[\s, $£€]/g;

const AMOUNT = /^\d+(\.\d{1,2})?$/;

/**
 * "16" -> 1600, "$16.50" -> 1650, "1,250" -> 125000.
 * Returns null for anything that isn't a plain positive amount, including
 * negatives, multiple decimal points, and sub-cent precision.
 */
export function parseMoneyToCents(raw: string): number | null {
  const cleaned = raw.trim().replace(DECORATION, "");
  if (!AMOUNT.test(cleaned)) return null;

  const [whole, fraction = ""] = cleaned.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));

  return Number.isSafeInteger(cents) ? cents : null;
}
