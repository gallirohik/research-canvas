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

## The body is REQUIRED and written for an AGENT reader (owner 2026-07-26)

A subject-only commit is a broken contract here. The next reader of this
message is most often an AGENT — ours (atlas recalling why a line exists, the
distiller judging a claim against this change, sage reading shapes) or a
foreign one — so the body must be SELF-CONTAINED and joinable:

- **What, concretely** — the surfaces/behaviors that changed, named (not
  "various fixes"); a reader must know the blast radius without the diff.
- **Why — the intent** — the one thing the diff cannot show. State the
  problem/decision that made this change necessary; paraphrase the pivotal
  choice if one was made (it should also be a `log_decision`).
- **Join keys** — mention the brain notes this change follows or invalidates
  (`per rule <id>` / `staleness: touches <id>`), so the cite-graph and the
  dirty queue read straight out of the log.
- **No session deixis** — never "as discussed", "per the above", "the same
  fix as before": the message must stand alone in `git log` a year later,
  with zero conversation context.

TDD-default red commits keep their fixed form (`[<task-id>] test: red —
<seam>`) — the seam IS the body's content there.

## Why this exists (don't skip the bracket)

The brain-commit hook captures every subject into `intent/<sha>.md`;
`rafa manifest` parses `[task-id]` back out into each note's
`provenance.tasks`. Skip the bracket and the lineage chain (rule ← commit ←
task ← plan) breaks at its first link — the platform can still join
plan ↔ merge via the branch, but per-task attribution is lost for that commit.
