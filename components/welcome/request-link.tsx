"use client";

import Link from "next/link";
import { useState } from "react";

import { WelcomeHeading } from "@/components/welcome/shell";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { emailError, nameError } from "@/lib/validation";

/**
 * The launch code's first step: who you are, and where to send the link.
 *
 * The code has to survive a round trip through an inbox, and it does that in
 * the `next` parameter `app/auth/callback/route.ts` already understands —
 * Supabase appends its own `?code=` for the session exchange, so the callback
 * arrives holding both. They are different `code`s, which is worth knowing
 * when reading that URL: the one in the query is Supabase's one-time PKCE
 * code, and the launch code is inside `next`.
 *
 * The name rides along in `signInWithOtp`'s `data`, which lands in the auth
 * user's `raw_user_meta_data` — where `redeem_launch_code` reads it when it
 * creates the profile. Nothing here is a security boundary: the auth endpoint
 * is public and takes the publishable key, so anyone can sign up with any
 * metadata they like whatever this form validates. That is why the ceiling on
 * `profiles.name` is a check constraint and the redemption function clamps
 * rather than trusts.
 */
export function RequestLink({ code }: { code: string }) {
  const [step, setStep] = useState<"request" | "sent">("request");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean }>(
    {},
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errors = { name: nameError(name), email: emailError(email) };
  const valid = !errors.name && !errors.email;

  const shown = (field: "name" | "email") =>
    touched[field] ? errors[field] : undefined;

  const fieldClass = (field: "name" | "email") =>
    cn(
      inputClass,
      shown(field) && "border-warn ring-2 ring-warn-soft focus:border-warn",
    );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true });
    if (!valid || sending) return;

    setSending(true);
    setError(null);

    const next = `/welcome?code=${encodeURIComponent(code)}`;
    const supabase = createClient();
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        data: { name: name.trim() },
        // Must be on the project's redirect allow list, or Supabase silently
        // falls back to the Site URL and the link lands somewhere else.
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    setSending(false);

    if (sendError) {
      setError(sendError.message);
      return;
    }
    setStep("sent");
  }

  if (step === "sent") {
    return (
      <>
        <WelcomeHeading title="Check your email">
          <p>
            We sent a link to <strong>{email}</strong>. Open it on this device
            and we&rsquo;ll finish setting you up. The link is good for one
            hour.
          </p>
        </WelcomeHeading>
        <p className="text-center font-body text-[14px] text-ink-soft">
          Didn&rsquo;t get it?{" "}
          <button
            type="button"
            onClick={() => setStep("request")}
            className="cursor-pointer font-medium text-accent"
          >
            Try a different email
          </button>
        </p>
      </>
    );
  }

  return (
    <>
      <WelcomeHeading title="Welcome to the circle">
        <p>
          You&rsquo;re joining with the code{" "}
          <strong className="font-mono text-[14px] uppercase tracking-[0.08em] text-ink">
            {code}
          </strong>
          . Tell us your name and where to send your sign-in link.
        </p>
      </WelcomeHeading>

      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <Field label="Your name" error={shown("name")}>
          <input
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
            aria-invalid={!!shown("name")}
            placeholder="e.g. Lisa Morrow"
            className={fieldClass("name")}
          />
        </Field>

        <Field label="Email address" error={shown("email")}>
          <input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
            aria-invalid={!!shown("email")}
            placeholder="you@example.com"
            className={fieldClass("email")}
          />
        </Field>

        {error ? (
          <p
            role="alert"
            className="rounded-[10px] border border-warn bg-warn-soft px-4 py-3 font-body text-[14px] leading-relaxed text-warn"
          >
            {error}
          </p>
        ) : null}

        <Button type="submit" block disabled={sending}>
          {sending ? "Sending…" : "Send my sign-in link"}
        </Button>

        <p className="text-center font-body text-[14px] text-ink-soft">
          Already a member?{" "}
          <Link href="/signin" className="font-medium text-accent">
            Sign in instead
          </Link>
        </p>
      </form>
    </>
  );
}
