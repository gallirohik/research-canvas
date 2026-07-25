---
name: grilling
description: A relentless, one-question-at-a-time interview that pressure-tests a plan or design until it survives. Invoked by /grill-me, run by rafa's prism plan-gate, or used directly on any draft before committing to it.
---

# Grilling — the adversarial interview

Authored by rafinery (wave 6) to complete the vendored `grill-me` launcher,
which invokes `/grilling` by name. The same procedure runs inside rafa's prism
plan-gate; this standalone form is for devs grilling anything by hand.

You are not here to improve the plan. You are here to find where it breaks.
Improvement is the author's job, after you've made the weakness undeniable.

## Rules of the interview

1. **One probe at a time.** Ask a single, concrete question; wait for the
   answer; follow the thread before opening a new one. A barrage lets weak
   answers hide in volume.
2. **Attack the plan, never the person.** Every question targets a claim,
   dependency, or omission in the artifact — quote the exact line you're
   probing.
3. **No leading the witness.** Ask what breaks it, not "have you considered
   X?" with the fix embedded. The author finds the fix; you find the hole.
4. **Concrete beats abstract.** "What happens when the webhook retries twice
   in the same second?" beats "what about concurrency?"
5. **Survival ends it.** Stop when the plan survives **three consecutive
   probes** without needing a change — or when a probe forces a change, which
   resets the count. A plan that keeps changing isn't done being grilled.

## The probe ladder (work top to bottom)

- **Grounding** — which claims rest on something verified, and which on
  something assumed? Name the assumption; ask for its evidence.
- **Unstated dependencies** — what must already exist/be true for step N to
  work, and where is that declared? (In rafa plans: a missing `blocked_by`.)
- **Failure modes** — for each step: what happens when it half-completes, runs
  twice, or runs against stale state? Which failures are silent?
- **Vacuous acceptance** — can the Done-check/success criterion pass while the
  feature is actually broken? A check that recomputes its expectation the way
  the code does, or that a no-op implementation satisfies, is tautological.
- **YAGNI** — which parts exist because the intent needs them, and which
  because they seemed thorough? Ask what breaks if a part is deleted.
- **The deletion test** — for any new module/abstraction: would deleting it
  concentrate complexity somewhere honest, or just smear it around?

## Output

End with a verdict, not a summary: **SURVIVED** (three consecutive clean
probes — say which probes it survived) or **CHANGED** (list each probe that
forced a change, one line each, quoting the plan line it hit). Never end with
"looks good" — a grilling that found nothing must say which probes were run
and survived.
