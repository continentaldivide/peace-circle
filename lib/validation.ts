/**
 * The rules for the two things every form here collects: a person's name and
 * their email address.
 *
 * They live in one module because two forms now ask for them — the public
 * interest form and the launch-code step on /welcome — and because both values
 * are used the same way once collected: shown to admins, and in the inquiry's
 * case written into an email header. Two copies of a rule is how the interest
 * form went wrong the first time (the browser accepted "you@example" and the
 * server did not, so a visitor's answers were wiped with no explanation), and
 * two copies of a *security* rule fails more quietly than that.
 */

/**
 * Any Unicode control character — the category a bare carriage return or line
 * feed falls into. Written as a property escape rather than a literal range so
 * this source file contains no control characters of its own.
 */
const CONTROL_CHARACTER = /\p{Cc}/u;

/**
 * Requires a dot: an address without one cannot receive the reply the interest
 * form exists to produce, or the magic link /welcome sends, though the
 * browser's own type="email" check allows it.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The problem with this name, or undefined if there is none. */
export function nameError(value: string): string | undefined {
  const name = value.trim();
  if (name.length < 2) return "Please add your name.";
  // A name reaches an email subject line, which is a header, and a newline in
  // a header is the shape header injection takes. Rejected here rather than
  // stripped at the send, so a caller can trust what it holds.
  if (CONTROL_CHARACTER.test(name)) {
    return "Please write your name on a single line.";
  }
  return undefined;
}

/** The problem with this address, or undefined if there is none. */
export function emailError(value: string): string | undefined {
  const email = value.trim();
  if (!EMAIL.test(email)) {
    return "Please enter a full email address, like you@example.org.";
  }
  // The address becomes a Reply-To, which is a header too. `\s` in the pattern
  // above already excludes CR and LF, so this is not the only thing standing
  // between us and a split header — but it is the only thing that covers the
  // rest of the control characters, and relying on a side effect of a
  // *format* check to enforce a *safety* property is how this gets broken by
  // someone later loosening the format.
  if (CONTROL_CHARACTER.test(email)) {
    return "Please write your email address on a single line.";
  }
  return undefined;
}
