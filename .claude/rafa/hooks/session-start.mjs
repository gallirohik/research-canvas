#!/usr/bin/env node
// rafa hook · SessionStart (startup|resume|clear) — the state digest.
//
// M5 capture engine, sensor #2: the session starts KNOWING instead of assuming —
// staleness (dirty code files → the brain notes citing them, via the local manifest
// or the platform's get_code_context), pending checkpoint conflicts (*.theirs.md),
// and the active plan. State, never activity (no-gossip principle: nothing here
// narrates what other devs did — only what THIS working copy's brain plane looks like).
//
// Everything printed to stdout lands in Claude's context. Silence = nothing to
// report (the honest digest). Budget: local reads + ONE optional platform call
// (get_code_context batch, ≤ 2s, fail-soft to local counts). Never blocks a
// session: every path exits 0. Honors RAFA_HOOKS_DISABLED=1.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const DIRTY_FILES_ALARM = 15; // ≥ → recommend /rafa scan --brain-only (the fire-alarm rung)
const CITED_NOTES_ALARM = 10;
const MCP_BUDGET_MS = 2000;
const MCP_MAX_FILES = 6;

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function dirtyEntries(rafaDir) {
  const f = join(rafaDir, "dirty.jsonl");
  if (!existsSync(f)) return [];
  const files = new Map(); // path → latest touch
  for (const line of readFileSync(f, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      if (e && typeof e.f === "string") files.set(e.f, e.t ?? "");
    } catch {
      /* a torn line never breaks the digest */
    }
  }
  return [...files.keys()];
}

// file → citing note ids, from the LOCAL manifest (a full pull / prior compile).
function citersFromManifest(rafaDir, files) {
  const m = readJson(join(rafaDir, "manifest.json"));
  if (!m || !Array.isArray(m.notes)) return null;
  const want = new Set(files);
  const byNote = new Map();
  for (const group of [m.notes, Array.isArray(m.improvements) ? m.improvements : []]) {
    for (const n of group) {
      const hits = (n.cites ?? []).filter((c) => want.has(c.file)).map((c) => c.file);
      if (hits.length) byNote.set(n.id, [...new Set(hits)]);
    }
  }
  return byNote;
}

// Fallback: the platform's inverted cite graph (get_code_context), fail-soft.
async function citersFromPlatform(root, files) {
  const stamp = readJson(join(root, "rafa.json"));
  const repoId = stamp?.repoId;
  if (!repoId) return null;
  let key = process.env.RAFA_MCP_KEY || null;
  let url = null;
  const local = readJson(join(root, ".claude", "settings.local.json"));
  if (!key && local?.env?.RAFA_MCP_KEY) key = local.env.RAFA_MCP_KEY;
  const creds = readJson(join(homedir(), ".config", "rafinery", "credentials.json"));
  const entry = creds?.repos?.[repoId];
  if (!key && entry?.key) key = entry.key;
  if (entry?.mcpUrl) url = entry.mcpUrl;
  if (!key || !url || typeof fetch !== "function") return null;

  const byNote = new Map();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), MCP_BUDGET_MS);
  try {
    await Promise.all(
      files.slice(0, MCP_MAX_FILES).map(async (path, i) => {
        const res = await fetch(url, {
          method: "POST",
          signal: ctrl.signal,
          headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: i + 1,
            method: "tools/call",
            params: { name: "get_code_context", arguments: { path } },
          }),
        });
        if (!res.ok) return;
        const rpc = await res.json();
        const text = rpc?.result?.content?.[0]?.text;
        const env = typeof text === "string" ? JSON.parse(text) : text;
        for (const ref of [...(env?.notes ?? []), ...(env?.improvements ?? [])]) {
          const id = ref?.id;
          if (!id) continue;
          if (!byNote.has(id)) byNote.set(id, []);
          byNote.get(id).push(path);
        }
      }),
    );
  } catch {
    return null; // offline / slow / shape drift → local counts still serve
  } finally {
    clearTimeout(timer);
  }
  return byNote.size ? byNote : null;
}

// Unprocessed corrections (the reflex queue) — monotonic; an abandoned session
// loses nothing because the next session starts by seeing these.
function pendingCorrections(rafaDir) {
  const f = join(rafaDir, "reflex.jsonl");
  if (!existsSync(f)) return [];
  const out = [];
  for (const line of readFileSync(f, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      if (e && e.id && !e.done) out.push(e);
    } catch {
      /* torn line never breaks the digest */
    }
  }
  return out;
}

function conflictCopies(rafaDir) {
  const out = [];
  const walk = (dir, depth) => {
    if (depth > 4 || !existsSync(dir)) return;
    for (const e of readdirSync(dir)) {
      if (e === ".git") continue;
      const p = join(dir, e);
      try {
        if (statSync(p).isDirectory()) walk(p, depth + 1);
        else if (e.endsWith(".theirs.md")) out.push(p.slice(rafaDir.length + 1));
      } catch {
        /* races are fine */
      }
    }
  };
  walk(rafaDir, 0);
  return out;
}

try {
  if (process.env.RAFA_HOOKS_DISABLED === "1") process.exit(0);
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  if (!existsSync(join(root, "rafa.json"))) process.exit(0);
  const rafaDir = join(root, ".rafa");

  const lines = [];

  const dirty = dirtyEntries(rafaDir);
  if (dirty.length) {
    let byNote = citersFromManifest(rafaDir, dirty);
    if (byNote === null || byNote.size === 0) byNote = (await citersFromPlatform(root, dirty)) ?? byNote;
    const noteIds = byNote ? [...byNote.keys()] : [];
    const shown = noteIds.slice(0, 8).join(", ") + (noteIds.length > 8 ? ` (+${noteIds.length - 8} more)` : "");
    lines.push(
      `[rafa · staleness] ${dirty.length} code file(s) edited since the last brain reconcile` +
        (noteIds.length
          ? ` → ${noteIds.length} brain note(s) cite them: ${shown}.`
          : byNote === null
            ? " (citing notes unresolved here — run `rafa dirty` for the mapping)."
            : " — no brain note cites them (nothing to refresh)."),
    );
    if (noteIds.length || byNote === null)
      lines.push(
        dirty.length >= DIRTY_FILES_ALARM || noteIds.length >= CITED_NOTES_ALARM
          ? `[rafa · staleness] drift is past the threshold (${dirty.length} files / ${noteIds.length} notes) — recommend a brain refresh from main (\`/rafa scan --brain-only\`) at the next natural boundary.`
          : `[rafa · staleness] at the next natural boundary, OFFER a scoped refresh of just the citing notes (atlas re-derives them, gates run as usual, then checkpoint). After the refresh: \`rafa dirty --consume\`.`,
      );
  }

  const corrections = pendingCorrections(rafaDir);
  if (corrections.length)
    lines.push(
      `[rafa · reflex] ${corrections.length} unprocessed correction(s) from earlier sessions: ` +
        corrections
          .slice(0, 3)
          .map((c) => `${c.id} ("${c.p.slice(0, 60)}${c.p.length > 60 ? "…" : ""}")`)
          .join(" · ") +
        (corrections.length > 3 ? " …" : "") +
        ` — fold into the bootstrap digest: bank the durable ones through the gates (see \`rafa reflex\`), consume each with its verdict.`,
    );

  const conflicts = conflictCopies(rafaDir);
  if (conflicts.length)
    lines.push(
      `[rafa · conflicts] ${conflicts.length} checkpoint conflict cop${conflicts.length === 1 ? "y" : "ies"} await a decision (never auto-resolved): ${conflicts.slice(0, 5).join(", ")}${conflicts.length > 5 ? " …" : ""} — read each .theirs.md, merge/adopt/keep, re-run \`rafa checkpoint\`.`,
    );

  let activePlanId = null;
  const activePath = join(rafaDir, "active.md");
  if (existsSync(activePath)) {
    const first = readFileSync(activePath, "utf8").split("\n")[0].trim();
    if (first.startsWith("#") && first !== "# No active plan") {
      activePlanId = first.replace(/^#\s*/, "");
      lines.push(`[rafa · plan] active: ${activePlanId} (materialized under .rafa/plans/).`);
    }
  }

  // Suggested next — ONE deterministic recommendation, ranked by consequence:
  // a teammate blocked by a conflict > an unbanked correction > resuming the
  // active plan > staleness repair. Guidance is front-loaded here (and ambient
  // in the statusline) — never interleaved mid-flow (offer etiquette).
  {
    let next = null;
    if (conflicts.length)
      next = `resolve the checkpoint conflict${conflicts.length > 1 ? "s" : ""} (${conflicts.length} .theirs.md) — a teammate's copy is waiting on your decision`;
    else if (corrections.length)
      next = `work the ${corrections.length} unprocessed correction${corrections.length > 1 ? "s" : ""} (bank the durable ones — \`rafa reflex\`)`;
    else if (activePlanId) next = `resume plan ${activePlanId}`;
    else if (dirty.length) next = `refresh the notes your edits staled (offer the scoped refresh)`;
    if (next) lines.push(`[rafa · next] suggested next: ${next}. Fold into the bootstrap digest — one question, never serial.`);
  }

  if (lines.length) process.stdout.write(lines.join("\n") + "\n");
} catch {
  /* the digest is a courtesy — never a crash */
}
process.exit(0);
