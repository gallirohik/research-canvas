---
name: rafa-review
description: "rafa SOP — the brain-grounded review gate: `rafa review` computes exactly what a diff touches (cite-intersection, zero LLM): rules AND playbooks, open improvements, stale-cite risk, open gaps, related plans' decisions; a prism-style judge rules ONLY on that list + the active task's Done-check; findings feed atlas; the verdict emits a review-verdict loop event. Loaded before push/merge or on request."
---

# review — the brain-grounded gate  (harness-arc wave 2)

> Status: **active.** The at-the-gate moment: defects caught BEFORE merge, by
> the repo's own rules — not generic review taste. Depends on: brain (#1),
> plans (#3, for the Done-check). Runs at the pre-push beat (offer, never
> block) and on demand.

Generic "review this PR" is banned here. The gate is two passes with a hard
split:

## Pass 1 — mechanical (the CLI, zero LLM)

`rafa review [--json]` — diff vs merge-base(origin default) → changed line
ranges ∩ the brain's cite graph (`get_code_context` per file), BOTH note kinds:

- **◆ direct** — a changed line falls inside a note's cited anchor range: the
  code the note stands on MOVED. Highest priority; also a staleness signal
  (the note may need a scoped refresh — the dirty queue already tracks it).
- **· file** — the file changed elsewhere but the note governs it.
- **⚠ stale cites** — the freshness sweep already flagged this note's anchors
  as drifted: a RISK marker (verify the note against code before relying on
  it in judgment — it may describe a world that no longer exists).
- **! open improvements** citing a touched file — is this change making the
  debt better, worse, or is it the fix itself (then bloom's close flow)?
- **open knowledge gaps** (top-missed queries) — live demand near the change.

Output: `.rafa/review.json` + summary. A bounded pass SAYS what it dropped
(never a silent cap); a mid-pass transport failure marks the list PARTIAL.

## Token economy — BINDING (the gate must cost less than the bugs it catches)

The judge's spend is proportional to the DIFF, never to the brain. Owner rule
(2026-07-24): review checks only the diff; hydrated fields serve the judgment;
querying files wholesale is a waste. Concretely:

1. **The pre-pass is free AND selective** — zero LLM; every note carries a
   deterministic RELEVANCE score (direct-hit +3 · failure:silent +2 · cite
   anchor token appears in the diff's added lines +2 · title/summary keyword
   overlap +1 each, capped) and an **`engage` tier**:
   - `deep` — body-worthy: hydrate/fetch and judge fully;
   - `triage` — summary-only: rule in/out from metadata + diff, fetch a body
     ONLY if that makes a violation plausible;
   - `skip` — governs the file but nothing in the change relates: NEVER
     judged, never fetched — listed in review.json so nothing drops silently.
   (Semantic relevance stays contract-reserved via `matchKind` — keywords +
   citations are the v1 scorer; vectors arrive on evidence, never blindly.)
2. **Honor the tiers.** The judge never upgrades a `skip`, and upgrades a
   `triage` to a body fetch only with a stated reason (the finding cites it).
3. **Local-first, never re-serve.** A note already hydrated under
   `.rafa/brain/**` (plan/build recall put it there) is read FROM DISK —
   no MCP round-trip, no double-serving. Fetch via `get_rule`/`get_playbook`
   only for shortlist notes absent locally; `rafa hydrate <kind> <id>` them
   so a re-judge after atlas's fix re-reads the disk copy (disposable-cache
   semantics keep them out of commits).
   **Frontmatter-first (the OKF leverage):** every file type has a strict
   format (contract §11), so the MACHINE fields — `cites` · `anchor` ·
   `failure` · `links` · `type` — parse without touching the prose body.
   Judge from frontmatter + diff first; read the body only when they can't
   settle it. A `contract` note's check is half-mechanical before any prose:
   does the diff touch its `anchor` token anywhere without updating every
   cited site (the B2 completeness question)?
4. **Deep-judge cap: 10 notes**, leverage-ranked (◆ direct > failure:silent >
   ⚠ stale-and-direct > · file). Anything beyond the cap is ruled on metadata
   only and the verdict SAYS SO ("N notes judged shallow") — an honest bound,
   never a silent one.
5. **Metadata-only lanes stay metadata-only**: gaps, decisions, relatedPlans,
   improvements are judged from what the pre-pass/`get_plan` already carries —
   no body fetches, no extra searches. NEVER load the whole brain, never
   fetch a note the pre-pass didn't flag.

## Pass 2 — the judge (prism-style, scoped)

For the work list ONLY — never the whole diff, never taste. Each data kind has
its OWN question:

1. Per **rule hit** — the OKF `type` names the violation shape:
   - `convention` → does the new code FOLLOW the local pattern the rule names?
   - `contract` → the cross-file class: does the diff change any occurrence of
     the rule's `anchor` without updating EVERY cited site (B2 completeness —
     half-mechanical from frontmatter, see the economy rules)? `failure:
     silent` contracts get the deepest scrutiny — that class never announces
     itself.
   Judge against code + rule, never against the author's claims.
2. Per **playbook hit** (`flow` / `how-to` types): is the documented
   FLOW/how-to still TRUE after this change (steps, ordering, file routes)?
   A diff that silently invalidates a playbook ships a lie to the next dev —
   that's an ITERATE finding (or a working-set edit updating the playbook,
   authored the branch way).
3. Per **⚠ stale-cite note**: verify the note against current code BEFORE
   using it in judgment; if the diff is the thing that staled it further,
   surface the scoped-refresh offer.
4. Per **open improvement**: touched for better or worse? Fixed-in-passing →
   bloom's close flow (hydrate first, `status: fixed`, report).
5. **Related plans' decisions** (`get_plan` for each `relatedPlans` entry):
   does the diff contradict a recorded decision? Contradicting one is the
   owner's call to reopen — an ITERATE finding, never silently overridden.
6. **Open gaps**: does this change ANSWER one (author the note, close the
   gap) — or deepen it?
7. **The active task's Done-check** (from `get_active_plan`): does the diff
   satisfy what the plan said done means?
8. Verdict: **PASS** or **ITERATE** with per-finding citations (note id +
   file:line). Findings feed atlas (validate-and-correct — atlas fixes, the
   judge re-checks; the reviewer never edits).
9. Emit **`report_loop_event(category: "review-verdict", outcome:
   PASS|ITERATE, subject: <task id or branch>)`** at the ruling — sage's
   evidence, monotonic, never a session-end sweep.

## When it runs

- **The pre-push beat** — before `git push`, offer the gate ("review the
  branch against the brain? <n> rules touched"). Opt-in, advisory, never
  blocks a push (a declined offer is honored, not re-asked this session).
- **Plan-done verify** — rafa-build's final verify runs it as part of
  declaring the build complete.
- **On demand** — `/rafa review` any time.

## Anti-patterns
- Judging files the pre-pass didn't flag (scope creep = generic review).
- Trusting the diff author's summary — judge code against rules.
- Blocking on the gate — it is advisory; the merge reconciler is the hard gate.
- Findings without citations (rule id + file:line) — uncited = unactionable.
