You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

## Documentation writing skill

When the user asks to write or edit documentation, follow the skill file:

- `.claude/skills/documentation-writer/SKILL.md`

This is mandatory for docs-related tasks. Prioritize short, clear, action-oriented docs and avoid bloat.

## Code architecture docs skill - Important for all tasks

Always try to use the code-context skill at the start and end of coding sessions:

- `.claude/skills/code-context/SKILL.md`

## Code architecture enforcement (mandatory)

The code-context skill is not optional. Agents MUST do both:

1. **Before coding**: load relevant architecture docs from `.codecontext/`.
2. **Before final response**: if the task revealed new architecture knowledge (code flow, edge cases, component relationships), update or create a `.codecontext/*.md` entry. Skip if the task was trivial.

Required output evidence in the final response:

- `Context loaded:` list of `.codecontext` files read (or `none found`).
- `Context updated:` exact `.codecontext` file path written (or `skipped — no architecture changes`).

The `.codecontext/` folder documents **code architecture only** — not session logs, changelogs, or task summaries.
