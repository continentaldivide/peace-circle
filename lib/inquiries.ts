/**
 * The interest form's shared rules: what a submission contains, what counts as
 * valid, and what the submission result looks like.
 *
 * Separate from `app/actions/inquiries.ts` because a `"use server"` module may
 * only export async functions — exporting the constants from there fails at
 * module evaluation with "can only export async functions, found object".
 * Types alone would be fine, since they are erased, but keeping the constants
 * beside them is clearer than splitting the two.
 */

/**
 * Every field on the form, in the order it is asked. One list, derived from
 * rather than repeated by everything downstream: the value type, the limits,
 * and the order in which the form reveals and focuses errors. Two copies of
 * the validation rules is how the first version of this form went wrong, and a
 * hand-repeated field list is the same mistake wearing a different hat.
 */
export const INQUIRY_FIELDS = [
  "name",
  "email",
  "heardFrom",
  "referredBy",
  "message",
] as const;

export type InquiryField = (typeof INQUIRY_FIELDS)[number];

/** Everything the visitor typed. */
export type InquiryValues = Record<InquiryField, string>;

export const emptyInquiryValues: InquiryValues = {
  name: "",
  email: "",
  heardFrom: "",
  referredBy: "",
  message: "",
};

/**
 * Length ceilings, enforced in three places on purpose: `maxLength` on the
 * inputs so nobody overruns one by accident, `validateInquiry` so a bypassed
 * client cannot either, and `check` constraints on the table so nothing
 * reaches a column regardless of how it got there. The columns are plain
 * `text`, so without these one submission could carry megabytes into the
 * table and into an admin's inbox.
 */
export const INQUIRY_LIMITS: Record<InquiryField, number> = {
  name: 100,
  // The longest address RFC 5321 permits.
  email: 254,
  heardFrom: 1000,
  referredBy: 100,
  message: 2000,
};

/**
 * The honeypot field's name, shared so the form and the action can never
 * disagree about it. A rename that lands on only one side does not fail
 * loudly: `formData.get` simply returns null, the check never trips, and the
 * honeypot quietly becomes a no-op while spam starts arriving.
 *
 * The name is deliberately meaningless. It used to be "website", which was
 * the bug: password managers fill fields by recognising them, and website/url
 * is a stock identity field, so the trap fired on real people. Bots do not
 * recognise anything — they enumerate the DOM and fill whatever they find — so
 * a name with no autofill category behind it still catches them while leaving
 * people alone. Do not "tidy" this into something descriptive.
 */
export const HONEYPOT_FIELD = "circle-note";

export type InquiryState = {
  status: "idle" | "error" | "sent";
  /**
   * Why the submission failed, when it failed as a whole. There is no
   * per-field counterpart: the form validates with `validateInquiry` before it
   * will submit at all, so the server's own run of the same rules is a
   * backstop against a bypassed client, not a feedback channel for anyone
   * using the form normally.
   */
  formError?: string;
};

export const initialInquiryState: InquiryState = { status: "idle" };

/**
 * Any Unicode control character — the category a bare carriage return or line
 * feed falls into. Written as a property escape rather than a literal range so
 * this source file contains no control characters of its own.
 */
const CONTROL_CHARACTER = /\p{Cc}/u;

/**
 * The validation rules, in one place.
 *
 * Imported by both the form and the server action on purpose. Two copies is
 * how the first version went wrong: the browser accepted "you@example" and the
 * server did not, so a visitor got their answers wiped with no explanation.
 * The form uses these to refuse to submit; the action re-runs them because a
 * client can always be bypassed.
 */
export function validateInquiry(
  values: InquiryValues,
): Partial<Record<InquiryField, string>> {
  const errors: Partial<Record<InquiryField, string>> = {};

  if (values.name.trim().length < 2) {
    errors.name = "Please add your name.";
  } else if (CONTROL_CHARACTER.test(values.name.trim())) {
    // The name goes into an email subject line, which is a header, and a
    // newline in a header is the shape header injection takes. Rejected here
    // rather than stripped at the send, so the action can trust what it holds.
    errors.name = "Please write your name on a single line.";
  }

  // Requires a dot: an address without one cannot receive the reply this form
  // exists to produce, though the browser's own type="email" check allows it.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Please enter a full email address, like you@example.org.";
  }

  if (values.heardFrom.trim().length < 2) {
    errors.heardFrom = "Please tell us a little about how you found us.";
  }

  // Length last, so an empty required field reads as missing rather than as
  // the wrong size. Applies to the optional fields too — they are unbounded
  // text columns like the rest.
  for (const field of INQUIRY_FIELDS) {
    const limit = INQUIRY_LIMITS[field];
    if (!errors[field] && values[field].trim().length > limit) {
      errors[field] = `Please keep this under ${limit} characters.`;
    }
  }

  return errors;
}
