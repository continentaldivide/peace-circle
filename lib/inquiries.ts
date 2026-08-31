/**
 * Shape of the interest form's submission result.
 *
 * Separate from `app/actions/inquiries.ts` because a `"use server"` module may
 * only export async functions — exporting the initial state object from there
 * fails at module evaluation with "can only export async functions, found
 * object". Types alone would be fine, since they are erased, but keeping the
 * constant beside them is clearer than splitting the two.
 */

export type InquiryField = "name" | "email" | "heardFrom";

/** Everything the visitor typed, echoed back so an error never wipes it. */
export type InquiryValues = {
  name: string;
  email: string;
  heardFrom: string;
  referredBy: string;
  message: string;
};

export type InquiryState = {
  status: "idle" | "error" | "sent";
  errors?: Partial<Record<InquiryField, string>>;
  /** Set when the submission itself failed, rather than a single field. */
  formError?: string;
  /**
   * Present whenever the form is redisplayed after a failure. Without it the
   * uncontrolled inputs come back empty and the re-render reads as the page
   * having reloaded and thrown the answers away.
   */
  values?: InquiryValues;
};

export const initialInquiryState: InquiryState = { status: "idle" };

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
  }
  // Requires a dot: an address without one cannot receive the reply this form
  // exists to produce, though the browser's own type="email" check allows it.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Please enter a full email address, like you@example.org.";
  }
  if (values.heardFrom.trim().length < 2) {
    errors.heardFrom = "Please tell us a little about how you found us.";
  }

  return errors;
}
