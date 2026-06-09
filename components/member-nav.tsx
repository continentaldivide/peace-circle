"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Avatar } from "@/components/avatar";
import { RingMark } from "@/components/ring-mark";
import { useSession, type SessionUser } from "@/components/session";
import { Button } from "@/components/ui/button";
import { useVariant } from "@/components/variant-context";
import { variantPath } from "@/lib/variants";

const NAV_BORDER =
  "option-a:border-b option-a:border-line option-c:border-b-[3px] option-c:border-double option-c:border-accent option-d:border-b-2 option-d:border-ink";

const WORDMARK =
  "inline-flex items-center gap-[11px] font-display text-[20px] font-semibold text-ink option-b:text-[15px] option-b:font-medium option-b:uppercase option-b:tracking-[0.3em] option-d:font-extrabold option-d:tracking-[-0.02em]";

/** Member-area header: brand + compose + profile menu. */
export function MemberNav({
  user,
  onCompose,
}: {
  user: SessionUser;
  onCompose: () => void;
}) {
  const variant = useVariant();
  const router = useRouter();
  const { signOut } = useSession();

  function signOutAndLeave() {
    signOut();
    router.push(variantPath(variant));
  }

  return (
    <header
      className={`flex items-center justify-between gap-4 px-6 py-[18px] sm:px-14 ${NAV_BORDER}`}
    >
      <Link href={variantPath(variant)} className={WORDMARK}>
        <span className="text-accent">
          <RingMark size={26} rings={3} />
        </span>
        <span>Peace Circle</span>
      </Link>

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={onCompose}>
          <span aria-hidden="true">+</span>
          <span className="hidden sm:inline">Share something</span>
          <span className="sm:hidden">Share</span>
        </Button>

        <Menu as="div" className="relative">
          <MenuButton
            aria-label="Your account"
            className="cursor-pointer rounded-full outline-none ring-accent ring-offset-2 ring-offset-bg transition hover:ring-2 hover:ring-line-strong focus-visible:ring-2 data-open:ring-2"
          >
            <Avatar person={user} size={34} />
          </MenuButton>
          <MenuItems
            anchor="bottom end"
            transition
            className="z-50 mt-2 w-60 origin-top-right rounded-card border border-line bg-surface p-1.5 shadow-lg transition duration-150 ease-out [--anchor-gap:8px] data-closed:scale-95 data-closed:opacity-0 motion-reduce:transition-none"
          >
            <div className="flex items-center gap-3 border-b border-line px-2.5 pb-3 pt-2">
              <Avatar person={user} size={38} />
              <div className="min-w-0">
                <p className="truncate font-body text-[14px] font-semibold text-ink">
                  {user.name}
                </p>
                <p className="font-body text-[12.5px] text-faint">Member</p>
              </div>
            </div>
            <MenuItem>
              <button className="block w-full rounded-[6px] px-2.5 py-2 text-left font-body text-[14px] text-ink-soft data-focus:bg-accent-soft">
                Your shares
              </button>
            </MenuItem>
            <MenuItem>
              <button className="block w-full rounded-[6px] px-2.5 py-2 text-left font-body text-[14px] text-ink-soft data-focus:bg-accent-soft">
                Notification settings
              </button>
            </MenuItem>
            <MenuItem>
              <button
                onClick={signOutAndLeave}
                className="block w-full rounded-[6px] px-2.5 py-2 text-left font-body text-[14px] text-accent data-focus:bg-accent-soft"
              >
                Sign out
              </button>
            </MenuItem>
          </MenuItems>
        </Menu>
      </div>
    </header>
  );
}
