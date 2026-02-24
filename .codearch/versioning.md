# Versioning

## Session: startup banner version source

Task: Clarify runtime version source for startup figlet/banner and align with project architecture.
Changes: Reverted `src/lib/server/startup.ts` to use shared `version()` from `src/lib/version.ts` instead of reading `package.json` directly with fs path logic.
Decision: Keep `src/lib/version.ts` as the single source for version resolution across server/client contexts. This respects code architecture and avoids duplicate version loading paths.
Gotcha: If version appears stale at runtime, ensure the app is rebuilt/restarted after bumping `package.json` so injected/runtime values update.
Files touched: `src/lib/server/startup.ts`.
Verification: `npm run check` passed with 0 errors (existing unrelated warnings only).
