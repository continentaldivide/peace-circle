import { describe, expect, test } from "vitest";

import { libraryHref, normalizeSearch } from "@/lib/search";

describe("normalizeSearch", () => {
  test("an absent, empty, or whitespace query means everything", () => {
    // The distinction that matters: "" is not a search for nothing, it is no
    // search. A blank box must leave the Library whole.
    expect(normalizeSearch(undefined)).toBe("");
    expect(normalizeSearch("")).toBe("");
    expect(normalizeSearch("   ")).toBe("");
    expect(normalizeSearch("\n\t ")).toBe("");
  });

  test("keeps the punctuation a person types", () => {
    // None of this is escaped or stripped: the database search reads quotes,
    // "or" and a leading dash, and raises no error on any of it — see
    // supabase/tests/search.test.sql for what it does with them.
    expect(normalizeSearch('"be still"')).toBe('"be still"');
    expect(normalizeSearch("silence or stillness")).toBe(
      "silence or stillness",
    );
    expect(normalizeSearch("grief -book")).toBe("grief -book");
    expect(normalizeSearch("!!! & | ( )")).toBe("!!! & | ( )");
  });

  test("collapses the whitespace around and inside a query", () => {
    expect(normalizeSearch("  hesse  ")).toBe("hesse");
    expect(normalizeSearch("be\n\tstill   now")).toBe("be still now");
  });

  test("takes the first value when the param is repeated", () => {
    expect(normalizeSearch(["hesse", "rilke"])).toBe("hesse");
    expect(normalizeSearch([])).toBe("");
  });

  test("caps the length rather than refusing a long query", () => {
    expect(normalizeSearch("x".repeat(500))).toHaveLength(200);
  });
});

describe("libraryHref", () => {
  test("no query is the plain Library, not an empty parameter", () => {
    expect(libraryHref("")).toBe("/library");
    expect(libraryHref("   ")).toBe("/library");
  });

  test("normalizes and encodes the query it carries", () => {
    expect(libraryHref("  be  still ")).toBe("/library?q=be%20still");
    expect(libraryHref('"be still" or grief')).toBe(
      "/library?q=%22be%20still%22%20or%20grief",
    );
  });
});
