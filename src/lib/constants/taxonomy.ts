/**
 * Fixed vocabularies for menu items and vendor listings.
 *
 * These live in code rather than in the database on purpose: they are small,
 * read-only at runtime, and change often enough during product work that a
 * migration per edit would be friction for no safety gain. Server actions
 * validate submitted values against these lists before writing.
 */

export const ALLERGENS = [
  { value: "milk", label: "Milk" },
  { value: "eggs", label: "Eggs" },
  { value: "fish", label: "Fish" },
  { value: "shellfish", label: "Shellfish" },
  { value: "tree_nuts", label: "Tree nuts" },
  { value: "peanuts", label: "Peanuts" },
  { value: "wheat", label: "Wheat" },
  { value: "soy", label: "Soy" },
  { value: "sesame", label: "Sesame" },
] as const;

export const DIETARY_TAGS = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "gluten_free", label: "Gluten-free" },
  { value: "dairy_free", label: "Dairy-free" },
  { value: "nut_free", label: "Nut-free" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
] as const;

export const CUISINES = [
  "Ethiopian",
  "Sichuan",
  "Oaxacan",
  "Filipino",
  "Neapolitan",
  "Bengali",
  "Levantine",
  "Georgian",
  "Peruvian",
  "Vietnamese",
  "Nigerian",
  "Baked goods",
] as const;

export const ALLERGEN_VALUES = ALLERGENS.map((a) => a.value);
export const DIETARY_VALUES = DIETARY_TAGS.map((d) => d.value);

const ALLERGEN_LABELS = new Map(ALLERGENS.map((a) => [a.value as string, a.label]));
const DIETARY_LABELS = new Map(DIETARY_TAGS.map((d) => [d.value as string, d.label]));

export function allergenLabel(value: string): string {
  return ALLERGEN_LABELS.get(value) ?? value;
}

export function dietaryLabel(value: string): string {
  return DIETARY_LABELS.get(value) ?? value;
}

/** 0 = Sunday, matching `pickup_windows.day_of_week`. */
export const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
] as const;
