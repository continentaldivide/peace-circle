"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  MONTHS,
  MONTHS_SHORT,
  parseDate,
  startOfToday,
} from "@/components/home/dates";
import { useVariant } from "@/components/variant-context";
import { variantPath } from "@/lib/variants";
import type { CircleEvent } from "@/lib/data";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

type Cell = { date: Date; day: number; muted: boolean };

function buildCells(year: number, month: number): Cell[] {
  const first = new Date(year, month, 1);
  const start = first.getDay(); // 0 = Sunday
  const cells: Cell[] = [];
  // Leading days from the previous month.
  for (let i = start - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    cells.push({ date, day: date.getDate(), muted: true });
  }
  // This month.
  const total = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= total; day++) {
    cells.push({ date: new Date(year, month, day), day, muted: false });
  }
  // Trailing days from the next month to complete the final week.
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({
      date: new Date(year, month + 1, nextDay),
      day: nextDay,
      muted: true,
    });
    nextDay++;
  }
  return cells;
}

const MO =
  "font-display text-[17px] font-semibold text-ink option-b:font-normal";

export function MonthCalendar({ events }: { events: CircleEvent[] }) {
  const variant = useVariant();
  const router = useRouter();

  const today = startOfToday();
  const dated = events.map((e) => ({ event: e, date: parseDate(e.date) }));
  const next = dated.find((e) => e.date >= today) ?? dated[0];

  const [view, setView] = useState(() =>
    next
      ? { year: next.date.getFullYear(), month: next.date.getMonth() }
      : { year: today.getFullYear(), month: today.getMonth() },
  );

  const eventKeys = new Map(dated.map((e) => [dayKey(e.date), e.event]));
  const cells = buildCells(view.year, view.month);

  function step(delta: number) {
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
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
          const event = !c.muted ? eventKeys.get(dayKey(c.date)) : undefined;
          const base =
            "grid aspect-square place-items-center rounded-btn font-body text-[13px]";
          if (event) {
            return (
              <button
                key={i}
                type="button"
                aria-label={`${event.title} on ${MONTHS_SHORT[c.date.getMonth()]} ${c.day}`}
                onClick={() => router.push(variantPath(variant, "/meetings"))}
                className={`${base} bg-accent font-bold text-accent-ink`}
              >
                {c.day}
              </button>
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
          {MONTHS_SHORT[next.date.getMonth()]} {next.date.getDate()} ·{" "}
          {next.event.title.split(" — ")[0]}, {next.event.time}
        </div>
      ) : null}
    </div>
  );
}
