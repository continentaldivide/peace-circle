-- Peace Circle — real pictures in the Library.
--
-- Two halves: the columns a share needs to point at a photo, and the bucket the
-- photo actually lives in, with the policies that make it part of the same
-- access gate as everything else.
--
-- The bucket is created here rather than in `supabase/config.toml` on purpose.
-- config.toml describes the *local* stack and is never pushed, so a bucket
-- declared there would exist on this machine and nowhere else — the same trap
-- that left the hosted invite template unset in Step 3. A migration reaches the
-- hosted project.

-- ---------------------------------------------------------------------------
-- resources — the image's shape travels with its path
-- ---------------------------------------------------------------------------

-- `image_path` has existed since Step 1 and has always been null. Its two new
-- companions are the picture's pixel dimensions, written at upload.
--
-- They are here so `next/image` can reserve the exact box before the bytes
-- arrive. Without them the choice is a fixed aspect box that crops every photo
-- to the same shape, or a box that resizes when the image loads and shoves the
-- rest of the Library down the page. The Library is a masonry of variable-height
-- cards, so the natural shape costs nothing to show — it just has to be known
-- before the image is.
alter table public.resources
  add column image_width integer,
  add column image_height integer;

-- All three or none of the three. A path with no dimensions would leave the
-- renderer with nothing to reserve; dimensions with no path describe an image
-- that does not exist.
--
-- The `is not null` tests are not redundant with the comparisons. A CHECK
-- constraint accepts a row whenever its expression is *not false*, and NULL is
-- not false — so `image_width > 0` against a null width is NULL, which the
-- whole `or` inherits, and a path with no dimensions would be let straight
-- through. The gate tests in supabase/tests/rls.test.sql caught exactly that.
alter table public.resources
  add constraint resources_image_shape check (
    (image_path is null and image_width is null and image_height is null)
    or (
      image_path is not null
      and image_width is not null and image_width > 0
      and image_height is not null and image_height > 0
    )
  );

-- Deliberately not tied to `kind`. Only pictures carry one today, but a book
-- cover is the obvious next thing to want one (see PLAN.md, "After launch"),
-- and a constraint naming 'picture' would have to be rewritten for it.

comment on column public.resources.image_path is
  'Object name inside the private `images` bucket, as `<author_id>/<uuid>.jpg`. '
  'Nothing deletes the object when this row goes: a delete here removes the '
  'reference, not the file, and removing a storage.objects row would not remove '
  'the underlying file either. Whoever deletes a share deletes its object '
  'through the Storage API first.';

-- ---------------------------------------------------------------------------
-- The bucket
-- ---------------------------------------------------------------------------

-- PRIVATE. This is the decision the rest of the file exists to enforce.
--
-- A public bucket serves every object at a guessable URL that works for anyone
-- who has it, forever, with no session and no policy consulted — which is
-- precisely the thing PLAN.md's second architectural commitment forbids. A
-- circle whose pictures can be read by a stranger with a link does not have its
-- gate in the database. The cost of private is that an object cannot be linked
-- to directly, which is why the app serves images through a route of its own.
--
-- `allowed_mime_types` is the enforcement that cannot be bypassed: the composer
-- checks what a member picked for the member's benefit, but anyone can call the
-- storage API without it. The list is the three formats every browser renders
-- and nothing else — SVG above all, because an SVG is a document that can carry
-- script, and these are served from the app's own origin.
--
-- `file_size_limit` is 5 MiB. The composer scales a photo down before it
-- uploads, so anything arriving near this has been sent around it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'images',
  'images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Storage policies — the same gate, on the same terms
-- ---------------------------------------------------------------------------

-- `storage.objects` has RLS enabled and no policies, so it is closed to
-- everyone until something opens it. These three are the whole of it, and they
-- route through `is_approved()` / `is_admin()` exactly like the eight tables in
-- 20260823000002_rls.sql — one definition of who is in the circle, not two.
--
-- Objects are named `<author_id>/<uuid>.jpg`, so `storage.foldername(name)[1]`
-- is the uploader. That is what makes "your own object" a thing a policy can
-- check without reading another table.

-- Any approved member may read any picture in the bucket: a share is posted to
-- the whole circle, and the circle is exactly who may see it.
create policy images_select_members on storage.objects
  for select to authenticated
  using (bucket_id = 'images' and public.is_approved());

-- You may only write into your own folder. `author_id` on the row is taken
-- from the session by the action that writes it, and this is the matching rule
-- for the file, so a member cannot upload under someone else's name.
create policy images_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'images'
    and public.is_approved()
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Deletion mirrors `resources_delete_own_or_admin`: your own, or an admin's
-- moderation. It is also what lets the composer clean up after itself when the
-- upload succeeds and the insert that was going to reference it does not.
create policy images_delete_own_or_admin on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'images'
    and (
      public.is_admin()
      or (
        public.is_approved()
        and (storage.foldername(name))[1] = (select auth.uid())::text
      )
    )
  );

-- No update policy, deliberately. An object here is immutable: its name is a
-- uuid, nothing uploads with upsert, and changing a share's picture means a new
-- object and a new path. Without an update policy, an overwrite is refused
-- rather than silently changing what every member already has cached.
