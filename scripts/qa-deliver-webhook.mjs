// QA-only helper: manually deliver a Stripe webhook event to the local dev
// server, signed with STRIPE_WEBHOOK_SECRET, when `stripe listen` isn't
// running. Usage: node scripts/qa-deliver-webhook.js <event-json-file>
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";

const secret = process.env.STRIPE_WEBHOOK_SECRET;
if (!secret) {
  console.error("STRIPE_WEBHOOK_SECRET not set");
  process.exit(1);
}

const eventPath = process.argv[2];
const payload = fs.readFileSync(eventPath, "utf8");

const timestamp = Math.floor(Date.now() / 1000);
const signedPayload = `${timestamp}.${payload}`;
const signature = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
const header = `t=${timestamp},v1=${signature}`;

const req = http.request(
  {
    hostname: "localhost",
    port: 3000,
    path: "/api/webhooks/stripe",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": header,
      "Content-Length": Buffer.byteLength(payload),
    },
  },
  (res) => {
    let body = "";
    res.on("data", (chunk) => (body += chunk));
    res.on("end", () => {
      console.log("status", res.statusCode);
      console.log(body);
    });
  },
);

req.on("error", (e) => console.error(e));
req.write(payload);
req.end();
