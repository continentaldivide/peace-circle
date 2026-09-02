"use client";

import Link from "next/link";
import { startTransition, useActionState, useRef, useState } from "react";

import { RingMark } from "@/components/ring-mark";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { submitInquiry } from "@/app/actions/inquiries";
import {
  emptyInquiryValues,
  initialInquiryState,
  HONEYPOT_FIELD,
  validateInquiry,
  INQUIRY_FIELDS,
  INQUIRY_LIMITS,
  type InquiryField,
  type InquiryValues,
} from "@/lib/inquiries";

/** Every field revealed at once, for the moment someone presses Send. */
const ALL_TOUCHED = Object.fromEntries(
  INQUIRY_FIELDS.map((field) => [field, true]),
) as Record<InquiryField, boolean>;

/**
 * The public interest form.
 *
 * Not a sign-up. Joining the Peace Circle runs through a human conversation,
 * so this collects an inquiry and ends at "we'll be in touch" — no account, no
 * magic link, and nothing about the member area exposed. Access is granted
 * afterwards by an admin invite or a launch code.
 *
 * Validation is deliberately front-loaded: the form refuses to submit while
 * anything is wrong, so a mistake is caught beside the field rather than by a
 * round trip that returns an error. `validateInquiry` is the same function the
 * server action runs, so the two can never disagree about what is acceptable.
 */
export function InterestForm() {
  const [state, formAction, pending] = useActionState(
    submitInquiry,
    initialInquiryState,
  );
  const [values, setValues] = useState<InquiryValues>(emptyInquiryValues);
  const [touched, setTouched] = useState<
    Partial<Record<InquiryField, boolean>>
  >({});
  const formRef = useRef<HTMLFormElement>(null);

  const errors = validateInquiry(values);
  const isValid = Object.keys(errors).length === 0;

  // A field's error stays hidden until they have left it once, so the form
  // does not scold someone for a half-typed address as they go.
  const shownError = (field: InquiryField) =>
    touched[field] ? errors[field] : undefined;

  const set =
    (field: InquiryField) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((prev) => ({ ...prev, [field]: e.target.value }));

  /**
   * Border and ring in the warning colour, so a problem is visible from the
   * shape of the field and not only from the sentence beneath it.
   */
  const fieldClass = (field: InquiryField) =>
    cn(
      inputClass,
      shownError(field) &&
        "border-warn ring-2 ring-warn-soft focus:border-warn",
    );

  const blur = (field: InquiryField) => () =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    if (!isValid) {
      // Reveal every outstanding problem at once and put the caret in the
      // first one. Nothing is sent, so there is no round trip to lose. Walking
      // INQUIRY_FIELDS rather than a hand-written list means a field can never
      // hold the form shut with an error nobody was shown.
      setTouched(ALL_TOUCHED);
      const firstInvalid = INQUIRY_FIELDS.find((field) => errors[field]);
      formRef.current
        ?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)
        ?.focus();
      return;
    }

    // useActionState's dispatch has to run inside a transition, which the
    // `action` prop would have done for us. We take the submit over by hand
    // to hold invalid forms back, so we owe React the transition ourselves —
    // without it `pending` never flips and the button keeps saying "Send".
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  }

  if (state.status === "sent") {
    return (
      <Card>
        <div className="text-accent">
          <RingMark size={40} rings={4} />
        </div>
        <div>
          <h1 className="font-display text-[28px] font-semibold leading-tight text-ink">
            Thank you — that&rsquo;s with us
          </h1>
          <p className="mt-2 font-body text-[15px] leading-relaxed text-ink-soft">
            A couple of us will read what you wrote and email you back soon.
            We&rsquo;re a small circle and we answer everyone personally, so it
            may take a few days rather than a few minutes.
          </p>
          <p className="mt-3 font-body text-[15px] leading-relaxed text-ink-soft">
            There&rsquo;s nothing else you need to do — no account to set up and
            no password to remember.
          </p>
        </div>
        <Link
          href="/"
          className="font-body text-[14px] font-medium text-accent"
        >
          Back to home
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <div className="text-accent">
        <RingMark size={40} rings={4} />
      </div>
      <div>
        <h1 className="font-display text-[28px] font-semibold leading-tight text-ink">
          Tell us about yourself
        </h1>
        <p className="mt-2 font-body text-[15px] leading-relaxed text-ink-soft">
          The Peace Circle isn&rsquo;t something you sign up for. Write us a few
          lines and a couple of us will read it and email you back.
        </p>
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        noValidate
        /**
         * Off so the browser does not restore field values on reload. These
         * inputs are controlled, so a restored value is a second source of
         * truth: React holds "" and the DOM holds the old text, and the next
         * render — the first time you tab between fields — silently wipes it.
         * Better that a reload start clean than that typing vanish later.
         */
        autoComplete="off"
        className="flex flex-col gap-5"
      >
        {/* Honeypot: hidden from people, tempting to bots. Off-screen rather
            than display:none, which some bots skip.

            The name and the label are both deliberately bland. Password
            managers match fields semantically, so anything recognisable —
            "website" above all — gets autofilled for a real person, who is
            then silently discarded as a bot. The data-*-ignore attributes ask
            the four common managers to skip the field outright; they are
            advisory and unsupported ones ignore them, which is why the
            meaningless name is doing the real work. Bots need none of this to
            take the bait: they fill every input they can parse. */}
        <div className="absolute left-[-9999px]" aria-hidden="true">
          <label>
            Note
            <input
              type="text"
              name={HONEYPOT_FIELD}
              tabIndex={-1}
              autoComplete="off"
              data-1p-ignore="true"
              data-lpignore="true"
              data-bwignore="true"
              data-form-type="other"
            />
          </label>
        </div>

        <Field label="Your name" error={shownError("name")}>
          <input
            name="name"
            type="text"
            autoComplete="name"
            maxLength={INQUIRY_LIMITS.name}
            value={values.name}
            onChange={set("name")}
            onBlur={blur("name")}
            aria-invalid={!!shownError("name")}
            placeholder="e.g. Lisa Morrow"
            className={fieldClass("name")}
          />
        </Field>

        <Field label="Email address" error={shownError("email")}>
          <input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={INQUIRY_LIMITS.email}
            value={values.email}
            onChange={set("email")}
            onBlur={blur("email")}
            aria-invalid={!!shownError("email")}
            placeholder="you@example.com"
            className={fieldClass("email")}
          />
        </Field>

        <Field
          label="How did you hear about the Peace Circle?"
          error={shownError("heardFrom")}
        >
          <textarea
            name="heardFrom"
            rows={2}
            maxLength={INQUIRY_LIMITS.heardFrom}
            value={values.heardFrom}
            onChange={set("heardFrom")}
            onBlur={blur("heardFrom")}
            aria-invalid={!!shownError("heardFrom")}
            placeholder="A friend, a flyer, something you read…"
            className={cn(fieldClass("heardFrom"), "resize-none")}
          />
        </Field>

        <Field
          label="Were you referred by a current member?"
          hint="(optional)"
          error={shownError("referredBy")}
        >
          <input
            name="referredBy"
            type="text"
            maxLength={INQUIRY_LIMITS.referredBy}
            value={values.referredBy}
            onChange={set("referredBy")}
            onBlur={blur("referredBy")}
            aria-invalid={!!shownError("referredBy")}
            placeholder="If so, who?"
            className={fieldClass("referredBy")}
          />
        </Field>

        <Field
          label="Anything you'd like us to know?"
          hint="(optional)"
          error={shownError("message")}
        >
          <textarea
            name="message"
            rows={3}
            maxLength={INQUIRY_LIMITS.message}
            value={values.message}
            onChange={set("message")}
            onBlur={blur("message")}
            aria-invalid={!!shownError("message")}
            placeholder="However much or little you'd like to say."
            className={cn(fieldClass("message"), "resize-none")}
          />
        </Field>

        {/* Only reachable if the server rejects something the form allowed —
            a bypassed client, or the insert itself failing. */}
        {state.status === "error" ? (
          <p
            role="alert"
            className="rounded-[10px] border border-warn bg-warn-soft px-4 py-3 font-body text-[14px] leading-relaxed text-warn"
          >
            {state.formError ??
              "Nothing was sent — please check the fields above."}
          </p>
        ) : null}

        <Button type="submit" block disabled={pending}>
          {pending ? "Sending…" : "Send this to the circle"}
        </Button>

        <p className="text-center font-body text-[14px] text-ink-soft">
          Already a member?{" "}
          <Link href="/signin" className="font-medium text-accent">
            Sign in instead
          </Link>
        </p>
      </form>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-[440px] flex-col gap-5 rounded-card border border-line bg-surface p-8 shadow-[var(--cardshadow)] sm:p-10">
        {children}
      </div>
    </div>
  );
}
