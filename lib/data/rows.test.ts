/**
 * The row mappers, against rows shaped like `supabase/seed.sql`'s. The kinds
 * share columns, so these pin down which column each field comes from.
 */

import { describe, expect, test } from "vitest";

import {
  toCircleEvent,
  toMember,
  toResource,
  type ResourceRow,
} from "@/lib/data/rows";

const LISA = "11111111-1111-1111-1111-111111111111";

function row(fields: Partial<ResourceRow>): ResourceRow {
  return {
    id: "a0000000-0000-0000-0000-000000000001",
    author_id: LISA,
    kind: "quote",
    title: null,
    body: null,
    quote: null,
    attribution: null,
    url: null,
    book_author: null,
    created_at: "2026-09-13T16:00:00+00:00",
    comments: [],
    ...fields,
  };
}

describe("toMember", () => {
  test("derives initials and maps the tint", () => {
    expect(
      toMember({
        id: LISA,
        name: "Lisa Morrow",
        role: "Circle keeper",
        avatar_tint: "#6b7355",
      }),
    ).toEqual({
      id: LISA,
      name: "Lisa Morrow",
      role: "Circle keeper",
      initials: "LM",
      tint: "#6b7355",
    });
  });

  test("falls back to a neutral tint when none is chosen", () => {
    const m = toMember({
      id: LISA,
      name: "Sam",
      role: "Member",
      avatar_tint: null,
    });
    expect(m.tint).toBe("var(--ink-soft)");
  });
});

describe("toResource", () => {
  test("a quote's note is its body, and the attribution keeps its dash", () => {
    const r = toResource(
      row({
        kind: "quote",
        quote: "Nothing can bring you peace but yourself.",
        attribution: "— Ralph Waldo Emerson",
        body: "Read at last month's circle.",
      }),
    );
    expect(r).toMatchObject({
      kind: "quote",
      authorId: LISA,
      createdAt: "2026-09-13T16:00:00+00:00",
      attribution: "— Ralph Waldo Emerson",
      note: "Read at last month's circle.",
    });
  });

  test("an empty body is absent, not an empty string", () => {
    const r = toResource(row({ kind: "quote", quote: "Stillness." }));
    expect(r.kind === "quote" && r.note).toBeUndefined();
  });

  test("a picture's caption is its body; the placeholder comes from the title", () => {
    const r = toResource(
      row({
        kind: "picture",
        title: "Candles after the April circle",
        body: "We sat with these until the last person was ready to leave.",
      }),
    );
    expect(r).toMatchObject({
      kind: "picture",
      caption: "We sat with these until the last person was ready to leave.",
      placeholder: "photo — candles after the april circle",
    });
  });

  test("a book's author is book_author and its description is body", () => {
    const r = toResource(
      row({
        kind: "book",
        title: "Wherever You Go, There You Are",
        book_author: "Jon Kabat-Zinn",
        body: "On simply being present.",
      }),
    );
    expect(r).toMatchObject({
      bookAuthor: "Jon Kabat-Zinn",
      body: "On simply being present.",
    });
  });

  test("a link keeps its url and body", () => {
    const r = toResource(
      row({
        kind: "link",
        title: "A guide",
        url: "plumvillage.org",
        body: "Plain.",
      }),
    );
    expect(r).toMatchObject({ url: "plumvillage.org", body: "Plain." });
  });

  test("comments keep their order and carry timestamps", () => {
    const r = toResource(
      row({
        kind: "quote",
        quote: "Stillness.",
        comments: [
          {
            id: "c1",
            author_id: LISA,
            body: "First",
            created_at: "2026-09-13T19:00:00+00:00",
          },
          {
            id: "c2",
            author_id: LISA,
            body: "Second",
            created_at: "2026-09-14T16:00:00+00:00",
          },
        ],
      }),
    );
    expect(r.comments.map((c) => [c.body, c.createdAt])).toEqual([
      ["First", "2026-09-13T19:00:00+00:00"],
      ["Second", "2026-09-14T16:00:00+00:00"],
    ]);
  });

  test("a row missing a column its kind requires fails loudly", () => {
    expect(() => toResource(row({ kind: "book", title: "Untitled" }))).toThrow(
      /book .* has no book_author/,
    );
  });
});

describe("toCircleEvent", () => {
  test("an evening gathering keeps its New York date, though UTC has moved on", () => {
    const e = toCircleEvent({
      id: "e1",
      title: "Late sitting",
      note: null,
      starts_at: "2026-08-17T00:30:00+00:00", // Sun Aug 16, 8:30 PM EDT
    });
    expect(e).toEqual({
      id: "e1",
      title: "Late sitting",
      note: undefined,
      date: "2026-08-16",
      startsAt: "2026-08-17T00:30:00+00:00",
    });
  });
});
