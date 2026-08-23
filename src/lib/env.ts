/**
 * Central, typed access to environment variables.
 *
 * Each phase adds its own group. Keep server-only vars out of the
 * `publicEnv` object so they can't be accidentally imported into a
 * client component.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required env var: ${name}. Check .env.local against .env.example.`,
    );
  }
  return value;
}

function optional(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}

// Values safe for the browser. All must be prefixed NEXT_PUBLIC_.
export const publicEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supabaseUrl: optional(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabasePublishableKey: optional(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  // Legacy anon JWT — kept as a fallback for older .env.local files.
  supabaseAnonKey: optional(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  mapboxToken: optional(process.env.NEXT_PUBLIC_MAPBOX_TOKEN),
  stripePublishableKey: optional(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
  sentryDsn: optional(process.env.NEXT_PUBLIC_SENTRY_DSN),
} as const;

// Server-only. Import from server components / route handlers only.
// The `required(...)` calls run lazily — they throw only when a
// caller actually reads the value, so Phase 0 doesn't need every key set.
export const serverEnv = {
  get supabaseServiceRoleKey(): string {
    return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
  },
  get stripeSecretKey(): string {
    return required("STRIPE_SECRET_KEY", process.env.STRIPE_SECRET_KEY);
  },
  get stripeWebhookSecret(): string {
    return required("STRIPE_WEBHOOK_SECRET", process.env.STRIPE_WEBHOOK_SECRET);
  },
  get stripePlusPriceId(): string {
    return required("STRIPE_PLUS_PRICE_ID", process.env.STRIPE_PLUS_PRICE_ID);
  },
  get platformFeeBps(): number {
    const raw = process.env.FRESHFORK_PLATFORM_FEE_BPS ?? "1200";
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n) || n < 0 || n > 10_000) {
      throw new Error(`FRESHFORK_PLATFORM_FEE_BPS must be 0..10000; got "${raw}".`);
    }
    return n;
  },
  get resendApiKey(): string {
    return required("RESEND_API_KEY", process.env.RESEND_API_KEY);
  },
  get resendFromEmail(): string {
    return required("RESEND_FROM_EMAIL", process.env.RESEND_FROM_EMAIL);
  },
} as const;

/**
 * Feature availability. Surfaces that depend on a third-party key check these
 * first so a missing key degrades to a clear message instead of crashing the
 * route.
 */
export const features = {
  get stripeConnect(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  },
  get membership(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PLUS_PRICE_ID);
  },
  get mapbox(): boolean {
    return Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
  },
} as const;
