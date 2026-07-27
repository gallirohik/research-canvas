---
name: rafa-migrate
description: "rafa SOP — the brain-side half of an upgrade: /rafa migrate rewrites plan files whose SHAPE changed, /rafa update reconciles the brain against a bumped contract. The terminal CLI already did the mechanical half; this is the part that needs judgment. Loaded on /rafa migrate or /rafa update."
---

# migrate · update — the intelligence half of an upgrade

> Status: **active.** Admin verbs — they run only when explicitly typed. The
> terminal `rafa migrate` / `rafa update` already did the mechanical half
> (field renames, path moves, blueprint re-sync); this SOP is the part that
> needs a model to read each file and preserve its meaning.

Lifted out of the conductor card (2026-07-27). The conductor's own rule is that
verb-specific procedure lives in a lazily-loaded skill and is never restated in
the card — this was the last section still violating it, and every session was
paying for a procedure that runs on upgrade days only.

**Both verbs end the same way:** `npx @rafinery/cli compile` to exit 0. Never
hand-edit around a migration, and never discard a tuned file to make one pass.

## `migrate` — a plan's SHAPE changed

Mechanical field renames and path moves are the terminal CLI's job. This verb is
for the case where each file has to be *understood* to be rewritten.

1. Read the target schema in [`.claude/rafa/contract.md`](../../rafa/contract.md)
   (§6/§7 for plans) and the `from` versions in the committed `rafa.json`.
2. Rewrite each affected file under `.rafa/plans/` (and any other structured
   directory) preserving meaning — remap fields, fill newly-required fields
   sensibly. A field you cannot derive is asked about, not invented: the
   no-assumed-values law (contract §0) applies to a migration exactly as it
   applies to a scan.
3. `rafa compile` to exit 0.
4. Surface the diff for approval.

## `update` — the brain side of a version bump

Runs AFTER `npx @rafinery/cli@latest update` has synced the blueprint and run the
mechanical migrations. Don't re-run the CLI here; if it hasn't run, say so and
stop — this verb reconciles what that one reported.

1. Compare `.rafa/manifest.json`'s `schemaVersion` (and `rafa.json`'s
   `contract`/`plans`) against the current contract. That gap is what the CLI
   flagged.
2. **Contract bumped → the brain is a stale cache.** Either re-scan (`## scan`)
   to regenerate it, or rewrite the affected notes and re-validate. Which one is
   a blast-radius judgement: a narrow field change is a rewrite, a structural
   change is a re-scan.
3. **Plan shape changed** → rewrite each per `migrate` above.
4. `rafa compile` to exit 0, then advance the data version in `rafa.json`
   (`contract`/`plans` → the versions you actually migrated to). Advancing it
   before the files migrate is how a repo starts lying about its own schema.
5. Summarize what moved.

## The ladder is the transform layer, and it is not automatic

A `schemaVersion` bump is a two-part act (contract §8): the step's transforms are
registered in [`packages/cli/lib/schema-ladder.mjs`](../../../packages/cli/lib/schema-ladder.mjs)
FIRST, then the constant moves. Bumping alone invalidates every existing note at
once — the compile gate, `rafa checkpoint` and the reconciler's version guard all
refuse a mismatch together.

So if this verb meets files at a version the ladder has no registered step for,
that is not a file to hand-fix: it is a missing transform. Say so and stop.

## Anti-patterns

- Hand-editing a file to satisfy compile instead of migrating it — the next pass
  re-breaks it, and the schema is now a fiction.
- Advancing `rafa.json`'s version before the files actually conform.
- Discarding a tuned file because rewriting it is harder than replacing it.
- Re-running the terminal CLI from inside this verb — the two halves are
  sequential on purpose.
