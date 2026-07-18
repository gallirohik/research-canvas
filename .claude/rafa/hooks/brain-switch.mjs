// rafa brain-switch — the post-checkout worker (capture-engine P1, spec r2
// §2.2). Keeps the nested .rafa/ repo's branch in LOCKSTEP with the code
// branch: code branch cut/switch ⇒ brain branch cut/switch (created lazily
// from the current local state). Dirty brain surfaces are committed to the OLD
// branch first (switch-carryover) — deterministic, nothing lost, nothing
// blocks. argv: <prevHEAD> <newHEAD> <flag> (git's post-checkout contract;
// flag "1" = branch checkout, "0" = file checkout → no-op).

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
try {
  if (process.env.RAFA_HOOKS_DISABLED === "1") process.exit(0);
  if (process.argv[4] !== "1") process.exit(0);
  if (!existsSync(join(ROOT, "rafa.json"))) process.exit(0);
  if (!existsSync(join(ROOT, ".rafa", ".git"))) process.exit(0);

  const sh = (cmd, cwd = ROOT) =>
    execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  const shR = (cmd) => sh(cmd, join(ROOT, ".rafa"));

  const branch = sh("git rev-parse --abbrev-ref HEAD");
  if (branch === "HEAD") process.exit(0); // detached — no mirror
  if (!/^[A-Za-z0-9._/-]+$/.test(branch)) process.exit(0);

  const cur = shR("git rev-parse --abbrev-ref HEAD");
  if (cur === branch) process.exit(0);
  try {
    shR("git add -A");
    shR(`git commit -q -m "brain(switch-carryover)" -m "switch-carryover-from: ${cur}"`);
  } catch {
    /* nothing dirty */
  }
  // Trunk mirrors to the brain repo's SAME-NAMED branch when it exists — the
  // default branch stays the distiller's write target; the session only ever
  // reads there. A missing trunk-named brain branch is left alone.
  try {
    shR(`git rev-parse --verify -q "refs/heads/${branch}"`);
    shR(`git checkout -q "${branch}"`);
  } catch {
    if (branch !== "main" && branch !== "master") shR(`git checkout -q -b "${branch}"`);
  }
} catch {
  /* silent by design */
}
process.exit(0);
