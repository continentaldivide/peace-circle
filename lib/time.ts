/**
 * Every date and time the app shows, in the circle's own timezone.
 *
 * The circle meets in person, in US Eastern, so that is the only clock that
 * means anything here: a gathering at 4 PM is at 4 PM, wherever the member
 * reading about it happens to be. Naming the zone explicitly also matters for
 * a second reason. Client components render on the server too, and a server in
 * UTC formatting with its own zone while a browser formats with another would
 * show different times and fail hydration.
 *
 * Timestamps cross the data seam as ISO strings and are formatted only here.
 * Calendar dates (`YYYY-MM-DD`) are the one exception: they are already a day
 * in this zone, so the helpers for them do plain date arithmetic in UTC, where
 * no day is 23 or 25 hours long.
 *
 * Pure, and safe in both server and client components.
 */

export const CIRCLE_TIME_ZONE = "America/New_York";

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

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** A timestamp as it crosses the seam: an ISO string, or already a Date. */
export type Instant = string | Date;

/** A day in the circle's zone, e.g. "2026-06-21". */
export type IsoDate = string;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

// Numeric parts only. Asking Intl for a finished string would hand back
// whatever spacing its ICU version prefers — recent ones put a narrow
// no-break space before "PM", and Node and browsers do not always agree —
// which is a hydration mismatch waiting to happen. Labels are assembled below.
const PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: CIRCLE_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

type CircleParts = {
  year: number;
  /** 0-based, like Date. */
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function toDate(instant: Instant): Date {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Not a timestamp: ${String(instant)}`);
  }
  return date;
}

function circleParts(instant: Instant): CircleParts {
  const out: Record<string, number> = {};
  for (const part of PARTS.formatToParts(toDate(instant))) {
    if (part.type !== "literal") out[part.type] = Number(part.value);
  }
  return {
    year: out.year,
    month: out.month - 1,
    day: out.day,
    hour: out.hour,
    minute: out.minute,
  };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** The `YYYY-MM-DD` for a year, 0-based month, and day. Overflow rolls over. */
export function isoDate(year: number, month: number, day: number): IsoDate {
  const d = new Date(Date.UTC(year, month, day));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** The day an instant falls on in the circle's zone. */
export function circleDate(instant: Instant): IsoDate {
  const p = circleParts(instant);
  return isoDate(p.year, p.month, p.day);
}

/** Today, in the circle's zone. */
export function circleToday(now: Instant = new Date()): IsoDate {
  return circleDate(now);
}

/** The hour (0–23) in the circle's zone, for the greeting. */
export function circleHour(now: Instant = new Date()): number {
  return circleParts(now).hour;
}

/** Split a `YYYY-MM-DD` into its year, 0-based month, and day. */
export function parseIsoDate(date: IsoDate): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month: month - 1, day };
}

function utcMidnight(date: IsoDate): number {
  const { year, month, day } = parseIsoDate(date);
  return Date.UTC(year, month, day);
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((utcMidnight(to) - utcMidnight(from)) / (24 * HOUR));
}

/** 0 = Sunday, for laying out a month grid. */
export function dayOfWeek(date: IsoDate): number {
  return new Date(utcMidnight(date)).getUTCDay();
}

/** "Sunday". */
export function weekdayName(date: IsoDate): string {
  return WEEKDAYS[dayOfWeek(date)];
}

/** "Sep 5", with the year only when it is not this year. */
function shortDate(date: IsoDate, today: IsoDate): string {
  const { year, month, day } = parseIsoDate(date);
  const label = `${MONTHS_SHORT[month]} ${day}`;
  return year === parseIsoDate(today).year ? label : `${label}, ${year}`;
}

/** Time of day, e.g. "4:00 PM". */
export function formatTime(instant: Instant): string {
  const { hour, minute } = circleParts(instant);
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${pad(minute)} ${hour < 12 ? "AM" : "PM"}`;
}

/**
 * The chat's day divider: "Today", "Yesterday", a weekday within the last
 * week, and a date beyond that. Messages sharing a label share a divider, so
 * older history gets real dates rather than collapsing under one "Last week".
 */
export function formatDayLabel(
  instant: Instant,
  now: Instant = new Date(),
): string {
  const today = circleToday(now);
  const date = circleDate(instant);
  const ago = daysBetween(date, today);
  if (ago <= 0) return "Today";
  if (ago === 1) return "Yesterday";
  if (ago < 7) return weekdayName(date);
  return `${weekdayName(date).slice(0, 3)}, ${shortDate(date, today)}`;
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
}

/**
 * How long ago something was shared: "just now", "5 minutes ago",
 * "3 hours ago", "2 days ago", "1 week ago", then a date.
 *
 * Minutes and hours are elapsed time; days are calendar days in the circle's
 * zone, so something from last night reads "1 day ago" the next morning even
 * if fewer than 24 hours have passed — and a 25-hour DST day is still one day.
 */
export function formatRelative(
  instant: Instant,
  now: Instant = new Date(),
): string {
  const elapsed = toDate(now).getTime() - toDate(instant).getTime();
  if (elapsed < MINUTE) return "just now";
  if (elapsed < HOUR) return plural(Math.floor(elapsed / MINUTE), "minute");

  const today = circleToday(now);
  const date = circleDate(instant);
  const days = daysBetween(date, today);
  if (days === 0) return plural(Math.floor(elapsed / HOUR), "hour");
  if (days < 7) return plural(days, "day");
  if (days < 28) return plural(Math.floor(days / 7), "week");
  return shortDate(date, today);
}
