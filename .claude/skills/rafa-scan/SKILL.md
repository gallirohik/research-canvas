---
name: rafa-scan
description: "rafa SOP — atlas's founding scan: map the whole codebase into cited rules/playbooks + coverage, breadth before depth, every citation mechanically verified. Loaded when the /rafa conductor runs scan or init; atlas follows it verbatim."
---

# Scan — capability

atlas's founding contribution to the brain: read the **whole** codebase and write its
notes — so that at work-time (planning a feature, fixing a bug) the brain **routes the
model to the exact relevant files and flags what's load-bearing**, instead of blind
searching or re-deriving the map.

You run this as a **context-isolated subagent spawned by the `/rafa` conductor** — the
whole-repo read happens in *your* window, not the conductor's; return a coverage summary, not
the raw reads. The conductor owns the validate/iterate loop (Gate 2, below).

The notes ARE the knowledge map. They are cited markdown, cross-linked with
**bundle-relative markdown links** — `[Title](/brain/rules/<id>.md)` (the OKF §5.1
form; contract §11) — plus the `links:` frontmatter edge list; the graph is
derived from the links, never stored. No `graph.json`.

## Governing law — memory must be net-positive

The brain is an **intelligence layer that powers the model**, not a database it queries.
Its only job is to make the model's work **more accurate and faster** — surface the silent
contract, the non-obvious gotcha, the exact file to open. It must **never reduce accuracy.**
A note ships only if it both:
- **adds** something the model wouldn't reliably know or quickly re-derive, AND
- **cannot mislead** — verified (the citation checker), durable (not volatile code that
  rots), honest about uncertainty.

Better no note than a wrong one: a memory layer that sometimes degrades accuracy is worse
than none. Every rule below serves this law.

## The work-time questions every note serves

A note earns its place only if it helps answer one of these, for a real feature/bug:
- **"How does X flow end to end?"** → a `flow` playbook
- **"What breaks if I touch Y?"** (blast radius) → `contract` rules + the link graph
- **"Where does Z live / what's the convention?"** → `convention` rules
- **"How do I add W here?"** → a `how-to` playbook

If a candidate note answers none of these, it doesn't ship.

## The brain is a reference point, not a replacement for the code

Code is the source of truth; the brain is the **index over it**. A note's job is to
**route the model to the right files accurately and flag what's load-bearing** — not to
reproduce code that will go stale. Optimize each note for:
- precise `cites` — *go here* (this is the navigation; a wrong pointer sends you wrong)
- the durable contract / gotcha — *watch this*
- body markdown links + `links:` frontmatter — *these connect*

The model then opens the cited files for current specifics. **Capture the durable, not
the volatile** — don't copy implementation that drifts; copy the map and the warnings.
A stale *answer* misleads; a stale *pointer* still lands you in the right place.

## Prime directive — breadth before depth, balance over salience

Two forbidden failures:
1. **Too shallow** — only single-file conventions; misses cross-file contracts that fail silently.
2. **Too narrow** — deep on one flashy seam, blind to whole domains. **Salience is not coverage.**

Rule: **every domain reachable from the index is mapped (sub-caps 1–4) before any one is
mined deep (5–6), and nothing emits until coverage is proven (7).**

## Verify, don't infer (the fidelity gate)

A well-formed note with a wrong citation is worse than no note — a dev greps the cited
file, finds nothing, and stops trusting the brain. So fidelity is non-negotiable:

- **Every citation is mechanically checked — by script, all of them.** Write each cite as
  `file:line :: token`, then run `npx @rafinery/cli verify-citations`, which asserts
  every cited line contains its token and exits non-zero on any miss. Fix every ✗ until it
  exits 0. A "spot-check" does NOT satisfy this. Off-by-N or wrong-file → fix or drop.
- **Contract sites come from grep, not memory — and the checker enforces it.** Every
  `type: contract` MUST declare `anchor:` — a greppable token, OR `anchor: none  # <why>`
  for composition/ordering contracts (provider nesting, matcher precedence) that don't grep
  as one token. `verify-citations.mjs` greps a token anchor repo-wide (code only) and
  **fails if any occurrence is uncited**; a contract that declares *no* anchor fails the
  policy gate. So completeness is **mandatory and mechanical**, not opt-in. A "3-place"
  contract whose anchor greps to 5 fails the build.
- **One docs rule, stated once.** Contract site lists count **code** occurrences; exclude
  docs/markdown/comments. Apply this identically to every contract — never "the full
  surface" for one and "the rest are docs" for another. State the exclusion once per note.
- **Never assert absence without an exhaustive grep — and DECLARE it so the gate re-greps
  it forever.** "none yet", "greenfield", "not used anywhere" require a repo-wide
  `git grep` of the pattern first; a sampled read is not evidence of absence. Then declare
  the token in frontmatter — `absent: <token>` (repeatable, one per line) — so
  `verify-citations` gate **B3** re-greps it on every run and the claim can never silently
  go stale (the 2026-06-08 blocker class: code grew the thing the note said was missing).
  An absence-shaped title/summary with no `absent:` declared is flagged as a checker WARN —
  resolve every WARN before hand-off (declare the token, or reword the claim).

---

## Output (to `.rafa/brain/`)

- `.rafa/brain/rules/*.md` — `convention` + `contract` notes ("what not to break")
- `.rafa/brain/playbooks/*.md` — `flow` + `how-to` notes ("how it works / how to add X")
- `.rafa/brain/coverage.md` — the coverage report. **Machine-read frontmatter** per
  [`.claude/rafa/contract.md`](../../rafa/contract.md) §6: `domains: { <domain>: mapped|thin|stubbed|empty, … }`
  — one entry per domain from Step 1. The body keeps the per-criterion PASS/FAIL narrative.
  **Declare `inventory:` entries** (`- <name> :: <glob> :: <count>`) for each framework
  surface the scan counted — route pages, API routes, agent graphs, whatever is
  load-bearing in THIS repo. The checker recomputes each via `git ls-files ':(glob)…'`
  every run and fails on drift, so coverage can never silently claim an inventory the
  repo has outgrown. Compute the count FROM the same `git ls-files` command — never from
  memory of the tree.

**Note format.** The **strict contract is [`.claude/rafa/contract.md`](../../rafa/contract.md) §2** — every
required field there is mandatory and `rafa compile` (Step 7) **rejects** any violation with a
`path · field · rule` error you must fix. Machine-read fields live in frontmatter; the body is
prose (never parsed). The example is *illustrative — a contract from the rafa reference repo*:
```markdown
---
schemaVersion: 1
id: starter-agent-name-contract          # required · kebab slug = filename stem = link target
title: The "starterAgent" name is a 4-place contract    # required
summary: One string wires the agent across 4 sites; a mismatch silently never connects   # required
type: contract                            # required · rules/: convention|contract · playbooks/: flow|how-to
domain: web-agent-bridge                  # required
links: [copilotkit-frontend-action-routing, agent-tool-to-ui-flow]   # optional · machine-read graph edges
anchor: starterAgent                      # contracts: EVERY code occurrence must be a cited site (B2)
cites:                                    # required ≥1 · `file:line :: token` — verify-citations checks each
  - apps/agent/langgraph.json:6 :: "starterAgent"
  - apps/web/app/layout.tsx:55 :: agent="starterAgent"
failure: silent                           # contracts only: silent|loud
---
The string must match across all four sites or the agent silently never connects.
See [frontend action routing](/brain/rules/copilotkit-frontend-action-routing.md)
and [agent tool → UI flow](/brain/playbooks/agent-tool-to-ui-flow.md).
```
`summary` is the one-line the platform shows; **`links` in frontmatter** are the machine-read
graph edges (body links are for human + foreign-agent reading). `cites` + `domain` + `links` are the
retrieval index. Bodies read like a senior engineer explaining that one concept to a teammate.

---

## The seven sub-capabilities (run in order)

1. **Inventory** [deterministic] — from workspace config (`pnpm-workspace.yaml`,
   `turbo.json`, `package.json`) enumerate every app/package, then every domain
   (design-system · components · routing/app-shell · API · data layer · auth ·
   agent/runtime · cross-app bridges · state · build/monorepo · external integrations).
   Emit a **coverage checklist**; show it first.

2. **Entry-point detection** [deterministic] — per app, find roots: `index`/`main`,
   route files, middleware, graph/agent defs, root providers, `bin`.

3. **Structural extraction** [deterministic] — imports/exports/AST + framework facts →
   the internal node/relationship model the next steps reason over. (Not emitted as a
   file; it feeds the notes.)

3b. **Toolbox inventory** [deterministic] — ratified 2026-07-12: the REPO toolbox is a
   first-class brain domain (`toolbox`). Run `npx @rafinery/cli leverage --json` (the
   deterministic extractor) and author cited notes for the committed toolbox — skills
   (`.claude/skills/*/SKILL.md` name+description), commands, `.mcp.json` servers,
   granted permissions — cites into the config files themselves (contract §2; they are
   citable file:line). This makes the toolbox recallable through the SAME MCP surface
   as all knowledge and refreshable like any note. Personal `~/.claude/` is NEVER
   inventoried here (user-profile plane, compass's job, standing consent).

4. **Convention detection** [deterministic + light LLM] — for **each** domain, the local
   idiom (design tokens, component export pattern + any server/client split such as RSC,
   data-op shape, naming).
   **One `convention` note minimum per domain** — this guarantees breadth. For the
   **external-integrations** domain, produce an **env-and-integrations** note: every
   required env var **name** and the `file:line` in **source** where each is read (so "what keys
   does this repo need, and where?" is answerable at work-time). A domain marked `mapped` must
   have a note.
   **Secrets guardrail (hard):** record env var **names only, read from code**. **Never open
   `.env`, `.env.*`, or any secret file, and never read, log, or copy a value** — a name is a
   contract, a value is a secret. If a note truly needs a value, **stop and ask the dev**; never
   harvest it. (`.env*` is excluded from every read/grep in this step.)
   **Flag exceptions as non-exemplars.** When a convention has a grandfathered/legacy file
   that *violates* it — often the **most salient** example — the note MUST name that file and
   mark it *"exception, not the model — don't pattern-match it."* Salience gets copied; an
   unflagged exception silently teaches the wrong pattern. *(Illustrative — from the rafa
   reference repo: `demo/page.tsx`, the only chat example, uses page-level `"use client"`
   against the RSC convention; the 2026-06-03 brain-vs-cold audit caught a cold agent copying
   it — a 100K-token correction round.)*

5. **Seam detection** [grep + LLM judge] — anchor tokens (agent/graph names, tool names,
   env vars, route strings, exported state/types, table names). For each, run
   `git grep -n <token> -- ':!.env*'` repo-wide (env files excluded — see the secrets guardrail
   above) and record **every** hit as a site (site list == grep hit list; never infer or sample). Any token in ≥2 boundary-crossing files = a
   `contract`. Judge *what must stay in sync* and *does it fail silently*. State-shape
   contracts count too (e.g. a frontend `AgentState` type that must match a backend graph
   state). **Composition/ordering contracts count too** — provider nesting, middleware
   matcher precedence, effect/hook order. These don't grep as a single token, so look for
   them explicitly: cite the ordering site, state the invariant + what silently breaks if
   reordered *(illustrative — from the rafa reference repo: `ConvexProviderWithClerk` must nest
   inside `ClerkProvider`)*. Such contracts declare `anchor: none  # composition/ordering`
   (no single greppable token).
   **Balanced across domains.**

6. **Flow tracing** [LLM, cited] — from each entry point, hop-by-hop to termination
   (render / DB write / response) → `flow` playbooks. Add `how-to` playbooks for the
   recurring "add X" procedures these flows imply.

7. **Verification & synthesis** — apply the 100× filter (a note earns a file only if it
   answers a work-time question AND eliminates a recurring tax), then write the notes. Run
   the **deterministic citation checker** — `npx @rafinery/cli verify-citations` — which
   verifies every `file:line :: token` cite resolves (B1) AND that every contract `anchor:`'s
   code occurrences are all cited (B2); fix every ✗ and re-run until it **exits 0**. It
   writes `.rafa/brain/citation-check.md` — **reference that file** from `coverage.md`,
   do NOT hand-paste the table (pasted evidence drifts from reality).
   Confirm every absence-claim was grep-proven. Run the **completeness critic** (walk the
   Step-1 checklist — every domain has ≥1 note or is flagged thin/stubbed; no silent
   truncation). Finalize `coverage.md` with per-criterion PASS/FAIL.

   Finally, run the **contract gate** — `npx @rafinery/cli compile` — which validates
   every file against [`.claude/rafa/contract.md`](../../rafa/contract.md) and emits `.rafa/manifest.json`
   (the JSON the platform ingests). It fails loudly with `path · field · rule` errors; **fix
   every one and re-run until it exits 0.** This is the validate-and-correct loop: a
   schema-invalid brain never ships, and the platform never guesses a value. Do not hand-edit
   `manifest.json` — it's generated.

---

## Gate 2 — independent validation (owned by the conductor, not here)

Producing the brain + a **green checker (gate 1)** completes *this capability's* job. The
independent QA (prism) and the fix→re-check→re-validate loop are owned by the **conductor**
— the `/rafa` command, running in the main session — because subagents can't spawn
subagents, so the loop must live there. **scan.md never spawns prism.** The full loop is
the conductor orchestration below (moved here from the conductor card in the 2.0.0 diet, so
this SOP stays self-contained).

## Conductor orchestration — the `scan` / `init` pipeline (the conductor runs this)

The conductor (not atlas) drives this loop from the main session; atlas is the spawned
subagent it calls in step 1/5. **`init`** = ensure structure idempotently (`.rafa/active.md`
= `# No active plan`), then run the full scan below. **`scan`** default runs the whole
pipeline; **`--brain-only`** stops after the brain is validated (step 5 PASS) — skips improve
+ push, a cheap knowledge refresh.

1. **Scan — spawn `atlas`** context-isolated: *"Run the scan per this SOP: comprehensive,
   breadth-before-depth, cited notes → `.rafa/brain/{rules,playbooks}/` + `coverage.md`. Run
   `npx @rafinery/cli verify-citations` until it **exits 0**. Return a coverage summary only —
   not the raw reads."*
2. **Gate 1 — checker (trust-but-verify):** re-run `npx @rafinery/cli verify-citations`
   yourself. Must **exit 0** (else re-spawn atlas to fix). It writes `citation-check.md`.
3. **Gate 2 — prism:** spawn `prism` **context-isolated**, passing ONLY: *"Validate the scan
   in `.rafa/brain/` against the repo per your SOP; write `.rafa/brain/checklist.md`."* Never
   pass atlas's reasoning — prism judges blind.
4. **Read** `.rafa/brain/checklist.md`. Append this round to `.rafa/brain/log.md`.
5. **`verdict: PASS`** → continue to Improve. **`ITERATE`** → **spawn `atlas`**: *"Fix every
   blocker + major per `checklist.md`, re-run the checker to exit 0, return what changed."*
   Then back to step 2. **Max 3 rounds**; if still not PASS, **STOP** — surface the findings,
   do **not** improve or push (never improve/push an unvalidated brain).
6. **Improve** *(skip if `--brain-only`)* — run the improve pass ([rafa-improve](../rafa-improve/SKILL.md)):
   spawn `bloom` → `.rafa/improve/`. It reads the *validated* brain as its index, so it only
   runs after PASS.
7. **Prove it — the measured benchmark** *(skip if `--brain-only`; skip if
   `.rafa/benchmark.json` already carries `measured: true` for this repo)* —
   the proof engine is WORKFLOW-WOVEN, never a dev-typed command (owner
   2026-07-24): the conductor drives `rafa benchmark` itself right after the
   brain PASSes — cut the two worktrees (cold vs brain; the scaffold does
   this), run the task fixture in EACH (the conductor IS the driving loop the
   scaffold documents), collect the harness token counts, then
   `rafa benchmark --counts <file> --push` so the Efficiency page's
   "measured on this repo: N×" widget carries a real row. Announce-and-proceed
   ("measuring the brain-vs-cold token proof — say stop to skip"); a decline
   is honored and not re-asked this session. `--dry-run` fixture numbers are
   demo-only and can never land as proof (the handler refuses them).
8. **Land it** — present the full summary (brain verdict/score + top improvements). **On the
   dev's explicit approval**, land the brain the way EVERY brain change lands — through the
   commit hooks, **never a direct trunk push** (the reconciler is the org brain's only writer).
   The dev MUST be on a feature branch (the post-commit hook no-ops on `main`). Then:
   `git add -A && git commit` → **post-commit** mirrors the validated `.rafa/` brain 1-1 onto
   the matching brain branch (stamped `code-commit: <sha>`); `git push` → **pre-push**
   checkpoints the working set to the platform; then land it on main (open a PR **or** a plain
   `git merge` + push — both work) → detection enqueues and the **reconciler** authors the org
   brain at the merge sha, minting the node (brain ↔ code). Do **not** run `rafa push` (retired:
   it wrote the trunk directly, bypassing the reconciler). Never land without approval.
9. **The coach offer (founding scan only)** — if this was the repo's FIRST scan and the dev's
   user brain is empty (`list_dev_insights` → none), offer ONCE: *"the code side is mapped —
   want me to bootstrap YOUR insights from your usage report?"* Accepted = run `## insights`
   (compass; every candidate offered, banked only on yes). The offer rung of the consent
   ladder — never auto-run, never re-asked after a no.

atlas scans + fixes; prism judges; bloom improves; the conductor orchestrates + pushes on
approval. The conductor owns `log.md`; it never edits `checklist.md` or the brain itself —
it spawns atlas for that.

## Acceptance criteria (strict)

A scan **PASSES only if every box below is true.** Any single failure → `iterate`, not
"mostly good". Each criterion is binary and independently checkable.

**A · Coverage (breadth)**
- [ ] **A1** `coverage.md` lists every app and package found in workspace config. None omitted.
- [ ] **A2** Every domain has an explicit status: `mapped` | `thin` | `stubbed` | `empty`. No domain unlisted.
- [ ] **A3** Every `mapped` domain has ≥1 note. (mapped + 0 notes = FAIL.)
- [ ] **A4** Every `thin`/`stubbed`/`empty` domain states why. (a silent gap = FAIL.)

**B · Fidelity — verify, don't infer (hard gate)**
- [ ] **B1** `npx @rafinery/cli verify-citations` **exits 0** — every `file:line :: token`
      cite mechanically verified (all, not a sample); its table pasted in `coverage.md`.
      A spot-check, or a PASS without the checker exiting 0, = FAIL.
- [ ] **B2** Every `type: contract` declares `anchor:` — a token, or `anchor: none` (with
      reason) for composition/ordering contracts. Token anchors: the checker asserts **every
      code occurrence is a cited site**; a contract with *no* anchor FAILS the policy gate.
      Completeness is mandatory + mechanical, not opt-in. (Catches the 3-vs-5 omission bug.)
- [ ] **B3** No absence-claim ("none yet", "greenfield", "not used") without a repo-wide
      `git grep` proving it. One un-grepped usage (e.g. a demo page) = FAIL.
- [ ] **B4** Cross-process / state-shape contracts captured, not only string contracts.
- [ ] **B5** Composition/ordering contracts captured (provider nesting, middleware matcher
      precedence, effect order) — not just grep-able string tokens.

**C · Work-time value (load-bearing)**
- [ ] **C1** For **one real feature** AND **one real bug**, the notes alone **route you to
      the exact files + flag what's load-bearing** for all four questions (flow / blast
      radius / where-and-convention / how-to-add) — no blind searching. (You then read those
      files for current specifics; the brain is the index, not the oracle.)
- [ ] **C2** Every note answers ≥1 of the four questions. A note that only describes code = drop.
- [ ] **C3** Every note has: `type` (convention|contract|flow|how-to), `domain`, ≥1 `cite`.
      Contracts also carry `failure: silent|loud`.
- [ ] **C4** Contracts and flows link (bundle-relative markdown) to the notes they touch — blast-radius and
      end-to-end flow are traversable by following links.

**D · Format & contract**
- [ ] **D1** Output is exactly `.rafa/brain/rules/` + `.rafa/brain/playbooks/` +
      `.rafa/brain/coverage.md`. **No `graph.json`.**
- [ ] **D2** Every note has valid frontmatter per [`.claude/rafa/contract.md`](../../rafa/contract.md) §2
      (incl. required `schemaVersion`, `title`, `summary`).
- [ ] **D3** `npx @rafinery/cli compile` **exits 0** and writes `.rafa/manifest.json`.
      Any `path · field · rule` violation = FAIL — fix and re-run (validate-and-correct).

The report must state PASS/FAIL **per criterion** (not a summary verdict), so iteration
targets the exact failing box.

## Anti-patterns (do NOT do)
- Cherry-pick the flashiest seam — the exact failure this capability prevents.
- Single-file conventions only — the old scan's shallowness.
- **Inferred / sampled / from-memory citations** — every `file:line` is grep-or-read
  verified, or it doesn't ship. (Off-by-N lines, wrong-file attribution, missed sites.)
- **Absence-claims** ("none yet", "greenfield") without an exhaustive repo-wide grep.
- Uncited claims; notes that describe code but answer none of the four questions.
- Literal `[[...]]` in prose — legacy wikilinks are transpiled at emit when they resolve,
  but AUTHOR bundle-relative markdown links (contract §11); a `[[...]]`-as-ellipsis literal
  pollutes the link graph and lands in the checker's LINKS warn lane.
- Silent truncation — if a domain is thin, say so.
