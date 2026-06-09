/** A member's initials in a tinted circle. Tints are fixed across variants. */
export function Avatar({
  person,
  size = 34,
}: {
  person: { initials: string; tint: string };
  size?: number;
}) {
  return (
    <span
      className="inline-grid flex-none place-items-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: person.tint,
        fontSize: size * 0.38,
      }}
      aria-hidden="true"
    >
      {person.initials}
    </span>
  );
}
