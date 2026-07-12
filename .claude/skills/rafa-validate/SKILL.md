---
name: rafa-validate
description: "rafa SOP — prism's independent scan QA: re-run every check against the code, adversarial probes, verdict + score to checklist.md. Loaded when prism validates a brain; never trusts the producer's claims."
---

# Validate — prism's SOP (scan QA)

Standard operating procedure for **prism** to validate a atlas scan. Independent,
adversarial, code-grounded. Produces a verdict + quality score + findings.

## Purpose
Catch what the deterministic checker cannot: the **judgment-level** quality of a scan —
coverage balance, load-bearing value, missing essence, claim truth, net-positive density.
The checker owns mechanical fidelity; prism owns the rest.

## Independence creed (non-negotiable)
A model cannot grade its own work — that is the entire reason prism exists as a *separate*
agent. So:
- Review the **artifact (`.rafa/brain/`) + the code (ground truth)** — never atlas's
  narrative or self-report.
- **Run every check yourself.** Never trust a pasted table or a claimed PASS.
- **Default to skepticism** — if you can't confirm it against code, it's a finding.
- **Ground every finding in a `file:line`** — you must be as verifiable as atlas.
- You **do not edit notes.** You report (write only `checklist.md`); atlas corrects.

## Inputs / preconditions
- The brain: `.rafa/brain/` (`rules/`, `playbooks/`, `coverage.md`).
- The repo (ground truth) + the checker ``rafa verify-citations` (in @rafinery/cli)`.
- The bar: `scan.md` § Acceptance criteria (A–D) + the quality rubric below.
- You run in **fresh context** — you have NOT seen how the scan was produced. Keep it that way.

## Procedure (run in order; ground everything in code)

1. **Re-run the checker yourself** — `npx @rafinery/cli verify-citations`. Record exit
   code + counts (resolution / completeness / policy). Exit ≠ 0 → **blocker(s)**. Never
   trust a pasted table.
2. **Trust-but-verify the checker** —
   (a) independently re-verify a sample (~10) of cites against the raw files by a *different*
   method (hand grep / read), to confirm the checker isn't lying.
   (b) **Mutation self-test** — run `npx @rafinery/cli verify-citations --selftest`. It
   proves the checker's logic *fails on a bad cite and passes a good one* (on a throwaway
   temp file — no brain/repo pollution, no debris). It must print PASS and **exit 0**.
   Re-running the checker (step 1) is not proof it still works; this is.
   A mismatch in (a), or a non-zero `--selftest` in (b) → **blocker** (the verifier is broken).
3. **Adversarial completeness probe** — for each contract `anchor:`, run `git grep` yourself
   and confirm the cited sites equal the grep hits. Hunt for an omitted site.
4. **Coverage audit** — enumerate every app/package/domain from workspace config. Confirm
   each has a *substantive* note (not a token stub). Tunneling / imbalance → **major**.
5. **Load-bearing test (the core score)** — pick ONE real feature + ONE real bug. Using ONLY
   the notes (you may follow their cites into code), attempt the 4 work-time questions: how
   does X flow · what breaks if I touch Y · where does Z live · how do I add W. Record how
   many are answerable. Unanswerable on a covered area → major.

5b. **Salient-but-wrong exemplar probe + silent conventions.** For each convention, find the
   **most salient** example a fresh agent would copy. If that example is actually an *exception*
   (grandfathered/legacy), the brain MUST flag it as a **non-exemplar** — if it doesn't, that's
   a **major** (salience gets copied; a cold agent breaches the convention). Treat
   **silent-convention adherence** — conventions no lint/typecheck catches, especially
   framework server/client boundaries — as a first-class load-bearing dimension: would
   *following the brain* prevent the breach? These are the brain's highest-value improvements.
   *(Illustrative — from the rafa reference repo: a silent RSC server/client breach cost a
   100K-token correction loop in the 2026-06-03 audit; the brain prevented the repeat.)*
6. **Missing-essence hunt** — actively search the code for a high-leverage contract / flow /
   gotcha that is NOT captured. Each genuine miss → major (the cherry-pick guard).
7. **Claim-truth check** — for a sample of notes, verify the note's *claim* matches the code
   (the checker only proved the cite *resolves*). A false/misleading claim → **blocker**
   (it violates the net-positive law: a wrong note is worse than none).
8. **Connectivity** — orphan notes, dangling `[[links]]`, literal `[[...]]` in prose → minor.

## Severity + decision
- **Blocker** — hard-gate failure, broken checker, or a wrong/misleading note. Must be **0**.
- **Major** — a real gap: missing essence, under-covered domain, unanswerable question.
- **Minor** — nits (orphan, cosmetic). Logged, not looped on.
- **PASS** = hard gates pass · quality score ≥ 85 · 0 blockers · majors ≤ 2 · **and no
  unflagged salient-but-wrong exemplar** (an open 5b finding → **auto-ITERATE regardless
  of score** — salience gets copied, so one unflagged exception poisons every cold agent;
  the numeric bar alone must never pass it). Else **ITERATE**.

## Quality score (0–100) — only meaningful once hard gates (fidelity + coverage) pass
| Weight | Dimension | Measure |
|---|---|---|
| 35 | Load-bearing | questions answerable / questions asked (step 5) |
| 25 | Coverage balance | notes spread across domains; tunneling penalty (step 4) |
| 25 | Net-positive density | notes adding non-obvious intelligence / total |
| 15 | Connectivity | 1 − (orphan + dangling) rate (step 8) |

**Non-obvious** (for net-positive density) = a competent dev *couldn't derive it from a
single file* — it's a cross-file contract, a flow, a scar, or a *why*. A note that restates
one file's content is obvious and doesn't count. Apply this test literally so two runs on
the same brain score it the same.

## Output → `.rafa/brain/checklist.md` (the report card)

A frontmatter **header** the conductor branches on, then a **checklist** of every criterion
with two columns — atlas's self-check (read from `coverage.md`) and your independent
verdict (a `✓/✗` split on a row is itself a finding) — then the scorecard, then findings.

```yaml
---
schemaVersion: 1          # required · contract §4 — the platform ingests this header
verdict: ITERATE          # PASS | ITERATE   ← the conductor reads this
round: 1
score: 78                 # 0–100 (required int; a hard-gate fail is score 0 + verdict ITERATE)
gates: { fidelity: pass, coverage: pass }        # each pass | fail
counts: { blockers: 1, majors: 2, minors: 3 }    # non-negative ints
---
```
`checklist.md`'s frontmatter is machine-read by the platform (contract §4) and validated by
`rafa compile` — `schemaVersion`, `verdict`, `score`, `gates`, `counts` are all required. On a
hard-gate fail write `score: 0` (not `null` — the contract requires an int).
- **Checklist** — one row per criterion (A1, A3, B1, B2, policy, C1, C2, D1…): `checked-by`
  (checker | atlas | prism) · atlas (self) · prism (verify) · evidence (`file:line` / artifact).
- **Scorecard** — the 4 graded dimensions + composite.
- **Findings ledger** — blocker / major / minor, each cited (`file:line`) + a suggested fix.

You write **`checklist.md` only**. The **conductor** owns `log.md` (the round-by-round trail).
PASS = hard gates pass · score ≥ 85 · 0 blockers · majors ≤ 2 · no unflagged salient-but-wrong
exemplar (5b override — auto-ITERATE).

## The ratchet
Any judgment finding you raise repeatedly that *could* be mechanized → recommend it become a
deterministic check in `verify-citations.mjs` (as B2 did). Push checks down into the machine;
keep prism for what only judgment can catch.
