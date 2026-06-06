# Home page is addressed as `~home` in the v4 API

The Home Page is stored with an empty `page_path`, which can not appear as a URL segment, so `/api/v4/pages/{page_path}` could not address it at all (#737). The v4 API now accepts the special segment `~home` for it: the request middleware maps `~home` to a lookup of the empty path before handlers run.

We considered the reporter's suggestion of a `default` keyword, and `home`, but both are valid page paths under the sanitizer (`[a-z0-9_-]`), so a real page could shadow the keyword or force reservation rules and migration edge cases. We also considered addressing pages by id, which either breaks the existing path-based contract or is ambiguous with numeric page paths. `~home` can never collide because the sanitizer strips `~`, and tilde is an RFC 3986 unreserved character, so clients never need to encode it (percent-encoded `%7Ehome` works too, since the middleware decodes segments).

Semantics follow the server-side invariants the manage UI relies on: `PATCH` via `~home` accepts every field except `page_path`, which is fixed for the home page (the UI disables the field), and `DELETE` is rejected — `DeletePage` in `pagesController` throws "Cannot delete the home page" and the rest of the app assumes the home page exists.

API responses also render the home page's `page_path` as `~home` (list, single, and write responses), so what a consumer reads is exactly what it can address — list → pick → `PATCH` round-trips cleanly, including read-modify-write bodies that send `~home` back (treated as "no path change"). The stored path remains empty and the public URL remains the site root; consumers must not build public URLs by concatenating `page_path`.
