"use client";

import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";

/**
 * Overlay sheet built on Headless UI Dialog — gives us focus trapping, scroll
 * lock, Escape-to-close, and scrim click for free. Transitions are quiet
 * (~200ms) and disabled under prefers-reduced-motion.
 */
export function Sheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onClose={onClose} transition className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/40 transition duration-200 ease-out data-closed:opacity-0 motion-reduce:transition-none"
      />
      <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-6">
        <DialogPanel
          aria-label={label}
          transition
          className="flex max-h-[92vh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-card border border-line bg-surface shadow-2xl transition duration-200 ease-out data-closed:translate-y-3 data-closed:opacity-0 sm:rounded-card motion-reduce:transition-none"
        >
          {children}
        </DialogPanel>
      </div>
    </Dialog>
  );
}

/** Close button for the top-right of a Sheet. */
export function SheetClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full text-[20px] leading-none text-ink-soft transition-colors hover:bg-accent-soft hover:text-ink"
    >
      ×
    </button>
  );
}
