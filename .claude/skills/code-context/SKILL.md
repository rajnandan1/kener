---
name: code-context
description: Persistent code architecture documentation via a `.codecontext/` folder.
user-invokable: false
metadata:
    category: architecture
---

# Code Architecture Documentation Skill

Use this skill to **read architecture docs before work** and **document architecture after work** using the `.codecontext/` folder.

`.codecontext/` is a living architecture reference — it helps new developers onboard and coding agents pick up where previous sessions left off. It is **NOT** a session log, changelog, or task diary.

---

## What Belongs in `.codecontext/`

Only document **architecture-level knowledge** that would take significant effort to rediscover by reading code alone.

### Include

- **Code architecture** — how modules/components are structured, layered, and why
- **Code flow** — request lifecycle, data flow between layers, event/cron pipelines
- **Component relationships** — which modules depend on each other, call chains, shared state
- **Edge cases and gotchas** — non-obvious behaviors, race conditions, ordering constraints
- **Design decisions and rationale** — why a pattern was chosen over alternatives
- **Integration points** — how external services, databases, queues connect
- **Invariants and constraints** — rules that must hold (e.g., "timestamps are always UTC seconds", "all DB access goes through db singleton")
- **Error handling patterns** — how errors propagate, retry logic, fallback behavior
- **Key file map** — which files own which responsibilities (only when non-obvious)

### Exclude

- Session logs, changelogs, or diary-style entries
- What files were changed in a specific task
- Raw terminal output or build logs
- Code snippets (reference file paths + line ranges instead)
- Obvious facts that can be inferred from reading one file
- Task status, TODO lists, or progress tracking
- Anything already covered in README, AGENTS.md, or inline comments

---

## Trigger Conditions

Run this skill at the **start and end** of any coding task that touches architecture:

- Feature implementations spanning multiple files/modules
- Refactors that change module boundaries or data flow
- Bug fixes that reveal non-obvious system behavior
- New integrations or service connections
- Discovery of undocumented edge cases or invariants
- **After any agent run** — if the agent explored, read, or traced code to understand how part of the codebase works, that understanding must be captured (see Phase C)

**Skip** for trivial changes (typo fixes, single-line edits, style-only changes).

---

## Phase A — Read Architecture Docs (Before Acting)

### A1) Discover docs

```bash
ls .codecontext/
```

If `.codecontext/` does not exist, continue the task and create it in Phase B.

### A2) Find relevant docs

```bash
grep -ril "<domain keyword>" .codecontext/
```

Use keywords from the feature area you are working on (e.g., "alerting", "auth", "monitors", "cron").

### A3) Read and apply

Read only relevant files. Extract:

- Architecture constraints that affect your implementation
- Code flow you need to hook into or extend
- Edge cases to preserve or handle
- Integration points to respect

If existing docs conflict with current code, trust the code — update docs in Phase B.

---

## Phase B — Document Architecture (Before Ending)

Only write/update docs if the task revealed architecture knowledge worth preserving.

### B1) Decide what to document

Ask: _"Would a new developer or future agent need to re-discover this to work in this area?"_

If yes, proceed. If no, skip Phase B entirely.

Then apply this filter to **every sentence** before writing:

> "Does this sentence describe how the code is structured, a design decision, or a constraint that would change how someone writes future code in this area?"

If no → cut it. This is the line between architecture documentation and a session diary.

### B2) Write architecture documentation

Structure each doc as a **reference document**, not a session diary.

Template (use only the sections that apply):

```markdown
# <Domain/Feature Area>

## Overview

Brief description of what this area does and its role in the system.

## Architecture

How the components are structured, key abstractions, layers.

## Code Flow

Step-by-step flow for the primary operations (e.g., "How a monitor check executes").

## Key Files

| File                 | Responsibility |
| -------------------- | -------------- |
| `src/lib/server/...` | Does X         |

## Edge Cases and Gotchas

- Non-obvious behavior 1
- Constraint that must be preserved

## Design Decisions

- Why X was chosen over Y (if non-obvious)
```

Not all sections are required — include only what is relevant. Keep each doc under **300 lines**.

### B3) Pick target file

```bash
ls .codecontext/
grep -ril "<topic keyword>" .codecontext/
```

| Condition                       | Action                           |
| ------------------------------- | -------------------------------- |
| Existing doc covers this domain | Update/rewrite relevant sections |
| Different domain                | Create new file                  |
| No match                        | Create new file                  |

When updating, **replace outdated sections** rather than appending session entries. The doc should always read as a clean, current architecture reference.

### B4) Persist

```bash
mkdir -p .codecontext
```

Create or overwrite the file so it reads as a standalone reference:

```bash
cat > .codecontext/<domain>.md
```

---

## Phase C — Capture Agent Understanding (After Any Agent Run)

After completing any task (coding, debugging, research, exploration), review what you learned about the codebase during the session and persist anything not already documented.

### C1) Identify new understanding

Reflect on what you discovered during this session:

- How does a feature/module actually work? (code flow, data transformations, call chains)
- What patterns or conventions did you observe across multiple files?
- What dependencies or relationships between modules did you trace?
- What surprised you or was non-obvious? (hidden side effects, implicit ordering, shared state)
- What constraints or invariants did you discover that aren't documented anywhere?

### C2) Check if already documented

```bash
ls .codecontext/
grep -ril "<keyword>" .codecontext/
```

Read matching files. If the understanding is already captured accurately, skip. If partially captured, update the relevant sections.

### C3) Write or update docs

Apply the same quality filters from Phase B (B1 architecture filter). Then:

- If the understanding maps to an existing `.codecontext/` file, update the relevant sections
- If it covers a new domain area, create a new file following the B2 template and naming rules
- Merge your new understanding with existing content — do not duplicate or contradict

### C4) Scope

This phase applies even when:

- The task was **read-only** (research, exploration, answering questions about code)
- The task was a **bug investigation** that didn't result in a fix
- The agent **traced code flow** to understand behavior before making changes
- The agent **read multiple files** to understand how a feature works

This phase does **NOT** apply when:

- The agent only touched a single file and learned nothing non-obvious
- The understanding is already fully captured in existing `.codecontext/` docs
- The session was trivial (formatting, typo fix, config change)

---

## Naming Rules

- Name by domain/feature area: `alerting.md`, `auth.md`, `monitor-execution.md`, `incident-lifecycle.md`
- Use kebab-case for multi-word topics
- Never use generic names: `notes.md`, `misc.md`, `context.md`, `session-1.md`
- One file per bounded domain — split if a file exceeds ~300 lines

---

## Fast Checklist

Before coding:

- [ ] Checked `.codecontext/` for relevant architecture docs
- [ ] Applied constraints and patterns from existing docs

Before finishing:

- [ ] Every sentence passed the B1 architecture filter
- [ ] Documented any new architecture knowledge discovered
- [ ] Updated outdated docs if current code contradicts them
- [ ] Doc reads as a clean architecture reference, not a session log

After any agent run:

- [ ] Reviewed what was learned about the codebase during this session
- [ ] Checked if that understanding is already in `.codecontext/`
- [ ] Persisted any new architectural knowledge (even from read-only/research sessions)
