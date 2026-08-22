/** Display helpers shared by vendor, menu, and discovery UI. */

export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars)
    ? `$${dollars}`
    : `$${dollars.toFixed(2)}`;
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
