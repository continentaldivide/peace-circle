/**
 * What the browser does with a picture before anything else sees it.
 *
 * Two jobs, both of which have to happen here rather than on the server.
 *
 * The first is scaling. Nothing optimizes these images once they are stored —
 * the route that serves them needs a session and Next's optimizer fetches
 * without one — so what a member uploads is what every other member downloads,
 * and a photo straight off a phone is several megabytes of pixels for a card
 * three hundred wide. Re-encoding here means it is scaled once, by the person
 * sharing it, instead of never.
 *
 * The second is the upload itself. A Server Action caps its request body at
 * 1 MB, and raising that would send every photo through the app server for no
 * benefit. The browser has a session, storage RLS checks exactly that session,
 * so the bytes go straight to Storage and the action is handed a path.
 *
 * Browser-only, deliberately not marked `"use server"` or `"server-only"`: it
 * touches `document` and `createImageBitmap`. The pure half — what an object
 * name looks like, and the size and quality constants — lives in `lib/images.ts`
 * and is shared with the server.
 */

import {
  IMAGE_BUCKET,
  IMAGE_MAX_EDGE,
  IMAGE_QUALITY,
  imageObjectName,
  UPLOAD_CONTENT_TYPE,
} from "@/lib/images";
import type { DraftImage } from "@/lib/resources";
import { createClient } from "@/lib/supabase/client";

/**
 * The largest file worth trying to decode. This is the *source*, before
 * scaling — a phone photo is a few megabytes, and anything past this is either
 * a mistake or something that will lock up the tab while it is decoded. The
 * bucket's own 5 MiB limit applies to what comes out the other end.
 */
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

/** A picture the member has chosen, scaled and ready to upload. */
export type PreparedImage = {
  /** The re-encoded JPEG. What is uploaded, and what the preview shows. */
  blob: Blob;
  width: number;
  height: number;
};

/**
 * Why a file cannot be used, in words for the member, or null.
 *
 * This is a courtesy, not a control: the bucket's `allowed_mime_types` and
 * `file_size_limit` are what actually decide, because anyone can call the
 * storage API without ever opening this form. Whether the browser can decode
 * the file is left to `prepareImage` — it is the only thing that really knows,
 * and a HEIC from an iPhone is exactly the case a type list gets wrong.
 */
export function describeFileProblem(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "That doesn't look like a picture. Please choose a photo.";
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return "That photo is very large. Please choose one under 25 MB.";
  }
  return null;
}

/**
 * The chosen file, scaled down and re-encoded as a JPEG.
 *
 * `imageOrientation: "from-image"` applies the EXIF rotation tag, which is
 * what stops a photo taken in portrait from arriving on its side. Re-encoding
 * then drops EXIF entirely, so the rotation is baked into the pixels — and the
 * GPS coordinates a phone writes into the same block do not travel to the
 * circle along with the picture.
 *
 * The canvas is painted white first. A PNG's transparent pixels become black
 * in a JPEG otherwise, which turns a screenshot with a clear background into a
 * dark rectangle.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });

  const scale = Math.min(
    1,
    IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot prepare the picture");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, UPLOAD_CONTENT_TYPE, IMAGE_QUALITY),
  );
  if (!blob) throw new Error("Could not encode the picture");

  return { blob, width, height };
}

/**
 * Puts the prepared picture in Storage and answers with what the action needs.
 *
 * The object name starts with the member's own id because that is what the
 * `images_insert_own` policy compares against `auth.uid()`. Passing the id in
 * rather than reading it here keeps this honest about what it is: a
 * convenience. A wrong id is refused by the policy, not by this function.
 *
 * `upsert: false`, so a name collision is an error rather than a silent
 * overwrite of a picture someone is already looking at.
 */
export async function uploadImage(
  userId: string,
  image: PreparedImage,
): Promise<DraftImage> {
  const supabase = createClient();
  const path = imageObjectName(userId, crypto.randomUUID());

  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, image.blob, {
      contentType: UPLOAD_CONTENT_TYPE,
      upsert: false,
    });

  if (error) throw new Error(`Could not upload the picture: ${error.message}`);
  return { path, width: image.width, height: image.height };
}

/**
 * Removes an object nothing ended up pointing at.
 *
 * The upload happens before the row is written, so a share that fails to save
 * leaves a file behind with nothing referring to it. Best effort by nature: if
 * this fails too, the object is orphaned and the member is already being told
 * their share did not save, which is the more useful thing to say.
 */
export async function discardImage(image: DraftImage): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .remove([image.path]);
  if (error) {
    console.warn(`[images] orphaned ${image.path}: ${error.message}`);
  }
}
