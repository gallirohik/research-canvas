---
name: rafa-insights
description: "rafa SOP — compass's user brain: bootstrap from the dev's native /insights report, refine with consent, steer back at boundaries; account-scoped, cross-repo, private. Loaded on /rafa insights and routed capture moments."
---

# insights — the user brain: bootstrap, refine, steer  (compass's SOP)

> Status: **active (v1 — conductor-mediated).** Invoke via `/rafa insights`
> (bootstrap/refresh) — capture during work is the conductor's job (rafa.md
> §capture routes dev-level observations here). Store: `put_dev_insight` /
> `list_dev_insights` / `remove_dev_insight` (account-scoped, cross-repo).

## The creed (owner, verbatim — non-negotiable)
**"We are not stealing their knowledge; we are working with them to refine
their knowledge to do bigger things in better way."** Partnership, not
extraction. The dev is the beneficiary AND co-author of their own refinement.
The measure of this work is the dev doing bigger things better — never the dev
becoming legible to anyone else.

## Honesty about tenancy (pre-orgs)
Until org accounts land, teammates' keys live under the repo owner's platform
account: MCP scoping keeps one KEY from reading another's insights, but the
ACCOUNT owner can see data stored under their account on the platform. When
the key isn't the account owner's, the offer says so: *"banked privately to
your key — note: stored under this repo owner's account until org accounts
ship."* Consent means informed.

## The boundary (both directions, no exceptions)
- Nothing **code-cited** enters the user brain (code facts → the branch working set →
  org brain via distillation).
- Nothing **person-scoped** leaves it — not to teammates, not to repo activity
  feeds, not to aggregates without explicit standing consent. This floor is
  enforced in the platform dispatch, not just here.

## Procedure

### 1. Bootstrap (first run, or on request)
Read the dev's native usage report (Claude Code `/insights` — ask the dev to
run it if absent; its report lands at `~/.claude/usage-data/report.html`).
**Distill with judgment — never parse the HTML mechanically** (its shape is
unversioned; the model reads it like a document). Extract dev-level signals
only: asking/decomposition patterns, repeated instructions (each is a candidate
preference), friction loops, unused leverage. For each candidate: show the dev,
**offer** — banked only on yes (`put_dev_insight`, kind pattern|preference|
constraint).

### 2. Continuous refinement (every session, conductor-routed)
**Before ANY put: `list_dev_insights` first.** Update the matching existing
insight (its id) instead of creating a near-copy — and NEVER re-offer an
insight the dev deleted (deleted rows persist as content-erased tombstones in
the list precisely so you can honor the refusal: "you removed this before; not
re-suggesting"). **Never bank a secret**: a stated constraint quoting a
credential is rephrased value-free before the offer (the platform screens too —
don't rely on it).
Capture moments: a correction repeated across sessions · a stated preference ·
a named constraint · a friction loop. Route: dev-level → offer → bank;
code-level → the branch working set (not yours — rafa.md §capture routes it). Update beats duplicate: refine the
existing insight (`put_dev_insight` with its id) rather than accreting near-
copies.

### 2b. Personal tooling (ratified 2026-07-12 — the user-plane toolbox)
Under the dev's STANDING insights consent, inventory the tooling they carry
across repos — `~/.claude/skills` + user-level MCPs — and bank each as a
`kind: tooling` insight (NAME + DESCRIPTION only, never file contents). Update
beats duplicate; tombstones honored. This is what lets rafa orchestrate a
dev's personal migration skill in a repo that has never seen it. The REPO
toolbox is atlas's plane (scan's toolbox domain), never yours.

### 3. Steering (the payoff — propose, the dev disposes)
At natural boundaries only, at most one nudge — and ALWAYS have a candidate
ready (leverage-coaching: cross the repo's toolbox inventory with the dev's
patterns + tooling insights — "you've hand-run this migration three times; the
repo ships a skill for it"). Availability is always; frequency never rises.
Surface the insight that changes what the dev does next — "you've corrected X three times: want it banked as a
rule?" · "this decomposition worked before, reuse it?" · "you never use plan
mode on big changes; it would have caught this." Dismissal is final for the
session. Never rank, never compare devs, never nag.

### 4. Legibility (consent's other half)
On request, show everything (`list_dev_insights`), correct anything, delete
anything (`remove_dev_insight`) — no residue, no argument. An insight the dev
says is wrong IS wrong.
