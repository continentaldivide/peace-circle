/**
 * The circle's clock, checked at the places a timezone bug hides: evenings
 * that are already tomorrow in UTC, the two DST transitions, and midnight.
 *
 * Every instant below is written in UTC on purpose. Writing them with a -04
 * offset would be easier to read and would hide exactly the conversions under
 * test. The comment beside each says what it is in New York.
 *
 * 2026's transitions: clocks spring forward at 2 AM on Sunday, March 8
 * (EST → EDT) and fall back at 2 AM on Sunday, November 1 (EDT → EST).
 */

import { describe, expect, test } from "vitest";

import {
  circleDate,
  circleHour,
  circleToday,
  dayOfWeek,
  daysBetween,
  formatDayLabel,
  formatRelative,
  formatTime,
  isoDate,
  weekdayName,
} from "@/lib/time";

describe("circleDate and formatTime", () => {
  test("a summer afternoon gathering", () => {
    const juneCircle = "2026-06-21T20:00:00Z"; // Sun Jun 21, 4:00 PM EDT
    expect(circleDate(juneCircle)).toBe("2026-06-21");
    expect(formatTime(juneCircle)).toBe("4:00 PM");
  });

  test("an evening event that is already the next day in UTC", () => {
    const evening = "2026-08-17T00:30:00Z"; // Sun Aug 16, 8:30 PM EDT
    expect(circleDate(evening)).toBe("2026-08-16");
    expect(formatTime(evening)).toBe("8:30 PM");
  });

  test("the same wall-clock time either side of fall back", () => {
    const october = "2026-10-18T20:00:00Z"; // 4:00 PM EDT (UTC−4)
    const november = "2026-11-15T21:00:00Z"; // 4:00 PM EST (UTC−5)
    expect(formatTime(october)).toBe("4:00 PM");
    expect(formatTime(november)).toBe("4:00 PM");
  });

  test("the repeated hour on the night clocks fall back", () => {
    expect(formatTime("2026-11-01T05:30:00Z")).toBe("1:30 AM"); // EDT
    expect(formatTime("2026-11-01T06:30:00Z")).toBe("1:30 AM"); // EST
    expect(circleDate("2026-11-01T06:30:00Z")).toBe("2026-11-01");
  });

  test("the skipped hour on the night clocks spring forward", () => {
    expect(formatTime("2026-03-08T06:59:00Z")).toBe("1:59 AM"); // EST
    expect(formatTime("2026-03-08T07:00:00Z")).toBe("3:00 AM"); // EDT
  });

  test("midnight and noon", () => {
    expect(formatTime("2026-09-15T04:00:00Z")).toBe("12:00 AM");
    expect(formatTime("2026-09-15T16:05:00Z")).toBe("12:05 PM");
  });

  test("labels use a plain space, so server and browser agree", () => {
    // Recent ICU puts U+202F before AM/PM, and not every runtime does. A
    // mismatch there fails hydration while looking identical on screen.
    expect(formatTime(new Date())).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
  });

  test("accepts a Date as well as an ISO string", () => {
    expect(formatTime(new Date("2026-06-21T20:00:00Z"))).toBe("4:00 PM");
  });

  test("rejects something that is not a timestamp", () => {
    expect(() => formatTime("not a date")).toThrow(/Not a timestamp/);
  });
});

describe("today and the hour", () => {
  test("late evening in New York is still today, though UTC has moved on", () => {
    const now = "2026-09-15T03:30:00Z"; // Mon Sep 14, 11:30 PM EDT
    expect(circleToday(now)).toBe("2026-09-14");
    expect(circleHour(now)).toBe(23);
  });
});

describe("calendar dates", () => {
  test("a day across either DST transition is still one day", () => {
    expect(daysBetween("2026-03-07", "2026-03-08")).toBe(1);
    expect(daysBetween("2026-10-31", "2026-11-01")).toBe(1);
    expect(daysBetween("2026-11-01", "2026-11-02")).toBe(1);
    expect(daysBetween("2026-06-21", "2026-06-14")).toBe(-7);
  });

  test("isoDate rolls overflow into the neighbouring month", () => {
    expect(isoDate(2026, 5, 21)).toBe("2026-06-21");
    expect(isoDate(2026, 6, 0)).toBe("2026-06-30");
    expect(isoDate(2026, 11, 32)).toBe("2027-01-01");
  });

  test("weekdays", () => {
    expect(weekdayName("2026-06-21")).toBe("Sunday");
    expect(dayOfWeek("2026-11-01")).toBe(0);
  });
});

describe("formatDayLabel", () => {
  const now = "2026-09-15T03:30:00Z"; // Mon Sep 14, 11:30 PM EDT

  test("today and yesterday are New York days, not UTC ones", () => {
    // Sun Sep 13, 11:00 PM EDT — already Sep 14 in UTC.
    expect(formatDayLabel("2026-09-14T03:00:00Z", now)).toBe("Yesterday");
    // Mon Sep 14, 9:00 PM EDT — already Sep 15 in UTC.
    expect(formatDayLabel("2026-09-15T01:00:00Z", now)).toBe("Today");
  });

  test("a weekday within the week, then a date", () => {
    expect(formatDayLabel("2026-09-10T16:00:00Z", now)).toBe("Thursday");
    expect(formatDayLabel("2026-09-07T16:00:00Z", now)).toBe("Mon, Sep 7");
    expect(formatDayLabel("2025-12-31T16:00:00Z", now)).toBe(
      "Wed, Dec 31, 2025",
    );
  });
});

describe("formatRelative", () => {
  const now = "2026-09-15T16:00:00Z"; // Tue Sep 15, 12:00 PM EDT

  test.each([
    ["2026-09-15T15:59:30Z", "just now"],
    ["2026-09-15T15:59:00Z", "1 minute ago"],
    ["2026-09-15T15:15:00Z", "45 minutes ago"],
    ["2026-09-15T15:00:00Z", "1 hour ago"],
    ["2026-09-15T04:30:00Z", "11 hours ago"], // 12:30 AM today
    ["2026-09-15T03:30:00Z", "1 day ago"], // 11:30 PM yesterday
    ["2026-09-13T16:00:00Z", "2 days ago"],
    ["2026-09-08T16:00:00Z", "1 week ago"],
    ["2026-08-19T16:00:00Z", "3 weeks ago"],
    ["2026-08-01T16:00:00Z", "Aug 1"],
    ["2025-08-01T16:00:00Z", "Aug 1, 2025"],
  ])("%s → %s", (instant, label) => {
    expect(formatRelative(instant, now)).toBe(label);
  });

  test("a clock slightly ahead of the server is still just now", () => {
    expect(formatRelative("2026-09-15T16:00:05Z", now)).toBe("just now");
  });

  test("a share made in the browser after the page's now is just now", () => {
    // Pages pass one server-side `now` down; a comment posted ten minutes
    // later is stamped by the browser, after it.
    expect(formatRelative("2026-09-15T16:10:00Z", now)).toBe("just now");
  });
});
