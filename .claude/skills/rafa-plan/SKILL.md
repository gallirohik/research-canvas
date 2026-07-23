---
name: rafa-plan
description: "rafa SOP — brain-grounded, prism-validated decomposition of an intent into contract §7 plan files (each child with a Done-check); plan-lite for small blast radius. Loaded on /rafa plan or plan-shaped intent."
---

# plan — brain-grounded, prism-validated decomposition  (capability #3)

> Status: **active.** The first *consumer* of the stores — where the brain starts to
> pay off. Depends on: brain (#1), ledger (#2). Invoke via `/rafa plan <intent>`.

Turn an intent into an approval-gated plan (contract §7 files), *grounded* in the
brain (don't re-derive), *aware* of the ledger (fold improvement into the work), and
**validated by prism before the owner ever sees it**.

## The trio at plan time

Planning is a choreography, not one agent (spec: knowledge-mcp-build-agent):

- **atlas drafts** — RECALL the brain slice for the intent's domains through the
  knowledge MCP (`get_coverage` to navigate → `search_knowledge` → `get_rule` /
  `get_playbook`, including non-exemplars), name the BLAST RADIUS from coverage,
  decompose into parent + child plan files. *Recall is automatic — the SOP calls
  the tools; the dev never asks for it. Repo not platform-connected (no `rafinery`
  MCP in the session)? Fall back to reading `.rafa/brain/` files directly — same
  knowledge, just unserved.*
- **bloom pulls** — `list_improvements` in the blast radius; surface the
  top-leverage open items as optional *"while-you're-here"* child tasks
  (leverage-ranked, dismissible, never blocking). **Any improvement the plan
  ADOPTS (as a task or the plan's very subject) is hydrated NOW** —
  `rafa hydrate improvement <id>` — so the canonical ledger file is in the
  branch working set from the start and the eventual `status: fixed` edit lands
  on that same file, never a path-drifted twin authored at build's end.
  **Also pull `get_knowledge_gaps`** (the open backlog — what devs asked that
  the brain couldn't serve): a top-missed gap inside the blast radius is live
  demand — offer it as a while-you're-here task; on adoption call
  `set_gap_status(q, "in-scope")` (and `out-of-scope` with a one-line note is
  an honest dismissal — silence is not).
- **prism validates the plan itself** — before the approval gate: is every task
  grounded in real brain/code (not hallucinated ground)? does every child carry a
  `## Done-check` (the expected outcome prism will validate execution against)?
  A plan whose children lack Done-checks is REJECTED here — compile never parses
  bodies (invariant #3); this gate is prism's.

## Procedure

1. **Staleness check** — compare the platform envelope's `brainForSha` against the
   local brain stamp; if the platform is behind, surface "run `rafa push`" (never
   proceed silently on knowledge you know is stale — never block either).
2. **Recall** (atlas, via MCP) — `get_coverage` now carries **`recentDeltas`**
   (the last trunk merges' knowledge changes + which plan delivered each):
   open the plan draft with a TWO-LINE BRIEFING of what changed in the blast
   radius since it was last touched — planning starts from the deltas, never a
   stale mental model. `search_knowledge` may return a **`decisions`** block
   (prior recorded calls matching the query): read it BEFORE re-litigating a
   settled decision — reopening one is the owner's move, not the plan's.
   Then **decompose** into the WORK-ITEM TREE (contract
   §7 v2): one epic → tasks → subtasks (three ranks, never deeper). Every item
   carries the glimpse fields — `title` (what) · `description` (why) ·
   `approach` (how, one line) · `assignee` when known · `blocked_by` for
   intra-plan dependencies (a dependency IS a blocker; blocked is DERIVED,
   never a status) · optional `priority` 0–4 / `estimate`. Every LEAF carries a
   `## Done-check`. The blast radius goes on the EPIC's `domains:` — it rides
   `push_plan` and the platform renders the plan's brain slice beside it.
   ADR material (alternatives, risks, non-goals) lives in the epic body AND
   the pivotal choices are logged as DECISIONS at approval (`log_decision`:
   context · options · decision · rationale; actor = the dev for their calls).
3. **Ledger pull** (bloom) → optional leverage tasks in the blast radius.
4. **Leverage-match** — recommend existing skills/tools/MCP that fit the tasks;
   never plan to hand-roll what a capability already does.
5. **prism plan-validation** → REJECT/fix loop until clean.
6. **Approval gate** (owner). Then materialize `plans/<plan>/*.md` per contract §7
   (plan files ride the OKF surface — markdown links in bodies; see [rafa-okf](../rafa-okf/SKILL.md))
   (parent + child-owned files, globally-unique prefixed ids; **the EPIC's
   frontmatter stamps `branch:` = the current git branch** — the platform
   joins merge events on this field to stamp the delivery ✓✓ (`merged`) per
   item, and re-points it through intermediate merges)
   + `active.md` pointer
   → `rafa compile` (validate the files) → **`push_plan` + `set_active_plan`
   immediately, no second prompt — plan approval IS the push trigger** (the
   dedicated plans channel; plans never ride the brain manifest). The dev just
   approved this exact content; a connected repo renders it on the platform
   within moments, resumable from ANY session, machine, or teammate — *"list
   plans"* shows names only; *"load plan X"* (`get_plan`) materializes the full
   plan (bodies included) back into `.rafa/plans/`.

## plan-lite — the light path (a mode of THIS SOP, not a bypass)
The full choreography earns its weight on cross-cutting work; a one-file change routed
through five steps teaches devs to route around rafa — and a route-around is a product
failure. So the conductor weighs the **blast radius** (from coverage at recall time):

- **Below planning entirely — DIRECT-DO (conductor 1.8.0):** radius ≤ 1 domain, no
  contract surface, fits one sitting → NO plan files are created at all. The
  conductor acts (recall → implement → verify) and the sensors carry the loop
  (dirty-mark · reflex · checkpoint-at-push · capture if knowledge emerged). Plans
  begin where RESUMABILITY or COORDINATION begins — not before. If direct-do work
  GROWS (2nd domain, contract surface, multi-session), the conductor escalates to
  lite with one announce line and creates the files THEN.
- **Lite** (radius ≤ 2 domains and no contract/schema surface touched): ONE parent +
  ONE child file, recall scoped to the touched domains, bloom pull skipped, prism gate
  collapses to the two invariants that never relax — every task grounded, the child
  carries a `## Done-check`. Same contract §7 files, same compile, same approval.
- **Full** (anything wider): the complete procedure above.

The dev can force either: `/rafa plan` always offers the choice when the radius is
borderline; "skip" bypasses planning entirely (their call — note it, never police it).

## Deferred / open
- Capture-back of plan-time decisions → brain (needs the capture engine).
- Pivot detection (mark superseded; the path is data).
- Plan lifecycle + tiering (cap, archive→remote, restore).
