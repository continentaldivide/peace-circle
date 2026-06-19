export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));

/** Parse an ISO `YYYY-MM-DD` into a local date (no timezone surprises). */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Midnight today, for date-only comparisons. */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
