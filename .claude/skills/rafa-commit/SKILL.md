---
name: rafa-commit
description: "rafa SOP — generate the commit message with the id join-key: the active task id rides the subject ([task-id] type: subject), making commit → task → plan → brain-delta lineage mechanical. Loaded at commit moments during /rafa build or on request."
---

# commit — the id join-key  (the commit contract)

> Status: **active.** The commit message is a JOIN KEY, not prose: the task id
> in the subject is what lets the platform walk rule ← commit ← task ← plan
> mechanically (intent records capture the subject per commit; the branch
> manifest lifts task ids into per-note `provenance.tasks`). Invoked at commit
> moments in /rafa build, or explicitly.

## The format

```
[<task-id>] <type>: <subject>

<body — what and why, wrapped>
```

- `<task-id>` — the ACTIVE plan item this commit advances (the in-progress
  leaf from `get_active_plan` / local `active.md`). Exactly one; the deepest
  in-progress leaf wins when nested. Work outside any plan (direct-do) omits
  the bracket entirely — `<type>: <subject>` — never a fake id.
- `<type>` — conventional: feat | fix | refactor | perf | test | docs | chore.
- `<subject>` — imperative, ≤ 72 chars including the bracket.

## Procedure

1. Resolve the active task: `get_active_plan` (platform) or `active.md` +
   child statuses (local). No active plan / no in-progress leaf → no bracket.
2. Compose from the STAGED DIFF (never from memory of the session): what
   changed, why, in the repo's own voice.
3. On task completion commits, the body's last paragraph notes the Done-check
   outcome one-line ("Done-check: prism PASS") — the receipt travels with the
   code.

## Why this exists (don't skip the bracket)

The brain-commit hook captures every subject into `intent/<sha>.md`;
`rafa manifest` parses `[task-id]` back out into each note's
`provenance.tasks`. Skip the bracket and the lineage chain (rule ← commit ←
task ← plan) breaks at its first link — the platform can still join
plan ↔ merge via the branch, but per-task attribution is lost for that commit.
