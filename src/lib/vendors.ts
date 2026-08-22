/**
 * Mock vendor + dish data for design/demo purposes.
 * Replaced by Supabase queries in Phase 2 (vendor onboarding + menu CRUD).
 */

export type Dish = {
  slug: string;
  name: string;
  description: string;
  price: string;
  tags: string[];
  prep: string;
  gradient: string;
};

export type Vendor = {
  handle: string;
  name: string;
  cuisine: string;
  neighborhood: string;
  distance: string;
  rating: string;
  reviewCount: number;
  cookingSince: number;
  dishesServed: number;
  story: string;
  certification: string;
  kitchen: string;
  pickupAddress: string;
  hours: string;
  verifiedSince: string;
  gradient: string;
  menu: { section: string; note: string; dishes: Dish[] }[];
  reviews: { name: string; when: string; text: string; rating: string }[];
};

export const vendors: Record<string, Vendor> = {
  "amina-tesfaye": {
    handle: "amina-tesfaye",
    name: "Amina Tesfaye",
    cuisine: "Ethiopian",
    neighborhood: "Fort Greene, Brooklyn",
    distance: "0.6 mi",
    rating: "4.9",
    reviewCount: 128,
    cookingSince: 2019,
    dishesServed: 312,
    story:
      "I learned to cook from my grandmother in Addis. Every plate I send out is my family's recipe — the same doro wat we ate on Sundays growing up. Fort Greene has become my second home.",
    certification: "NYC Food Handler",
    kitchen: "Home · inspected",
    pickupAddress: "215 DeKalb Ave",
    hours: "Sun–Wed 6–8 pm",
    verifiedSince: "Mar 2026",
    gradient: "linear-gradient(180deg, #d9a06a 0%, #522e24 100%)",
    menu: [
      {
        section: "Mains",
        note: "Slow-cooked stews, family recipes, served with fresh injera.",
        dishes: [
          {
            slug: "doro-wat",
            name: "Doro Wat + Injera",
            description:
              "Chicken stewed in berbere spice, house-made injera on the side. Serves 1.",
            price: "$16",
            tags: ["GF"],
            prep: "READY 6 PM · 4 LEFT",
            gradient: "linear-gradient(180deg, #d97148 0%, #6b2c1e 100%)",
          },
          {
            slug: "lamb-berbere",
            name: "Lamb Berbere",
            description:
              "Braised lamb with berbere, ginger, and clarified butter. Serves 1.",
            price: "$18",
            tags: ["GF"],
            prep: "READY 6 PM · 3 LEFT",
            gradient: "linear-gradient(180deg, #b85c38 0%, #612619 100%)",
          },
          {
            slug: "yemisir-wot",
            name: "Yemisir Wot",
            description: "Red lentil stew with berbere and caramelized onion.",
            price: "$12",
            tags: ["Vegan", "GF"],
            prep: "READY 6 PM · 9 LEFT",
            gradient: "linear-gradient(180deg, #c76633 0%, #6b331e 100%)",
          },
        ],
      },
      {
        section: "Small plates & sides",
        note: "Order any two — I'll pack them together.",
        dishes: [
          {
            slug: "kitfo",
            name: "Kitfo (raw beef)",
            description:
              "Hand-chopped raw beef with mitmita and niter kibbeh. Serves 2.",
            price: "$14",
            tags: ["GF", "Contains raw beef"],
            prep: "ORDER BY 3 PM · 5 LEFT",
            gradient: "linear-gradient(180deg, #9e4733 0%, #52231a 100%)",
          },
          {
            slug: "injera-roll",
            name: "Injera roll x6",
            description: "Six fresh injera rolls, made this morning.",
            price: "$8",
            tags: ["Vegan"],
            prep: "READY 6 PM · 12 LEFT",
            gradient: "linear-gradient(180deg, #d9b884 0%, #8c6b47 100%)",
          },
        ],
      },
    ],
    reviews: [
      {
        name: "Sara P.",
        when: "2 days ago · pickup",
        text: "Best doro wat in Brooklyn. Amina packed extra injera for me — my kids inhaled it.",
        rating: "5.0",
      },
      {
        name: "Marcus K.",
        when: "5 days ago · pickup",
        text: "Perfectly spiced, showed me how to fold injera when I picked up. Cook is the real deal.",
        rating: "5.0",
      },
    ],
  },
};

export function getVendor(handle: string): Vendor | undefined {
  return vendors[handle];
}
