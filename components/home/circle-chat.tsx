"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";

import { sendMessage } from "@/app/actions/messages";
import { Avatar } from "@/components/avatar";
import type { AuthorInfo } from "@/components/library/kinds";
import {
  chatReducer,
  initialHistory,
  isPending,
  PENDING_ID_PREFIX,
} from "@/lib/chat";
import type { Member, Message, MessagePage } from "@/lib/data";
import { useLiveMessages } from "@/lib/live-messages";
import { circleDate, formatDayLabel, formatTime } from "@/lib/time";
import { trimmedBody } from "@/lib/validation";

/** Fixed height of the chat card, so new messages scroll rather than grow it. */
const CHAT_HEIGHT = "h-[750px]";

/**
 * How close to the bottom counts as "at the bottom", in pixels. Someone else's
 * message scrolls into view only from here: a member reading back through the
 * history should not be pulled away from it by every new arrival.
 */
const NEAR_BOTTOM = 80;

function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 font-mono text-[10px] uppercase text-faint">
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function Bubble({
  message,
  author,
  me,
  pending,
}: {
  message: Message;
  author: AuthorInfo;
  /** Sent by the signed-in member, so drawn on the right in the accent. */
  me: boolean;
  /** Drawn but not yet saved, so faded until the database confirms it. */
  pending: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-[11px] ${me ? "flex-row-reverse" : ""} ${
        pending ? "opacity-60" : ""
      }`}
    >
      <Avatar person={author} size={34} />
      <div
        className={`flex max-w-[76%] flex-col gap-1 ${me ? "items-end" : ""}`}
      >
        <span
          className={`flex items-baseline gap-2 font-body text-[13px] font-semibold text-ink ${
            me ? "flex-row-reverse" : ""
          }`}
        >
          {author.name}
          <span className="text-[11.5px] font-normal text-faint">
            {formatTime(message.createdAt)}
          </span>
        </span>
        <span
          className={`rounded-card border px-[13px] py-[9px] font-body text-[14.5px] leading-[1.5] ${
            me
              ? "border-accent bg-accent text-accent-ink"
              : "border-line bg-bg text-ink"
          }`}
        >
          {message.body}
        </span>
      </div>
    </div>
  );
}

/**
 * "The Circle" — the group-text feed shown in the center of the member Home.
 *
 * The card is a fixed height with the message list as the only scroll region.
 * It opens on the newest page (pinned to the bottom) and fetches older pages
 * via `loadOlder` as the member scrolls toward the top, prepending each batch
 * while holding the viewport on the same message.
 *
 * This list is the browser's, not the server's: `initialPage` seeds it once and
 * older pages accumulate on top, so a re-rendered Home cannot replace it. A
 * sent message is therefore drawn here first and reconciled with the row the
 * database saves — which is also what stops it appearing twice.
 *
 * Everyone else's messages arrive live (`useLiveMessages`), and each time that
 * connection opens the chat re-reads the newest page through `loadNewest` to
 * fill in whatever was said while it was closed. How all three sources settle
 * into one list is `chatReducer`'s job, in `lib/chat.ts`.
 */
export function CircleChat({
  initialPage,
  loadOlder,
  loadNewest,
  user,
  now,
  lookup,
  className,
}: {
  initialPage: MessagePage;
  loadOlder: (cursor: string) => Promise<MessagePage>;
  loadNewest: () => Promise<MessagePage>;
  user: Member;
  /** The page's render instant, for "Today" and "Yesterday". */
  now: string;
  lookup: (id: string) => AuthorInfo;
  className?: string;
}) {
  const [{ messages, cursor, hasMore }, dispatch] = useReducer(
    chatReducer,
    initialPage,
    initialHistory,
  );
  const [loadingOlder, setLoadingOlder] = useState(false);
  // Set when a page of history fails to load, and cleared only by the member
  // choosing to try again. Without it, the observer below retries on its own:
  // each failure re-creates `fetchOlder`, the effect re-observes the sentinel,
  // and a sentinel still in view fires at once — dozens of requests a second
  // against a database that is already failing.
  const [loadFailed, setLoadFailed] = useState(false);
  const [draft, setDraft] = useState("");
  // Why the last send did not land. Cleared on the next attempt, not on a
  // timer: a message that never reached the circle should stay said so.
  const [sendError, setSendError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinel = useRef<HTMLDivElement>(null);
  // Coordinates the post-render scroll adjustment with what just changed.
  const didInit = useRef(false);
  const prependFromHeight = useRef<number | null>(null);
  const firstId = useRef(messages[0]?.id);
  const stickBottom = useRef(false);

  // Keep the viewport steady: pin to the bottom on first paint, after we send,
  // and when a message arrives while the member is already there; after
  // prepending older messages, offset scrollTop by the growth so the message
  // the member was reading stays put.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Older history went in above only if the old first message is still
    // here. Catching up can replace the list outright, which changes the first
    // message too, and there is no reading position to hold across that.
    const previousFirst = firstId.current;
    const prependedAbove =
      messages[0]?.id !== previousFirst &&
      messages.some((m) => m.id === previousFirst);
    firstId.current = messages[0]?.id;
    if (!didInit.current) {
      el.scrollTop = el.scrollHeight;
      didInit.current = true;
      return;
    }
    if (prependFromHeight.current !== null) {
      if (prependedAbove) {
        el.scrollTop += el.scrollHeight - prependFromHeight.current;
        prependFromHeight.current = null;
        return;
      }
      // A message arrived below while the older page is still loading. That
      // growth is not above the reader, so measure the prepend from here.
      prependFromHeight.current = el.scrollHeight;
    }
    if (stickBottom.current) {
      el.scrollTop = el.scrollHeight;
      stickBottom.current = false;
    }
  }, [messages]);

  /** Whether the member is reading the newest messages, not the history. */
  function atBottom(): boolean {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM;
  }

  useLiveMessages({
    onMessage(message) {
      if (atBottom()) stickBottom.current = true;
      dispatch({ type: "received", messages: [message] });
    },
    async onConnected() {
      try {
        const page = await loadNewest();
        // Measured when the page lands, not when it was asked for: the member
        // may have scrolled in between.
        if (atBottom()) stickBottom.current = true;
        dispatch({ type: "caughtUp", page });
      } catch (error) {
        // New messages are still heard; only what was said while the
        // connection was down is missing, until the next reload.
        console.warn("[chat] could not catch up on new messages", error);
      }
    },
  });

  const fetchOlder = useCallback(async () => {
    if (!hasMore || loadingOlder || loadFailed || cursor === null) return;
    setLoadingOlder(true);
    prependFromHeight.current = scrollRef.current?.scrollHeight ?? 0;
    try {
      const page = await loadOlder(cursor);
      // The reducer drops this page if catching up replaced the list while it
      // loaded. Nothing is prepended then, so there is nothing to hold.
      dispatch({ type: "older", from: cursor, page });
    } catch (error) {
      // Nothing was prepended, so there is no position to hold. Left set, the
      // next message sent would be treated as a prepend and not scrolled into
      // view.
      prependFromHeight.current = null;
      setLoadFailed(true);
      console.warn("[chat] could not load earlier messages", error);
    } finally {
      setLoadingOlder(false);
    }
  }, [hasMore, loadingOlder, loadFailed, cursor, loadOlder]);

  // Load the previous page when the top of the history scrolls into view.
  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = topSentinel.current;
    if (!root || !sentinel) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void fetchOlder();
      },
      { root, rootMargin: "120px 0px 0px 0px" },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [fetchOlder]);

  // Clearing the flag is the retry: it re-creates `fetchOlder`, and the
  // observer loads the page as soon as the top of the history is in view —
  // which it is, since that is where this button sits.
  function retryOlder() {
    setLoadFailed(false);
  }

  /**
   * Take back a message that never reached the database, and hand the member
   * their words instead of a bubble nobody else will ever see. The draft is
   * restored only if the box is still empty — they may have started typing the
   * next thing while this one was in flight.
   */
  function unsend(pendingId: string, body: string, why: string) {
    dispatch({ type: "unsent", pendingId });
    setDraft((current) => (current === "" ? body : current));
    setSendError(why);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = trimmedBody(draft);
    if (!body) return;

    // Drawn first, sent second. This is a group text: waiting on a round trip
    // before the bubble appears is what makes one feel broken.
    const pendingId = `${PENDING_ID_PREFIX}${crypto.randomUUID()}`;
    stickBottom.current = true;
    dispatch({
      type: "drawn",
      message: {
        id: pendingId,
        authorId: user.id,
        // The browser's clock, for the second or two before the database's own
        // created_at replaces it. The page's `now` would be worse: it is the
        // instant the page rendered, which may be an hour ago by now. Nothing
        // hydrates against this — the bubble is created after the fact, in the
        // browser, so there is no server render to disagree with.
        createdAt: new Date().toISOString(),
        body,
      },
    });
    setDraft("");
    setSendError(null);

    try {
      const result = await sendMessage(body);
      if (result.status === "error") {
        unsend(pendingId, body, result.formError);
        return;
      }
      // The saved row takes the drawn one's place, with the id and created_at
      // the database assigned — unless Realtime delivered it first and the
      // bubble is already gone. Either way the reducer leaves one copy.
      dispatch({ type: "sent", pendingId, message: result.message });
    } catch (error) {
      // A dispatch that never made it to the action at all: offline, or a
      // build whose action ids have rotated out from under this tab.
      console.warn("[chat] could not send a message", error);
      unsend(pendingId, body, "That didn't send. Please try again.");
    }
  }

  return (
    <div
      className={`flex flex-col self-stretch overflow-hidden rounded-card border border-line bg-surface shadow-[var(--cardshadow)] ${CHAT_HEIGHT} ${className ?? ""}`}
    >
      <div className="border-b border-line bg-accent px-5 py-4" />

      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-[15px] overflow-y-auto p-5"
      >
        <div ref={topSentinel} />
        {hasMore ? (
          <div
            role="status"
            className="text-center font-mono text-[10px] uppercase text-faint"
          >
            {loadFailed ? (
              <>
                Couldn&rsquo;t load earlier messages ·{" "}
                <button
                  type="button"
                  onClick={retryOlder}
                  className="cursor-pointer uppercase text-accent hover:underline"
                >
                  Try again
                </button>
              </>
            ) : loadingOlder ? (
              "Loading earlier messages…"
            ) : (
              "Scroll up for more"
            )}
          </div>
        ) : (
          <div className="text-center font-mono text-[10px] uppercase text-faint">
            The beginning of the circle
          </div>
        )}
        {messages.map((m, i) => (
          <div key={m.id} className="flex flex-col gap-[15px]">
            {i === 0 ||
            circleDate(messages[i - 1].createdAt) !==
              circleDate(m.createdAt) ? (
              <DayDivider label={formatDayLabel(m.createdAt, now)} />
            ) : null}
            <Bubble
              message={m}
              author={lookup(m.authorId)}
              me={m.authorId === user.id}
              pending={isPending(m)}
            />
          </div>
        ))}
      </div>

      <div className="flex-none border-t border-line">
        {sendError ? (
          <p
            role="alert"
            className="px-4 pt-2.5 font-body text-[12.5px] text-warn"
          >
            {sendError}
          </p>
        ) : null}
        <form onSubmit={send} className="flex items-center gap-2.5 px-4 py-3.5">
          <Avatar person={user} size={30} />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message the circle…"
            aria-label="Message the circle"
            className="flex-1 rounded-chip border border-line-strong bg-bg px-4 py-2.5 font-body text-[14.5px] text-ink outline-none transition-colors placeholder:text-faint focus:border-accent"
          />
        </form>
      </div>
    </div>
  );
}
