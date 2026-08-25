import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Unit tests for the pure logic.
 *
 * Scoped to modules that do not import `server-only` — money arithmetic, status
 * mapping, validation schemas and email bodies. Anything that touches the
 * database is covered by the pgTAP suite in `supabase/tests/` instead, because
 * the rules there live in RLS policies and triggers that TypeScript cannot see.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/fees.ts",
        "src/lib/format.ts",
        "src/lib/stripe/**",
        "src/lib/validation/**",
        "src/lib/email/templates.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws by design when imported outside a server bundle,
      // which is exactly what makes it useful — and exactly what stops a unit
      // test importing a module that carries it. Stubbed to a no-op so the
      // logic inside those modules stays testable; the real guard is still in
      // force everywhere Next.js builds.
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
});
