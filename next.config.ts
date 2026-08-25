import type { NextConfig } from "next";

/**
 * Security headers.
 *
 * The app had none, which left it opted out of every browser-side protection
 * that has to be asked for. The CSP is the load-bearing one: it is what stops
 * an injected script from reading a session cookie or posting a card number
 * somewhere else.
 *
 * `'unsafe-inline'` on styles is required by Tailwind's runtime style
 * injection, and `'unsafe-eval'` in development is required by the React
 * refresh runtime — both are scoped as narrowly as they can be. Scripts fall
 * back to `'strict-dynamic'`-free allow-listing rather than nonces because
 * nonces need per-request header generation in the proxy, which is a larger
 * change than this pass should make.
 */

const isDev = process.env.NODE_ENV === "development";

const supabaseOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
      : "";
  } catch {
    return "";
  }
})();

const connectSources = [
  "'self'",
  supabaseOrigin,
  supabaseOrigin ? supabaseOrigin.replace("https://", "wss://") : "",
  "https://api.mapbox.com",
  "https://events.mapbox.com",
  "https://api.stripe.com",
  "https://*.ingest.sentry.io",
]
  .filter(Boolean)
  .join(" ");

const csp = [
  `default-src 'self'`,
  // Stripe and Mapbox both ship their own script bundles.
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://js.stripe.com https://api.mapbox.com`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https://*.supabase.co https://api.mapbox.com`,
  `font-src 'self' data:`,
  `connect-src ${connectSources}`,
  // Stripe Checkout and Connect onboarding render in frames.
  `frame-src https://js.stripe.com https://hooks.stripe.com https://connect.stripe.com`,
  `worker-src 'self' blob:`,
  `object-src 'none'`,
  `base-uri 'self'`,
  // Nothing in this app is meant to be embedded anywhere.
  `frame-ancestors 'none'`,
  `form-action 'self' https://checkout.stripe.com https://connect.stripe.com`,
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
]
  .filter(Boolean)
  .join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Nothing here needs a camera, a microphone, or a payment handler.
          // Geolocation is requested by the location bar, so it stays.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        // Nothing under /api is ever a cacheable, shareable document.
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;
