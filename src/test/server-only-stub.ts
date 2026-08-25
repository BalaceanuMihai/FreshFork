/**
 * Stand-in for the `server-only` package under Vitest.
 *
 * The real package throws on import outside a server bundle. That guard is
 * worth having in the app and useless in a unit test, so vitest.config.ts
 * aliases it here. Nothing else should import this file.
 */
export {};
