import "server-only";

import { Resend } from "resend";

/**
 * Outgoing transactional mail.
 *
 * There are two email paths in this app and only this one runs through our
 * code. Supabase Auth sends magic links and invites itself, through whatever
 * SMTP provider is configured in the project dashboard — nothing here is
 * involved in signing in. This module is for mail the app composes: currently
 * the interest-form notification to admins (Step 3).
 *
 * Without `RESEND_API_KEY` the message is logged instead of sent, so local
 * development needs no account, no verified domain, and no network. That is
 * also what runs in tests.
 */

const FROM = process.env.EMAIL_FROM ?? "Peace Circle <onboarding@resend.dev>";

/** Admin notify list, comma-separated. Kept in env so it works from day one. */
export function adminNotifyList(): string[] {
  return (process.env.ADMIN_NOTIFY_EMAILS ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
}

export type Email = {
  to: string[];
  subject: string;
  text: string;
  /**
   * Set this to the person the mail is *about* so an admin can just hit Reply.
   * The interest form depends on it: the notification comes from us, but the
   * conversation it starts should go to the applicant.
   */
  replyTo?: string;
};

export type SendResult =
  | { delivered: true; id: string }
  | { delivered: false; reason: "not-configured" | "no-recipients" }
  | { delivered: false; reason: "failed"; error: string };

export async function sendEmail(email: Email): Promise<SendResult> {
  if (email.to.length === 0) {
    return { delivered: false, reason: "no-recipients" };
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Deliberately loud rather than silent: a missing key in production would
    // otherwise drop admin notifications with no trace.
    console.info(
      `[email] RESEND_API_KEY not set — not sending.\n` +
        `        to: ${email.to.join(", ")}\n` +
        `        subject: ${email.subject}\n` +
        (email.replyTo ? `        reply-to: ${email.replyTo}\n` : "") +
        email.text.replace(/^/gm, "        "),
    );
    return { delivered: false, reason: "not-configured" };
  }

  const { data, error } = await new Resend(apiKey).emails.send({
    from: FROM,
    to: email.to,
    subject: email.subject,
    text: email.text,
    ...(email.replyTo ? { replyTo: email.replyTo } : {}),
  });

  // Returned rather than thrown: a failed notification should not lose the
  // visitor's inquiry, which is already safely in the database by this point.
  if (error)
    return { delivered: false, reason: "failed", error: error.message };

  return { delivered: true, id: data?.id ?? "unknown" };
}
