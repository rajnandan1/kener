---
name: documentation-writer
description: Specialized skill for creating and editing high-quality Kener documentation. MUST be used whenever creating or editing documentation files in the src/routes/(docs)/docs/content/ directory or updating docs.json navigation.
---

# Documentation Writer

Use this skill for all docs edits in `src/routes/(docs)/docs/content/` and when updating docs navigation in `src/routes/(docs)/docs.json`.

## Non-negotiable rules

1. **Be concise**: remove repetition and background that does not help the user complete a task.
2. **Be actionable**: prioritize “what to do” over theory.
3. **One source of truth**: if another page already has details, link to it instead of duplicating.
4. **Preserve structure**: keep valid frontmatter and heading anchor IDs.
5. **Keep examples copyable**: minimal, tested-looking, and directly relevant.
6. **Search before writing**: always check if the content already exists in some form before adding new sections or pages.
7. **Check Relevant Code**: Search the codebase inside `src/` for any relevant code, comments, or tests that can inform the documentation content and ensure accuracy.

## Docs config model (current)

`docs.json` is versioned. Sidebar lives inside tabs:

- `versions[].content.navigation.tabs[].sidebar`
- Sidebar groups contain `pages`
- Page paths use `content` (legacy `slug` may still appear in older content)

When adding a new doc page, add it to the appropriate tab sidebar path.

## Versioned link policy (mandatory)

- For v4 docs content, internal links MUST use explicit v4 paths: `/docs/v4/...`.
- Do not use unversioned shortcuts like `/docs/alerting/...` in v4 pages.
- Before finalizing, verify every internal link in edited files resolves to the intended version.

## Required page format

```markdown
---
title: Page Title
description: One-line summary of user outcome
---
```

- Use custom anchors for H2/H3 headings: `## Section {#section}`
- Use GitHub admonitions only when needed: `[!NOTE]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`, `[!TIP]`
- Prefer short sections and short lists

## Preferred structure (default)

1. Short intro (1–2 sentences)
2. Quick setup / minimum config
3. Required variables/options table
4. Verification step
5. Top troubleshooting items

Only add extra sections if they materially improve task completion.

## Keep docs lean

Remove or avoid:

- Multiple near-identical examples
- Long conceptual explainers
- Platform-by-platform repetition unless behavior differs
- Large checklists that restate earlier content

## Editing workflow

1. Read the whole target document.
2. Compress verbose sections first.
3. Keep critical caveats and breaking notes.
4. Ensure internal links and anchors still work.
5. If adding files, update `docs.json` navigation in the correct version/tab.

## Review checklist

- [ ] Title/description frontmatter exists
- [ ] Key steps are clear and copyable
- [ ] Content is concise and non-duplicative
- [ ] Headings keep stable custom anchors
- [ ] Navigation updated (if new page)
- [ ] Internal links point to correct paths
- [ ] v4 pages use `/docs/v4/...` internal links (no unversioned `/docs/...` shortcuts)
- [ ] No outdated or irrelevant content remains
- [ ] Admonitions used appropriately for important notes
