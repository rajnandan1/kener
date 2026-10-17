# Testing

Vitest runs two projects, defined in `vite.config.ts`:

- `server` runs `src/**/*.{test,spec}.{js,ts}` in Node, except the `*.svelte.test.ts` files.
- `client` runs `src/**/*.svelte.{test,spec}.{js,ts}` in headless Chromium through Playwright, with setup in `vitest-setup-client.ts`. Install the browser once: `npx playwright install chromium`.

Put each test next to the code it tests: `apiCall.ts` and `apiCall.test.ts`. A component test sits next to its component as `<component>.svelte.test.ts` (`monitor-docker.svelte` and `monitor-docker.svelte.test.ts`), so it runs in the `client` project.

Tests run in UTC. `npm test` and `npm run test:server` set `TZ=UTC` for the server project, and `vite.config.ts` pins the client project's Chromium to UTC. Run server tests through those scripts so the timezone is set.

```bash
npm run test:server -- src/lib/server/tool.test.ts   # one file
npm run test:server -- -t "test name"                # one test by name
npm run test:client                                  # component tests only
```
