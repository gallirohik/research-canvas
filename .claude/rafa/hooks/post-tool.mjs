#!/usr/bin/env node
// rafa hook · PostToolUse (Edit|Write|MultiEdit|NotebookEdit) — the dirty-marker.
//
// M5 capture engine, sensor #1: every code edit is recorded the moment it happens
// (monotonic, event-driven — never at session end, because there is no session end).
// Appends {f, t} to .rafa/dirty.jsonl; the SessionStart digest and `rafa dirty`
// resolve entries to the brain notes that cite those files (the codeRefs plane).
//
// Hard rules: NEVER block the session (exit 0 on every path, all errors swallowed),
// no network, no LLM, O(append). Honors RAFA_HOOKS_DISABLED=1 (headless workers /
// CI distillation set it — the recursion guard).

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, isAbsolute, sep } from "node:path";

try {
  if (process.env.RAFA_HOOKS_DISABLED === "1") process.exit(0);

  let input = "";
  try {
    input = readFileSync(0, "utf8"); // stdin: the hook event JSON
  } catch {
    process.exit(0);
  }
  let evt = null;
  try {
    evt = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const root = process.env.CLAUDE_PROJECT_DIR || evt?.cwd || process.cwd();
  if (!existsSync(join(root, "rafa.json"))) process.exit(0); // not a rafa-provisioned repo

  const fp = evt?.tool_input?.file_path || evt?.tool_input?.notebook_path;
  if (!fp || typeof fp !== "string") process.exit(0);

  const rel = isAbsolute(fp) ? relative(root, fp) : fp;
  // Outside the repo, or not code-plane: knowledge/state/tooling edits don't dirty the brain.
  if (rel.startsWith("..") || isAbsolute(rel)) process.exit(0);
  const top = rel.split(sep)[0];
  if ([".rafa", ".claude", ".git", "node_modules"].includes(top) || rel === "rafa.json") process.exit(0);

  const rafaDir = join(root, ".rafa");
  mkdirSync(rafaDir, { recursive: true });

  // Transport exclusion, belt-and-braces: the queue is session-local state and must
  // never ride a brain push (`rafa push` commits .rafa/ wholesale). ensureBrainRepo
  // writes this too — this covers the window before any pull/push ran here.
  const gi = join(rafaDir, ".gitignore");
  const body = existsSync(gi) ? readFileSync(gi, "utf8") : "";
  if (!/^dirty\.jsonl$/m.test(body))
    writeFileSync(gi, body + (body === "" || body.endsWith("\n") ? "" : "\n") + "dirty.jsonl\n");

  appendFileSync(
    join(rafaDir, "dirty.jsonl"),
    JSON.stringify({ f: rel.split(sep).join("/"), t: new Date().toISOString() }) + "\n",
  );
} catch {
  /* a sensor must never take down the session */
}
process.exit(0);
