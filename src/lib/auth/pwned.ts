import "server-only";

import { createHash } from "node:crypto";

import { log } from "@/lib/log";

/**
 * Reject passwords already known to be in breach corpora.
 *
 * Supabase ships this, but only on the Pro plan. The underlying service —
 * Have I Been Pwned's Pwned Passwords range API — is free, needs no key, and
 * is the same corpus Supabase queries, so the protection is available anyway.
 *
 * **The password never leaves this process.** The API uses k-anonymity: we
 * SHA-1 the password, send only the first five hex characters of the digest,
 * and get back every suffix sharing that prefix — several hundred candidates.
 * The comparison happens locally. HIBP learns a 5-character prefix, which
 * matches roughly 800 of the 900-million-odd hashes in the set and identifies
 * nothing.
 *
 * SHA-1 here is not protecting anything; it is simply the index the corpus is
 * built on. Real password storage is Supabase Auth's job, and it uses bcrypt.
 */

const ENDPOINT = "https://api.pwnedpasswords.com/range";

/** Below this, a password is common enough to be in every credential-stuffing list. */
const BREACH_THRESHOLD = 1;

export type PwnedCheck =
  | { status: "ok" }
  | { status: "pwned"; count: number }
  | { status: "unavailable" };

/**
 * Fails **open**: if HIBP is unreachable, signup proceeds.
 *
 * The alternative is letting a third party's downtime block all registration,
 * which trades a small security gain for a total availability loss. The
 * minimum-length rule still applies either way.
 */
export async function checkPwnedPassword(password: string): Promise<PwnedCheck> {
  if (!password) return { status: "ok" };

  const digest = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = digest.slice(0, 5);
  const suffix = digest.slice(5);

  try {
    const response = await fetch(`${ENDPOINT}/${prefix}`, {
      headers: {
        // Opts into padded responses: HIBP returns extra synthetic entries so
        // the response size cannot be used to infer anything about the prefix.
        "Add-Padding": "true",
        "User-Agent": "FreshFork-Signup-Check",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });

    if (!response.ok) {
      log.warn("Pwned-password lookup returned a non-OK status.", {
        status: response.status,
      });
      return { status: "unavailable" };
    }

    const body = await response.text();

    for (const line of body.split("\n")) {
      const [candidate, rawCount] = line.trim().split(":");
      if (candidate !== suffix) continue;

      const count = Number.parseInt(rawCount ?? "0", 10);
      // Padded entries come back with a count of 0 and must be ignored.
      return Number.isFinite(count) && count >= BREACH_THRESHOLD
        ? { status: "pwned", count }
        : { status: "ok" };
    }

    return { status: "ok" };
  } catch (error) {
    log.warn("Pwned-password lookup failed; allowing the signup.", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: "unavailable" };
  }
}

/** Wording that explains the rejection without implying we know their account. */
export function pwnedPasswordMessage(count: number): string {
  const appearances =
    count >= 1_000_000
      ? "millions of times"
      : count >= 1_000
        ? `over ${Math.floor(count / 1_000)},000 times`
        : `${count} time${count === 1 ? "" : "s"}`;

  return (
    `This password has appeared ${appearances} in known data breaches, ` +
    `so it's one attackers try first. Please pick a different one — ` +
    `it doesn't mean your account was compromised.`
  );
}
