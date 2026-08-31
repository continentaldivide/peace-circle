<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Schema changes require regenerating types

`lib/supabase/database.types.ts` is generated from the database and checked in.
It is what makes `lib/dal.ts` and the data seam type-safe against the real
schema, so a stale copy is worse than none — it looks authoritative while
describing a schema that no longer exists.

**Whenever a migration in `supabase/migrations/` adds, removes, or alters a
table, column, enum, or function, regenerate it in the same commit:**

```
supabase migration up   # apply first — the generator reads the DATABASE,
npm run types           # not the migration files
git add lib/supabase/database.types.ts
```

Never hand-edit that file. Never hand-write a type that mirrors a table; derive
it from `Database["public"]["Tables"][...]` so the compiler catches drift.

Nothing enforces this yet — there is no CI. Until there is, it is a habit, and
regenerating is also a useful check that the migration did what you intended:
`git diff` on the generated file shows the schema change in plain TypeScript.
