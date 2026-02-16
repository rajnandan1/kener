---
name: documentation-writer
description: Specialized skill for creating and editing high-quality Kener documentation. MUST be used whenever creating or editing documentation files in the src/routes/(docs)/docs/content/ directory or updating docs.json navigation.
---

# Documentation Writer

## Overview

This skill provides guidelines and best practices for creating high-quality, easy-to-follow documentation for Kener. Use this skill when creating new documentation or editing existing documentation files.

## Documentation Structure

### Content Location

All documentation files are located in:
```
src/routes/(docs)/docs/content/
```

### File Organization

```
content/
├── introduction.md          # Top-level pages
├── configuration.md
├── monitors/               # Nested sections
│   ├── overview.md
│   ├── api.md
│   └── ping.md
├── alerting/
│   ├── overview.md
│   └── triggers.md
└── setup/
    ├── email-setup.md
    └── database-setup.md
```

### Navigation Configuration

Navigation is controlled by `/src/routes/(docs)/docs.json`:

```json
{
  "sidebar": [
    {
      "group": "Getting Started",
      "collapsible": false,
      "pages": [
        {
          "title": "Introduction",
          "slug": "introduction"
        }
      ]
    }
  ]
}
```

**Important**: When creating new documentation files, you MUST also update `docs.json` to add navigation entries.

## Required Frontmatter

Every documentation file MUST begin with YAML frontmatter:

```markdown
---
title: Your Page Title
description: A clear, concise description of the page content (used for SEO and previews)
---
```

## Custom Heading Anchors

Use custom heading IDs for stable deep linking. This is CRITICAL for maintaining links even if heading text changes.

### Syntax

```markdown
## Section Title {#section-title}
```

### Best Practices

1. **Always include custom IDs** for all H2 and H3 headings
2. Use lowercase, kebab-case format
3. Keep IDs short but descriptive
4. IDs should be unique within the document

### Examples

```markdown
## How API Monitoring Works {#how-api-monitoring-works}
### Configuration Options {#configuration-options}
### Common Issues {#common-issues}
```

## Markdown Features

### Callout Boxes

Use GitHub-flavored callout syntax for important information:

```markdown
> [!NOTE]
> Additional context or helpful information

> [!WARNING]
> Caution about potential issues

> [!TIP]
> Helpful tips for users

> [!IMPORTANT]
> Critical information users should know
```

### Code Blocks

Always specify the language for syntax highlighting:

````markdown
```javascript
// Your code here
```

```bash
# Shell commands
```

```json
{
  "config": "value"
}
```
````

### Tables

Use tables for structured information:

```markdown
| Column 1 | Column 2 | Column 3 |
| :------- | :------- | :------- |
| Value 1  | Value 2  | Value 3  |
```

### Internal Links

Reference other documentation pages using absolute paths:

```markdown
See the [Email Setup](/docs/setup/email-setup) guide for details.
```

For section anchors:

```markdown
See [Configuration Options](/docs/monitors/api#configuration-options).
```

## Documentation Structure Template

Follow this structure for comprehensive documentation pages:

```markdown
---
title: Feature Name
description: Brief description of the feature
---

Brief introduction paragraph explaining what the feature is and why it matters.

## How It Works {#how-it-works}

Explain the basic workflow or concept.

## Configuration Options {#configuration-options}

Document all available configuration options using tables:

| Field    | Type     | Description | Default |
| :------- | :------- | :---------- | :------ |
| `option` | `string` | What it does | `value` |

## Examples {#examples}

Provide practical examples with clear explanations.

### 1. Basic Example {#basic-example}

Simple use case with minimal configuration.

### 2. Advanced Example {#advanced-example}

More complex use case demonstrating advanced features.

## Best Practices {#best-practices}

### Topic 1 {#best-practices-topic-1}

Practical advice for optimal usage.

## Troubleshooting {#troubleshooting}

### Common Issues {#common-issues}

| Issue | Possible Cause | Solution |
| :---- | :------------- | :------- |
| Problem | Why it happens | How to fix |

## Next Steps {#next-steps}

- [Related Documentation 1](/docs/path/to/doc1)
- [Related Documentation 2](/docs/path/to/doc2)
```

## Quality Guidelines

### Writing Style

1. **Be Clear and Concise**: Use simple language and short sentences
2. **Be Action-Oriented**: Focus on what users need to do
3. **Be Consistent**: Use the same terms throughout documentation
4. **Be Complete**: Don't assume prior knowledge

### Content Requirements

1. **Start with Context**: Explain why the feature exists
2. **Show Examples**: Always include practical examples
3. **Include Edge Cases**: Document common pitfalls
4. **Link Related Topics**: Help users navigate to related information

### Technical Writing

1. **Use Active Voice**: "Configure the monitor" not "The monitor should be configured"
2. **Use Present Tense**: "Kener sends notifications" not "Kener will send notifications"
3. **Be Specific**: Include exact values, paths, and commands
4. **Test All Code**: Ensure all code examples work

## Avoid Duplication

### Before Creating New Documentation

1. **Search Existing Docs**: Check if the topic is already covered
2. **Use References**: If content exists elsewhere, link to it instead of duplicating
3. **Extend Existing Docs**: Consider adding to an existing page rather than creating a new one

### When Content Overlaps

**Instead of duplicating**:
```markdown
## Email Configuration

To send emails, you need to configure SMTP settings:
- SMTP_HOST=smtp.example.com
- SMTP_PORT=587
...
```

**Use references**:
```markdown
## Email Configuration

Kener supports email notifications through SMTP or Resend. For detailed configuration instructions, see the [Email Setup](/docs/setup/email-setup) guide.
```

### When to Duplicate vs Reference

**Duplicate when**:
- The information is critical to understanding the current topic
- The content is very brief (1-2 sentences)
- The duplicate provides necessary context

**Reference when**:
- Detailed configuration steps exist elsewhere
- The topic is comprehensively covered in another document
- The information would make the current document too long

## Workflow

### Creating New Documentation

1. **Plan the Structure**: Outline sections before writing
2. **Check for Existing Content**: Ensure you're not duplicating
3. **Write the Content**: Follow the template and guidelines
4. **Add Custom Heading IDs**: Include `{#id}` for all major headings
5. **Update docs.json**: Add navigation entry
6. **Add Internal Links**: Link to related documentation
7. **Review and Test**: Verify all links, code examples, and formatting

### Editing Existing Documentation

1. **Read the Full Document**: Understand the existing content
2. **Maintain Consistency**: Match the existing style and tone
3. **Update Related Sections**: Keep all sections consistent
4. **Preserve Custom IDs**: Never change existing `{#custom-ids}`
5. **Update Links**: Ensure all internal references remain valid

### Before Finalizing

**Checklist**:
- [ ] Frontmatter includes title and description
- [ ] All H2 and H3 headings have custom IDs
- [ ] Code blocks specify language
- [ ] Tables are properly formatted
- [ ] Internal links use `/docs/` prefix
- [ ] Examples are practical and tested
- [ ] No duplicate content (or justified duplication)
- [ ] Navigation entry added to docs.json (for new pages)
- [ ] Related documentation is linked

## Common Patterns

### Configuration Documentation

Always document environment variables with tables:

```markdown
### Environment Variables {#environment-variables}

| Variable | Description | Required | Default |
| :------- | :---------- | :------- | :------ |
| `VAR_NAME` | What it does | Yes/No | `value` |
```

### API Documentation

Structure API documentation consistently:

```markdown
## Endpoint Name {#endpoint-name}

Description of what the endpoint does.

**Endpoint**: `POST /api/path`

**Authentication**: Required/Not Required

**Request Body**:
```json
{
  "field": "value"
}
```

**Response**:
```json
{
  "result": "success"
}
```
```

### Monitor Type Documentation

Follow this structure for monitor types:

1. Brief introduction
2. How it works
3. Configuration options (table)
4. Examples (multiple, increasing complexity)
5. Best practices (with sub-sections)
6. Troubleshooting (table format)

## File Naming Conventions

- Use lowercase
- Use hyphens for spaces: `email-setup.md`
- Be descriptive: `creating-managing.md` not `create.md`
- Match the slug in docs.json

## Examples of High-Quality Documentation

Reference these examples when writing:
- `/docs/content/setup/email-setup.md` - Comprehensive setup guide
- `/docs/content/monitors/api.md` - Feature documentation with examples
- `/docs/content/alerting/overview.md` - Conceptual overview

## Key Principles

1. **User-First**: Write for users of all skill levels
2. **Scannable**: Use headings, lists, and tables for easy scanning
3. **Actionable**: Users should know what to do after reading
4. **Maintainable**: Use references to avoid update cascades
5. **Accessible**: Clear language, good structure, proper formatting
