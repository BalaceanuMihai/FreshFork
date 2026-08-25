import "server-only";

import { features, serverEnv } from "@/lib/env";
import { captureException, log } from "@/lib/log";
import type { EmailBody } from "@/lib/email/templates";

/**
 * Resend, over plain `fetch`.
 *
 * No SDK: the whole API surface we need is one POST, and every dependency in a
 * server bundle is one more thing to audit.
 *
 * Sending never throws. An order that was paid for must not fail because the
 * receipt bounced — the failure is reported and the caller carries on.
 */

const ENDPOINT = "https://api.resend.com/emails";

export type SendResult = { sent: boolean; id?: string; skipped?: string };

export async function sendEmail(
  to: string | null | undefined,
  body: EmailBody,
  context: Record<string, unknown> = {},
): Promise<SendResult> {
  if (!features.email) {
    log.warn("Email is not configured; skipping send.", { subject: body.subject });
    return { sent: false, skipped: "not_configured" };
  }
  if (!to) {
    log.warn("No recipient address; skipping send.", { subject: body.subject });
    return { sent: false, skipped: "no_recipient" };
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serverEnv.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: serverEnv.resendFromEmail,
        to: [to],
        subject: body.subject,
        html: body.html,
        text: body.text,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      log.error("Resend rejected the message.", {
        status: response.status,
        subject: body.subject,
        detail: detail.slice(0, 500),
        ...context,
      });
      return { sent: false, skipped: `http_${response.status}` };
    }

    const payload = (await response.json().catch(() => ({}))) as { id?: string };
    log.info("Email sent.", { subject: body.subject, id: payload.id, ...context });
    return { sent: true, id: payload.id };
  } catch (error) {
    captureException(error, { where: "sendEmail", subject: body.subject, ...context });
    return { sent: false, skipped: "threw" };
  }
}

/**
 * Send without making the caller wait.
 *
 * Used on request paths where the mail is a courtesy rather than the point —
 * the customer's redirect to their receipt page should not sit behind an SMTP
 * round trip.
 */
export function sendEmailInBackground(
  to: string | null | undefined,
  body: EmailBody,
  context: Record<string, unknown> = {},
): void {
  void sendEmail(to, body, context);
}
