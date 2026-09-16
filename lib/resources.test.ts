/**
 * The composer's rules, which the sheet and the server action both run.
 */

import { describe, expect, test } from "vitest";

import {
  emptyResourceDraft,
  isComplete,
  isResourceDraft,
  normalizeUrl,
  validateResource,
  type ResourceDraft,
} from "@/lib/resources";

function draft(fields: Partial<ResourceDraft>): ResourceDraft {
  return { ...emptyResourceDraft, ...fields };
}

describe("normalizeUrl", () => {
  test("fills in the scheme the field's placeholder leaves out", () => {
    expect(normalizeUrl("example.com/article")).toBe(
      "https://example.com/article",
    );
  });

  test("keeps an address that already has one", () => {
    expect(normalizeUrl("http://example.com/a")).toBe("http://example.com/a");
  });

  test("keeps a port, which is not a scheme", () => {
    expect(normalizeUrl("example.com:8080/article")).toBe(
      "https://example.com:8080/article",
    );
    expect(normalizeUrl("http://example.com:8080/a")).toBe(
      "http://example.com:8080/a",
    );
  });

  test("refuses a scheme that is a script rather than an address", () => {
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("javascript://example.com/%0aalert(1)")).toBeNull();
    expect(normalizeUrl("data:text/html,<script>")).toBeNull();
    expect(normalizeUrl("mailto:someone@example.org")).toBeNull();
  });

  test("refuses an address wearing another one's name", () => {
    // The host is somewhere-else.example; the part before the @ is a username.
    expect(
      normalizeUrl("https://peacecircle.org@somewhere-else.example/x"),
    ).toBeNull();
    expect(normalizeUrl("someone@example.org")).toBeNull();
  });

  test("refuses a host nobody else could reach", () => {
    expect(normalizeUrl("notes")).toBeNull();
    expect(normalizeUrl("   ")).toBeNull();
  });
});

describe("validateResource", () => {
  test("a quote needs more than a keystroke", () => {
    expect(
      validateResource(draft({ kind: "quote", quote: "a" })).quote,
    ).toBeDefined();
    expect(
      validateResource(draft({ kind: "quote", quote: "Begin again." })),
    ).toEqual({});
  });

  test("a link needs a title and an address that is one", () => {
    expect(
      validateResource(draft({ kind: "link", title: "", url: "" })),
    ).toEqual({
      title: expect.any(String),
      url: expect.any(String),
    });
    expect(
      validateResource(
        draft({ kind: "link", title: "A reading", url: "javascript:x" }),
      ),
    ).toEqual({ url: expect.any(String) });
    expect(
      validateResource(
        draft({ kind: "link", title: "A reading", url: "example.com" }),
      ),
    ).toEqual({});
  });

  test("a picture and a book need only a title, whatever else is typed", () => {
    expect(
      validateResource(draft({ kind: "picture", title: "Candles" })),
    ).toEqual({});
    expect(
      validateResource(draft({ kind: "book", title: "Peace Is Every Step" })),
    ).toEqual({});
    expect(
      validateResource(draft({ kind: "book", title: " " })).title,
    ).toBeDefined();
  });

  test("only the current kind's fields are judged", () => {
    // A url left behind under the Link chip does not hold a quote back.
    const switched = draft({
      kind: "quote",
      quote: "Begin again.",
      url: "not a url",
    });
    expect(validateResource(switched)).toEqual({});
  });
});

describe("isComplete", () => {
  test("asks only whether the required fields are filled in", () => {
    const filledButWrong = draft({
      kind: "link",
      title: "A reading",
      url: "javascript:x",
    });
    expect(isComplete(filledButWrong)).toBe(true);
    expect(validateResource(filledButWrong).url).toBeDefined();
    expect(isComplete(draft({ kind: "link", title: "A reading" }))).toBe(false);
  });
});

describe("isResourceDraft", () => {
  test("accepts what the composer sends", () => {
    expect(isResourceDraft(emptyResourceDraft)).toBe(true);
  });

  test("rejects what a hand-written POST might", () => {
    expect(isResourceDraft(null)).toBe(false);
    expect(isResourceDraft("quote")).toBe(false);
    expect(isResourceDraft({ ...emptyResourceDraft, kind: "gathering" })).toBe(
      false,
    );
    expect(isResourceDraft({ ...emptyResourceDraft, title: 12 })).toBe(false);
    const missingField = { ...emptyResourceDraft, note: undefined };
    expect(isResourceDraft(missingField)).toBe(false);
  });
});
