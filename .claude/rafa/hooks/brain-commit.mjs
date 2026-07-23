// rafa brain-commit — the post-commit worker (capture-engine P1, spec r2 §2.2).
// ONE brain commit per code commit, strict 1-1 (--allow-empty), on the MIRRORED
// brain branch — never the brain default branch (the distiller's, single
// writer). Carries whatever changed under .rafa/ plus the commit's INTENT
// RECORD (intent/<shortsha>.md); trailers code-commit/code-branch are the join
// keys. Standalone by design (node built-ins only, like every M5 sensor);
// non-blocking always — a brain problem must never block a code commit.

import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
  mkdirSync(join(rafa, "intent"), { recursive: true });
  writeFileSync(
    join(rafa, "intent", `${short}.md`),
    `---\n` +
      `type: IntentRecord\n` +
      `description: "per-commit intent trail (capture-engine P2) — provenance, consumed at merge, never org-brain truth"\n` +
      `code-commit: ${fullSha}\n` +
      `code-branch: ${branch}\n` +
      `timestamp: ${new Date().toISOString()}\n` +
      `---\n\n# ${subject}\n\n## Files\n` +
      files.map((f) => `- ${f}`).join("\n") +
      `\n`,
  );

  shR("git add -A");
  disposeHydrations(branch);
  shR(
    `git commit --allow-empty -q -m "brain(${branch}): ${subject}" ` +
      `-m "code-commit: ${fullSha}" -m "code-branch: ${branch}"`,
  );
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
