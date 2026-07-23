// rafa brain-switch — the post-checkout worker (capture-engine P1, spec r2
// §2.2). Keeps the nested .rafa/ repo's branch in LOCKSTEP with the code
// branch: code branch cut/switch ⇒ brain branch cut/switch. Dirty brain
// surfaces are committed to the OLD branch first (switch-carryover) —
// deterministic, nothing lost, nothing blocks.
//
// FRESH-SLATE RULE (owner 2026-07-23): a NEW branch's mirror is cut FROM THE
// REMOTE TRUNK (the published org brain), never from whatever branch the local
// mirror happened to sit on. That makes the slate exact — no session leftovers
// from other branches, no local-vs-remote drift — and keeps the branch's diff
// vs trunk equal to precisely what the branch captures (the reconciler's
// git-plane semantic). Cutting an EMPTY tree instead would read as mass
// deletion of the org brain in that diff — never that.
// Fallback ladder (offline-safe, never blocks a checkout):
//   origin/<trunk> (freshly fetched, bounded) → local <trunk> → current HEAD.
//
// argv: <prevHEAD> <newHEAD> <flag> (git's post-checkout contract;
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

  const sh = (cmd, cwd = ROOT, timeout) =>
    execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], ...(timeout ? { timeout } : {}) }).trim();
  const shR = (cmd, timeout) => sh(cmd, join(ROOT, ".rafa"), timeout);

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

  // The brain trunk = the mirror of the code repo's default-ish branch (the
  // distiller's write target; sessions only ever read there).
  const trunkOf = () => {
    for (const t of ["main", "master"]) {
      try {
        shR(`git rev-parse --verify -q "refs/remotes/origin/${t}"`);
        return t;
      } catch {
        /* keep looking */
      }
      try {
        shR(`git rev-parse --verify -q "refs/heads/${t}"`);
        return t;
      } catch {
        /* keep looking */
      }
    }
    return null;
  };
  const fetchTrunk = (trunk) => {
    try {
      shR(`git fetch -q origin "${trunk}"`, 8000); // bounded — a hook must never hang a checkout
      return true;
    } catch {
      return false;
    }
  };

  try {
    // SWITCH — a same-named mirror branch exists: check it out. Switching TO the
    // trunk additionally freshens it from remote (ff-only; divergence left alone —
    // pull --full --force is the explicit adopt path).
    shR(`git rev-parse --verify -q "refs/heads/${branch}"`);
    shR(`git checkout -q "${branch}"`);
    if (branch === "main" || branch === "master") {
      if (fetchTrunk(branch)) {
        try {
          shR(`git merge -q --ff-only "origin/${branch}"`);
        } catch {
          /* diverged — loud adoption is pull --full --force, never a silent hook */
        }
      }
    }
  } catch {
    // CUT — no mirror branch yet. Never mirror-cut the trunk itself; for any other
    // branch, base the new mirror on the freshest trunk we can reach.
    if (branch !== "main" && branch !== "master") {
      const trunk = trunkOf();
      let base = null;
      if (trunk) {
        fetchTrunk(trunk); // best-effort freshness — offline still falls through
        for (const ref of [`refs/remotes/origin/${trunk}`, `refs/heads/${trunk}`]) {
          try {
            shR(`git rev-parse --verify -q "${ref}"`);
            base = ref;
            break;
          } catch {
            /* next */
          }
        }
      }
      if (base) shR(`git checkout -q -b "${branch}" "${base}"`);
      else shR(`git checkout -q -b "${branch}"`); // last resort: old behavior, current HEAD
    }
  }
} catch {
  /* silent by design */
}
process.exit(0);
