import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Compose Tailwind class names, resolving conflicts (later wins).
 * Used throughout the UI so design variants can layer/override classes safely.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * The initials `Avatar` draws, derived rather than stored.
 *
 * Shared because two places need the same answer: `lib/dal.ts`, building the
 * signed-in member, and the live preview on /welcome's finish-profile step,
 * which has to show what a name will look like before it is saved.
 */
export function initialsFor(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const first = (parts[0] || "Y")[0];
  const second = parts[1] ? parts[1][0] : "";
  return (first + second).toUpperCase();
}
