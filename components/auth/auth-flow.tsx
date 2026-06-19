"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { RingMark } from "@/components/ring-mark";
import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { useVariant } from "@/components/variant-context";
import { variantPath } from "@/lib/variants";

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

/**
 * Simulated passwordless magic-link auth (mirrors the handoff prototype). No
 * backend: the "Open the magic link" button writes a stub session and drops the
 * member into the Library. Phase 2 wires this to real Supabase magic links.
 */
export function AuthFlow({ mode }: { mode: "join" | "signin" }) {
  const [step, setStep] = useState<"request" | "sent">("request");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);

  const router = useRouter();
  const variant = useVariant();
  const { signIn } = useSession();

  const joining = mode === "join";
  const valid = isEmail(email) && (!joining || name.trim().length > 1);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (valid) setStep("sent");
  }

  function openLink() {
    signIn({ name: joining ? name.trim() : undefined, email });
    router.push(variantPath(variant, "/home"));
  }

  return (
    <div className="flex min-h-[80vh] flex-col">
      <header className="flex items-center justify-between gap-4 px-6 py-[22px] sm:px-14">
        <Link
          href={variantPath(variant)}
          className="inline-flex items-center gap-[11px] font-display text-[20px] font-semibold text-ink option-b:text-[15px] option-b:font-medium option-b:uppercase option-b:tracking-[0.3em] option-d:font-extrabold"
        >
          <span className="text-accent">
            <RingMark size={26} rings={3} />
          </span>
          <span>Peace Circle</span>
        </Link>
        <Link
          href={variantPath(variant)}
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
                <h1 className="font-display text-[28px] font-semibold leading-tight text-ink option-b:font-light option-d:font-extrabold">
                  {joining ? "Join the circle" : "Welcome back"}
                </h1>
                <p className="mt-2 font-body text-[15px] leading-relaxed text-ink-soft">
                  {joining
                    ? "No password to remember. Enter your details and we'll send a sign-in link to your email."
                    : "No password needed. Enter your email and we'll send you a one-time sign-in link."}
                </p>
              </div>

              {joining ? (
                <Field
                  label="Your name"
                  error={
                    touched && name.trim().length <= 1
                      ? "Please add your name so the circle knows you."
                      : undefined
                  }
                >
                  <input
                    type="text"
                    value={name}
                    autoComplete="name"
                    placeholder="e.g. Gail Morrow"
                    className={inputClass}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
              ) : null}

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

              <Button type="submit" block>
                {joining ? "Send my sign-in link" : "Send sign-in link"}
              </Button>

              <p className="text-center font-body text-[14px] text-ink-soft">
                {joining ? (
                  <>
                    Already a member?{" "}
                    <Link
                      href={variantPath(variant, "/signin")}
                      className="font-medium text-accent"
                    >
                      Sign in instead
                    </Link>
                  </>
                ) : (
                  <>
                    New here?{" "}
                    <Link
                      href={variantPath(variant, "/join")}
                      className="font-medium text-accent"
                    >
                      Join the circle
                    </Link>
                  </>
                )}
              </p>
            </form>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="text-accent">
                <RingMark size={40} rings={4} />
              </div>
              <div>
                <h1 className="font-display text-[28px] font-semibold leading-tight text-ink option-b:font-light option-d:font-extrabold">
                  Check your email
                </h1>
                <p className="mt-2 font-body text-[15px] leading-relaxed text-ink-soft">
                  We sent a sign-in link to <strong>{email}</strong>. Open it on
                  this device to step into the circle. The link is good for one
                  hour.
                </p>
              </div>

              <div className="rounded-[10px] border border-line bg-bg p-4">
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-accent">
                    <RingMark size={22} rings={3} />
                  </span>
                  <div>
                    <p className="font-body text-[13px] font-semibold text-ink">
                      Peace Circle
                    </p>
                    <p className="font-body text-[13px] text-ink-soft">
                      Your sign-in link
                    </p>
                  </div>
                </div>
                <Button block onClick={openLink}>
                  Open the magic link →
                </Button>
                <p className="mt-3 font-body text-[12.5px] leading-relaxed text-faint">
                  (In the real site this button lives in your inbox. Here it
                  takes you straight in.)
                </p>
              </div>

              <p className="text-center font-body text-[14px] text-ink-soft">
                Didn&rsquo;t get it?{" "}
                <button
                  type="button"
                  onClick={() => setStep("request")}
                  className="font-medium text-accent"
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
