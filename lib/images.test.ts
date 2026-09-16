import { describe, expect, test } from "vitest";

import {
  imageContentType,
  imageObjectName,
  imageObjectOwner,
  imageSrc,
  isImageObjectName,
} from "@/lib/images";

const LISA = "11111111-1111-1111-1111-111111111111";
const RUTH = "22222222-2222-2222-2222-222222222222";
const FILE = "f1a2b3c4-0000-4000-8000-0000000000ab";

describe("isImageObjectName", () => {
  test("accepts the names the composer writes", () => {
    expect(isImageObjectName(`${LISA}/${FILE}.jpg`)).toBe(true);
    expect(isImageObjectName(`${LISA}/${FILE}.png`)).toBe(true);
    expect(isImageObjectName(`${LISA}/${FILE}.webp`)).toBe(true);
  });

  test("refuses anything else", () => {
    // Traversal, in the two spellings a path from a URL could arrive in.
    expect(isImageObjectName(`${LISA}/../${RUTH}/${FILE}.jpg`)).toBe(false);
    expect(isImageObjectName("../secrets.jpg")).toBe(false);
    // A deeper or shallower name than the policies know how to scope.
    expect(isImageObjectName(`${LISA}/nested/${FILE}.jpg`)).toBe(false);
    expect(isImageObjectName(`${FILE}.jpg`)).toBe(false);
    // An extension that is a document rather than a picture.
    expect(isImageObjectName(`${LISA}/${FILE}.svg`)).toBe(false);
    expect(isImageObjectName(`${LISA}/${FILE}.html`)).toBe(false);
    expect(isImageObjectName(`${LISA}/${FILE}`)).toBe(false);
    // A folder that is not an id, so not something a policy can compare.
    expect(isImageObjectName(`anyone/${FILE}.jpg`)).toBe(false);
    expect(isImageObjectName("")).toBe(false);
  });
});

describe("imageObjectOwner", () => {
  test("is the first segment, which is what the policies compare", () => {
    expect(imageObjectOwner(`${RUTH}/${FILE}.jpg`)).toBe(RUTH);
  });

  test("is null for a name this app could not have written", () => {
    expect(imageObjectOwner(`${LISA}/../${RUTH}/${FILE}.jpg`)).toBeNull();
    expect(imageObjectOwner("nonsense")).toBeNull();
  });
});

describe("imageContentType", () => {
  test("comes from the name, not from whatever was stored", () => {
    expect(imageContentType(`${LISA}/${FILE}.jpg`)).toBe("image/jpeg");
    expect(imageContentType(`${LISA}/${FILE}.PNG`)).toBe("image/png");
    expect(imageContentType(`${LISA}/${FILE}.webp`)).toBe("image/webp");
  });

  test("is null for a name this app could not have written", () => {
    expect(imageContentType(`${LISA}/${FILE}.svg`)).toBeNull();
  });
});

describe("imageObjectName", () => {
  test("puts the upload in the uploader's own folder", () => {
    const name = imageObjectName(RUTH, FILE);
    expect(name).toBe(`${RUTH}/${FILE}.jpg`);
    // The round trip that matters: what the composer writes is what the route
    // serving it, and the action checking it, will accept.
    expect(isImageObjectName(name)).toBe(true);
    expect(imageObjectOwner(name)).toBe(RUTH);
  });
});

describe("imageSrc", () => {
  test("is this app's route, not a storage URL", () => {
    expect(imageSrc(`${LISA}/${FILE}.jpg`)).toBe(
      `/api/images/${LISA}/${FILE}.jpg`,
    );
  });
});
