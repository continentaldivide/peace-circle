"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Avatar } from "@/components/avatar";
import { RingMark } from "@/components/ring-mark";
import { signOutAction } from "@/app/actions/auth";
import type { Member } from "@/lib/data";

const NAV_BORDER = "border-b border-line";

const WORDMARK =
  "inline-flex items-center gap-[11px] font-display text-[20px] font-semibold text-ink";

const NAV_LINKS =
  "text-[15px] font-medium text-ink-soft transition-colors hover:text-ink";

/** Accent underline marking the current page (mirrors the public nav's links). */
const NAV_ACTIVE =
  "text-ink font-semibold relative after:absolute after:inset-x-0 after:-bottom-1.5 after:h-0.5 after:bg-accent";

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: string;
}) {
  return (
    <Link
      href={href}
      className={active ? `${NAV_LINKS} ${NAV_ACTIVE}` : NAV_LINKS}
    >
      {children}
    </Link>
  );
}

/** Member-area header: brand + nav links + profile menu. Mirrors SiteNav. */
export function MemberNav({ user }: { user: Member }) {
  const pathname = usePathname();

  return (
    <header
      className={`flex flex-wrap items-center justify-between gap-x-5 gap-y-3 px-6 py-[22px] sm:px-14 ${NAV_BORDER}`}
    >
      <Link href="/" className={WORDMARK}>
        <span className="text-accent">
          <RingMark size={22} rings={3} />
        </span>
        <span>Peace Circle</span>
      </Link>

      <nav className="flex flex-wrap items-center gap-x-[26px] gap-y-2">
        <NavLink href="/home" active={pathname === "/home"}>
          Home
        </NavLink>
        <NavLink href="/library" active={pathname === "/library"}>
          The Library
        </NavLink>
        <Link href="/about" className={NAV_LINKS}>
          About
        </Link>

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
                <p className="font-body text-[12.5px] text-faint">
                  {user.role}
                </p>
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
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="block w-full cursor-pointer rounded-[6px] px-2.5 py-2 text-left font-body text-[14px] text-accent data-focus:bg-accent-soft"
                >
                  Sign out
                </button>
              </form>
            </MenuItem>
          </MenuItems>
        </Menu>
      </nav>
    </header>
  );
}
