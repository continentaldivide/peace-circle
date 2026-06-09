export const inputClass =
  "w-full rounded-[8px] border border-line bg-bg px-3.5 py-2.5 font-body text-[15px] text-ink outline-none transition-colors placeholder:text-faint focus:border-accent";

/** Labelled form field with optional inline hint and error. */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-body text-[13px] font-medium text-ink-soft">
        {label}
        {hint ? <em className="ml-1 not-italic text-faint">{hint}</em> : null}
      </span>
      {children}
      {error ? (
        <em className="mt-1 block font-body text-[12.5px] not-italic text-accent">
          {error}
        </em>
      ) : null}
    </label>
  );
}
