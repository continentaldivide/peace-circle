-- Peace Circle — let the Circle chat update while it is open.
--
-- Until now a member saw someone else's message only by reloading Home. The
-- chat now subscribes to new rows through Supabase Realtime, which only
-- broadcasts tables in the `supabase_realtime` publication.
--
-- Nothing about who may read changes. Realtime checks each change against the
-- subscriber's own RLS policies before sending it, so `messages_select_members`
-- still decides: approved members receive new messages, nobody else does.
--
-- Only inserts are listened for. Deleting a message is allowed by policy but
-- has no control in the app yet; when it does, the chat will need to hear
-- deletes too.

alter publication supabase_realtime add table public.messages;
