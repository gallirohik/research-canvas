// rafa brain-commit — the post-commit worker (capture-engine P1, spec r2 §2.2).
// ONE brain commit per code commit, strict 1-1 (--allow-empty), on the MIRRORED
// brain branch — never the brain default branch (the distiller's, single
// writer). Carries whatever changed under .rafa/ plus the commit's INTENT
// RECORD (intent/<shortsha>.md); trailers code-commit/code-branch are the join
// keys. Standalone by design (node built-ins only, like every M5 sensor);
// non-blocking always — a brain problem must never block a code commit.

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
try {
  if (process.env.RAFA_HOOKS_DISABLED === "1") process.exit(0);
  if (!existsSync(join(ROOT, "rafa.json"))) process.exit(0);
  if (!existsSync(join(ROOT, ".rafa", ".git"))) process.exit(0);

  const sh = (cmd, cwd = ROOT) =>
    execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  const rafa = join(ROOT, ".rafa");
  const shR = (cmd) => sh(cmd, rafa);

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
  shR(
    `git commit --allow-empty -q -m "brain(${branch}): ${subject}" ` +
      `-m "code-commit: ${fullSha}" -m "code-branch: ${branch}"`,
  );
} catch {
  /* silent by design — the heartbeat carries sensor health */
}
process.exit(0);
