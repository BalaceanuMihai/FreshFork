/**
 * Transactional email bodies.
 *
 * Pure functions returning `{ subject, html, text }` so they can be unit
 * tested without a mail provider, and so a missing name or a null note is a
 * test failure rather than a "Hi undefined" in somebody's inbox.
 *
 * Every template ships a text part. Plenty of clients prefer it, and a receipt
 * that only renders as HTML is a receipt some people cannot read.
 */

export type EmailBody = { subject: string; html: string; text: string };

export type OrderLine = { name: string; quantity: number; lineTotalCents: number };

export type OrderEmailData = {
  code: string;
  vendorName: string;
  customerName: string;
  pickupAt: string;
  pickupAddress: string | null;
  lines: OrderLine[];
  subtotalCents: number;
  serviceFeeCents: number;
  totalCents: number;
  orderUrl: string;
  note?: string | null;
  /** ISO 4217. Defaults to euro — most of the marketplace, but not all of it. */
  currency?: string;
};

/**
 * Mirrors formatPrice. Duplicated rather than imported because this module is
 * deliberately dependency-free — it is the one place whose output a stranger
 * reads without the app around it.
 */
function money(cents: number, currency = "eur"): string {
  const major = cents / 100;
  try {
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: Number.isInteger(major) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${major.toFixed(Number.isInteger(major) ? 0 : 2)} ${currency.toUpperCase()}`;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // Apostrophes too: escaped values are interpolated into href attributes,
    // and a single-quoted attribute would otherwise be escapable.
    .replace(/'/g, "&#039;");
}

/**
 * One shell for every message. Inline styles only — Gmail strips <style>
 * blocks, and a table layout is still the only thing Outlook renders reliably.
 */
function shell(heading: string, bodyHtml: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#faf8f5;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;color:#1f1c18;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #ece7e0;">
    <tr><td style="padding:28px 28px 8px;">
      <p style="margin:0 0 20px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#8a7f72;">FreshFork</p>
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">${escapeHtml(heading)}</h1>
      ${bodyHtml}
    </td></tr>
    <tr><td style="padding:20px 28px 28px;border-top:1px solid #f2ede6;">
      <p style="margin:0;font-size:12px;color:#8a7f72;">You are receiving this because of activity on your FreshFork account.</p>
    </td></tr>
  </table>
</body></html>`;
}

function lineTable(lines: OrderLine[], currency?: string): string {
  return lines
    .map(
      (line) =>
        `<tr><td style="padding:6px 0;font-size:14px;">${escapeHtml(line.name)} × ${line.quantity}</td>` +
        `<td style="padding:6px 0;font-size:14px;text-align:right;">${money(line.lineTotalCents, currency)}</td></tr>`,
    )
    .join("");
}

function linesText(lines: OrderLine[], currency?: string): string {
  return lines
    .map((line) => `  ${line.name} × ${line.quantity}  ${money(line.lineTotalCents, currency)}`)
    .join("\n");
}

function totalsHtml(data: OrderEmailData): string {
  const service =
    data.serviceFeeCents > 0
      ? `<tr><td style="padding:4px 0;font-size:14px;color:#6b6157;">Service fee</td><td style="padding:4px 0;font-size:14px;text-align:right;color:#6b6157;">${money(data.serviceFeeCents, data.currency)}</td></tr>`
      : `<tr><td style="padding:4px 0;font-size:14px;color:#2f7d4f;">Service fee (waived with Plus)</td><td style="padding:4px 0;font-size:14px;text-align:right;color:#2f7d4f;">${money(0, data.currency)}</td></tr>`;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0 20px;">
    ${lineTable(data.lines, data.currency)}
    <tr><td colspan="2" style="border-top:1px solid #f2ede6;padding-top:8px;"></td></tr>
    <tr><td style="padding:4px 0;font-size:14px;color:#6b6157;">Subtotal</td><td style="padding:4px 0;font-size:14px;text-align:right;color:#6b6157;">${money(data.subtotalCents, data.currency)}</td></tr>
    ${service}
    <tr><td style="padding:8px 0 0;font-size:15px;font-weight:600;">Total</td><td style="padding:8px 0 0;font-size:15px;font-weight:600;text-align:right;">${money(data.totalCents, data.currency)}</td></tr>
  </table>`;
}

function button(url: string, label: string): string {
  return `<p style="margin:20px 0 0;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:11px 20px;background:#1f1c18;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;">${escapeHtml(label)}</a></p>`;
}

export function orderReceiptEmail(data: OrderEmailData): EmailBody {
  const pickup = data.pickupAddress ? `\n${data.pickupAddress}` : "";

  return {
    subject: `Order ${data.code} confirmed — ${data.vendorName}`,
    html: shell(
      `Your order from ${data.vendorName} is confirmed`,
      `<p style="margin:0 0 4px;font-size:15px;">Pick it up <strong>${escapeHtml(data.pickupAt)}</strong>.</p>
       ${data.pickupAddress ? `<p style="margin:0 0 16px;font-size:14px;color:#6b6157;">${escapeHtml(data.pickupAddress)}</p>` : ""}
       <p style="margin:0 0 4px;font-size:14px;color:#6b6157;">Show code <strong style="color:#1f1c18;letter-spacing:0.05em;">${escapeHtml(data.code)}</strong> at pickup.</p>
       ${totalsHtml(data)}
       ${button(data.orderUrl, "View your order")}`,
    ),
    text: `Your order from ${data.vendorName} is confirmed.

Pick up: ${data.pickupAt}${pickup}
Pickup code: ${data.code}

${linesText(data.lines, data.currency)}

Subtotal ${money(data.subtotalCents, data.currency)}
Service fee ${money(data.serviceFeeCents, data.currency)}
Total ${money(data.totalCents, data.currency)}

${data.orderUrl}`,
  };
}

export function newOrderForVendorEmail(data: OrderEmailData): EmailBody {
  return {
    subject: `New order ${data.code} — pickup ${data.pickupAt}`,
    html: shell(
      `${data.customerName} ordered from you`,
      `<p style="margin:0 0 16px;font-size:15px;">Pickup is <strong>${escapeHtml(data.pickupAt)}</strong>. Accept it so they know you're on it.</p>
       ${data.note ? `<p style="margin:0 0 16px;padding:12px;background:#faf8f5;border-radius:8px;font-size:14px;"><strong>Note:</strong> ${escapeHtml(data.note)}</p>` : ""}
       ${totalsHtml(data)}
       ${button(data.orderUrl, "Open the order")}`,
    ),
    text: `${data.customerName} ordered from you.

Order ${data.code}
Pickup: ${data.pickupAt}
${data.note ? `Note: ${data.note}\n` : ""}
${linesText(data.lines, data.currency)}

Total ${money(data.totalCents, data.currency)}

${data.orderUrl}`,
  };
}

export function orderAcceptedEmail(data: OrderEmailData): EmailBody {
  return {
    subject: `${data.vendorName} is cooking order ${data.code}`,
    html: shell(
      `${data.vendorName} accepted your order`,
      `<p style="margin:0 0 16px;font-size:15px;">They'll have it ready for <strong>${escapeHtml(data.pickupAt)}</strong>.</p>
       ${data.pickupAddress ? `<p style="margin:0 0 16px;font-size:14px;color:#6b6157;">${escapeHtml(data.pickupAddress)}</p>` : ""}
       ${button(data.orderUrl, "View your order")}`,
    ),
    text: `${data.vendorName} accepted your order ${data.code}.
Ready for ${data.pickupAt}.
${data.pickupAddress ?? ""}

${data.orderUrl}`,
  };
}

export function orderReadyEmail(data: OrderEmailData): EmailBody {
  return {
    subject: `Order ${data.code} is ready for pickup`,
    html: shell(
      `Your order is ready`,
      `<p style="margin:0 0 16px;font-size:15px;">${escapeHtml(data.vendorName)} has your order waiting.</p>
       ${data.pickupAddress ? `<p style="margin:0 0 8px;font-size:14px;color:#6b6157;">${escapeHtml(data.pickupAddress)}</p>` : ""}
       <p style="margin:0 0 4px;font-size:14px;color:#6b6157;">Show code <strong style="color:#1f1c18;letter-spacing:0.05em;">${escapeHtml(data.code)}</strong>.</p>
       ${button(data.orderUrl, "View your order")}`,
    ),
    text: `Your order ${data.code} from ${data.vendorName} is ready.
${data.pickupAddress ?? ""}
Pickup code: ${data.code}

${data.orderUrl}`,
  };
}

export function orderCanceledEmail(
  data: OrderEmailData & { reason: string; refunded: boolean },
): EmailBody {
  const refundLine = data.refunded
    ? `We've refunded ${money(data.totalCents, data.currency)} to your original payment method. Card refunds usually land within 5–10 days.`
    : `Nothing was charged.`;

  return {
    subject: `Order ${data.code} was cancelled`,
    html: shell(
      `Order ${data.code} was cancelled`,
      `<p style="margin:0 0 12px;font-size:15px;">${escapeHtml(data.reason)}</p>
       <p style="margin:0 0 16px;font-size:14px;color:#6b6157;">${escapeHtml(refundLine)}</p>
       ${button(data.orderUrl, "View your order")}`,
    ),
    text: `Order ${data.code} was cancelled.

${data.reason}

${refundLine}

${data.orderUrl}`,
  };
}

export function refundIssuedEmail(
  data: OrderEmailData & { refundedCents: number },
): EmailBody {
  return {
    subject: `Refund issued for order ${data.code}`,
    html: shell(
      `We've refunded ${money(data.refundedCents, data.currency)}`,
      `<p style="margin:0 0 16px;font-size:15px;">Your refund for order ${escapeHtml(data.code)} from ${escapeHtml(data.vendorName)} is on its way. Card refunds usually land within 5–10 days.</p>
       ${button(data.orderUrl, "View your order")}`,
    ),
    text: `We've refunded ${money(data.refundedCents, data.currency)} for order ${data.code} from ${data.vendorName}.
Card refunds usually land within 5-10 days.

${data.orderUrl}`,
  };
}

export function reviewRequestEmail(data: OrderEmailData): EmailBody {
  return {
    subject: `How was ${data.vendorName}?`,
    html: shell(
      `How was your order from ${data.vendorName}?`,
      `<p style="margin:0 0 16px;font-size:15px;">A quick rating helps other people find good food — and helps ${escapeHtml(data.vendorName)} build a reputation.</p>
       ${button(data.orderUrl, "Leave a review")}`,
    ),
    text: `How was your order from ${data.vendorName}?

Leave a review: ${data.orderUrl}`,
  };
}

export type VendorDecisionEmailData = {
  vendorName: string;
  decision: "approved" | "changes_requested" | "suspended";
  note: string | null;
  dashboardUrl: string;
};

/**
 * The gap this closes: a cook whose listing was sent back for changes
 * previously had no way of finding out except by logging in and looking.
 */
export function vendorDecisionEmail(data: VendorDecisionEmailData): EmailBody {
  const copy = {
    approved: {
      subject: `${data.vendorName} is approved on FreshFork`,
      heading: `You're approved`,
      body: `Your listing passed review. Once your Stripe payouts setup is complete, ${data.vendorName} goes live and customers can order.`,
      cta: "Open your dashboard",
    },
    changes_requested: {
      subject: `${data.vendorName}: a few changes needed`,
      heading: `We need a couple of changes`,
      body: `Your listing is nearly there. Here's what our reviewer needs before ${data.vendorName} can go live:`,
      cta: "Update your listing",
    },
    suspended: {
      subject: `${data.vendorName} has been suspended`,
      heading: `Your listing has been suspended`,
      body: `${data.vendorName} is no longer visible to customers. Here's why:`,
      cta: "Open your dashboard",
    },
  }[data.decision];

  return {
    subject: copy.subject,
    html: shell(
      copy.heading,
      `<p style="margin:0 0 16px;font-size:15px;">${escapeHtml(copy.body)}</p>
       ${data.note ? `<p style="margin:0 0 16px;padding:12px;background:#faf8f5;border-radius:8px;font-size:14px;">${escapeHtml(data.note)}</p>` : ""}
       ${button(data.dashboardUrl, copy.cta)}`,
    ),
    text: `${copy.heading}

${copy.body}
${data.note ? `\n${data.note}\n` : ""}
${data.dashboardUrl}`,
  };
}
