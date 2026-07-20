---
name: rafa-build
description: "rafa SOP — execute the active plan task by task: atlas implements from recalled knowledge, prism gates done on each Done-check, bloom sweeps the ledger; progress + journals sync at checkpoints. Loaded on /rafa build."
---

# build — execute the plan, trio-choreographed, compounding  (capability #4)

> Status: **active.** The work-time loop where recall + validation + improvement all
> fire — the mission payoff. Depends on: plan (#3), brain (#1), ledger (#2).
> Invoke via `/rafa build`.

Execute the approved plan with all three agents in the loop, knowledge served by the
platform MCP (one read path — the same surface any third-party agent uses).

## The trio at build time

| Role | Agent | Job per task |
|---|---|---|
| **Executor** | atlas | RECALL the task's brain slice via MCP (`search_knowledge` + `get_rule`/`get_playbook`; honor non-exemplars) → implement, convention-adherent |
| **Validator** | prism | validate the execution against the child's `## Done-check` — strict, unbiased, against code + brain, never against atlas's claims. **`status: done` only on prism PASS**; FAIL → atlas corrects (validate-and-correct at work time). Plan-done adds one line to the verdict: **working set reviewed — captured, or clean-with-reason** (a build that learned nothing SAYS so; a build that learned something SHOWS the files) |
| **Improver** | bloom | **push**: new improvement opportunities spotted during execution → new ledger files. **close**: improvements fixed in passing → `status: fixed` in the ledger file + `report_improvement_status(id, fixed)` so the platform shows it LIVE as pending-reconciliation (the ledger row itself changes only at the next brain push — K1). **nudge**: top-leverage open item in the task's blast radius — opt-in, never blocking |

## Procedure

1. **Resume** — `get_active_plan` (platform) or local `active.md`; staleness check
   (envelope `brainForSha` vs local stamp → prompt `rafa push` if behind). MCP
   recall is automatic throughout — SOP-driven, never dev-invoked; a repo without
   the `rafinery` MCP connected falls back to local `.rafa/` file reads.
   **Session consent (asked ONCE, verbs ENUMERATED):** *"keep the platform
   updated as I work? That means exactly: (1) plan status + Log pushes on
   cadence, (2) checkpointing this branch's working set (edited/new brain
   files) — announced per file as it happens, (3) nothing else."* Revocable
   anytime ("stop pushing"). On "no": journal locally only, push at the end on
   approval. Dev-level insights are NEVER under this consent — each is its own
   offer.
2. **Per task:** atlas recalls → implements → prism validates vs `## Done-check` →
   bloom sweeps (push new / close fixed / nudge) → update the child file's `status`
   **and append a dated entry to the child's `## Log`** (body links: markdown,
   per [rafa-okf](../rafa-okf/SKILL.md)) — what was done, what was
   decided, what surprised (body prose: displayed verbatim on the platform, never
   parsed; the plan files at `.rafa/plans/<plan>/` ARE the local cache) → at the
   task-done CHECKPOINT (under the session consent): `push_plan` /
   `update_plan_status` (the plans channel — statuses + Log journals) +
   **`log_decision` for each deliberation since the last checkpoint** — what
   came up, what was considered, what the DEV chose, why (actor = the dev for
   steering, the agent for its own proposals; PARAPHRASE + short verbatim
   quotes only where the wording carries the decision — transcripts never land
   in shared stores; mirror each into the item's `## Decisions` section) +
   **`report_loop_event(category: "prism-verdict", outcome: PASS|ITERATE,
   subject: <task id>)`** at the moment prism rules on the Done-check (sage's
   evidence — shapes only: the verdict + the task id, never code) +
   `rafa checkpoint` (the branch working set), so the platform and every MCP
   consumer reflect live progress. Checkpoint moments: task done · plan
   approved · explicit ask · cadence · git push/pull — never session-end. The
   loop-event emits ride the SAME checkpoint beats — one per outcome as it
   occurs, monotonic, NEVER a session-end sweep. The
   git-push boundary is MECHANICAL (M5): the pre-push hook runs `rafa checkpoint`
   itself, non-blocking — the session still owns the task-done/plan-approved
   moments. A checkpoint CONFLICT (a teammate's newer copy of the same file) is
   decided IN THIS SESSION: read the `.theirs.md` copy, merge/adopt/keep,
   re-checkpoint.
3. **Brain changes mid-build — WHERE you are decides WHERE it goes.**
   - **On the default branch (main):** run a full `/rafa scan` (regenerate →
     prism → compile → push); the brain re-stamps at the new sha, so
     `brain = f(code@sha)` stays exact. When the gate runs, emit
     **`report_loop_event(category: "gate-result", outcome: exit0|failed,
     subject: <compile|verify-citations>)`** at that checkpoint beat — the gate's
     own moment, never deferred to session-end.
   - **On any other branch:** the org brain is NEVER written from a branch —
     it describes main, and a branch-state scan would poison it for everyone.
     Invalidated/learned knowledge → the branch **working set**: hydrate the
     affected note (`rafa hydrate <rule|playbook> <id>`) and edit it, or author
     a new note file under `.rafa/brain/**` — `rafa checkpoint` syncs it. It
     enters the org brain at merge-to-main, through distillation. This is the
     knowledge-propagates-like-code rule, enforced.
   The working-set files ARE the sanctioned branch authoring surface — what is
   never allowed is editing main's brain around the scan/compile/push gates.
4. **Verify** (prism-style) before declaring the plan done; final `push_plan` +
   `set_active_plan` (clear) + `rafa checkpoint`. A plan that stops being worth
   finishing closes honestly: `superseded` or `abandoned`, never fake-`done`.
   Plan-done is also a **staleness boundary**: read `rafa dirty --json` — if the
   build's edits dirtied notes this session didn't already refresh, surface the
   scoped-refresh offer NOW (on main: refresh → gates → push; on a branch:
   working-set edit → checkpoint), and `rafa dirty --consume` only after it ships.

**Lite plans** (single-child, from plan-lite) run the same per-task loop — the
Done-check gate never relaxes; only the ceremony around it shrinks (no bloom nudge,
single checkpoint + plan push at the end).

## Deferred / open
- **The capture engine** — `Stop`/`PostToolUse` hooks making the gates + capture
  automatic rather than conductor-driven SOP (deterministic-enforcement lesson).
- **Incremental re-scan** — cite-graph invalidation (diff → invalidate notes citing
  changed files → re-verify/regenerate only those). Needs: partial-brain cache-key
  semantics + the seam-neighbor scope rule. Designed (see
  .fable/sessions/2026-07-07-brain-versioning-and-incremental.md); first post-loop item.
- Show-thinking + pivot protocol from the atlas character.
