/**
 * The row mappers, against rows shaped like `supabase/seed.sql`'s. The kinds
 * share columns, so these pin down which column each field comes from.
 */

import { describe, expect, test } from "vitest";

import {
  toCircleEvent,
  toMember,
  toResource,
  toResourceInsert,
  type ResourceRow,
} from "@/lib/data/rows";
import { emptyResourceDraft, type ResourceDraft } from "@/lib/resources";

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
    image_path: null,
    image_width: null,
    image_height: null,
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

  test("a picture's caption is its body, and it may have no image at all", () => {
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
    });
    // Every picture shared before uploads existed is in this state. It is an
    // ordinary share, not a broken one.
    expect(r.kind === "picture" && r.image).toBeUndefined();
  });

  test("a picture's image is an app route and the row's own dimensions", () => {
    const r = toResource(
      row({
        kind: "picture",
        title: "Candles after the April circle",
        image_path: `${LISA}/f1a2b3c4-0000-4000-8000-0000000000ab.jpg`,
        image_width: 1200,
        image_height: 900,
      }),
    );
    expect(r.kind === "picture" && r.image).toEqual({
      // Never a storage URL: the bucket is private and the bytes come through
      // this app, which is the only place the gate can be checked.
      src: `/api/images/${LISA}/f1a2b3c4-0000-4000-8000-0000000000ab.jpg`,
      width: 1200,
      height: 900,
    });
  });

  test("a path with no dimensions draws as a share without a photo", () => {
    // The resources_image_shape constraint makes this row impossible. If one
    // ever exists anyway, one picture missing beats the whole Library failing
    // to render, so this is the one place a column is not `required()`.
    const r = toResource(
      row({
        kind: "picture",
        title: "Half a picture",
        image_path: `${LISA}/f1a2b3c4-0000-4000-8000-0000000000ab.jpg`,
      }),
    );
    expect(r.kind === "picture" && r.image).toBeUndefined();
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

describe("toResourceInsert", () => {
  const author = { id: LISA, name: "Lisa Morrow" };

  function draft(fields: Partial<ResourceDraft>): ResourceDraft {
    return { ...emptyResourceDraft, ...fields };
  }

  test("every kind's free text goes to body, and an empty box to null", () => {
    expect(
      toResourceInsert(
        draft({ kind: "picture", title: "Candles", note: "After the circle" }),
        author,
      ).body,
    ).toBe("After the circle");
    expect(
      toResourceInsert(
        draft({ kind: "picture", title: "Candles", note: "  " }),
        author,
      ).body,
    ).toBeNull();
  });

  test("an unattributed quote is credited to the member passing it along", () => {
    expect(
      toResourceInsert(draft({ kind: "quote", quote: "Begin again." }), author)
        .attribution,
    ).toBe("— shared by Lisa Morrow");
    expect(
      toResourceInsert(
        draft({ kind: "quote", quote: "Begin again.", attribution: "— Rumi" }),
        author,
      ).attribution,
    ).toBe("— Rumi");
  });

  test("a link is stored with the scheme the composer filled in", () => {
    expect(
      toResourceInsert(
        draft({ kind: "link", title: "A reading", url: "example.com/a" }),
        author,
      ).url,
    ).toBe("https://example.com/a");
  });

  test("a book with no author named still satisfies the not-null column", () => {
    expect(
      toResourceInsert(
        draft({ kind: "book", title: "Peace Is Every Step" }),
        author,
      ).book_author,
    ).toBe("Unknown");
  });

  test("a kind carries only its own columns, not what an abandoned chip left behind", () => {
    const abandoned = draft({
      kind: "quote",
      quote: "Begin again.",
      title: "A reading",
      url: "example.com",
      bookAuthor: "Someone",
    });
    expect(toResourceInsert(abandoned, author)).toEqual({
      author_id: LISA,
      kind: "quote",
      quote: "Begin again.",
      attribution: "— shared by Lisa Morrow",
      body: null,
    });
  });

  test("the author is the caller's, never the draft's", () => {
    expect(
      toResourceInsert(draft({ kind: "picture", title: "Candles" }), author)
        .author_id,
    ).toBe(LISA);
  });
});
