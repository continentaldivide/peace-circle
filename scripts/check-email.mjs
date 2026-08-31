/**
 * Diagnostic: does outgoing mail actually work?
 *
 * Run with `npm run email:check`. Sends one message to ADMIN_NOTIFY_EMAILS
 * using the same RESEND_API_KEY and EMAIL_FROM the app uses, so a green run
 * here means the interest form's notification will land too.
 *
 * Deliberately standalone rather than importing lib/email.ts: that module is
 * marked `server-only` and cannot be loaded outside the Next server runtime.
 */
import { Resend } from "resend";

const key = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "Peace Circle <onboarding@resend.dev>";
const to = (process.env.ADMIN_NOTIFY_EMAILS ?? "")
  .split(",")
  .map((a) => a.trim())
  .filter(Boolean);

console.log(`from: ${from}`);
console.log(`to:   ${to.join(", ") || "(none)"}\n`);

if (!key) {
  console.error("RESEND_API_KEY is not set in .env.local — nothing to test.");
  process.exit(1);
}
if (to.length === 0) {
  console.error(
    "ADMIN_NOTIFY_EMAILS is not set in .env.local — no recipients.",
  );
  process.exit(1);
}

const { data, error } = await new Resend(key).emails.send({
  from,
  to,
  subject: "Peace Circle — email check",
  text: "If this arrived, outgoing mail is configured correctly.",
  replyTo: "someone@example.org",
});

if (error) {
  console.error(`FAILED: ${error.message}`);
  if (/domain|verif/i.test(error.message)) {
    console.error(
      "\nThis usually means EMAIL_FROM's domain is not verified in Resend yet,\n" +
        "or you are on the shared onboarding@resend.dev sender, which can only\n" +
        "deliver to your own Resend account address.",
    );
  }
  process.exit(1);
}

console.log(`Sent. Resend id: ${data?.id ?? "unknown"}`);
