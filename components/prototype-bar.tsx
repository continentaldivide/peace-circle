"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useSession } from "@/components/session";
import { cn } from "@/lib/utils";
import { VARIANTS, variantPath, type VariantKey } from "@/lib/variants";

/**
 * Prototype-only scaffold. Deliberately styled to read as a tool, not a product
 * feature, so reviewers judge the designs — not the switcher. Switching rewrites
 * only the leading variant segment of the URL, preserving the rest of the path
 * (so `/option-c/meetings` → `/option-a/meetings`, not back to the landing page).
 *
 * Also offers a preview bypass of the (stubbed) sign-in so the member-only
 * Library can be viewed without the magic-link dance.
 */
export function PrototypeBar({
  currentVariant,
}: {
  currentVariant: VariantKey;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signIn, signOut } = useSession();
  const currentLabel =
    VARIANTS.find((v) => v.key === currentVariant)?.label ?? currentVariant;

  function hrefForVariant(key: VariantKey) {
    const segments = pathname.split("/");
    // segments = ["", "<variant>", ...rest]; swap the variant segment in place.
    segments[1] = key;
    return segments.join("/") || "/";
  }

  function enterAsMember() {
    signIn({ name: "Preview Member", email: "preview@peacecircle.test" });
    router.push(variantPath(currentVariant, "/home"));
  }

  function leaveMember() {
    signOut();
    router.push(variantPath(currentVariant));
  }

  const previewBtn =
    "rounded-md border border-amber-400/70 px-2 py-0.5 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-200";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-amber-300/60 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      <span className="font-medium">Prototype — viewing {currentLabel}</span>
      <span className="text-amber-700/70">·</span>
      <div className="flex flex-wrap items-center gap-1">
        {VARIANTS.map((v) => {
          const active = v.key === currentVariant;
          return (
            <Link
              key={v.key}
              href={hrefForVariant(v.key)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
                active
                  ? "bg-amber-900 text-amber-50"
                  : "text-amber-800 hover:bg-amber-200",
              )}
            >
              {v.label}
            </Link>
          );
        })}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {user ? (
          <>
            <span className="text-xs text-amber-700/80">Viewing as member</span>
            <button type="button" onClick={leaveMember} className={previewBtn}>
              Leave member view
            </button>
          </>
        ) : (
          <button type="button" onClick={enterAsMember} className={previewBtn}>
            Enter as member ▸
          </button>
        )}
      </div>
    </div>
  );
}
