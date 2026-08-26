import Link from "next/link";

import { cn } from "@/lib/utils";

const SIZES = {
  md: "px-5 py-[11px] text-[15px]",
  sm: "px-4 py-[9px] text-[14px]",
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
