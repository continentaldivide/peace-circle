/**
 * Scaffold-only placeholder. Each design variant's page exports point here in
 * Phase 0 so the full route tree is navigable before any real UI exists.
 * Phase 1 replaces these exports with the actual round-2 design components.
 */
export function PagePlaceholder({
  design,
  page,
  detail,
}: {
  design: string;
  page: string;
  detail?: string;
}) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
        {design} · placeholder
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">{page}</h1>
      {detail ? <p className="text-zinc-500">{detail}</p> : null}
      <p className="max-w-md text-sm text-zinc-400">
        Phase 1 replaces this with the real design. The route, navigation, and
        the design switcher above already work.
      </p>
    </main>
  );
}
