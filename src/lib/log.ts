import "server-only";

import { publicEnv } from "@/lib/env";

/**
 * Structured logging with an optional Sentry sink.
 *
 * Deliberately dependency-free: `@sentry/nextjs` pulls in a bundler plugin and
 * instrumentation hooks, and all we actually need is "POST this event". Events
 * go out through Sentry's envelope endpoint, parsed straight from the DSN.
 *
 * Every log line is JSON on one line so a hosted log drain can index it.
 * Nothing here ever throws — a broken logger must not take a request with it.
 */

type Level = "debug" | "info" | "warn" | "error";

type Fields = Record<string, unknown>;

/** Keys whose values never belong in a log line or an error report. */
const REDACTED = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "email",
  "phone",
  "card",
  "stripe_secret",
  "service_role",
];

function redact(fields: Fields): Fields {
  const out: Fields = {};
  for (const [key, value] of Object.entries(fields)) {
    const lowered = key.toLowerCase();
    out[key] = REDACTED.some((needle) => lowered.includes(needle))
      ? "[redacted]"
      : value;
  }
  return out;
}

function emit(level: Level, message: string, fields: Fields = {}): void {
  const line = JSON.stringify({
    level,
    message,
    time: new Date().toISOString(),
    ...redact(fields),
  });

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (message: string, fields?: Fields) => emit("debug", message, fields),
  info: (message: string, fields?: Fields) => emit("info", message, fields),
  warn: (message: string, fields?: Fields) => emit("warn", message, fields),
  error: (message: string, fields?: Fields) => emit("error", message, fields),
};

type ParsedDsn = { host: string; projectId: string; key: string };

function parseDsn(dsn: string): ParsedDsn | null {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\//, "");
    if (!url.username || !projectId) return null;
    return { host: url.host, projectId, key: url.username };
  } catch {
    return null;
  }
}

/**
 * Report an exception to Sentry, and always log it locally.
 *
 * Fire-and-forget on purpose: an error report is never worth delaying a
 * response for, and a Sentry outage must not become a FreshFork outage.
 */
export function captureException(error: unknown, context: Fields = {}): void {
  const err = error instanceof Error ? error : new Error(String(error));
  log.error(err.message, { ...context, stack: err.stack });

  const dsn = publicEnv.sentryDsn;
  if (!dsn) return;

  const parsed = parseDsn(dsn);
  if (!parsed) {
    log.warn("Sentry DSN could not be parsed; error reporting is off.");
    return;
  }

  const eventId = crypto.randomUUID().replace(/-/g, "");
  const sentAt = new Date().toISOString();

  const envelope =
    JSON.stringify({ event_id: eventId, sent_at: sentAt, dsn }) +
    "\n" +
    JSON.stringify({ type: "event" }) +
    "\n" +
    JSON.stringify({
      event_id: eventId,
      timestamp: sentAt,
      platform: "node",
      level: "error",
      environment: process.env.NODE_ENV ?? "development",
      exception: {
        values: [
          {
            type: err.name,
            value: err.message,
            stacktrace: { frames: framesFrom(err) },
          },
        ],
      },
      extra: redact(context),
    }) +
    "\n";

  void fetch(
    `https://${parsed.host}/api/${parsed.projectId}/envelope/?sentry_key=${parsed.key}&sentry_version=7`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body: envelope,
      cache: "no-store",
    },
  ).catch(() => {
    // Reporting the failure to report would be circular. Swallow it.
  });
}

/** Sentry wants oldest frame first; Node gives us newest first. */
function framesFrom(error: Error): { filename: string; function: string }[] {
  return (error.stack ?? "")
    .split("\n")
    .slice(1, 25)
    .map((raw) => {
      const match = raw.trim().match(/^at\s+(.+?)\s+\((.+)\)$/);
      return match
        ? { function: match[1], filename: match[2] }
        : { function: "<anonymous>", filename: raw.trim().replace(/^at\s+/, "") };
    })
    .reverse();
}
