-- Peace Circle — length ceilings on the public interest form's columns.
--
-- `inquiries` is the one table anyone on the internet may write to, and every
-- text column on it was unbounded. A single submission could therefore carry
-- as much text as the request body allowed, straight into the table and into
-- the notification email an admin has to open.
--
-- These ceilings are the last of three layers. `maxLength` on the inputs stops
-- an honest overrun, `validateInquiry` in lib/inquiries.ts stops a bypassed
-- client, and these stop anything that reaches the column by another route.
-- The numbers are the same ones in INQUIRY_LIMITS; changing one means changing
-- both, which is why they are named identically on each side.
--
-- The app trims before inserting, so these measure the stored value. NULL
-- passes a CHECK, which is what the two optional columns want — they are
-- absent rather than empty when nobody answered them.

alter table public.inquiries
  add constraint inquiries_name_length
    check (char_length(name) <= 100),
  add constraint inquiries_email_length
    -- The longest address RFC 5321 permits.
    check (char_length(email) <= 254),
  add constraint inquiries_heard_from_length
    check (char_length(heard_from) <= 1000),
  add constraint inquiries_referred_by_length
    check (char_length(referred_by) <= 100),
  add constraint inquiries_message_length
    check (char_length(message) <= 2000);
