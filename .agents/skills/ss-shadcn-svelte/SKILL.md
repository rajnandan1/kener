---
name: ss-shadcn-svelte
description: >
  Use shadcn-svelte components in SvelteKit projects. Detects whether the current project is a SvelteKit
  app with shadcn-svelte installed, lists available components, and provides access to full component
  documentation via the official llms.txt. Helps choose the right UI components for the job — buttons,
  forms, dialogs, tables, charts, and more — following shadcn-svelte best practices.
  Use this skill whenever the user is working in a SvelteKit project and wants to: add UI components,
  build forms, create dialogs or modals, add a data table, use a date picker, build a sidebar or
  navigation, add charts, use a combobox or select, create an alert or toast notification, or generally
  build UI with pre-built accessible components. Also trigger when the user mentions "shadcn", "shadcn-svelte",
  "bits-ui", or asks about available components in their Svelte project.
---

# shadcn-svelte — Component-Aware Svelte UI Assistant

Use the right shadcn-svelte components when building UI in SvelteKit projects. This skill detects your project setup, shows what's available, and gives you access to full component documentation.

## Prerequisites

The project must be a SvelteKit app with shadcn-svelte initialized:

```bash
# Initialize shadcn-svelte in an existing SvelteKit project
npx shadcn-svelte@latest init
```

## How to use

### Step 1: Detect project setup

Run the detection script to verify this is a SvelteKit project with shadcn-svelte and see which components are already installed:

```bash
bash <skill-path>/scripts/detect.sh .
```

This will:
- Confirm it's a SvelteKit project (checks for `svelte.config.js/ts` and `@sveltejs/kit` in package.json)
- Confirm shadcn-svelte is installed (checks for `components.json`, `bits-ui`, or `shadcn-svelte` in package.json)
- List all currently installed components in the project's UI directory
- Provide the documentation URL

If the script exits with code 1, the project either isn't SvelteKit or doesn't have shadcn-svelte — do not proceed with shadcn-svelte components in that case.

### Step 2: Read the component documentation

The full component documentation for LLMs is available at:

```
https://www.shadcn-svelte.com/llms.txt
```

Fetch this URL to get a structured index of all available components organized by category, with links to individual component documentation pages (in `.md` format).

When you need to use a specific component, read its individual documentation page from the links provided in `llms.txt`. Each component doc includes:
- Import statements and usage examples
- Available props, events, and slots
- Variants and configuration options
- Accessibility information

### Step 3: Use the right component for the job

When building UI, follow this decision process:

1. **Run detection** to confirm shadcn-svelte is available and see installed components
2. **Fetch llms.txt** to see all available components
3. **Read the specific component docs** for the components you plan to use
4. **Check if the component is installed** — if not, add it:
   ```bash
   npx shadcn-svelte@latest add <component-name>
   ```
5. **Import and use the component** following the documentation patterns

### Component categories

shadcn-svelte components are organized into these categories:

| Category | Components |
|----------|-----------|
| **Layout** | Aspect Ratio, Collapsible, Resizable, Scroll Area, Separator, Sidebar |
| **Form & Input** | Button, Calendar, Checkbox, Combobox, Date Picker, Input, Input OTP, Label, Radio Group, Range Calendar, Select, Slider, Switch, Textarea, Toggle, Toggle Group |
| **Data Display** | Accordion, Avatar, Badge, Card, Carousel, Chart, Table, Data Table |
| **Feedback** | Alert, Alert Dialog, Progress, Skeleton, Sonner (Toast) |
| **Overlay** | Context Menu, Dialog, Drawer, Dropdown Menu, Hover Card, Menubar, Popover, Sheet, Tooltip |
| **Navigation** | Breadcrumb, Command, Pagination, Tabs |
| **Typography** | Typography |

### Adding new components

```bash
# Add a single component
npx shadcn-svelte@latest add button

# Add multiple components
npx shadcn-svelte@latest add button card dialog

# List all available components
npx shadcn-svelte@latest add
```

### Import patterns

Components are typically imported from the project's `$lib/components/ui` directory:

```svelte
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import * as Dialog from "$lib/components/ui/dialog";
</script>
```

Some components use namespace imports (with `* as`) when they have multiple sub-components (Card, Dialog, Sheet, Table, etc.), while simpler components use named imports (Button, Input, Badge, etc.).

## Important guidelines

- **Always run detection first** before suggesting shadcn-svelte components
- **Always read component docs** before using a component — don't guess at props or patterns
- **Check installed components** and add missing ones before importing
- **Use the project's configured path** — the components directory may vary based on `components.json` configuration
- **Follow Svelte 5 patterns** — shadcn-svelte uses runes (`$state`, `$derived`, `$effect`) and snippet-based composition
- **Prefer composition** — shadcn-svelte components are designed to be composed together, not used as monolithic blocks
