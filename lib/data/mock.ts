import type { CircleEvent } from "@/lib/data/types";

// Throwaway seed for the prototype, using the handoff's walking-free content
// model. Phase 2 deletes this file once the accessors in `index.ts` read from
// Supabase. (Copy rule: the group gathers / sits in stillness — it never walks.)

export const MOCK_CIRCLE_EVENTS: CircleEvent[] = [
  {
    id: "ev-jun",
    title: "June Circle — an hour of stillness",
    note: "Grace United Church",
    date: "2026-06-21",
    time: "4:00 PM",
  },
  {
    id: "ev-jul",
    title: "July Circle",
    note: "An ordinary hour of quiet",
    date: "2026-07-19",
    time: "4:00 PM",
  },
  {
    id: "ev-aug",
    title: "August Circle — evening sitting",
    note: "Cooler hour",
    date: "2026-08-16",
    time: "6:30 PM",
  },
  {
    id: "ev-sep",
    title: "September Circle",
    note: "Welcome tea for newcomers",
    date: "2026-09-20",
    time: "4:00 PM",
  },
  {
    id: "ev-oct",
    title: "October Circle",
    note: "Bring a reading to share",
    date: "2026-10-18",
    time: "4:00 PM",
  },
];
