---
name: rafa-okf
description: "rafa SOP — the OKF surface (contract §11): every generated .md self-describes as an Open Knowledge Format v0.1 concept, and a pushed brain repo is a conformant bundle any foreign agent can read. How every authoring agent writes OKF-natively, and how to mint a NEW file type in minutes via rafa okf new + the @rafinery/okf registry. Loaded via the okf-surface duty on atlas · bloom · prism · sage cards."
---

# okf — the interchange surface every writer shares

**The protocol in one sentence:** *if rafa writes a `.md`, it is a valid OKF
concept — frontmatter, `type`, markdown links, cited — and a pushed brain repo
IS a conformant [OKF v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf)
bundle.* The spec version is pinned ONCE — `OKF_VERSION` in `@rafinery/okf`
(v0.1 today); machine surfaces interpolate it, never re-declare it. OKF is the
interchange **floor** (what any foreign agent can read);
the [contract](../../rafa/contract.md) stays the strict **ceiling** (what our
gates enforce). Canonical spec: contract **§11**. Machinery: the
**`@rafinery/okf`** package ([packages/okf/](../../../packages/okf/)) — parser,
concept primitives, links, citations, indexes, validator, generator. Nothing is
buried in gate output; every surface (gate CLI · emitter · platform · tests)
imports the same package.

Why it matters: OKF standardizes format and has **no truth story** — anyone
can emit OKF; only rafa mechanically proves its OKF against the code at a sha.
Conformance is our distribution wedge; verification stays the moat.

---

## Prime directives

1. **Every generated `.md` self-describes** — frontmatter with a non-empty
   `type`, no exceptions beyond the two documented ones (`active.md` pointer,
   `log.md` heading decoration), which are declared exemptions surfaced by
   `rafa okf check`, never silent skips.
2. **No assumed values, extended to interchange** — a stamp is derived from
   authored data or real history (git), or it is **omitted**. Authored values
   are never rewritten by tooling.
3. **Author markdown links, not wikilinks** — bundle-relative form:
   `[Title](/brain/rules/<id>.md)` (OKF §5.1). Legacy `[[wikilinks]]` are
   transpiled at emit when they resolve; a dangling link is *not-yet-written
   knowledge* (OKF §5.3) — the checker's non-failing LINKS lane lists it as
   your worklist. `links:` frontmatter stays the machine edge list.
4. **`cites:` stays the machine truth** — the generated `# Citations` body
   section (inside `okf:citations` markers) is display-only render, re-emitted
   each push, never hand-edited.
5. **Naming is navigation** — kebab-case ids that equal filename stems,
   semantic directories, an `index.md` at every level: a foreign agent reaches
   any concept from the bundle root in ≤ 2 hops with zero rafa tooling.

## How each agent writes OKF-natively (the adoption map)

| Agent | Files | What OKF-native means for you |
|---|---|---|
| **atlas** | `brain/rules/` · `brain/playbooks/` · `brain/coverage.md` | author `type` (§2 enum) + `title` + `summary` as ever; body cross-links as markdown links; optionally author `description`/`tags` — emit derives them from `summary`/`domain` if you don't |
| **bloom** | `improve/improvements/` · `improve/ledger.md` | same; your files gain `type: Improvement` + `tags: [lens, priority]` at emit — author `found:` so timestamps are yours, not git's |
| **prism** | `brain/checklist.md` | verdict frontmatter as ever (emit stamps `type: Health Report` + a derived description); at validation, treat the checker's LINKS warns as a worklist — dangling links are claims of future knowledge |
| **sage** | `.claude/rafa/learnings/` | learnings are OKF concepts too: frontmatter + `type: Learning` + markdown links; outside the bundle but under the same protocol |
| **conductor / plan·build** | `plans/**` · `brain/log.md` | plan items gain `type` from `kind` at emit (per-epic `plans/index.md`); journals + bodies use markdown links; `log.md` stays the reserved trail |
| **compass** | — | writes platform state, never bundle `.md` — its duty is the PORTABILITY law: OKF bundles are exchangeable, so person-scoped content never lands in one; anything it ever materializes self-describes |

The tooling backstop: `rafa push` runs `rafa okf` (emit) → `verify-citations`
→ `compile`, so the surface exists even where an agent forgot — but authoring
natively keeps stamps honest (your `created:`/`found:` beats git history).

## Minting a NEW file type — minutes, not hours

A new generated file class is **four small moves**, conformant by construction:

1. **Registry** — add the class to `FILE_CLASSES` in
   [packages/okf/lib/profile-rafa.mjs](../../../packages/okf/lib/profile-rafa.mjs)
   (dir or singleton path · OKF `type` name · index title) and, if any stamp is
   derivable, a `derivedStamps` case. Derivation law: authored data or real
   history, else omit.
2. **Contract row** — one row in the contract's file-type registry
   ([contract.md](../../rafa/contract.md), the §-table): path glob · class
   (`structured`/`verbatim`/`generated`) · schema section · author. A
   `structured` class also gets its schema section + a compile validator in
   [packages/cli/lib/gate/compile.mjs](../../../packages/cli/lib/gate/compile.mjs)
   (required fields fail loudly; enums closed).
3. **Skeleton** — `rafa okf new <class> <id> --type=… --key=value
   --cite="file:line :: token" --link=<id>` mints the file in the class's
   directory. The generator REFUSES to invent values: flags you omit are
   absent, and `rafa compile` fails required ones loudly — that is the
   validate-and-correct loop working, not a bug to paper over.
4. **Prove it** — `rafa verify-citations` (cites/anchors real) →
   `rafa compile` (schema holds) → `rafa okf check` (bundle still conformant).
   Add a case to the gate e2e
   ([packages/cli/test/okf-gate.test.mjs](../../../packages/cli/test/okf-gate.test.mjs))
   when the class carries new emit behavior.

Naming rules for new classes (directive 5): class name = singular kebab noun;
instances live in a plural semantic directory (`brain/<things>/`) or a fixed
singleton path; ids kebab-case = filename stem; the OKF `type` value is a
short, self-explanatory Title Case string (consumers route on it — OKF types
are unregistered by design).

## Commands

```bash
rafa okf          # materialize the surface (runs automatically inside rafa push)
rafa okf check    # OKF §9 conformance walk — errors fail, exemptions surface as warnings
rafa okf new …    # mint a conformant concept skeleton (see above)
```
