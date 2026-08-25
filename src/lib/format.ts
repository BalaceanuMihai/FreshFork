/** Display helpers shared by vendor, menu, and discovery UI. */

/**
 * Money, in the currency it is actually charged in.
 *
 * FreshFork sells across Europe, so a kitchen in Warsaw prices in złoty and one
 * in Stockholm in kronor. Every amount is integer minor units — cents, grosze,
 * öre — and each of the currencies in use divides by 100, so the conversion is
 * uniform. `currency` comes from the vendor (and, once placed, is frozen on the
 * order), never from a platform-wide constant.
 *
 * Whole amounts drop the decimals: "€16", not "€16.00". Prices are set in round
 * numbers far more often than not, and the zeros are noise on a menu.
 */
export function formatPrice(cents: number, currency: string = "eur"): string {
  const major = cents / 100;

  try {
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: Number.isInteger(major) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    // An unrecognised currency code should not blank out a price.
    return `${major.toFixed(Number.isInteger(major) ? 0 : 2)} ${currency.toUpperCase()}`;
  }
}

/** Metres to the "0.6 mi" form the designs use. */
export function formatDistance(metres: number): string {
  const miles = metres / 1609.344;
  return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
}

export function milesToMetres(miles: number): number {
  return miles * 1609.344;
}

/** "18:00:00" -> "6 pm", "11:30:00" -> "11:30 am" */
export function formatTime(time: string): string {
  const [rawHour, rawMinute] = time.split(":");
  const hour = Number.parseInt(rawHour, 10);
  const minute = Number.parseInt(rawMinute, 10);
  const suffix = hour >= 12 ? "pm" : "am";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0 ? `${display} ${suffix}` : `${display}:${rawMinute} ${suffix}`;
}
