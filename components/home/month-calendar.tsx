"use client";

import { useState } from "react";

import type { CircleEvent } from "@/lib/data";
import {
  MONTHS,
  MONTHS_SHORT,
  circleToday,
  dayOfWeek,
  formatTime,
  isoDate,
  parseIsoDate,
  type IsoDate,
} from "@/lib/time";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

type Cell = { date: IsoDate; day: number; muted: boolean };

// Plain `YYYY-MM-DD` arithmetic rather than local Dates: event dates are
// already days in the circle's zone, and the browser's own zone has no say.
function buildCells(year: number, month: number): Cell[] {
  const cell = (d: number, muted: boolean): Cell => {
    const date = isoDate(year, month, d);
    return { date, day: parseIsoDate(date).day, muted };
  };
  const cells: Cell[] = [];
  // Leading days from the previous month.
  const start = dayOfWeek(isoDate(year, month, 1)); // 0 = Sunday
  for (let i = start - 1; i >= 0; i--) cells.push(cell(-i, true));
  // This month.
  const total = parseIsoDate(isoDate(year, month + 1, 0)).day;
  for (let day = 1; day <= total; day++) cells.push(cell(day, false));
  // Trailing days from the next month to complete the final week.
  for (let day = total + 1; cells.length % 7 !== 0; day++) {
    cells.push(cell(day, true));
  }
  return cells;
}

const MO = "font-display text-[17px] font-semibold text-ink";

export function MonthCalendar({ events }: { events: CircleEvent[] }) {
  const today = circleToday();
  // Events arrive earliest first. With nothing ahead there is no legend, and
  // the calendar opens on this month rather than on a past gathering.
  const next = events.find((e) => e.date >= today);

  const [view, setView] = useState(() => {
    const { year, month } = parseIsoDate(next ? next.date : today);
    return { year, month };
  });

  const eventKeys = new Map(events.map((e) => [e.date, e]));
  const cells = buildCells(view.year, view.month);

  function step(delta: number) {
    setView((v) => {
      const { year, month } = parseIsoDate(isoDate(v.year, v.month + delta, 1));
      return { year, month };
    });
  }

  return (
    <div className="rounded-card border border-line bg-surface px-5 py-[18px] shadow-[var(--cardshadow)]">
      <div className="mb-3.5 flex items-center justify-between">
        <span className={MO}>
          {MONTHS[view.month]} {view.year}
        </span>
        <div className="flex gap-1.5">
          {[-1, 1].map((delta) => (
            <button
              key={delta}
              type="button"
              aria-label={delta < 0 ? "Previous month" : "Next month"}
              onClick={() => step(delta)}
              className="grid h-[26px] w-[26px] place-items-center rounded-btn border border-line-strong bg-surface text-[13px] leading-none text-ink-soft transition-colors hover:text-ink"
            >
              {delta < 0 ? "‹" : "›"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-[3px]">
        {DOW.map((d, i) => (
          <div
            key={i}
            className="pb-2 text-center font-mono text-[10px] uppercase text-faint"
          >
            {d}
          </div>
        ))}
        {cells.map((c, i) => {
          const event = !c.muted ? eventKeys.get(c.date) : undefined;
          const base =
            "grid aspect-square place-items-center rounded-btn font-body text-[13px]";
          if (event) {
            // Not a button: there is nowhere to go. The label still tells a
            // screen reader which gathering the highlight marks.
            return (
              <div
                key={i}
                role="img"
                aria-label={`${event.title} on ${MONTHS_SHORT[view.month]} ${c.day}`}
                className={`${base} bg-accent font-bold text-accent-ink`}
              >
                {c.day}
              </div>
            );
          }
          return (
            <div
              key={i}
              className={`${base} ${c.muted ? "text-faint opacity-45" : "text-ink"}`}
            >
              {c.day}
            </div>
          );
        })}
      </div>

      {next ? (
        <div className="mt-3.5 flex items-center gap-2.5 font-body text-[12.5px] text-ink-soft">
          <span className="h-2 w-2 rounded-full bg-accent" />
          {MONTHS_SHORT[parseIsoDate(next.date).month]}{" "}
          {parseIsoDate(next.date).day} · {next.title.split(" — ")[0]},{" "}
          {formatTime(next.startsAt)}
        </div>
      ) : null}
    </div>
  );
}
