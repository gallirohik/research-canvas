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
| **Validator** | prism | validate the execution against the child's `## Done-check` — strict, unbiased, against code + brain, never against atlas's claims. **`status: done` only on prism PASS**; FAIL → atlas corrects (validate-and-correct at work time). **TDD tasks (wave 6): green re-run LIVE; red per tier (standard = attested `method:"static"` · full = re-run at the red commit in a throwaway worktree). Findings carry `Critical (Must Fix) · Important (Should Fix) · Minor (Nice to Have)` — ITERATE iff any Critical/Important; Minor NEVER flips the verdict.** Plan-done adds one line to the verdict: **working set reviewed — captured, or clean-with-reason** (a build that learned nothing SAYS so; a build that learned something SHOWS the files) |
| **Improver** | bloom | **push**: new improvement opportunities spotted during execution → new ledger files. **close**: improvements fixed in passing → `status: fixed` in the ledger file + `report_improvement_status(id, fixed)` so the platform shows it LIVE as pending-reconciliation (the ledger row itself changes only at the next brain push — K1). **nudge**: top-leverage open item in the task's blast radius — opt-in, never blocking. **audit**: a task that touched a lockfile or manifest re-runs the cheap dependency tier (`rafa audit --json`, contract §12.5) and reports the delta in one transparent line — new or cleared findings, never silence; a newly-surfaced critical becomes a `category: security` P0 row now |
| **Coach** | compass | **sitback** (harness-arc): after each task's verdict + sweep, one beat of reflection — did THIS task reveal something about how this DEV works (a preference, a recurring friction, a steering pattern)? Repo knowledge goes to the working set, never here. A genuine dev-level observation becomes its OWN opt-in offer (consent doctrine: insights are NEVER under session consent) → `put_dev_insight` on yes. No observation = no offer — silence is the honest default |

## Procedure

1. **Resume** — `get_active_plan` (platform) or local `active.md`; staleness check
   (envelope `brainForSha` vs local stamp → prompt `rafa push` if behind). MCP
   recall is automatic throughout — SOP-driven, never dev-invoked; a repo without
   the `rafinery` MCP connected falls back to local `.rafa/` file reads.
   **On a feature branch, pass `branch: <current git branch>` to
   search_knowledge/get_rule/get_playbook/get_improvement** — recall then
   overlays the branch's live working set on canon, every non-canonical result
   tier-labeled (the alert rule: a `source: {tier: "candidate"}` or
   `branchOverlay` is branch state, not org truth — say so when you rely on it).
   **Session consent (asked ONCE, verbs ENUMERATED):** *"keep the platform
   updated as I work? That means exactly: (1) plan status + Log pushes on
   cadence, (2) checkpointing this branch's working set (edited/new brain
   files) — announced per file as it happens, (3) nothing else."* Revocable
   anytime ("stop pushing"). On "no": journal locally only, push at the end on
   approval. Dev-level insights are NEVER under this consent — each is its own
   offer.
2. **Per task:** atlas recalls → implements → **commits use the
   [rafa-commit](../rafa-commit/SKILL.md) format — `[<task-id>] <type>:
   <subject>` (the id join-key; intent records + the branch manifest lift it
   into per-note provenance)** → prism validates vs `## Done-check` →
   bloom sweeps (push new / close fixed / nudge; and when THIS task touched a
   lockfile or manifest, the dependency-tier re-audit + one-line delta fires —
   bloom's **audit** clause in the trio table above) → update the child file's
   `status`
   **and append a dated entry to the child's `## Log`** (body links: markdown,
   per [rafa-okf](../rafa-okf/SKILL.md)) — what was done, what was
   decided, what surprised (body prose: displayed verbatim on the platform, never
   parsed; the plan files at `.rafa/plans/<plan>/` ARE the local cache) → the
   task-done CHECKPOINT is **ONE beat (wave 5), two calls total**, under the
   session consent:
   **(a) `checkpoint_task`** — the atomic boundary write (all-or-nothing,
   idempotent on retry) carrying together: `patch: {status, body}` (the item's
   new status + its full body with the fresh `## Log` entry — never a
   whole-tree `push_plan` for one task); `loopEvent: {category:
   "prism-verdict", outcome: PASS|ITERATE, subject: <task id>, tier: <the
   task's validation_tier>, verification: <prism's evidence entry — method
   static|live + tool + exit code, straight from its structured return>,
   actorMeta: {model: <ruling model>, agent: "prism@<card ver>", runner:
   "session"}, dedupeKey: "<task-id>·v<attempt>"}` (the emit rides the ruling's
   OWN moment, never a session-end sweep; the dedupeKey makes a retried beat
   count ONCE — the non-idempotent-emit learning, closed); and `decisions:
   [...]` — each deliberation since the last beat with a CLIENT-STABLE id
   (`<task-id>·d1`, `·d2` …): what came up, what was considered, what the DEV
   chose, why (actor = the dev for steering, the agent for its own proposals;
   PARAPHRASE + short verbatim quotes only where the wording carries the
   decision — transcripts never land in shared stores; mirror each into the
   item's `## Decisions` section).
   **(b) `rafa checkpoint`** — the branch working set + sensor heartbeat +
   brain mirror (the CLI beat; it also refreshes the loop-event cache the
   sage-due digest reads).
   `push_plan` remains for CREATION and structure changes only;
   `update_plan_status`/`log_decision` stay valid but the one-beat call
   replaces them at task boundaries. Checkpoint moments: task done · plan
   approved · explicit ask · cadence · git push/pull — never session-end. The
   git-push boundary is MECHANICAL (M5): the pre-push hook runs `rafa checkpoint`
   itself, non-blocking — the session still owns the task-done/plan-approved
   moments. A checkpoint CONFLICT (a teammate's newer copy of the same file) is
   decided IN THIS SESSION: read the `.theirs.md` copy, merge/adopt/keep,
   re-checkpoint.
3. **Brain changes mid-build — WHERE you are decides WHERE it goes.**
   - **On the default branch (main):** run a full `/rafa scan` (regenerate →
     prism → compile → push); the brain re-stamps at the new sha, so
     `brain = f(code@sha)` stays exact. gate-result loop events are
     **MECHANICAL** (wave 5): the push gates emit them CLI-stamped — actor
     envelope, `method: "live"` verification with the real exit code, and a
     `(gate·sha·outcome)` dedupeKey. The session never hand-emits gate-result;
     the double-emit class died with the non-idempotent-emit learning.
   - **On any other branch:** the org brain is NEVER written from a branch —
     it describes main, and a branch-state scan would poison it for everyone.
     Invalidated/learned knowledge → the branch **working set**: hydrate the
     affected note (`rafa hydrate <rule|playbook|improvement> <id>`) and edit
     it, or author a new note file under `.rafa/brain/**` — `rafa checkpoint`
     syncs it. Ledger status edits (bloom's `fixed`) ALWAYS hydrate first. It
     enters the org brain at merge-to-main, through distillation. This is the
     knowledge-propagates-like-code rule, enforced.
   The working-set files ARE the sanctioned branch authoring surface — what is
   never allowed is editing main's brain around the scan/compile/push gates.
   **Gap close-out:** authored knowledge that answers an in-scope knowledge
   gap (adopted at plan time via `get_knowledge_gaps`) closes the loop —
   `set_gap_status(q, "closed")` at the same beat the note is authored.
4. **Verify** (prism-style) before declaring the plan done — including the
   [rafa-review](../rafa-review/SKILL.md) gate: `rafa review` scopes the exact
   rules/improvements the branch's diff touches; the judge rules on that list
   + each Done-check, emits `review-verdict`; final `push_plan` +
   `set_active_plan` (clear) + `rafa checkpoint`. **Dual status (single/double
   tick):** `status: done` is the dev ✓ — prism-earned, session-set, for
   leaves AND the epic (the epic's ✓ = every leaf verified done). DELIVERY is
   the separate ✓✓: the platform stamps `merged` per item when the branch
   merges to main (the reconciliation is the receipt; sessions can never
   write it; intermediate merges re-point the plan to the target branch so
   stacked branches converge). The board shows "awaiting merge" between ✓ and
   ✓✓. A plan that stops being worth
   finishing closes honestly: `superseded` or `abandoned`, never fake-`done`.
   Plan-done is also a **staleness boundary**: read `rafa dirty --json` — if the
   build's edits dirtied notes this session didn't already refresh, surface the
   scoped-refresh offer NOW (on main: refresh → gates → push; on a branch:
   working-set edit → checkpoint), and `rafa dirty --consume` only after it ships.

## TDD-default (wave 6 — code tasks build red → green)

**Eligibility gate (deterministic, decided once per session):** the `tdd` skill
is installed (`.agents/skills/tdd/` — the toolbox slice says so) AND the repo
has a test harness — checklist, first hit wins: `package.json` `test` script ·
`vitest.config.*`/`jest.config.*` · `pytest.ini`/`pyproject [tool.pytest]` ·
`go.mod` with `*_test.go` · `Cargo.toml`. Bank the answer as a session fact
(`rafa facts add --claim="test harness: <runner>" --command="<detect>" --exit=0
--depends=package.json`) so no later spawn re-derives it. Not eligible → the
pre-wave path below, unchanged, plus a `factsDiscovered: ["tdd unavailable:
<reason>"]` note in atlas's return — bloom may later surface a tooling-fit
improvement; NEVER a mid-build nag.

**The loop (per the installed tdd skill — atlas INVOKES it; its anti-patterns
are prism's criteria):**
1. **Red** — atlas authors the failing test FIRST, at the seam the plan's
   Done-check names (the seam was dev-confirmed at approval — never invented
   here). Run it; it must FAIL for the right reason. Commit
   `[<task-id>] test: red — <seam>` (full tier prefers the split commit; at
   standard tier the evidence object below is the durable proof and red+green
   may land as one commit).
2. **Green** — implement the minimal slice to exit 0. One seam, one test, one
   vertical slice per cycle — never all-tests-then-all-code.
3. **Refactor is NOT part of the loop** — it belongs to the review stage
   (tdd SKILL.md's own rule + the [rafa-review](../rafa-review/SKILL.md) gate;
   bloom's no-big-bang directive is the same law).
Evidence rides atlas's structured return —
`evidence: [{claim: "red", tool: "<runner>", exitCode: 1}, {claim: "green",
tool: "<runner>", exitCode: 0}]` + `skillsUsed: ["tdd"]` — and
`how: via the tdd skill` lands in the item's `approach`.

**prism's verification, tier-scaled:** green is ALWAYS re-run live (tool
authenticity: binary + real exit code). Red at **standard** = attested from
atlas's evidence, labeled `method: "static"`; at **full** = re-run at the red
commit in a throwaway worktree (`git worktree add`), labeled `method: "live"`.
Mock discipline is a finding class: mocks only at system boundaries, never the
repo's own collaborators (the tdd skill's mocking reference is the criteria).

## UI tasks — the design method (wave 6)

**Trigger:** the task's epic `domains:` include a UI domain, or its target
files land in the app's component/route surfaces — the BRAIN's domain map
decides, never a hardcoded path list.

**Method (when the skills are installed — the toolbox slice says):** atlas
**INVOKES** `frontend-design` (Skill tool) for the two-pass plan — token
system (Color 4–6 named values · Type roles · Layout · the ONE signature
element), then self-critique against the brief before any code — and CONSULTS
`vercel-composition-patterns` for component structure (no boolean-prop
sprawl · compound components · state/actions/meta context · children over
render props), gating the `react19-*` rules on the repo's actual React version
(a React ≤18 repo skips them, stated in the return).

**Adherence vs distinctive — the brain decides:** when the brain documents a
design system (theme tokens, component conventions), those notes ARE the
brief and the skill's own "the brief's own words always win" rule applies —
adherence mode, distinctiveness spent within the system. No design-system
notes (greenfield/marketing surface) → distinctive mode, full method. Record
`how: via the frontend-design skill` (+ vercel-composition-patterns when
consulted). Skills declined → the pre-wave path + a `factsDiscovered` note.

## Spawn-prompt discipline (wave 5 — pay once, cite after)

- **Session facts first.** Every atlas/prism spawn prompt begins by pointing at
  `.rafa/session-facts.json` (read first; cite `SF-n unchanged` where it holds;
  bank new expensive verifications via `rafa facts add`). Six agents
  re-deriving one environment fact was the QA session's headline waste.
- **Never restate card doctrine.** The card already binds the agent's creed
  (prism's skepticism, atlas's toolbox-first) — a spawn prompt carries ONLY the
  task-specific grounding: the task file, the exact target files/patterns, the
  `validation_tier`, the facts pointer. Re-explaining the card in every prompt
  is conductor inefficiency, not rigor.
- **Compact agent-to-agent register.** A subagent's primary reader is the
  CONDUCTOR: terse-with-citations by default, ending in the structured return
  (prism: `{verdict, evidence[], residualRisk}` · atlas: `{filesChanged,
  commitSha, notes, factsDiscovered}`) — Logs and loop events assemble from
  FIELDS, never re-paraphrased prose. Expand to full prose only on ITERATE or
  when the human will read it directly.

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
