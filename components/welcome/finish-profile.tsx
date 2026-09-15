"use client";

import { Radio, RadioGroup } from "@headlessui/react";
import { startTransition, useActionState, useState } from "react";

import { finishProfile } from "@/app/actions/welcome";
import { Avatar } from "@/components/avatar";
import { WelcomeHeading } from "@/components/welcome/shell";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { cn, initialsFor } from "@/lib/utils";
import {
  AVATAR_TINTS,
  initialProfileState,
  isAvatarTint,
  PROFILE_NAME_LIMIT,
  validateProfile,
} from "@/lib/welcome";

/**
 * The short finish step both ways into the circle end on — a launch code and
 * a per-person invite. Nothing in the app sends invites until Step 7's admin
 * screen; until then they are made by hand through the admin API.
 *
 * Both arrive with a name already: the launch code carries the one typed
 * before the magic link, an invite carries whatever the admin entered. So this
 * confirms rather than asks, and the only genuinely new decision is the tint.
 */
export function FinishProfile({
  initialName,
  initialTint,
}: {
  initialName: string;
  initialTint: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    finishProfile,
    initialProfileState,
  );
  const [name, setName] = useState(initialName);
  const [tint, setTint] = useState<string>(
    initialTint && isAvatarTint(initialTint)
      ? initialTint
      : AVATAR_TINTS[0].value,
  );
  const [touched, setTouched] = useState(false);

  const errors = validateProfile({ name, tint });
  const isValid = Object.keys(errors).length === 0;
  const nameProblem = touched ? errors.name : undefined;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    if (!isValid) {
      setTouched(true);
      return;
    }

    // useActionState's dispatch has to run inside a transition, which the
    // `action` prop would have done for us. Taking the submit over by hand to
    // hold an invalid form back means owing React the transition — without it
    // `pending` never flips and the button keeps saying "Step inside".
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  }

  return (
    <>
      <WelcomeHeading title="One last thing">
        <p>
          You&rsquo;re in. Check your name is how you&rsquo;d like the circle to
          see it, and pick a colour for your mark.
        </p>
      </WelcomeHeading>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <Field label="Your name" error={nameProblem}>
          <input
            name="name"
            type="text"
            autoComplete="name"
            maxLength={PROFILE_NAME_LIMIT}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={!!nameProblem}
            className={cn(
              inputClass,
              nameProblem &&
                "border-warn ring-2 ring-warn-soft focus:border-warn",
            )}
          />
        </Field>

        <div>
          <span className="mb-1.5 block font-body text-[13px] font-medium text-ink-soft">
            Your mark
          </span>
          <div className="flex items-center gap-4">
            {/* The choice made concrete: initials, in the colour, at the size
                they will actually appear beside a share. */}
            <Avatar person={{ initials: initialsFor(name), tint }} size={46} />
            {/* `name` makes Headless UI emit the hidden input the form posts,
                so the tint reaches the action without a controlled <input> of
                our own. */}
            <RadioGroup
              value={tint}
              onChange={setTint}
              name="tint"
              aria-label="Avatar colour"
              className="flex flex-wrap gap-2.5"
            >
              {AVATAR_TINTS.map((option) => (
                <Radio
                  key={option.value}
                  value={option.value}
                  aria-label={option.label}
                  title={option.label}
                  style={{ background: option.value }}
                  className="h-8 w-8 cursor-pointer rounded-full ring-offset-2 ring-offset-surface transition data-checked:ring-2 data-checked:ring-ink data-focus:ring-2 data-focus:ring-accent"
                />
              ))}
            </RadioGroup>
          </div>
        </div>

        {/* Only reachable if the server rejects something this form allowed —
            a bypassed client, or the update itself failing. */}
        {state.status === "error" ? (
          <p
            role="alert"
            className="rounded-[10px] border border-warn bg-warn-soft px-4 py-3 font-body text-[14px] leading-relaxed text-warn"
          >
            {state.formError ?? "Nothing was saved — please try again."}
          </p>
        ) : null}

        <Button type="submit" block disabled={pending}>
          {pending ? "Saving…" : "Step inside"}
        </Button>
      </form>
    </>
  );
}
