-- Peace Circle — a share may only show a picture from its author's own folder.
--
-- The storage policies stop a member *writing* a file into another member's
-- folder. But a share does not hold a file, it names one, and the policies on
-- `resources` ask only whether `author_id` is you. So a member skipping the app
-- and writing to `resources` with their own session could post — or edit their
-- own share into — a picture whose `image_path` is someone else's photo, and it
-- would appear in the Library as theirs.
--
-- `createResource` already refuses that. An action is not the gate, though:
-- PLAN.md's commitment is that the rule lives in the database, where a request
-- that never touched the app meets it too.
--
-- Written as a check constraint rather than a clause in the insert and update
-- policies, so it holds for every writer — including the service role, which
-- bypasses RLS and is what Step 7's admin tools will use.
--
-- It pins the whole name, not only its first segment. The object names this app
-- writes are exactly `<author_id>/<uuid>.<jpg|png|webp>`; anything else is not
-- something the composer made, and comparing only the folder would still store
-- `<author_id>/../<someone else>/<uuid>.jpg`. Lower-case throughout, because
-- that is what `auth.uid()::text`, `crypto.randomUUID()` and the storage insert
-- policy all produce — an upper-case folder could never have been uploaded.
-- `lib/images.ts` matches the same pattern, so the app and the database agree
-- on what an object name is.

alter table public.resources
  add constraint resources_image_path_own check (
    image_path is null
    or image_path ~ (
      '^' || author_id::text
      || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
      || '\.(jpg|png|webp)$'
    )
  );
