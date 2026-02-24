---
name: code-architecture
description: Persistent project memory via a `.codearch/` folder.
user-invokable: false
metadata:
    category: architecture
---

# code-architecture — Project Memory Skill

Use this skill at the START and END of every coding session, agentic task, or multi-step file operation. Trigger whenever the user asks you to work on a codebase, fix a bug, refactor, review code, or continue work from a previous session. Also trigger if the user mentions "context," "memory," "remember this," "pick up where we left off," or references prior work. This skill tells you how to read relevant context before acting and how to compress + save what you learned after acting. Always use it — skipping it loses hard-won context.

`.codearch/` is a folder that lives at the project root. It stores compressed context files so you can resume work without re-deriving what was already figured out.

---

## Before Every Run — Load Context

**Do this before writing any code or answering any question about the codebase.**

### Step 1: Scan the folder

```bash
ls .codearch/
```

If the folder doesn't exist, skip to the run. You'll create it after.

### Step 2: Find relevant files

Two approaches — use both if unsure:

**A. File name scan** — Read the file names. Match against the current task (e.g., working on auth? look for `auth.md`, `session.md`, `jwt.md`).

**B. Text search** — Search inside files for keywords from the task.

```bash
grep -ril "<keyword>" .codearch/
```

Run multiple greps if the task spans several concepts.

### Step 3: Read relevant files

Read only the files that match. Don't load the entire folder into context unnecessarily.

```bash
cat .codearch/<relevant-file>.md
```

### Step 4: Apply the context

Use what you read to inform your approach. Don't re-derive decisions already documented. If a file says "we chose X over Y because of Z," respect that unless the user explicitly overrides it.

---

## After Every Run — Save Context

**Do this after completing the task, before ending the session.**

### Step 1: Write a summary

Compress what happened into a short summary. Cover:

- What the task was
- What you changed or built
- Key decisions made (and why)
- Gotchas, constraints, or warnings for next time
- Files/modules touched
- Anything left unresolved

Keep it under 200 words. Dense is better than verbose.

**Example summary:**

```
Task: Refactored auth middleware to support refresh tokens.
Changes: Modified src/middleware/auth.go and src/handlers/refresh.go.
Decisions: Used Redis for token storage (not DB) — avoids write contention under load.
Gotcha: JWT secret is loaded from env at startup only; restart required after rotation.
Unresolved: Rate limiting on /refresh endpoint not yet implemented.
```

### Step 2: Find the right file to update

Check if the summary fits an existing `.codearch/` file:

```bash
ls .codearch/
grep -ril "<topic keyword>" .codearch/
```

**Match logic:**

| Situation                          | Action                      |
| ---------------------------------- | --------------------------- |
| File exists and topic matches      | Append summary to that file |
| File exists but topic is a stretch | Create a new file           |
| No file matches                    | Create a new file           |

### Step 3: Write or update the file

**Appending to an existing file:**

```bash
cat >> .codearch/<existing-file>.md << 'EOF'

---
## Session: <brief date or task label>

<your summary here>
EOF
```

**Creating a new file:**

Name it after the topic, not the date. Good names: `auth.md`, `database-schema.md`, `api-design.md`, `deployment.md`. Bad names: `session-2024-01-15.md`, `notes.md`, `misc.md`.

```bash
cat > .codearch/<topic>.md << 'EOF'
# <Topic Title>

## Session: <brief task label>

<your summary here>
EOF
```

### Step 4: Create the folder if it doesn't exist

```bash
mkdir -p .codearch
```

Do this before writing if the folder is missing.

---

## File Naming Rules

- One file per logical domain (`auth`, `billing`, `database`, `api`, `deployment`, `testing`)
- Use kebab-case for multi-word topics: `rate-limiting.md`, `background-jobs.md`
- Never use dates as file names
- Never use generic names: `notes`, `misc`, `temp`, `context`
- If a file grows beyond ~300 lines, split it by subtopic

---

## What Makes a Good `.codearch` Entry

**Include:**

- Decisions and their rationale
- Non-obvious constraints (env vars, external dependencies, config quirks)
- What was tried and rejected
- Known bugs or tech debt left behind
- Key file paths and what they do

**Exclude:**

- Code snippets (link to files instead)
- Step-by-step logs of what you typed
- Anything that's obvious from reading the code

---

## Example `.codearch/` Structure

```
.codearch/
├── auth.md              # JWT strategy, refresh token design, middleware notes
├── database-schema.md   # Table decisions, migration gotchas, index rationale
├── api-design.md        # REST conventions, versioning decisions, error formats
├── deployment.md        # Docker setup, env var requirements, CI notes
└── background-jobs.md   # Queue design, retry logic, failure handling
```

---

## Quick Reference

| When                   | What to do                                                   |
| ---------------------- | ------------------------------------------------------------ |
| Start of task          | `ls .codearch/` → grep for keywords → read matches → proceed |
| End of task            | Write summary → find matching file → append or create        |
| Folder missing         | `mkdir -p .codearch` then proceed                            |
| No relevant file found | Skip loading; create one after the run                       |
| Ambiguous match        | Read both files; create a new one if neither fits well       |
