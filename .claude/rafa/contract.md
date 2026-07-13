# rafa brain contract — v1

The strict protocol every brain file obeys, and the `manifest.json` the platform
ingests. This is the **single source of truth** shared by the writers (atlas, bloom,
prism) and the reader (the platform ingest). If a file violates this, the compile
step **fails loudly** and the authoring agent must correct it — the platform never
guesses, never assumes a value.

**Canonical home: `.claude/rafa/contract.md` in the CODE repo** (blueprint split,
0.4.0) — the contract versions with the CLI that implements it (`rafa compile` ships
inside `@rafinery/cli`, never vendored). A **stamped copy** rides every brain push as
`contract.md` in the brain repo, so any reader of the brain repo knows which contract
version that brain conforms to.

Pipeline:

```
agents write .md (frontmatter per this contract)
  → rafa compile   (deterministic: parse frontmatter, VALIDATE, fail loudly)
       ├ FAIL → structured error (file · field · rule) → author agent fixes → retry
       └ PASS → emit manifest.json
  → git push → webhook → INGEST = JSON.parse(manifest) + shape-check → Convex
  → query APIs (per repo+branch) → platform renders
```

Two enforcement points: **compile-time** (structure — this contract) and **prism**
(semantics — truth of the content). Structure is validated _before_ semantics.

---

## File-type registry — every `.rafa` file has a declared class

No consumer ever guesses. **Every** file type is classified here; a `structured` type has
a schema (parse it), a `verbatim` type is prose (display it, never parse for data), a
`generated` type is machine-written by a named tool. If a file matching a `structured` path
doesn't validate, compile fails.

| Type                  | Path glob                         | Class                                                                                                                              | Schema                                                                                                                                                        | Author     |
| --------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| rule                  | `brain/rules/*.md`                | **structured**                                                                                                                     | §2                                                                                                                                                            | atlas      |
| playbook              | `brain/playbooks/*.md`            | **structured**                                                                                                                     | §2                                                                                                                                                            | atlas      |
| health                | `brain/checklist.md`              | **structured**                                                                                                                     | §4                                                                                                                                                            | prism      |
| coverage              | `brain/coverage.md`               | **structured**                                                                                                                     | §6                                                                                                                                                            | atlas      |
| improvement           | `improve/improvements/*.md`       | **structured**                                                                                                                     | §3                                                                                                                                                            | bloom      |
| ledger                | `improve/ledger.md`               | **structured**                                                                                                                     | §5                                                                                                                                                            | bloom      |
| plan                  | `plans/**/*.md`                   | **structured**                                                                                                                     | §7                                                                                                                                                            | plan/build |
| log                   | `brain/log.md`                    | **verbatim**                                                                                                                       | — (prose trail)                                                                                                                                               | conductor  |
| citation-check        | `**/citation-check.md`            | **generated**                                                                                                                      | — (by `rafa verify-citations`)                                                                                                                                | tool       |
| citation-check record | `**/citation-check.json`          | **generated**                                                                                                                      | `{ checkerVersion, at, pass, gates, warns }` (by `rafa verify-citations`; compile folds it into `manifest.citations`)                                         | tool       |
| active pointer        | `active.md`                       | **generated**                                                                                                                      | — (`# <plan-id>` or "No active plan"; compile emits it as `activePlanId`, §7)                                                                                 | conductor  |
| contract copy         | `contract.md`                     | **generated**                                                                                                                      | — (stamped copy of `.claude/rafa/contract.md`, written by `rafa push`)                                                                                        | tool       |
| dirty queue           | `dirty.jsonl`                     | **generated** (local state — transport-excluded, NEVER pushed/ingested)                                                            | one `{f, t}` JSON line per code edit (by the PostToolUse sensor hook; read by `rafa dirty` + the SessionStart digest)                                         | tool       |
| reflex queue          | `reflex.jsonl`                    | **generated** (local state — transport-excluded, NEVER pushed/ingested; transcript pointers are LOCAL, raw transcripts never ship) | `{id, p, t, tp}` per detected correction + append-only `{id, done, verdict, at}` markers (by the UserPromptSubmit sensor; read by `rafa reflex` + the digest) | tool       |
| agent                 | `.claude/agents/*.md` (code repo) | **structured** (local gate — NOT in manifest)                                                                                      | §10                                                                                                                                                           | rafa       |

The `agent` type is the one structured type outside `.rafa/`: the shipped agent cards
in the code repo. Compile validates them (§10) so a malformed card fails the gate like
any other contract violation, but they are never emitted into `manifest.json` — the
platform doesn't ingest agents (yet); the gate exists so the agents themselves are
never un-schema'd. The SOPs the cards point at are committed skills in the code repo
(`.claude/skills/rafa-*/SKILL.md`); the gate tools are `@rafinery/cli` commands —
neither lives under `.rafa/`, which holds purely knowledge + state.

`structured` types are compiled into `manifest.json` (§1) — that JSON is the ONLY thing the
platform ingests. `verbatim`/`generated` files are shown as-is in the file browser (fetched
lazily), never parsed. A file under a `structured` path that isn't in this table → compile
error (no rogue unschema'd data files).

---

## 0. Global rules

- **Frontmatter is the only machine-read surface.** The markdown **body is prose**
  and is NEVER parsed for data. Every value the platform shows comes from frontmatter
  (via the compiled manifest), or from the body rendered _verbatim_ (never scraped).
- **`schemaVersion` is required** on every file and in the manifest. Unknown version
  → ingest reports an error, does not guess.
- **`id` is required and stable.** It MUST equal the filename stem (`foo.md` → `foo`).
  Renames are safe because rows are keyed by `id`, not path.
- **Required fields are required.** Missing/empty required field = compile failure.
  The validator **never fills a default for a required field** — that would be
  assuming. Optional fields have documented defaults.
- **Enums are closed.** A value outside the enum = compile failure (not coerced).

### Frontmatter grammar (strict subset — the only shapes allowed)

Frontmatter is a leading `---` … `---` block. Within it, only these forms are legal;
anything else is a compile error:

```yaml
key: scalar                       # string | number | true | false
key: "quoted string"              # quotes stripped
key: [a, b, c]                    # flow list of scalars
key: { a: x, b: y }               # flow map of scalars
key:                              # block list …
  - item
  - item
key: >-                           # folded scalar: continuation lines joined with one space
  first part
  second part
```

No nested block maps, no anchors, no literal (`|`) blocks. The folded scalar (`>-`/`>`)
is the ONLY multiline form, added for agent cards (§10) whose descriptions fold.
Deterministic to parse: indented non-empty lines after `>-` join with a single space.

### cites DSL

Each cite is one string: `` `<path>:<line> :: <token>` ``

- split on the **first** `::` → (`left`, `token`)
- in `left`, split on the **last** `:` → (`path`, `line`)
- `line` is digits (`"42"`) or a range (`"14-18"`)

Compile parses each into `{ file, line, token }`. A cite that doesn't match → error.

---

## 1. manifest.json — the ingestion contract

Machine-generated by `rafa compile`, committed to the brain repo, read by ingest as
JSON. This is the exact shape the platform binds to.

```jsonc
{
  "schemaVersion": 1,
  "generatedAt": "2026-07-03T10:00:00Z", // ISO-8601, stamped by compile
  "repo": "owner/repo", // CODE repo full_name (identity)
  "branch": "main", // code branch this brain reflects
  "codeSha": "abc123…", // code commit the brain was built for

  "health": {
    // from brain/checklist.md — or null
    "verdict": "PASS", // "PASS" | "ITERATE"
    "score": 95, // 0–100
    "gates": { "fidelity": "pass", "coverage": "pass" },
    "counts": { "blockers": 0, "majors": 0, "minors": 2 },
  },

  "ledger": {
    // from improve/ledger.md — or null
    "open": 7,
    "debtScore": 13,
    "byPriority": { "P0": 0, "P1": 1, "P2": 3, "P3": 3 },
  },

  "coverage": {
    // from brain/coverage.md — or null
    "domains": [
      // one row per domain, its scan status
      { "domain": "design-system", "status": "mapped" },
      { "domain": "external-integrations", "status": "thin" },
    ],
  },

  "citations": {
    // from brain/citation-check.json — or null
    "checkerVersion": 2, // the gate level this brain passed
    "pass": true, // that run's verdict (recorded, never assumed)
    "at": "2026-07-12T10:00:00Z", // when the checker last ran
  }, // null = no recorded checker run rode this push

  "notes": [
    {
      "id": "agent-name-contract",
      "kind": "rule", // "rule" | "playbook" (from directory)
      "type": "contract", // contract | convention | flow | how-to
      "domain": "web-agent-bridge",
      "title": "…",
      "summary": "…",
      "links": ["other-note-id"], // [] if none
      "failure": "silent", // "silent" | "loud" | omitted
      "bodyTokens": 180, // OPTIONAL · ceil(bodyChars/4) size estimate of the
      //   prose body — deterministic (no LLM), for recall-savings
      "cites": [
        {
          "file": "src/x.tsx",
          "line": "42",
          "token": "research_agent",
          "targetTokens": 940,
        },
      ], // targetTokens OPTIONAL · ceil(fileChars/4) of the CITED
      //   file — OMITTED when unreadable at compile (never 0)
      "path": "brain/rules/agent-name-contract.md", // prose body (lazy fetch)
    },
  ],

  "improvements": [
    {
      "id": "dead-model-options-google-crewai",
      "priority": "P1", // P0 | P1 | P2 | P3
      "lens": "product", // security|correctness|performance|architecture|product|ops
      "status": "open", // open | backlog | fixed | wontfix
      "title": "…",
      "summary": "…",
      "fix": "…",
      "leverage": { "impact": "high", "effort": "low" }, // impact/effort ∈ low|medium|high
      "blastRadius": ["web-agent-bridge"], // [] if none
      "cites": [{ "file": "…", "line": "25", "token": "…" }],
      "path": "improve/improvements/dead-model-options-google-crewai.md",
    },
  ],
}
```

**The manifest carries KNOWLEDGE only.** Plans and the active pointer left it
(0.4.0 — the plans channel, §7): they are pushed on approval via `push_plan` /
`set_active_plan` and never ride the brain repo. Legacy manifests carrying
`plans[]`/`activePlanId` are tolerated and IGNORED by ingest (never written).

Ingest is `JSON.parse` + a shape-check against this schema. Any mismatch (missing
key, wrong enum, wrong type, unknown `schemaVersion`) → a **surfaced ingest error**
on the platform, never a guessed value.

**Size stamps (`bodyTokens`, `cites[].targetTokens`) are ADDITIVE OPTIONAL.** compile
stamps each note's body-token estimate and, per cite, the cited file's token estimate —
both `ceil(chars/4)`, computed deterministically at compile time (no LLM, no network) to
feed the platform's recall-savings estimator. `targetTokens` is **omitted** for any cite
whose target is unreadable at compile (honest absence — never a guessed `0`). Because
these fields are purely additive and optional, `schemaVersion` **stays 1**: ingest never
refuses a manifest for lacking them, so a legacy manifest produced without them (or with
some cites carrying no `targetTokens`) remains valid. The shape-check treats them as
optional and tolerates their absence.

---

## 2. Note files — `brain/rules/*.md`, `brain/playbooks/*.md`

`kind` is derived from the directory (`rules/` → `rule`, `playbooks/` → `playbook`).

```yaml
---
schemaVersion: 1
id: agent-name-contract # required · == filename stem
type: contract # required · contract | convention | flow | how-to
domain: web-agent-bridge # required · non-empty
title: The agent name is a cross-process contract # required
summary: Only "research_agent" is fully wired end to end # required
links: [copilotkit-runtime-route-convention] # optional · default []
failure: silent # optional · silent | loud
anchor:
  research_agent # optional · checker gate B2: EVERY code hit of this
  #   token must be a cited site (`anchor: none` = explicit
  #   exemption for composition/ordering contracts)
absent:
  legacy_agent_name # optional · checker gate B3: this token must appear
  #   NOWHERE in code (docs/.md excluded) — declare one for
  #   every claim that depends on something NOT existing;
  #   the checker re-greps it every run, so the claim can
  #   never silently go stale. Repeatable (one per line).
cites: # required · ≥ 1
  - src/lib/model-selector-provider.tsx:42 :: research_agent
  - agents/python/main.py:20 :: research_agent
---
（prose body — rendered verbatim, never parsed）
```

`anchor:`/`absent:` are **checker declarations** (consumed by `rafa verify-citations`
gates B2/B3, not emitted into the manifest). A note whose title/summary reads as an
absence claim without declaring `absent:` is listed as a checker WARN — prism's
worklist, never a gate failure (a heuristic that fails the gate would be an assumed
value).

---

## 3. Improvement files — `improve/improvements/*.md`

```yaml
---
schemaVersion: 1
id: dead-model-options-google-crewai # required · == filename stem
priority: P1 # required · P0 | P1 | P2 | P3
lens: product # required · security|correctness|performance|architecture|product|ops
status: open # required · open | backlog | fixed | wontfix
title: Two of the four model options are dead and fail silently # required
summary: google_genai and crewai route to unwired agents # required
fix: Wire both agents in main.py, or remove them from the picker # required
leverage: { impact: high, effort: low } # required · impact/effort ∈ low|medium|high
blast_radius: [web-agent-bridge, external-integrations] # optional · default []
cites: # required · ≥ 1
  - src/components/ModelSelector.tsx:25 :: google_genai
found: 2026-07-02 # optional · ISO date
---
（prose body）
```

Note: `title`, `summary`, `fix` are now **required frontmatter** — previously scraped
from prose. That scraping is gone; these are authored values.

---

## 4. Health file — `brain/checklist.md`

```yaml
---
schemaVersion: 1
verdict: PASS # required · PASS | ITERATE
score: 95 # required · 0–100
gates: { fidelity: pass, coverage: pass } # required · each pass | fail
counts: { blockers: 0, majors: 0, minors: 2 } # required · non-negative ints
---
（prism report body）
```

---

## 5. Ledger file — `improve/ledger.md`

The debt figure is **authored in frontmatter** (bloom's number), not parsed from a
table. `open`/`by_priority` are cross-checked against the improvement rows at ingest.
Flat keys only — no nesting (compile maps `debt_score`→`debtScore`, `by_priority`→`byPriority`).

```yaml
---
schemaVersion: 1
open: 7
debt_score: 13
by_priority: { P0: 0, P1: 1, P2: 3, P3: 3 }
---
（human-readable trend/tables in the body）
```

---

## 6. Coverage file — `brain/coverage.md`

The scan's breadth report. `domains` is a **flow map** of `domain: status`, one entry per
domain found (compile emits it as `[{ domain, status }]` in the manifest). Status enum:
`mapped | thin | stubbed | empty`. The body holds the human per-criterion PASS/FAIL narrative.

```yaml
---
schemaVersion: 1
domains: { design-system: mapped, components: mapped, api: thin, external-integrations: empty }
inventory:                       # optional · declared surface inventories, re-counted by
  - route-pages :: apps/web/app/**/page.tsx :: 23      # the checker every run
  - api-routes :: apps/web/app/api/**/route.ts :: 2
---
（per-criterion PASS/FAIL narrative in the body）
```

`inventory:` entries are `<name> :: <glob> :: <count>` — the checker recomputes each
count via `git ls-files ':(glob)<glob>'` and FAILS on drift (coverage claiming a
surface inventory the repo has outgrown). atlas declares one per framework surface it
maps (route pages, API routes, workflows — whatever the repo's shape makes load-bearing);
compile validates the grammar, the checker owns the truth.

---

## 7. Plan files — `plans/**/*.md` (+ the plans channel) — **v2: the work-item tree**

Plans are a TREE of work items (plans data version 2, ratified 2026-07-12): one
**epic** (the root) → **tasks** → **subtasks**. Three ranks, deliberately matching
the ceiling of Linear (Project→Issue→sub-issue), Jira (Epic→Task→Sub-task), and
Asana (Project→Task→Subtask) so tracker sync is lossless. Vocabulary is
vendor-blended: field names below are the majority vendor names wherever one exists.
Each item owns exactly one file (merges never conflict; progress is derived).

```yaml
---
schemaVersion: 1
id: payments-c3-webhooks # required · == filename stem · GLOBALLY unique across plans/**
plan: payments # required · the ROOT (epic) id
parent: payments-c3 # required · the parent ITEM id (any rank above), or null (epic)
kind: epic | task | subtask # required · epic = root only · task's parent = the epic · subtask's parent = a task
title: Handle provider webhooks # required · WHAT (Linear title · Jira summary · Asana name)
description:
  >- # optional · WHY + context — syncs 1:1 with vendor description/notes
  reconciliation must be automatic; manual matching doesn't scale
approach: verify HMAC → enqueue → idempotent apply # optional · HOW, one line — rafa value-add
status: todo | in-progress | done | superseded | abandoned # required (task/subtask); epic may omit
assignee: rohik # optional · WHO (free string pre-orgs; unanimous vendor word)
blocked_by: [payments-c2] # optional · item ids this waits on — a dependency IS a blocker
blocked_reason: "vendor sandbox access" # optional · external blocks (no dependency id to point at)
priority: 2 # optional · 0 none · 1 urgent · 2 high · 3 medium · 4 low (Linear scale)
estimate: 3 # optional · points (Linear estimate / Jira story points)
branch: feat/webhooks # optional · ↔ Linear branchName
baseSha: abc123 # optional · commit it was cut from
domains: [payments] # optional · EPIC only · the blast radius — the brain link
external: { provider: jira, key: PAY-142 } # optional · tracker identity — READ-ONLY to sessions
---
（prose body — a LEAF item (a task with no subtasks, or a subtask) MUST carry a
`## Done-check`; `## Log` is the execution journal; `## Decisions` mirrors the
structured decision records (below). Compile never parses bodies.）
```

Rules (all compile-enforced unless noted):

- **Global id uniqueness** across `plans/**` (duplicate = error). Convention: prefix
  descendants with the epic id.
- **Tree shape.** Exactly ONE `kind: epic` per plan; `epic` → `parent: null`, `plan == id`.
  A task's `parent` is the epic; a subtask's `parent` is a task. Every item's `plan`
  is the root epic id. Dangling parents and rank violations are loud errors.
- **`blocked` is DERIVED, never stored.** An item is blocked when it has an
  unresolved `blocked_by` (a listed item not yet `done`) or a `blocked_reason`.
  `status: blocked` is a compile ERROR (removed in v2 — `rafa migrate` converts).
  No vendor stores blocked as a state either (Linear: relations · Jira: links +
  Flagged · Asana: dependencies) — deriving it keeps sync lossless.
- **`blocked_by` ids resolve within the plan and are acyclic.**
- **Progress is never stored.** A `progress` key is a compile error. Progress =
  `count(done LEAVES) / count(leaves)` per subtree — derived everywhere.
- **Statuses.** `done` exists only on prism PASS (the execution gate). Terminal:
  `superseded` (replaced by a newer plan) · `abandoned` (deliberately dropped) —
  mapping losslessly to Linear `canceled` / Jira resolution "Duplicate"/"Won't do".
  Statuses are set in sessions; the platform board renders them read-only.
- **`external` is read-only to sessions** — the sync layer owns it. When a provider
  closes a ticket, the item shows DUAL status (provider's + ours); `done` is never
  imported (K6: done is earned, not synced).
- **`active.md` → `activePlanId`.** First line `# <plan-id>` must resolve to a
  `kind: epic`; `# No active plan` / missing file → null.

**Decisions — first-class deliberation records (channel-borne, never frontmatter):**
the frontmatter grammar is flat and bodies are never parsed, so structured decisions
live on the PLATFORM, pushed via `log_decision` at checkpoint moments:
`{ item, at, actor, context, options[], decision, rationale }` — _actor_ is who
decided (the dev for steering; the agent for proposals it made under standing
consent). Text fidelity: **paraphrase + short verbatim quotes only where the exact
wording carries the decision** (transcripts never land in shared stores). Sessions
mirror each record into the item body's `## Decisions` for human reading. On tracker
sync, decisions flow OUT as prefixed comments (Jira/Linear comments, Asana stories);
imported comments are never scraped into decisions.

**Transport — the plans channel (plans never ride the brain manifest):**

- **Authoring**: files above, compile-validated; `.rafa/plans/` is the working copy.
- **Push on approval**: approval IS the trigger — `push_plan` sends the whole tree
  (`items[]`, bodies included); `set_active_plan` points the pointer. Build cadence
  re-pushes statuses + `## Log` (`push_plan` / `update_plan_status`) and logs
  decisions (`log_decision`).
- **Pull-based work**: `list_plans` = NAMES ONLY; **"load plan X"** = `get_plan`
  (bodies + decisions) materialized back into `.rafa/plans/` by the session.
- **The brain link**: the epic's `domains:` rides the channel; the plan detail page
  renders the related knowledge beside the tree.
- **Tracker sync (phased)**: `external` identity now → import (a ticket is
  purpose/what, NOT an executable plan — it still flows through plan drafting +
  prism before build) → two-way sync under a field-ownership matrix (provider owns
  ticket-native fields; rafa owns execution fields; conflicts surface, never
  auto-resolve).

---

## 8. Versioning & the validate-and-correct loop

- **`schemaVersion`** bumps when this contract changes incompatibly. Ingest refuses
  an unknown version (surfaced error) rather than mis-reading it. **Additive OPTIONAL
  fields do NOT bump it** — e.g. the note size stamps (`bodyTokens`,
  `cites[].targetTokens`, §1): ingest tolerates their absence, so a legacy manifest
  without them stays valid at the same `schemaVersion`.
- **Validate-and-correct:** `rafa compile` validates every file. On failure it emits
  a structured error — `path · field · rule` — to the **authoring agent** (atlas for
  notes, bloom for improvements/ledger, prism for checklist). The agent edits the
  file and compile re-runs. Bounded retries; if it can't converge, a **hard failure**
  blocks the push (better than a silently-wrong brain).
- The validator **reports, never auto-fills** a required value.

---

## 9. The read side — knowledge MCP (platform-served)

The platform serves the **ingested** brain to any MCP client (the build agent, a
teammate's session, Slack/incident.io agents) — the read-side twin of this contract.
One backend: the platform. Local files are the _authoring_ surface; the platform is
the _serving_ surface, and it serves only what passed compile + ingest.

**Envelope — mandatory on every tool response:**

```jsonc
{
  "source": "platform",
  "brainForSha": "<snapshot codeSha>", // the ingested manifest's codeSha — one source
  "ingestedAt": "<ISO time of ingest>",
  "schemaVersion": 1,
  "synthesized": false, // raw tools: always false
}
```

**Error semantics (no assumed values, outward):** snapshot has an `ingestError` →
every tool returns that error loudly, never partial data. Repo connected but never
pushed (no snapshot) → `"no brain ingested — run rafa push"`. Invalid/mismatched key
→ loud auth error, never a fallback. Empty search → empty result, never a stretched
match.

**Tools (read-only — ALL writes flow files → compile → push → ingest):**

| Tool                                            | Args                                      | Returns                                                                                                                                                                                         |
| ----------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_brain_status`                              | `repo`                                    | envelope + per-type counts, health, coverage summary, `activePlanId`, `ingestError?`                                                                                                            |
| `get_coverage`                                  | `repo`                                    | coverage rows (the domain map — how an agent navigates)                                                                                                                                         |
| `search_knowledge`                              | `q`, `types?`, `domain?`, `limit?`        | ranked candidates (fields per type below)                                                                                                                                                       |
| `ask_knowledge`                                 | `repo`, `q`                               | the guarded synthesis read (below) — `{answer, synthesized, citations[], retrieval, usage?}`                                                                                                    |
| `get_rule` / `get_playbook` / `get_improvement` | `repo`, `id`                              | full frontmatter + lazy-fetched body + cites as objects                                                                                                                                         |
| `list_improvements`                             | `repo`, `status?`, `priority?`, `domain?` | ledger rows                                                                                                                                                                                     |
| `get_plan`                                      | `repo`, `id` (parent or child)            | parent + all children **with stored bodies** + **derived** progress; a child id resolves the whole plan with `requestedChild` set — this is what "load plan X" materializes into `.rafa/plans/` |
| `get_active_plan`                               | `repo`                                    | resolves the channel pointer (`set_active_plan`) → `get_plan`, or "no active plan"                                                                                                              |

`repo` must match the key's scope exactly; `branch` is reserved (branch-keyed
instances land in Slice 2 — third-party clients default to the production brain,
i.e. the default branch's instance).

**Search = deterministic lexical retrieval; the server retrieves, the agent decides.**
Fields searched per type — rule/playbook: `title, summary, domain, type` ·
improvement: `title, summary, lens, blast_radius` · plan: `title, plan, parent`.
Score = Σ over matched case-folded query tokens of field weight (`title` 3 ·
`domain`/`lens`/`blast_radius`/`type`/`plan`/`parent` 2 · `summary` 1); tie-break
score desc then id asc; fields a type lacks are omitted, never defaulted. Candidates
carry `matchKind: "lexical"` (`"semantic"` reserved).

**`ask_knowledge` — the guarded synthesis read (the reserved id, filled 2026-07-13
per the served-brain spec).** For THIN clients (Slack bots, dashboards); full agents
should prefer `search_knowledge` + `get_*` and compose with their own model. The
guarantees, in order: 0. **Enumerable intents route deterministically BEFORE retrieval** — command-shaped
asks ("list improvements [open|P0]", "list plans", "status/health", "coverage")
return the actual rows (`retrieval.matchKind: "intent"`, `items[]`), no LLM
involved. Interrogatives (how/why/where/when) always retrieve instead — a missed
intent degrades to search; a wrong intent would answer the wrong thing.

1. **Retrieval first, deterministic** — the same lexical scorer, top-K candidates.
2. **Empty = honest empty**: `{answer: null, synthesized: false, found: 0}` with a
   "no knowledge found" message — never composed from general knowledge; the empty
   ask is logged into the same knowledge-gaps feed as an empty search
   (`payload.via: "ask"`).
3. **Composition uses retrieved cited notes ONLY**; answers are marked
   `synthesized: true` and carry `citations[]` ({id, title, kind, domain?, path}).
4. **Raw mode**: with no org synthesis key configured, returns `rawMode: true` +
   the top cited candidates (no LLM call) — the surface degrades to search, never
   to silence or invention.
5. **Custody**: synthesis runs on the ORG'S OWN LLM key (a platform tokens row,
   provider `anthropic`, encrypted at rest, decrypted per call server-side, never
   logged). Usage is metered to `usageEvents` (purpose `ask`, runner `platform`).
6. **Caps are loud**: a per-repo daily cap returns an explicit error, never a
   silent throttle.

**Auth:** per-repo machine keys, minted on the platform, sent as
`Authorization: Bearer`. Keys are stored hashed platform-side and live client-side in
`~/.config/rafinery/credentials.json` — never inside the code repo or this brain repo.

**Client wiring (written by `rafa init`, secret-free where committed):** a key is
minted at setup generation and delivered consume-once through the setup fetch;
`.mcp.json` (committed) registers the `rafinery` server with
`Authorization: Bearer ${RAFA_MCP_KEY}` env expansion; the raw key lands in
`.claude/settings.local.json` `env` (gitignored) and `~/.config/rafinery/credentials.json`
(0600). Teammates mint their own key on the platform (repo → Agent access).

### §9 addendum — state-plane tools (three-store model, working-set architecture)

The knowledge plane stays strictly read-only (org-brain writes go ONLY through
files → compile → push → ingest). Seven additional tools write **collaboration
state**, marked by `envelope.plane: "state"`:

| Tool                                                                                   | Store                                                   | Notes                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list_dev_insights` / `put_dev_insight` / `remove_dev_insight`                         | **user brain** — account-scoped, cross-repo, PRIVATE    | consent-gated by the conductor; never logged to repo activity; nothing person-scoped is ever served to another user                                                                                                                                                                                                                                                  |
| `checkpoint_sync`                                                                      | **branch working set** — (repo, branch, file path) rows | pushes edited/new brain files from the lazy `.rafa/` instance at CHECKPOINTS (task done · plan approved · explicit ask · cadence · git push/pull — never session-end) under **base-version CAS**: each file carries the row `version` last seen (null = create); a stale base returns the newer copy as a per-file conflict for the HUMAN in that session to resolve |
| `get_working_set`                                                                      | branch working set                                      | hydration (a session starts with its branch's working set), the branch view, distillation collect; `needs-adjudication` rows carry the incoming copy in `pending`                                                                                                                                                                                                    |
| `resolve_working_file`                                                                 | branch working set                                      | `distilled` / `refuted` (+ cited note) at merge-to-main distillation; `keep-current` for adjudication decisions; CAS on status — a racing distill fails loudly                                                                                                                                                                                                       |
| `fold_working_set`                                                                     | branch working set                                      | branch→parent-branch MECHANICAL fold (no LLM, no prism — rigor only at main): absent → re-keyed · identical → merged · divergent → `needs-adjudication` on the parent row                                                                                                                                                                                            |
| `push_plan` / `list_plans` / `update_plan_status` / `set_active_plan` / `log_decision` | **plans** — (repo) work objects                         | the push-on-approval channel (§7 v2): approval pushes the whole work-item TREE (items[], bodies stored); `list_plans` = names only; statuses push back (5-value enum — blocked is derived); `log_decision` records the deliberation trail (paraphrase + pivotal quotes); the active pointer is explicit, never inferred                                              |
| `report_improvement_status`                                                            | **events only** — no store                              | a LIVE session signal (bloom's fixed-in-passing during build). The improvement ledger row is untouched — it has ONE writer, the ingest (K1); the platform overlays the report as pending-reconciliation until the next brain push confirms it                                                                                                                        |

State tools work with or without an ingested brain (a working set can exist —
and a plan can be pushed — before the first scan) and are exempt from the
snapshot/ingestError gates. `get_plan`/`get_active_plan` share this exemption
(plans are work objects, not snapshot-derived knowledge). The retired
bucket-note tools (`stage/list/resolve_bucket_note`, pre-0.4.0) are superseded
by the working-set tools.

## 10. Agent cards — `../.claude/agents/*.md` (local gate)

The shipped agents are contract-governed artifacts: every card is validated by
`rafa compile` (a malformed agent fails the gate) but never enters `manifest.json`.
No assumed values — applied to the agents themselves.

```yaml
---
name: prism                 # required · MUST equal filename stem
version: 0.4.0              # required · semver (MAJOR.MINOR.PATCH)
model: opus                 # required · non-empty (trailing # comment = the why)
groundTruth: code-vs-claim  # required · code-at-sha | code-vs-claim | code-trend | sessions-over-time
description: >-             # required · non-empty (folded scalar allowed, §0)
  …
tools: Read, Grep, …        # required · non-empty
color: orange               # optional
duties:                     # required · block list, ≥ 1 · each a duty DSL string
  - <duty> :: <sop-path> :: <bar>
---
```

**Duty DSL** (one string per duty, split on `::`, exactly three parts):

- `duty` — kebab-case name of the responsibility.
- `sop-path` — path relative to the CODE repo root (e.g.
  `.claude/skills/rafa-validate/SKILL.md`); the file MUST exist at compile time (a
  duty without a procedure is a claim, not a contract). Legacy `.rafa/`-relative
  paths (pre-0.4.0 `capabilities/*.md`) still resolve during the migration window.
- `bar` — the explicit pass/fail sentence for this duty. Never empty: a duty whose
  bar can't be stated can't be validated, so it doesn't ship.

Versioning: bump `version:` with any card change; record the _why_ outside the card
(cards ship to end users and stay clean of build-log clutter).

---

This contract is the thing to test against.
