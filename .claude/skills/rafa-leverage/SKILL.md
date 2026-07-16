---
name: rafa-leverage
description: "rafa SOP — tune the dev's agent toolbox: detect missing/misconfigured/unused permissions, skills, MCP servers; on approval apply exact merges. Loaded on /rafa leverage."
---

# leverage — get more out of the toolbox you already have  (capability #3)

rafa's third mission: **make the dev's agent toolchain pull its full weight.** rafa already
reads your *code* to build a brain; leverage turns the same lens on your *toolbox* — the
config layer (permissions, skills, MCP servers, hooks, commands) that decides how effective
the AI engineer actually is. It surfaces what's missing, misconfigured, or unused, and points
at the fix. This is platform DNA: **leverage what's present; never reinvent it.**

**Two layers — detection is deterministic, action needs intelligence:**
- **`rafa leverage`** (CLI) — the cheap **detector**. Reads the repo, ranks, and *reports*; it
  **changes nothing**. Good for a notify/CI signal, and as structured input to the LLM.
- **`/rafa leverage`** (in Claude Code) — the **actor**. rafa reasons over the real config and,
  on the dev's approval, **applies the fix exactly** — merges the precise permission entries,
  writes the correct `.mcp.json` block, scaffolds the skill. The CLI can't do this; only the
  intelligence can edit correctly. The detector finds the gap; the LLM closes it.

---

## Prime directives

1. **Leverage, don't replace** — always prefer the dev's existing capability (a skill, an MCP
   server, a host feature) over hand-rolling one. The best tip points at something already
   installed but unwired.
2. **Signal, not noise** — emit a tip only from a clear, checkable signal (a missing permission,
   an un-ignored `.env`, a stack with no matching MCP). A false or obvious tip mutes the whole
   advisor. Few, relevant, dismissible.
3. **Leverage-ranked** — `P1` security/correctness → `P2` friction/leverage → `P3` nice-to-have.
   Lead with impact × ease. Never dump an unranked wall.
4. **Approval-gated, never authoritarian** — the dev owns their setup. `rafa leverage` (CLI) only
   proposes. `/rafa leverage` *applies*, but **only on the dev's approval and always as a merge** —
   show the diff, never clobber, propose don't force.
5. **Tool-agnostic by construction** — the advice engine knows nothing about any specific tool;
   all tool knowledge lives in an **adapter**. This is what makes "leverage what's available"
   true for Codex, Cursor, or any other toolchain, not just Claude Code.

---

## Architecture — the ToolchainAdapter seam

The engine ([`lib/leverage/engine.mjs`](../../../packages/cli/lib/leverage/engine.mjs)) gathers
light, tool-agnostic repo signals (`repoContext`: stack deps, `.env` files + whether they're
ignored, declared MCP servers), then runs every **detected** adapter and ranks the tips.

Each adapter implements one contract ([`lib/leverage/adapters/index.mjs`](../../../packages/cli/lib/leverage/adapters/index.mjs)):

| Member | Shape | Job |
|---|---|---|
| `id` / `name` | string | identity + human label |
| `detect(cwd)` | → boolean | is this toolchain present in the repo? |
| `inspect(cwd)` | → Capabilities | normalized view: `{ permissions, skills, agents, commands, … }` |
| `recommend(cwd, ctx)` | → Tip[] | proactive tips `{ id, priority, title, detail, fix }` |

**Implemented:** `claude-code` — reads `.claude/settings.json`, `skills/`, `agents/`,
`commands/`, and `.mcp.json`. **Declared, not yet built:** `codex`, `cursor` (the `PLANNED`
list) — the seam is real, the adapters are added when a user actually runs on that toolchain.
*Don't build an adapter ahead of the phase that consumes it.*

### What the Claude Code adapter checks today
- **Secrets** — `.env*` present but not gitignored → `P1` (protect the keys before a scan or a commit).
- **Permissions** — rafa provisioned but its CLI commands are not allow-listed / no `settings.json`
  → `P2`, fix = `rafa init`/`update` (which *merge*, never clobber — see the CLI).
- **MCP** — a stack with no matching server wired (e.g. Convex repo, no `convex` MCP) → `P2`.
- **Skills** — no project skills captured → `P3`.

Adding a check = one entry in an adapter's `recommend`. Adding a toolchain = one new adapter
behind the same contract. The engine and the `rafa leverage` command never change.

---

## Boundaries

- **Committed config only.** Read the repo's `.claude/` (org config). The dev's personal
  `~/.claude/` is private — never inspected. (Mirrors [scan](../rafa-scan/SKILL.md)'s privacy line.)
- **Secrets are off-limits.** Detect that an `.env` is unprotected; **never open it or read a
  value.** Same hard line as the scan guardrail.
- **Read-only.** leverage itself mutates nothing. The only writes are `rafa init`/`update`
  merging permissions, run explicitly by the dev.
