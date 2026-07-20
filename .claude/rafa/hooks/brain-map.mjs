// rafa brain-map — the post-rewrite worker (capture-engine P1, spec r2 §2.2).
// Rebase/amend rewrite the CODE shas; git hands the old→new map on stdin. We
// APPEND it to the mirrored brain branch (maps/rewrite-<ts>.json) — brain
// history is never rewritten. Collection keys on the merge event's branch
// name; the map chain restores per-commit grounding through code-commit
// trailers. argv[2]: "amend" | "rebase" (git's post-rewrite kind).

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
try {
  if (process.env.RAFA_HOOKS_DISABLED === "1") process.exit(0);
  if (!existsSync(join(ROOT, "rafa.json"))) process.exit(0);
  if (!existsSync(join(ROOT, ".rafa", ".git"))) process.exit(0);

  const map = readFileSync(0, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [oldSha, newSha] = l.trim().split(/\s+/);
      return { old: oldSha, new: newSha };
    })
    .filter((m) => /^[0-9a-f]{40,64}$/i.test(m.old ?? "") && /^[0-9a-f]{40,64}$/i.test(m.new ?? ""));
  if (map.length === 0) process.exit(0);

  const sh = (cmd, cwd = ROOT) =>
    execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  const rafa = join(ROOT, ".rafa");
  const shR = (cmd) => sh(cmd, rafa);

  const branch = sh("git rev-parse --abbrev-ref HEAD");
  if (branch === "main" || branch === "master" || branch === "HEAD") process.exit(0);
  if (!/^[A-Za-z0-9._/-]+$/.test(branch)) process.exit(0);

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

  const kind = process.argv[2] === "amend" ? "amend" : "rebase";
  mkdirSync(join(rafa, "maps"), { recursive: true });
  writeFileSync(
    join(rafa, "maps", `rewrite-${Date.now()}.json`),
    JSON.stringify({ kind, at: new Date().toISOString(), branch, map }, null, 2) + "\n",
  );
  shR("git add -A");
  shR(`git commit -q -m "brain(rewrite-map): ${kind} · ${map.length} commit(s)" -m "code-branch: ${branch}"`);
} catch {
  /* silent by design */
}
process.exit(0);
