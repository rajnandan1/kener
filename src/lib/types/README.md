This folder contains **shared** TypeScript types.

Guidelines:

- Put domain models and DTOs here (safe for both server + client).
- Avoid importing Node-only libs or $env/private here.
- If a type is server-only, put it in `src/lib/server/types`.
- If a type is client-only, put it in `src/lib/client/types`.
