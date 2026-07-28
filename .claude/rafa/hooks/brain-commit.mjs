// rafa brain-commit — the post-commit worker (capture-engine P1, spec r2 §2.2).
// ONE brain commit per code commit, strict 1-1 (--allow-empty), on the MIRRORED
// brain branch — never the brain default branch (the distiller's, single
// writer). Carries whatever changed under .rafa/ plus the commit's INTENT
// RECORD (intent/<shortsha>.md); git TRAILERS code-commit/code-branch are the join
// key. Note the two spellings are deliberate and must not be unified: a git trailer
// is hyphenated by convention, an OKF frontmatter key CANNOT be (it is read as
// `data.key`, and `data.code-commit` is unreachable). Class `intent` in
// profile-rafa.mjs is the authority for the frontmatter side.
// keys. Standalone by design (node built-ins only, like every M5 sensor);
// non-blocking always — a brain problem must never block a code commit.

import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
try {
  if (process.env.RAFA_HOOKS_DISABLED === "1") process.exit(0);
  if (!existsSync(join(ROOT, "rafa.json"))) process.exit(0);
  if (!existsSync(join(ROOT, ".rafa", ".git"))) process.exit(0);

  const sh = (cmd, cwd = ROOT, timeout) =>
    execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], ...(timeout ? { timeout } : {}) }).trim();
  const rafa = join(ROOT, ".rafa");
  const shR = (cmd, timeout) => sh(cmd, rafa, timeout);

  // DISPOSAL (MIRRORS working-set.isDisposableHydration — the ONE rule, both planes):
  // an UNEDITED hydration must never enter a brain commit, or we re-push org content as a
  // branch delta → stale-override at reconcile. After staging, unstage every unedited
  // hydration (it stays in the working tree as disposable cache) so only real deltas commit.
  const disposeHydrations = (br) => {
    try {
      const sc = JSON.parse(readFileSync(join(rafa, "hydration.json"), "utf8"));
      const synced = (sc.sync ?? {})[br] ?? {};
      for (const [p, rec] of Object.entries(sc.files ?? {})) {
        const abs = join(rafa, p);
        if (!existsSync(abs) || !/^[A-Za-z0-9._/-]+$/.test(p)) continue;
        const hash = createHash("sha256").update(readFileSync(abs, "utf8")).digest("hex");
        if (!synced[p] && rec?.hash === hash) {
          try {
            shR(`git reset -q -- "${p}"`);
          } catch {
            /* not staged (never tracked) — already excluded */
          }
        }
      }
    } catch {
      /* no/corrupt sidecar → nothing hydrated to dispose */
    }
  };

  const branch = sh("git rev-parse --abbrev-ref HEAD");
  // Trunk commits never mirror — the brain default branch has one writer, the
  // distiller. Conservative charset guard: a refname git allows but a shell
  // might mangle is skipped, never quoted-and-hoped.
  if (branch === "main" || branch === "master" || branch === "HEAD") process.exit(0);
  if (!/^[A-Za-z0-9._/-]+$/.test(branch)) process.exit(0);

  // Lockstep ensure (post-checkout's job, repeated here belt-and-braces): dirty
  // surfaces carry to the OLD branch first — deterministic, nothing lost.
  const cur = shR("git rev-parse --abbrev-ref HEAD");
  if (cur !== branch) {
    try {
      shR("git add -A");
      disposeHydrations(cur);
      shR(`git commit -q -m "brain(switch-carryover)" -m "switch-carryover-from: ${cur}"`);
    } catch {
      /* nothing dirty */
    }
    try {
      shR(`git rev-parse --verify -q "refs/heads/${branch}"`);
      shR(`git checkout -q "${branch}"`);
    } catch {
      shR(`git checkout -q -b "${branch}"`);
    }
  }

  // Merge-union (spec r2 §2.2): a LOCAL merge of branch X into this branch Y ⇒ union
  // brain/X into brain/Y, the merged branch winning per path (fold doctrine on the git
  // plane, `-X theirs`). TRUNK is excluded — merging main into a branch is a resync, not
  // a knowledge transport (unioning main's brain would re-pull org content = stale-
  // override). Best-effort: an unrecoverable branch name just leaves the 1-1 commit, and
  // the reconciler's ancestry sweep still catches the merged commits.
  try {
    const parents = sh("git rev-list --parents -n 1 HEAD").split(/\s+/).slice(1);
    if (parents.length >= 2) {
      const m = sh("git log -1 --pretty=%B").match(
        /Merge branch '([^']+)'|Merge branch "([^"]+)"|Merge remote-tracking branch '[^/]+\/([^']+)'/,
      );
      const merged = m ? m[1] || m[2] || m[3] : null;
      if (
        merged &&
        merged !== branch &&
        merged !== "main" &&
        merged !== "master" &&
        /^[A-Za-z0-9._/-]+$/.test(merged)
      ) {
        try {
          shR(`git rev-parse --verify -q "refs/heads/${merged}"`);
          shR(`git merge -q -m "brain(merge): ${merged} -> ${branch}" -X theirs "${merged}"`);
        } catch {
          /* no brain branch for the merged code branch, or already up to date */
        }
      }
    }
  } catch {
    /* not a merge / rev-list unavailable — normal 1-1 path */
  }

  // The BRANCH MANIFEST (harness-arc wave 1, manifest-as-handoff): every brain
  // commit carries a lenient snapshot of the branch's knowledge state, so the
  // reconciler (or any agent) reads "what this branch believes" at any ref.
  // Delegated to the CLI (`rafa manifest` — okf-parsed, never a second parser);
  // best-effort + bounded: a missing/slow CLI must never block a code commit.
  try {
    const localRafa = join(ROOT, "node_modules", ".bin", "rafa");
    const runner = existsSync(localRafa) ? `"${localRafa}"` : "npx -y @rafinery/cli";
    sh(`${runner} manifest`, ROOT, 30000);
  } catch {
    /* snapshot skipped — the reconciler treats a stale/absent branch manifest as null */
  }

  // The intent record — the commit's end-to-end intent, mechanically joined.
  // Minimal here (sha · subject · files); the P3 capture worker enriches.
  const fullSha = sh("git rev-parse HEAD");
  const short = fullSha.slice(0, 12);
  const clean = (s) => s.replace(/[`"$\\]/g, "'");
  const subject = clean(sh("git log -1 --pretty=%s")).slice(0, 100);
  const files = sh("git diff-tree --no-commit-id --name-only -r HEAD")
    .split("\n")
    .filter(Boolean)
    .slice(0, 100);

  // TAIL RUN detection (0.8.16, live-catch 2026-07-24): if HEAD already has its
  // 1-1 mirror commit (its code-commit trailer is in the brain log), THIS
  // invocation carries the SESSION TAIL — brain deltas written AFTER the last
  // code commit (verify flips · late-authored notes · regenerated manifest)
  // that would otherwise strand uncommitted until the next code commit. The
  // checkpoint beat fires this worker for exactly that case. A tail commit is
  // additive provenance on the SAME join key (trailer unchanged); its subject
  // is distinct so the log never shows two look-alike mirrors, and an empty
  // tail is a NO-OP — never an --allow-empty duplicate.
  let isTail = false;
  try {
    isTail = shR(`git log --grep "code-commit: ${fullSha}" --format=%H -n 1`) !== "";
  } catch {
    /* fresh mirror / unborn HEAD — normal 1-1 path */
  }

  mkdirSync(join(rafa, "intent"), { recursive: true });
  // A tail run never rewrites an existing intent record — the 1-1 mirror wrote
  // it, and a fresh `timestamp:` would make every tail beat a phantom delta
  // (the no-op contract would never hold).
  // One-time repair of records written by <=0.16.1, which spelled these two keys
  // the way the git TRAILER spells them. Those files fail `okf check` on every
  // checkpoint until fixed, and the writer below never revisits an existing record.
  // Only a file that actually carries the legacy key is rewritten, so a repaired
  // (or already-correct) intent dir produces no delta on later beats.
  try {
    const intentDir = join(rafa, "intent");
    if (existsSync(intentDir)) {
      for (const f of readdirSync(intentDir)) {
        if (!f.endsWith(".md")) continue;
        const fp = join(intentDir, f);
        const was = readFileSync(fp, "utf8");
        const now = was.replace(/^code-commit: /m, "codeCommit: ").replace(/^code-branch: /m, "codeBranch: ");
        if (now !== was) writeFileSync(fp, now);
      }
    }
  } catch {
    // Repair is best-effort: a commit must never fail because provenance was stale.
  }

  const intentPath = join(rafa, "intent", `${short}.md`);
  if (!isTail || !existsSync(intentPath)) {
    writeFileSync(
      intentPath,
      `---\n` +
        `type: IntentRecord\n` +
        `title: "Commit ${short}"\n` +
        `description: "per-commit intent trail (capture-engine P2) — provenance, consumed at merge, never org-brain truth"\n` +
        `codeCommit: ${fullSha}\n` +
        `codeBranch: ${branch}\n` +
        `timestamp: ${new Date().toISOString()}\n` +
        `---\n\n# ${subject}\n\n## Files\n` +
        files.map((f) => `- ${f}`).join("\n") +
        `\n`,
    );
  }

  // Local-state exclusion (owner 2026-07-24): the hydration sidecar + sensor
  // queues are MACHINE state, never knowledge — ensure the ignore entries and
  // UNTRACK anything an earlier CLI's window let git track (a .gitignore entry
  // alone never untracks; `git add -A` would keep committing it forever).
  // Best-effort: exclusion must never block a code commit.
  try {
    const LOCAL_STATE = [
      "hydration.json",
      "dirty.jsonl",
      "reflex.jsonl",
      "sensor-errors.jsonl",
      "distill-verdicts.json",
      "benchmark.demo.json",
      // rafa review's scored-ranges artifact (wave 2.3) — regenerated per
      // review, machine state like distill-verdicts; never brain knowledge.
      "review.json",
      // wave 5: session-scoped machine state — memoized verification + the
      // checkpoint-written loop-event cache the sage-due digest reads.
      "session-facts.json",
      "loop-events-tail.json",
    ];
    const gi = join(rafa, ".gitignore");
    const cur = existsSync(gi) ? readFileSync(gi, "utf8") : "";
    const have = new Set(cur.split("\n").map((l) => l.trim()).filter(Boolean));
    const missing = [...LOCAL_STATE, "*.theirs.md", "distill-incoming/"].filter((l) => !have.has(l));
    if (missing.length)
      writeFileSync(gi, cur + (cur === "" || cur.endsWith("\n") ? "" : "\n") + missing.join("\n") + "\n");
    for (const p of LOCAL_STATE) shR(`git rm -q --cached --ignore-unmatch "${p}"`);
    shR('git rm -q -r --cached --ignore-unmatch distill-incoming');
    shR('git rm -q --cached --ignore-unmatch "*.theirs.md"');
  } catch {
    /* exclusion is best-effort */
  }

  shR("git add -A");
  disposeHydrations(branch);
  if (isTail) {
    // Session tail: commit only when something REAL is staged (disposal may
    // have unstaged everything). The 1-1 join stays mechanical — same trailer.
    let staged = [];
    try {
      staged = shR("git diff --cached --name-only").split("\n").filter(Boolean);
    } catch {
      /* nothing staged */
    }
    if (staged.length > 0)
      shR(
        `git commit -q -m "brain(${branch}): session tail · ${staged.length} file(s)" ` +
          `-m "code-commit: ${fullSha}" -m "code-branch: ${branch}"`,
      );
  } else {
    shR(
      `git commit --allow-empty -q -m "brain(${branch}): ${subject}" ` +
        `-m "code-commit: ${fullSha}" -m "code-branch: ${branch}"`,
    );
  }
  // Keep the REMOTE mirror branch current (owner 2026-07-23: the branch is visible
  // in the brain repo) — best-effort, bounded; a failed push retries on the next
  // commit. Never the trunk (single writer = the reconciler).
  if (branch !== "main" && branch !== "master") {
    try {
      shR(`git push -q -u origin "${branch}"`, 10000);
    } catch {
      /* offline / no permission — stays local until a later push succeeds */
    }
  }
} catch {
  /* silent by design — the heartbeat carries sensor health */
}
process.exit(0);
