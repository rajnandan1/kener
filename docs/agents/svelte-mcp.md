# Svelte MCP

Use the Svelte MCP tools in this order:

1. Call `list-sections` first for any Svelte or SvelteKit question, then call `get-documentation` for every relevant section.
2. Run `svelte-autofixer` on Svelte code before you hand it over. Repeat until it reports no issues.
3. Call `playground-link` only when the user asks for one, and only for code that is not written to project files.
