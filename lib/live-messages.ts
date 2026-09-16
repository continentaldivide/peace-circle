import type {
  RealtimeChannel,
  RealtimePostgresInsertPayload,
} from "@supabase/supabase-js";
import { useEffect, useRef } from "react";

import type { Message } from "@/lib/data/types";
import { toMessage, type MessageRow } from "@/lib/data/rows";
import { createClient } from "@/lib/supabase/client";

/**
 * Hear the circle's new messages while the chat is open.
 *
 * The one read in the app that does not go through `lib/data`: that seam runs
 * on the server, per request, and this is a connection the browser holds open.
 * It is still a read through RLS — Realtime checks each new row against the
 * subscriber's own `messages_select_members` policy before sending it, so a
 * member who is not approved subscribes and hears nothing.
 *
 * Realtime does not replay what was said while the connection was down — a
 * laptop asleep, a train through a tunnel. `onConnected` runs each time the
 * subscription opens, the first time included (the page was rendered before
 * it), so the chat can re-read the newest page and fill the gap.
 */
export function useLiveMessages({
  onMessage,
  onConnected,
}: {
  onMessage: (message: Message) => void;
  onConnected: () => void;
}) {
  // Latest callbacks without resubscribing on every render: a subscription is
  // a round trip to the server, and a gap in which messages go unheard.
  const handlers = useRef({ onMessage, onConnected });
  useEffect(() => {
    handlers.current = { onMessage, onConnected };
  });

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let unmounted = false;

    // The session first, then the subscription. The browser client reads the
    // session from cookies asynchronously, and a channel that joins before it
    // has joins as `anon` — which RLS lets hear nothing. The client does pass
    // the token on once it has it, but only to channels that have finished
    // joining, so a join still in flight stays anonymous, silently, for as
    // long as the page is open.
    void supabase.realtime.setAuth().then(() => {
      if (unmounted) return;
      channel = supabase
        // Unique per mount: Strict Mode mounts twice, and a second channel
        // with the same topic would be handed the first one as it is removed.
        .channel(`circle-chat:${crypto.randomUUID()}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload: RealtimePostgresInsertPayload<MessageRow>) => {
            handlers.current.onMessage(toMessage(payload.new));
          },
        )
        .subscribe((status, error) => {
          if (status === "SUBSCRIBED") {
            handlers.current.onConnected();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            // Realtime keeps retrying on its own, and the next SUBSCRIBED
            // catches the chat up; this is only the record of why it dropped.
            console.warn(`[chat] live messages ${status}`, error);
          }
        });
    });

    return () => {
      unmounted = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);
}
