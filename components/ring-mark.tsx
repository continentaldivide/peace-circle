/**
 * The concentric "Peace Circle" mark: stroked rings + a center dot, recolored
 * via `currentColor` (pair with `text-accent`). Ported from the handoff's
 * `ring()` helper (build-notes.md).
 */
export function RingMark({
  size = 22,
  rings = 3,
  className,
}: {
  size?: number;
  rings?: number;
  className?: string;
}) {
  const c = size / 2;
  const circles = Array.from({ length: rings }, (_, i) => {
    const r = (c - 1) * ((i + 1) / rings);
    const opacity = (0.4 + 0.6 * (i / (rings - 1 || 1))).toFixed(2);
    return (
      <circle
        key={i}
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.1}
        opacity={opacity}
      />
    );
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-hidden="true"
    >
      {circles}
      <circle cx={c} cy={c} r={1.4} fill="currentColor" />
    </svg>
  );
}
