"use server";

import { adminNotifyList, sendEmail } from "@/lib/email";
import type { InquiryState, InquiryValues } from "@/lib/inquiries";
import { HONEYPOT_FIELD, validateInquiry } from "@/lib/inquiries";
import { createClient } from "@/lib/supabase/server";

/**
 * The public interest form's submission path.
 *
 * Deliberately unauthenticated, and deliberately not privileged: the insert
 * goes through the ordinary server client, so the `inquiries_insert_public`
 * policy still applies and pins `status` to 'new' with `handled_by` and
 * `notes` empty. A submitter cannot post themselves in as already-invited,
 * and cannot read back a single row afterwards — the table is write-only to
 * everyone but admins.
 */

export async function submitInquiry(
  _prev: InquiryState,
  formData: FormData,
): Promise<InquiryState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const heardFrom = String(formData.get("heardFrom") ?? "").trim();
  const referredBy = String(formData.get("referredBy") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  const values: InquiryValues = { name, email, heardFrom, referredBy, message };

  // Honeypot. A person never sees this field, so anything in it means a bot
  // walked the form. Answer exactly as we would a real submission — telling a
  // bot it was caught just teaches whoever wrote it to fill the field in.
  if (String(formData.get(HONEYPOT_FIELD) ?? "").trim() !== "") {
    // The field name and the data-*-ignore attributes are what keep a password
    // manager from filling this for a real person and getting them discarded
    // as a bot. Neither is a guarantee, so this line is how we check the trap
    // is still catching only what it is meant to: hits here should carry
    // junk, and a run of plausible addresses means the guards have stopped
    // working.
    console.info(
      `[inquiries] honeypot filled — discarded a submission from ${email || "(no address)"}`,
    );
    return { status: "sent" };
  }

  // Re-run here rather than trusted from the client, which can be bypassed
  // entirely. Same rules as the form uses, from the same module.
  const errors = validateInquiry(values);
  if (Object.keys(errors).length > 0) {
    // The form will not submit while any of these fail, so reaching this means
    // the client was bypassed rather than that someone mistyped something.
    console.warn(
      `[inquiries] rejected a submission that the form would not have sent: ${Object.keys(errors).join(", ")}`,
    );
    return {
      status: "error",
      formError: "Some of those answers weren't quite right. Please try again.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("inquiries").insert({
    name,
    email,
    heard_from: heardFrom,
    referred_by: referredBy || null,
    message: message || null,
  });

  if (error) {
    return {
      status: "error",
      formError:
        "Something went wrong saving that. Please try again in a moment.",
    };
  }

  // The inquiry is safely stored by this point, so a failed notification must
  // not fail the submission — the visitor did nothing wrong and should not be
  // asked to resubmit. sendEmail returns rather than throws for this reason.
  const result = await sendEmail({
    to: adminNotifyList(),
    // `name` is safe to interpolate into this header: validateInquiry has
    // already rejected any control character in it, so there is no newline
    // here to split the subject and inject a header of someone's choosing.
    subject: `Peace Circle — new inquiry from ${name}`,
    replyTo: email,
    text: [
      `${name} <${email}> would like to know more about the circle.`,
      "",
      "How did you hear about the Peace Circle?",
      heardFrom,
      "",
      "Were you referred by a current member?",
      referredBy || "(not answered)",
      "",
      "Anything else they'd like us to know?",
      message || "(not answered)",
      "",
      "Reply to this email to write back to them directly.",
    ].join("\n"),
  });

  if (!result.delivered) {
    console.error(
      `[inquiries] saved ${email}'s inquiry but the notification did not send: ${result.reason}`,
    );
  }

  return { status: "sent" };
}
