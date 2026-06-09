import type { Meeting, Member, NextMeeting, Resource } from "@/lib/data/types";

// Throwaway seed for the prototype, using the handoff's walking-free content
// model. Phase 2 deletes this file once the accessors in `index.ts` read from
// Supabase. (Copy rule: the group gathers / sits in stillness — it never walks.)

export const MOCK_MEMBERS: Member[] = [
  {
    id: "gail",
    name: "Gail Morrow",
    role: "Circle keeper",
    initials: "GM",
    tint: "#6b7355",
  },
  {
    id: "ruth",
    name: "Ruth Adeyemi",
    role: "Member",
    initials: "RA",
    tint: "#8c8a6e",
  },
  {
    id: "david",
    name: "David Tran",
    role: "Member",
    initials: "DT",
    tint: "#9a8f7a",
  },
  {
    id: "marta",
    name: "Marta Ibáñez",
    role: "Member",
    initials: "MI",
    tint: "#7e8466",
  },
  {
    id: "sam",
    name: "Sam Okafor",
    role: "Member",
    initials: "SO",
    tint: "#8f8b73",
  },
];

export const MOCK_RESOURCES: Resource[] = [
  {
    id: "r1",
    kind: "quote",
    authorId: "gail",
    when: "2 days ago",
    quote: "Nothing can bring you peace but yourself.",
    attribution: "— Ralph Waldo Emerson",
    note: "Read at last month's circle. It stayed with me all week.",
    comments: [
      {
        id: "c1",
        authorId: "ruth",
        when: "2 days ago",
        body: "I keep coming back to this one. Thank you for sharing, Gail.",
      },
      {
        id: "c2",
        authorId: "david",
        when: "1 day ago",
        body: "Going to write it on a card for my desk.",
      },
    ],
  },
  {
    id: "r2",
    kind: "event",
    authorId: "gail",
    when: "4 days ago",
    title: "June Circle — an hour of stillness",
    eventDate: "Sunday, June 21 · 4:00–5:30 PM",
    location: "Fellowship Hall, Grace United Church. Newcomers welcome.",
    body: "Doors open at 3:45. Come in, find a seat, and settle. We'll begin with twenty minutes of shared silence.",
    comments: [
      {
        id: "c3",
        authorId: "marta",
        when: "3 days ago",
        body: "I can bring tea and cups for afterward.",
      },
    ],
  },
  {
    id: "r3",
    kind: "book",
    authorId: "david",
    when: "1 week ago",
    title: "Wherever You Go, There You Are",
    bookAuthor: "Jon Kabat-Zinn",
    body: "On simply being present. A gentle place to begin.",
    comments: [],
  },
  {
    id: "r4",
    kind: "quote",
    authorId: "ruth",
    when: "1 week ago",
    quote:
      "Within you there is a stillness and a sanctuary to which you can retreat at any time.",
    attribution: "— Hermann Hesse",
    comments: [],
  },
  {
    id: "r5",
    kind: "link",
    authorId: "sam",
    when: "1 week ago",
    title: "A short guide to sitting in silence",
    url: "plumvillage.org",
    body: "Plain, practical, non-religious. Good to hand to someone new.",
    comments: [],
  },
  {
    id: "r6",
    kind: "picture",
    authorId: "marta",
    when: "2 weeks ago",
    title: "Candles after the April circle",
    caption: "We sat with these until the last person was ready to leave.",
    placeholder: "photo — candles on the windowsill",
    comments: [],
  },
];

export const MOCK_NEXT_MEETING: NextMeeting = {
  tag: "Next gathering",
  date: "Sunday, June 21",
  location: "Fellowship Hall, Grace United Church · 4:00–5:30 PM",
  expect: [
    "Doors open at 3:45. Come in, find a seat, and settle.",
    "We begin with twenty minutes of shared silence — no experience needed.",
    "Someone offers a short reading or reflection to sit with.",
    "We close with tea and conversation. Leave whenever you need to.",
  ],
  goodToKnow: {
    address: "142 Linden Ave",
    parking:
      "Street parking on Linden and Cedar. Enter through the garden door at the side of the hall.",
    welcome: "Newcomers always welcome — just come as you are.",
  },
};

export const MOCK_UPCOMING_MEETINGS: Meeting[] = [
  {
    id: "m-jul",
    month: "Jul",
    day: "19",
    title: "July Circle",
    note: "An ordinary hour of quiet",
    time: "4:00–5:30 PM",
  },
  {
    id: "m-aug",
    month: "Aug",
    day: "16",
    title: "August Circle — evening sitting",
    note: "Meeting later for the cooler hour",
    time: "6:30–8:00 PM",
  },
  {
    id: "m-sep",
    month: "Sep",
    day: "20",
    title: "September Circle",
    note: "Welcome tea for newcomers",
    time: "4:00–5:30 PM",
  },
  {
    id: "m-oct",
    month: "Oct",
    day: "18",
    title: "October Circle",
    note: "Bring a reading to share",
    time: "4:00–5:30 PM",
  },
];
