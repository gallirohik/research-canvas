---
name: rafa-security
description: "rafa SOP — the security profile: run the self-contained `rafa audit` engine (dep CVEs via OSV · secrets · SAST if present), brain-ground reachability, author category:security improvements with the mechanical priority map, emit the profile. Loaded by bloom/the conductor at profiling moments (scan's improve pass, build-time sweep) — NEVER a dev-typed verb."
---

# security — the profile  (woven, never a command)

rafa's security posture is **woven into the loop, not a chore**: the dev never
types a security command. Owner doctrine (owner 2026-07-26, consolidated in
[contract §12.5](../../rafa/contract.md)): *"security is not an aftermath — it
is an integral part of the development cycle."* The engine fires at every
moment of that cycle:

- **plan** — the audit runs before approval and its picture is presented to
  the dev verbatim (rafa-plan §3b): totals + blast-radius criticals; clean is
  said out loud, never implied by silence.
- **build** — a task that touches the lockfile re-runs the cheap dep tier and
  reports the delta in one line (rafa-build §2).
- **improve / scan** — the full three-tier profile (this SOP's procedure below).
- **every merge** — branch→branch merges get a platform-side dep audit at fold
  time; canonical merges get the reconcile graph's security lane. Both mint
  Security-tab rows — freshness at every level, not just prod.

Findings land as ordinary contract §3 improvements with `category: security`;
the platform's Security tab reads the merge-level rows.

## The engine — deterministic first, always

Run **`npx @rafinery/cli audit --json`** and parse the `rafa.audit/v1`
envelope. The engine is SELF-CONTAINED — it needs no installs, ever:

- **dependency** — a built-in **multi-manager** lockfile parser (pnpm · npm ·
  yarn · bun, resolved dynamically richest-first — never a pnpm hardcode) +
  the keyless OSV.dev advisory API, merged with `pnpm audit` on pnpm repos;
  per finding: package · GHSA/CVE + aliases · severity + CVSS ·
  direct-vs-transitive chain (pnpm/npm; yarn/bun are honestly packages-only) ·
  fixed-in · dev-only flag. No lockfile → the tier is `ran:false` and
  `rafa doctor` prints the per-manager command to generate one.
- **secrets** — built-in curated ruleset over tracked files (`.env*` never
  opened; fingerprints, never secret bytes). gitleaks enhances if present.
- **sast** — semgrep if installed (pinned `p/security-audit`), otherwise the
  envelope says `ran:false` with the reason. semgrep/gitleaks are OPTIONAL
  enhancers; mention their value once when relevant (`rafa doctor` shows
  install hints) — installing is always the dev's own consented choice.
  **Never LLM-pretend a tier that did not run** — `tiers.<t>.ran` is the truth.

## Findings → improvements (the mechanical part)

One §3 improvement file per finding worth a row (group same-package CVEs into
one row when they share the fix — one lockfile bump = one improvement).
Required frontmatter as ever (`title` · `summary` · `fix` · `leverage` ·
`cites`), plus:

- `category: security` — always.
- **Priority maps mechanically, never by vibe**: critical → P0 · high → P1 ·
  moderate → P2 · low or dev-only (`dev:true`) → P3. The LLM may ANNOTATE
  (see below) but **never downgrades** a mapped priority.
- `fix:` carries the concrete path: the upgrade target (`fixedIn`), whether the
  dep is direct (bump it) or transitive (dedupe/overrides/parent-bump), the
  secret's rotation step. Comprehensive detail (chain, refs, CVSS) rides the
  body — machine-sourced from the envelope, never re-guessed.
- Dependency-tier rows cite the lockfile/manifest line that pins the package;
  secret/sast rows cite the `file:line` from the finding.

**Reconcile like any improvement**: dedupe against existing rows by the stable
finding id (in the body); auto-close rows whose finding vanished from a fresh
audit (`status: fixed` — the lockfile bump landed) **with a dated closure line
in the body naming the evidence (the new lockfile version / the vanished
advisory) — a tombstone, never a removal** (the §2/§12.4 lifecycle law);
preserve the dev's triage (backlog/wontfix stay).

## Brain-ground the reachability (the judgment part)

The brain's domain map is what raw scanners lack. For each dependency finding,
answer from the brain — *is this package on a server-exposed path?* (API
routes, webhook handlers, auth boundary) — and write the answer into the body
as an annotation: `Reachability: server-exposed via <domain> — see
[<note>](/brain/...)` or `Reachability: build-time only`. Cited, observational,
and **priority-neutral** — it informs the dev's triage, it never overrides the
mechanical map.

The wider observational pass (authz per route, webhook verification, input
validation against the brain's contracts) belongs to the improve SOP's
security lens — cited `file:line`, labeled observational, never presented as
SAST output.

## The P0 exception — the one row that travels

Improvement nudges are blast-radius-scoped — EXCEPT `category: security` P0s:
a critical CVE lives in no file the dev is touching, so a P0 security row may
surface at plan/build boundaries regardless of region. Still one line, still
dismissible, never blocking, never re-nagged in the same session.

## Anti-patterns

- Running the engine and PARAPHRASING its output into rows without the
  envelope's fields — the detail is machine-sourced or it doesn't ship.
- Downgrading a mapped priority because it "seems fine" — annotate, never
  downgrade.
- A wall of per-CVE rows for one package — group by shared fix.
- Presenting the observational pass as scanner output.
- Asking the dev to install semgrep/gitleaks more than once — the doctor
  carries the hint; a decline stands.
