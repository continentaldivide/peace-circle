"use client";

import Link from "next/link";
import { useState } from "react";

import { RingMark } from "@/components/ring-mark";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

/**
 * Passwordless magic-link auth.
 *
 * Requesting a link proves nothing but ownership of an address, and the link
 * always creates a user if there is none. That is deliberate: authorization is
 * a separate layer, so a stranger who signs in here authenticates successfully
 * and then lands on /pending. Not gating on account existence also avoids
 * telling an unknown visitor whether an address belongs to a member.
 */
export function AuthFlow({ initialError }: { initialError?: string }) {
  const [step, setStep] = useState<"request" | "sent">("request");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  const valid = isEmail(email);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid || sending) return;

    setSending(true);
    setError(null);

    const supabase = createClient();
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // The email template builds its link on this, so it must be on the
        // project's redirect allow list — otherwise Supabase substitutes the
        // Site URL and the link is broken. It must also carry a query, since
        // the template appends `&token_hash=`. See supabase/templates/.
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent("/home")}`,
      },
    });

    setSending(false);

    if (sendError) {
      setError(sendError.message);
      return;
    }
    setStep("sent");
  }

  return (
    <div className="flex min-h-[80vh] flex-col">
      <header className="flex items-center justify-between gap-4 px-6 py-[22px] sm:px-14">
        <Link
          href="/"
          className="inline-flex items-center gap-[11px] font-display text-[20px] font-semibold text-ink"
        >
          <span className="text-accent">
            <RingMark size={26} rings={3} />
          </span>
          <span>Peace Circle</span>
        </Link>
        <Link
          href="/"
          className="font-body text-[15px] font-medium text-ink-soft transition-colors hover:text-ink"
        >
          Back to home
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[440px] rounded-card border border-line bg-surface p-8 shadow-[var(--cardshadow)] sm:p-10">
          {step === "request" ? (
            <form onSubmit={submit} noValidate className="flex flex-col gap-5">
              <div className="text-accent">
                <RingMark size={40} rings={4} />
              </div>
              <div>
                <h1 className="font-display text-[28px] font-semibold leading-tight text-ink">
                  Welcome back
                </h1>
                <p className="mt-2 font-body text-[15px] leading-relaxed text-ink-soft">
                  No password needed. Enter your email and we&rsquo;ll send you
                  a one-time sign-in link.
                </p>
              </div>

              <Field
                label="Email address"
                error={
                  touched && !isEmail(email)
                    ? "Please enter a valid email address."
                    : undefined
                }
              >
                <input
                  type="email"
                  value={email}
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  className={inputClass}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>

              {error ? (
                <p
                  role="alert"
                  className="rounded-[10px] border border-line bg-bg px-4 py-3 font-body text-[14px] leading-relaxed text-accent"
                >
                  {error}
                </p>
              ) : null}

              <Button type="submit" block disabled={sending}>
                {sending ? "Sending…" : "Send sign-in link"}
              </Button>

              <p className="text-center font-body text-[14px] text-ink-soft">
                New here?{" "}
                <Link href="/join" className="font-medium text-accent">
                  Tell us about yourself
                </Link>
              </p>
            </form>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="text-accent">
                <RingMark size={40} rings={4} />
              </div>
              <div>
                <h1 className="font-display text-[28px] font-semibold leading-tight text-ink">
                  Check your email
                </h1>
                <p className="mt-2 font-body text-[15px] leading-relaxed text-ink-soft">
                  We sent a sign-in link to <strong>{email}</strong>. Open it on
                  this device to step into the circle. The link is good for one
                  hour.
                </p>
              </div>

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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
