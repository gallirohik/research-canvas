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

  **The grill pass (wave 6 — tier-bounded adversarial interview).** On top of
  the two invariants, prism GRILLS the draft — the same procedure the installed
  `grilling` skill carries (`.agents/skills/grilling/SKILL.md`; prism READS it
  as criteria when installed, and this SOP carries the method regardless —
  never invoked mid-validation, per its card). Per task, up the probe ladder:
  **grounding** (which claims rest on assumption? name it, demand its
  evidence — a session-fact id counts, vibes don't) · **unstated dependencies**
  (what must exist for this task that no `blocked_by` declares?) · **vacuous
  Done-check** (can it pass while the feature is broken? a check that
  recomputes its expectation the way the code will, or that a no-op satisfies,
  is TAUTOLOGICAL — criteria per the tdd skill's anti-patterns when installed)
  · **YAGNI** (does the INTENT need this task, or did thoroughness invent it?).
  Budget scales with the task's `validation_tier`: **light** = the two
  invariants only (exactly today) · **standard** = ≤2 probes per task, ≤10 per
  plan · **full** = the complete grilling procedure (one probe at a time,
  survives-three-consecutive ends it). Every probe finding cites the plan line
  it hits — an uncited probe is dropped, and findings feed the existing
  REJECT-with-cited-reasons loop. Plan-lite drafts grill at light.

  **The seam ritual (wave 6 — TDD's consent moment, no new prompt).** For code
  tasks in TDD-eligible repos (the tdd skill installed + a test harness
  detected — the build SOP's gate), every LEAF's `## Done-check` NAMES the seam
  under test: *"`<runner>` on `<test-file>` at seam `<the public interface>`
  exits 0"*. Seams come from recall (the brain's contracts/flows) — never
  invented at build time. The plan-approval summary lists the seams as their
  own line, so **the dev approving the plan IS the tdd skill's "confirm seams
  with the user" step** — consent rides the existing approval gate.

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
   never a status) · optional `priority` 0–4 / `estimate` ·
   **`validation_tier` (wave 5 — rigor scales with blast radius, not with
   process): assign per LEAF from what the task touches — contract/state-shape/
   graph surface → `full` · pure types/docs/leaf-UI → `light` · everything else
   → `standard` (the default when omitted). The tier bounds prism's
   RE-DERIVATION DEPTH only; the Done-check gate itself never relaxes, and the
   tier rides the task's loop events so sage can audit the tiering against
   escaped-bug reality instead of anyone guessing.** Every LEAF carries a
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
