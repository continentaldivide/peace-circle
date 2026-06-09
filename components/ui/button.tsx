import Link from "next/link";

import { cn } from "@/lib/utils";

// Per-variant button treatments: Option B = uppercase letter-spaced pills
// (weight 400); Option C = italic; Option D = heavier. Option A is the base.
const TREATMENTS =
  "option-b:font-normal option-b:uppercase option-b:tracking-[0.18em] option-c:italic option-c:font-medium option-d:font-bold";

const SIZES = {
  md: "px-5 py-[11px] text-[15px] option-b:px-[30px] option-b:py-[15px] option-b:text-[13px]",
  sm: "px-4 py-[9px] text-[14px] option-b:px-6 option-b:py-3 option-b:text-[12px]",
} as const;

function classes({
  variant = "primary",
  size = "md",
  block = false,
  className,
}: ButtonStyleProps) {
  return cn(
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-btn border font-body font-semibold leading-none transition disabled:cursor-not-allowed disabled:opacity-45",
    variant === "primary"
      ? "border-accent bg-accent text-accent-ink hover:opacity-90"
      : "border-line-strong bg-transparent text-ink hover:bg-accent-soft",
    SIZES[size],
    TREATMENTS,
    block && "w-full",
    className,
  );
}

type ButtonStyleProps = {
  variant?: "primary" | "ghost";
  size?: "md" | "sm";
  block?: boolean;
  className?: string;
};

type ButtonProps = ButtonStyleProps &
  React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant,
  size,
  block,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={classes({ variant, size, block, className })}
      {...props}
    />
  );
}

type ButtonLinkProps = ButtonStyleProps & React.ComponentProps<typeof Link>;

export function ButtonLink({
  variant,
  size,
  block,
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={classes({ variant, size, block, className })} {...props} />
  );
}
