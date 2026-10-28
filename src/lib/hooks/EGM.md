# hooks

## Overview

This folder holds two small Svelte 5 helper classes. They use runes (`$state`) or `svelte/reactivity`, so they work only in a component or in another `.svelte.ts` file.

## Interface

- `IsMobile` (`is-mobile.svelte.ts`) extends `MediaQuery` from `svelte/reactivity`. `new IsMobile(breakpoint = 768)` matches `max-width: <breakpoint - 1>px`. Its `current` property is `true` on a narrow screen. `src/lib/components/ui/sidebar/context.svelte.ts` uses it.
- `UseClipboard` (`use-clipboard.svelte.ts`) copies text and keeps the result. Create it with `new UseClipboard({ delay = 2000, reset = true })`. `src/lib/components/CopyButton.svelte` uses it.
    - `copy(text: string | number)` writes the text with `navigator.clipboard.writeText` and resolves to `"success"` or `"failure"`.
    - `copied` is `true` right after a successful copy.
    - `status` is `"success"`, `"failure"`, or `undefined`.
    - `lastCopied` is the last text that copied successfully.

## Invariants

- `copy` never throws. A clipboard error (no browser, or no clipboard permission) sets the status to `"failure"`.
- When `reset` is `true`, the status goes back to `undefined` after `delay` milliseconds. A new `copy` call clears the timer of the previous call.
- `copied` is a boolean. The usage example in the `UseClipboard` doc comment compares `clipboard.copied === 'success'`, and that comparison is always false. Use `status` to tell success from failure.

## Side Effects

- `UseClipboard.copy` writes to the system clipboard. When `reset` is `true`, it starts a `setTimeout`.
- `IsMobile` listens to a CSS media query through `MediaQuery`.

## Verification

- Run `npm run check` (svelte-kit sync and the svelte-check type check).
- Run `npm test` (the full suite). No test covers this folder directly. `src/lib/components/CopyButton.svelte.test.ts` covers `UseClipboard` through `CopyButton.svelte`: run `npm run test:client -- "src/lib/components/CopyButton.svelte.test.ts"`.
