---
name: dev-loop
description: The end-to-end development algorithm for this repo — recall before editing, hydrate affected notes, edit knowledge DURING development, then commit → checkpoint → push. Use at the START of any code change, before the first edit, and at every commit/push boundary. Load this whenever you are about to modify code, are asked to run/fix/build something, or are about to commit — it is the loop, not a reference doc.
---

# The development loop — every step, in order

This exists because the steps below get skipped in exactly one direction: an
agent starts editing code, learns things, ships the diff, and the knowledge
never lands in a file. Knowledge held only in conversation cannot be edited
later — it has to be fetched first, and nobody fetches what they don't know
exists.

**The loop is not optional and not "after the code works."** Steps 2 and 5
happen *during* development or they do not happen at all.

---

## Step 0 — Know what is already known (BEFORE the first edit)

Never start from a blank slate. The brain almost certainly has notes on the
code you are about to touch.

```
mcp__rafinery__get_brain_status          # counts + health; is there knowledge at all?
mcp__rafinery__search_knowledge          # q=<the subsystem>, branch=<current branch>
```

**HARD RULE — a local `.rafa/` with no `brain/` directory does NOT mean the
brain is empty.** `.rafa/` is a *lazy skeleton*. It is empty until hydrated.
Reading the local filesystem and concluding "there is no knowledge here" is a
false negative, and it is the specific mistake that produces duplicate notes.
Only `get_brain_status` answers that question.

**Read the `decisions` block in the search result before proposing anything.**
It carries settled calls (plan · actor · decision · rationale). A decision like
"Python-only for now" means the work you are about to do may already have been
ruled out. Surface it to the dev *before* building, not after.

Gate: you cannot proceed to Step 1 without knowing (a) which notes cite the
files you are about to touch, and (b) whether a decision already governs this
area.

---

## Step 1 — Do the work

Edit code normally. The PostToolUse sensor appends every edit to
`.rafa/dirty.jsonl`; that queue is what Step 2 reads. You do not maintain it.

If a correction arrives mid-task (the dev tells you you're wrong), that is a
signal, not just a redirect — carry it to Step 5.

---

## Step 2 — Hydrate the notes your diff touched (DURING the work)

The moment you have changed a line that a note cites, that note is stale. Fetch
it now, while you still hold the context that makes it editable.

```
rafa hydrate --working-set            # this branch's already-synced files
rafa hydrate rule <id>                # a specific note by id
rafa hydrate playbook <id>
```

Watch the output. A line like:

```
⚠ agents/typescript/package.json:13 did not re-base (gone) — served line may be stale
```

means **your change broke that citation**. That is not a warning to scroll past;
it is the note telling you it now describes code that no longer exists.

Hydrated-but-unedited notes are a disposable cache and are never pushed. A note
only becomes working set once you edit it.

---

## Step 3 — Edit the affected notes, don't write new ones

Default to **editing the hydrated note**. Only create a new note when no
existing note covers the claim — check Step 0's candidates first.

When editing a note:
- Update `summary` and `title` if the claim changed, not just the body.
- Fix every `cites:` entry whose line moved or vanished.
- If a claim **inverts** (the thing you cited no longer exists), move the token
  from `cites:` to `absent:` — gate B3 re-greps it every run, so the claim can
  never silently go stale again.
- Re-declare `anchor:` if you changed where the anchored token appears. Gate B2
  requires every code occurrence of an anchored token to be cited.
- Retire, never delete: set `status: retired` + a dated `## Retired` section.

Schema is contract §2 (`schemaVersion`, `id` == filename stem, `type`, `domain`,
`title`, `summary`, `cites:` ≥ 1). Frontmatter is strictly validated — an
illegal key fails the gate at Step 5.

Verify before moving on:

```
rafa verify-citations     # resolution · completeness · policy (B2) · absence (B3)
```

---

## Step 4 — Commit the code

```
git add <paths> && git commit
```

The `pre-commit` hook runs `rafa verify-blueprint` **only** if the staged set
touches `.claude/` or `CLAUDE.md`. An ordinary code commit pays nothing.

The `post-commit` hook mirrors the commit into the brain repo as an intent
record. That mirror carries *provenance only* — it does **not** contain your
knowledge edits. Seeing a green brain commit is not evidence the knowledge
landed.

---

## Step 5 — Checkpoint (this is the step that gets skipped)

```
rafa checkpoint
```

Checkpoint does three things that matter:
1. Syncs the branch working set (your edited notes) to the platform.
2. Converges reported improvement flips into the ledger.
3. **Compulsorily hydrates every note citing touched code** — the dirty queue
   ∪ `git diff <trunk>...HEAD` — so affected-note edits happen during
   development.

It also refuses to let the work pass as done:

```
⚠ 4 code file(s) edited, ZERO knowledge captured.
  `rafa guard --pre-push` WILL refuse the push until one of these is true.
```

**If checkpoint exits non-zero, the loop is broken — do not wave it through.**
A failing checkpoint means step 3 above never ran, so the notes that needed
editing were never pulled down. The push hook prints "checkpoint skipped —
push continues" and that reads like a formality; it is not. It means capture
is degraded while the code ships anyway.

Re-run until it exits 0:

```
rafa okf check        # names the malformed files
rafa checkpoint       # again
```

Then close the queues that fed this pass:

```
rafa reflex --consume <id> --reason "<banked as <note-id> | session-only>"
rafa dirty --consume        # ONLY after the refresh actually shipped
```

Bank a correction as a note if it is durable and code-groundable; mark it
session-only only if it is a one-off steer. "It's already implied by the diff"
is **not** a reason to skip banking — a diff is not recall.

---

## Step 6 — Push

```
git push -u origin <branch>
```

`pre-push` runs `rafa guard --pre-push` (**blocking** — a missing brain mirror
stops the push) and then `rafa checkpoint` (**non-blocking** by design). Because
the second one cannot stop you, Step 5 has to have been done properly already.

---

## Step 7 — Review before merge

```
rafa review
```

Computes what the diff touches — rules, playbooks, open improvements, stale
cites, open gaps, related decisions — and judges only against that list.

---

## Where this file lives, and why

`.agents/skills/` — not `.claude/skills/`. `rafa update` prunes anything under
`.claude/skills/` that is not in its own manifest, so a repo-authored skill put
there is deleted on the next CLI upgrade (observed 0.16.1 → 0.16.2: the file
vanished, leaving an empty directory). `.agents/skills/` is the harness-neutral
home every agent runtime reads and survives updates.

---

## The failure this loop prevents

Real sequence from this repo, all steps skipped:

1. Agent changed `agents/typescript/package.json:13` (`workspace:*` → `^1.63.2`).
2. Never ran Step 0 — did not know `build-tooling-convention` cited that exact
   line, and did not see the recorded "Python-only for now" decision.
3. Read the empty local `.rafa/`, concluded "the brain has zero knowledge"
   (false — 12 rules, 4 playbooks, health 94).
4. Committed and pushed. Brain mirror commits looked green; they held only
   intent records.
5. Checkpoint failed on a frontmatter gate; the message said "push continues",
   so it was treated as cosmetic.
6. Started hand-authoring a *new* note for knowledge an existing note already
   owned — a duplicate instead of an edit.

Net result: a shipped diff, a note still asserting `workspace:*`, and a
session's worth of findings that existed only in a chat transcript.
