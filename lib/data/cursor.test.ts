import { describe, expect, test } from "vitest";

import { decodeCursor, encodeCursor, olderThanFilter } from "@/lib/data/cursor";

const ID = "7f3c2a10-5b4e-4d7a-9c1e-2b8f6a0d4e13";

describe("message cursor", () => {
  test("round-trips a Postgres timestamp without losing microseconds", () => {
    const cursor = { createdAt: "2026-08-31T22:33:29.480999+00:00", id: ID };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  test("builds the tie-breaking filter", () => {
    expect(
      olderThanFilter({
        createdAt: "2026-08-31T22:33:29.480999+00:00",
        id: ID,
      }),
    ).toBe(
      `created_at.lt."2026-08-31T22:33:29.480999+00:00",and(created_at.eq."2026-08-31T22:33:29.480999+00:00",id.lt.${ID})`,
    );
  });

  test.each([
    ["an old mock id", "msg16"],
    ["no id", "2026-08-31T22:33:29+00:00"],
    ["an extra part", `2026-08-31T22:33:29+00:00|${ID}|x`],
    [
      "a filter smuggled into the timestamp",
      `2026-08-31T22:33:29+00:00,id.gt.0|${ID}`,
    ],
    [
      "a filter smuggled into the id",
      "2026-08-31T22:33:29+00:00|x),or(id.gt.0",
    ],
    ["a quote", `2026-08-31T22:33:29"+00:00|${ID}`],
    ["an empty string", ""],
  ])("rejects %s", (_, value) => {
    expect(decodeCursor(value)).toBeNull();
  });
});
