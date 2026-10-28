# Images API (`/api/v4/images`)

## Overview

This route uploads one image. It stores the image in the database and returns the URL that serves it. `src/hooks.server.ts` checks the Bearer API key before the handler runs.

## Interface

- `POST` takes a JSON body with `base64` and `mime_type` (required), and `file_name`, `max_width`, `max_height`, and `force_dimensions` (optional).
- `POST` calls `uploadImage` from `$lib/server/controllers/imageController`. It returns 201 with `{ image }`, which has `id`, `url` (`/assets/images/<id>`), `mime_type`, `width`, `height`, and `size`. The response holds no image data.
- `badRequest` is a local helper that builds the 400 response.

## Invariants

- `max_width` and `max_height` must be integers from 1 to `GC.MAX_IMAGE_DIMENSION` (4096). `force_dimensions` must be a boolean.
- `uploadImage` accepts only `image/png`, `image/jpeg`, `image/jpg`, `image/webp`, `image/heic`, and `image/heif`. It rejects SVG, even when the bytes are SVG under another type.
- `uploadImage` returns 400 `Image MIME type does not match file content` when `mime_type` differs from the format that sharp detects. It reads `image/jpg` as `image/jpeg`. It converts a HEIC or HEIF file to JPEG before sharp reads it, so such a file passes only as `image/jpeg`, `image/jpg`, `image/heic`, or `image/heif`.
- `uploadImage` rejects a `file_name` longer than 255 characters and decoded data larger than `GC.MAX_UPLOAD_BYTES` (2 MB). It limits the source to `GC.MAX_INPUT_PIXELS` (4096 x 4096 pixels).
- By default, the resize fits the image inside the size limits and never enlarges it. With `force_dimensions`, it crops to exactly that size.
- The stored image is a JPEG at quality 85 when the source is JPEG or HEIC, and a PNG otherwise.
- The `id` is the first 16 hex characters of the SHA-256 hash of the stored bytes, plus `.jpg` or `.png`. So the same output always gets the same id.
- An `ImageUploadError` returns 400 with its message. Any other error returns 500 with the fixed message `Failed to upload image`.

## Side Effects

- `POST` inserts one row in `images` through `db.insertImage`, with the bytes as base64. The insert uses `onConflict("id").merge(["id"])`, so a repeated upload does not fail and does not add a second row.
- `POST` writes no file to disk.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/routes/(api)/api/v4/images"`.
- A change here writes the database, so it must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
