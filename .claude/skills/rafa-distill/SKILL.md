---
name: rafa-distill
description: "rafa SOP — merge-time reconciliation: validate a merged branch's WORKING SET against merged MAIN (prism), author survivors into the org brain through verify-citations + compile + push (atlas), refute loudly with citations; contested items flagged needs-adjudication, never guessed. Loaded on /rafa distill or the merge offer; CI runs the same SOP headlessly (rafa distill --headless)."
---

# distill — merge-time reconciliation of a branch working set into the org brain

> Status: **active.** Two runners, ONE SOP: the org's CI (`rafa distill
> --headless`, installed by `rafa ci-setup`, driven by the ORG'S OWN
> `ANTHROPIC_API_KEY` — never stored on the platform) and the dev session
> (offer-driven at bootstrap, or explicit `/rafa distill <branch>`) as the
> fallback when CI isn't wired or failed. Depends on: brain (#1), the branch
> working set (synced via `rafa checkpoint`).

The rigor gradient this enforces (ratified 2026-07-10): **dev↔dev = CAS + a
session prompt · branch↔branch = free mechanical fold (no LLM, no prism) ·
branch→main = full distillation + gates.** Cost tracks consequence. Working-set
files are candidate-grade — attributed, loose, never served as org truth. The
merge to main is the one moment rigor fires: what survives validation against
merged main enters the org brain through the normal gates; what doesn't is
refuted loudly back to its author; what can't be decided is flagged
`needs-adjudication` — NEVER guessed. Knowledge propagates exactly like the
code it describes.

## Trigger

- **CI (normal path):** the reconcile workflow fires on the PR-merged EVENT
  (squash/rebase-safe — ancestry is never consulted): merge to the default
  branch → `rafa distill --headless <branch>` · branch→parent merge →
  `rafa fold --from <branch> --to <parent>` (mechanical, no LLM).
- **Offer (session fallback):** at bootstrap the conductor checks
  `get_working_set` for active files on branches whose code reached main —
  *"branch <x> merged with N working-set files — distill now?"* Part of the
  ONE bootstrap digest. Boundary consent; accepted offer = invocation.
- **Explicit:** `/rafa distill <branch>`.

## Procedure (the trio, distillation roles)

1. **Collect** — `get_working_set(repo, branch, status: active)`. Zero files →
   nothing to do, say so, stop. Rows already `needs-adjudication` are a HUMAN's
   to resolve — surface them in the digest, never fold them in silently.
1b. **Schema ladder (0.11.0 — the owner's 4-case doctrine).** Before ANY
   claim-level judging, resolve the version lattice: **target** = the org
   brain's `manifest.json → schemaVersion` (else max over its notes; a
   pre-manifest brain is the founding v1) · **source** = max over the
   collected candidates' own `schemaVersion` · **latest** = the running CLI's
   `SCHEMA_VERSION`. Then: **target < source → REWRITE-TARGET** (every org-
   brain note lifts to the newer schema and rides THIS run's gates + push —
   one migration+reconcile commit) · **target > source → UPGRADE-SOURCE**
   (incoming candidates lift into the target's schema before judging) ·
   **equal but < latest → REWRITE-MERGED** (both lift; the merged target is a
   full rewrite onto latest) · **equal and == latest → DIFF** (the happy flow,
   steps 2–6 exactly as written). **Either side > latest → ABORT LOUDLY** — a
   newer CLI authored it; update the runner, knowledge is never downgraded.
   Transforms are REGISTERED per step AND per OKF type
   (`lib/distiller/schema-ladder.mjs` — each step declares rule · playbook ·
   improvement explicitly: a function, or the EXPLICIT "unchanged", which
   still re-stamps the note's schemaVersion line); a missing step OR class is
   a loud error, never a guess. Only durable knowledge ladders — derived/
   generated files (coverage · checklist · ledger · reports · manifest)
   REGENERATE at the new schema; intent records pass through untouched. The
   headless CLI runs this mechanically; the session path applies the same
   lattice by hand.
2. **Validate (prism, context-isolated)** — the target is **merged MAIN as of
   NOW, never the fork point and never a stale checkout**: `git fetch origin`
   first; judge every claim against the fetched trunk. Confirm every citation
   resolves (the cited line contains its token — grep it yourself). A claim
   that can't be confirmed with a `file:line` is REFUTED (cited reason).
   Contested/low-confidence → `needs-adjudication`, never a guess. Files about
   code the merge did NOT touch are judged on their own merits, same bar.
3. **Author (atlas)** — for each survivor: write/update the org-brain file
   (contract §2) with real cites into main; `anchor:` on contracts (hydrated
   files lost it — re-declare); fold into an existing note when one covers the
   topic (supersede, never duplicate).
4. **Gate + ship** — `rafa verify-citations` AND `rafa compile` to exit 0 →
   `rafa push --verb=distill --message="reconcile(<branch>): <N> banked ·
   <M> refuted · <K> adjudication — <banked ids…>"`. The reconciliation
   commit is DESCRIPTIVE (owner 2026-07-26): its subject states what THIS run
   did — branch, per-verdict counts, the banked note ids — so any agent
   walking the brain log understands the commit without opening it (the
   headless CLI composes this automatically; the session path passes it
   explicitly). Only now has anything entered the org brain. A failed gate
   aborts EVERYTHING: nothing resolved, nothing pushed, working set intact.
5. **Resolve** — `resolve_working_file(path, distilled)` for survivors — authored
   per the OKF surface ([rafa-okf](../rafa-okf/SKILL.md); push emits the rest) —
   CAS: only a live row resolves; a failure means ANOTHER runner already
   distilled this branch — STOP and reconcile against what it shipped.
   `resolve_working_file(path, refuted, note)` for failures — TELL the author
   which files died and why (cited); refutation is feedback, not silence. At
   that same resolve beat emit **`report_loop_event(category:
   "distill-refutation", outcome: refuted|distilled, subject: <path or note
   id>, actorMeta: {model: <the judging model>, agent: "distiller@<ver>" (or
   "prism@<ver>" on the session path), runner: session|ci|sandbox — the tier
   this distill runs in}, dedupeKey: "<branch>·<path>·<outcome>")`** — sage's
   evidence that a claim met the gates or was refuted (shapes only: the
   outcome + a file/note reference, never the refuted content, never the
   cited code). Wave 5 is STRICT: an emit without the actor envelope is
   rejected loudly; the dedupeKey makes a re-run of the same distillation
   count ONCE. Checkpoint-adjacent, monotonic, never a session-end sweep.
   `resolve_working_file(path, needs-adjudication, note)` for the undecidable —
   the next session's digest offers the decision.

## Branch→branch merges (sub-feature → feature): FOLD, don't distill

Distillation targets ONLY the default branch. When a sub-feature merges into
its parent branch, the working set is **folded forward mechanically** —
`rafa fold --from <branch> --to <parent>` (or the CI fold job): absent on the
parent → re-keyed · identical content → merged silently · true same-file
divergence → `needs-adjudication` on the parent row (incoming preserved,
attributed). No LLM, no prism — the knowledge keeps riding with the code until
the code reaches main.

Sub-feature CONTEXT: a branch's working knowledge = org brain (via MCP) + its
own working set + unmerged ANCESTOR branches' working sets (the conductor
derives the ancestor chain from git and calls `get_working_set` per ancestor —
the platform stores no lineage).

## Rules

- Validation target is main at distillation time, never the fork point.
- An abandoned branch's working set is never distilled — it dies with the
  branch (propagation mirrors code).
- No file skips steps 2–4; there is no fast path into the org brain.
- CI can detect and flag; only a dev session resolves a human's divergence.
- Dev-level observations found among the files route to `put_dev_insight`
  (the author's user brain), never to the org brain.
