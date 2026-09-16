"use server";

import { refresh } from "next/cache";

import { requireApproved } from "@/lib/dal";
import { toResourceInsert } from "@/lib/data/rows";
import type {
  CommentResult,
  ResourceDraft,
  ResourceResult,
} from "@/lib/resources";
import { isResourceDraft, validateResource } from "@/lib/resources";
import { createClient } from "@/lib/supabase/server";
import { trimmedBody } from "@/lib/validation";

/**
 * The Library's two writes: passing something along, and replying to it.
 *
 * Both are public entry points. Rendering the composer behind the gate is not
 * a security boundary — anyone can POST to an action without ever loading the
 * page — so each one checks `requireApproved()` for itself, takes the author
 * from the session rather than from the caller, and re-runs the rules the form
 * already ran. RLS (`resources_insert_own`, `comments_insert_own`) refuses the
 * same things underneath, so these checks decide *what the member is told*,
 * not whether the write is allowed.
 *
 * Both end in `refresh()`. Member pages are dynamic and uncached — Cache
 * Components is off and nothing here is tagged — so there is no cache entry
 * for `updateTag` to expire; what is stale is the RSC payload the browser is
 * holding. `refresh()` re-renders the current route and sends it back in the
 * same response as the result, so the new row is on screen by the time the
 * caller's `await` resolves.
 */

export async function createResource(
  draft: ResourceDraft,
): Promise<ResourceResult> {
  const { userId, profile } = await requireApproved();

  // Shape first, then the rules. The composer will not post while either is
  // wrong, so reaching here means the client was bypassed rather than that
  // somebody mistyped something.
  const errors = isResourceDraft(draft) ? validateResource(draft) : null;
  if (!errors || Object.keys(errors).length > 0) {
    console.warn(
      `[resources] rejected a share the composer would not have sent: ${
        errors ? Object.keys(errors).join(", ") : "not a draft"
      }`,
    );
    return {
      status: "error",
      formError: "Some of that wasn't quite right. Please try again.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resources")
    .insert(toResourceInsert(draft, { id: userId, name: profile.name }))
    // The id comes back so the composer can open what was just shared.
    .select("id")
    .single();

  if (error) {
    // The member sees one sentence, so this is the only record of what went
    // wrong — the code names the check constraint when a kind's shape is off.
    console.error(
      `[resources] could not save a ${draft.kind} from ${userId}: ${error.code} ${error.message}`,
    );
    return {
      status: "error",
      formError:
        "Something went wrong saving that. Please try again in a moment.",
    };
  }

  refresh();
  return { status: "created", id: data.id };
}

export async function addComment(
  resourceId: string,
  draft: string,
): Promise<CommentResult> {
  const { userId } = await requireApproved();

  const body = trimmedBody(draft);
  if (!body) {
    console.warn("[comments] rejected a comment with an empty body");
    return { status: "error", formError: "Please write something first." };
  }

  const supabase = await createClient();
  // `resourceId` is the caller's to choose — it is which share they are
  // replying to — and that is all it can be: the row's author is the session's
  // and the foreign key turns an id that belongs to nothing into a failure
  // here rather than an orphaned comment.
  const { error } = await supabase
    .from("comments")
    .insert({ resource_id: resourceId, author_id: userId, body });

  if (error) {
    console.error(
      `[comments] could not save ${userId}'s comment on ${resourceId}: ${error.code} ${error.message}`,
    );
    return {
      status: "error",
      formError: "That comment didn't save. Please try again.",
    };
  }

  refresh();
  return { status: "added" };
}
