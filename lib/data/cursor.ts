/**
 * The chat history cursor: the oldest message a client already has, as its
 * `(created_at, id)` pair.
 *
 * A timestamp alone is not enough. Two messages can share a `created_at`, and
 * a page boundary that falls between them would skip one with `<` or repeat
 * one with `<=`. Ordering by the pair, which is exactly what the
 * `messages_created_at_id_idx` index covers, makes every position unique.
 *
 * The cursor makes a round trip through the browser and comes back through a
 * Server Action, so decoding treats it as untrusted: it ends up inside a
 * PostgREST filter, and anything that is not precisely a timestamp and a uuid
 * is rejected rather than escaped.
 */

export type MessageCursor = { createdAt: string; id: string };

const SEPARATOR = "|";

// As Postgres writes a timestamptz: microseconds, and an offset. Kept
// verbatim — parsing through Date would truncate to milliseconds and move the
// boundary past any message in the lost microseconds.
const TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}(:\d{2})?)$/;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeCursor(cursor: MessageCursor): string {
  return `${cursor.createdAt}${SEPARATOR}${cursor.id}`;
}

/** The cursor, or null when the string is not one this app could have made. */
export function decodeCursor(value: string): MessageCursor | null {
  const parts = value.split(SEPARATOR);
  if (parts.length !== 2) return null;
  const [createdAt, id] = parts;
  if (!TIMESTAMP.test(createdAt) || !UUID.test(id)) return null;
  return { createdAt, id };
}

/**
 * The PostgREST `or` filter for rows strictly older than the cursor:
 * `created_at < t OR (created_at = t AND id < id)`. Values are quoted because
 * a timestamp's `.` and `:` are reserved inside a logic tree.
 */
export function olderThanFilter(cursor: MessageCursor): string {
  const t = `"${cursor.createdAt}"`;
  return `created_at.lt.${t},and(created_at.eq.${t},id.lt.${cursor.id})`;
}
