// rafa brain-switch — the post-checkout worker (capture-engine P1, spec r2
// §2.2). Keeps the nested .rafa/ repo's branch in LOCKSTEP with the code
// branch: code branch cut/switch ⇒ brain branch cut/switch. Dirty brain
// surfaces are committed to the OLD branch first (switch-carryover) —
// deterministic, nothing lost, nothing blocks.
//
// EMPTY-SLATE RULE (owner 2026-07-23): a NEW branch's mirror is cut at the
// trunk's ROOT COMMIT — the empty genesis base every brain trunk begins with —
// so the branch starts with an EMPTY .rafa and code agents HYDRATE what they
// need during development. Rooting at genesis (not an orphan) keeps ancestry
// with main, so the reconciler's main...branch diff = exactly what the branch
// captured (an unrooted empty branch would diff as mass deletion of the org
// brain — never that). The new mirror branch is also PUSHED to the brain
// remote (best-effort, bounded) so the branch is VISIBLE in the brain repo.
// Fallback ladder (offline-safe, never blocks a checkout):
//   root of origin/<trunk> (freshly fetched) → root of local <trunk> → current HEAD.
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

  const sh = (cmd, cwd = ROOT, timeout) =>
    execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], ...(timeout ? { timeout } : {}) }).trim();
  const shR = (cmd, timeout) => sh(cmd, join(ROOT, ".rafa"), timeout);

  // SELF-HEAL (owner 2026-07-23): a repo with rafa.json but no materialized .rafa
  // instance must still mirror — "clone → just works" means the FIRST branch checkout
  // bootstraps the lazy .rafa itself (same npx precedent as the pre-push checkpoint
  // hook), bounded so a checkout can never hang. A bootstrap failure degrades to the
  // old silent no-op — a checkout must never break.
  if (!existsSync(join(ROOT, ".rafa", ".git"))) {
    try {
      console.error("rafa · no local .rafa instance — bootstrapping (one-time) …");
      sh("npx -y @rafinery/cli pull", ROOT, 90000);
    } catch {
      process.exit(0);
    }
    if (!existsSync(join(ROOT, ".rafa", ".git"))) process.exit(0);
  }

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
    // branch, base the new mirror at the ROOT of the freshest trunk we can reach —
    // the empty genesis base ⇒ an EMPTY .rafa slate, hydrated on demand during dev.
    if (branch !== "main" && branch !== "master") {
      const trunk = trunkOf();
      let base = null;
      if (trunk) {
        fetchTrunk(trunk); // best-effort freshness — offline still falls through
        for (const ref of [`refs/remotes/origin/${trunk}`, `refs/heads/${trunk}`]) {
          try {
            shR(`git rev-parse --verify -q "${ref}"`);
            // The trunk-line root (first-parent chain has exactly one root) — the
            // empty genesis commit the reconciler authors the org brain from.
            base = shR(`git rev-list --max-parents=0 --first-parent "${ref}"`).split("\n").pop();
            break;
          } catch {
            /* next */
          }
        }
      }
      if (base) shR(`git checkout -q -b "${branch}" "${base}"`);
      else shR(`git checkout -q -b "${branch}"`); // last resort: old behavior, current HEAD
      // Make the branch VISIBLE in the brain repo (owner 2026-07-23) — best-effort,
      // bounded; a push failure never blocks the checkout (remote lands on the next
      // brain-commit push instead).
      try {
        shR(`git push -q -u origin "${branch}"`, 10000);
      } catch {
        /* offline / no permission — mirror stays local until a later push succeeds */
      }
    }
  }
} catch {
  /* silent by design */
}
process.exit(0);
