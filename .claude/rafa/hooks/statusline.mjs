#!/usr/bin/env node
// rafa · statusline — the CLAUDE CODE ADAPTER for the loop-state line.
//
// HARNESS ADAPTER, deliberately thin (portability directive 2026-07-13: built
// for Claude Code now, Cursor/Codex later). The semantics are owned by the
// harness-neutral core — `rafa status` (packages/cli/lib/status.mjs); this
// script mirrors that computation as a self-contained, dependency-free file
// because statuslines re-render often (an npx call here would lag the UI).
// Any drift between this and `rafa status --line` is a bug against the core.
//
// Claude Code invokes it with session JSON on stdin; whatever one line it
// prints becomes the statusline. Ambient guidance, zero keystrokes, zero nags:
//   rafa ▸ plan auth-rate-limit 2/5 → add limiter to route · 3 stale · 1 correction
//   rafa ▸ in sync
// Outside a rafa repo it prints nothing (silent — never hijacks the statusline).

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function readJsonl(file) {
  if (!existsSync(file)) return [];
  const out = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      if (e) out.push(e);
    } catch {
      /* torn line */
    }
  }
  return out;
}

function walk(dir, depth, hit, out = []) {
  if (depth < 0 || !existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    if (e === ".git") continue;
    const p = join(dir, e);
    try {
      if (statSync(p).isDirectory()) walk(p, depth - 1, hit, out);
      else if (hit(e)) out.push(p);
    } catch {
      /* races are fine */
    }
  }
  return out;
}

function fmField(path, key) {
  try {
    let fence = 0;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      if (line.trim() === "---") { fence++; if (fence >= 2) break; continue; }
      if (fence !== 1) continue;
      const m = line.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`));
      if (m) return m[1].replace(/\s+#.*$/, "").replace(/^["']|["']$/g, "").trim();
    }
  } catch {
    /* unreadable = absent */
  }
  return null;
}

try {
  let root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  try {
    const evt = JSON.parse(readFileSync(0, "utf8"));
    root = evt?.workspace?.current_dir || evt?.workspace?.project_dir || evt?.cwd || root;
  } catch {
    /* no/bad stdin — fall back to env/cwd */
  }
  if (!existsSync(join(root, "rafa.json"))) process.exit(0); // silent outside rafa repos

  const rafaDir = join(root, ".rafa");
  const dirty = new Set(
    readJsonl(join(rafaDir, "dirty.jsonl")).filter((e) => typeof e.f === "string").map((e) => e.f),
  ).size;
  const byId = new Map();
  for (const e of readJsonl(join(rafaDir, "reflex.jsonl"))) if (e.id) byId.set(e.id, { ...(byId.get(e.id) ?? {}), ...e });
  const reflex = [...byId.values()].filter((e) => !e.done).length;
  const conflicts = walk(rafaDir, 4, (n) => n.endsWith(".theirs.md")).length;

  let plan = null;
  const activePath = join(rafaDir, "active.md");
  if (existsSync(activePath)) {
    const first = readFileSync(activePath, "utf8").split("\n")[0].trim();
    const id = first.startsWith("# ") && first !== "# No active plan" ? first.slice(2).trim() : null;
    if (id) {
      let done = 0, total = 0, current = null;
      for (const f of walk(join(rafaDir, "plans"), 3, (n) => n.endsWith(".md") && !n.startsWith("_"))) {
        if (fmField(f, "plan") !== id) continue;
        const kind = fmField(f, "kind");
        if (kind !== "task" && kind !== "subtask") continue;
        total++;
        const status = fmField(f, "status");
        if (status === "done") done++;
        else if (status === "in-progress" && !current) current = fmField(f, "title") ?? fmField(f, "id");
      }
      plan = { id, done, total, current };
    }
  }

  const parts = [];
  if (plan) parts.push(`plan ${plan.id} ${plan.done}/${plan.total}` + (plan.current ? ` → ${plan.current}` : ""));
  if (dirty) parts.push(`${dirty} stale`);
  if (reflex) parts.push(`${reflex} correction${reflex === 1 ? "" : "s"}`);
  if (conflicts) parts.push(`${conflicts} conflict${conflicts === 1 ? "" : "s"}`);
  process.stdout.write(parts.length ? `rafa ▸ ${parts.join(" · ")}` : "rafa ▸ in sync");
} catch {
  /* a statusline must never error the UI */
}
process.exit(0);
