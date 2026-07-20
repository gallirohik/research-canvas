#!/usr/bin/env node
// rafa hook · UserPromptSubmit — the correction reflex, detect half (M5 sensor #4).
//
// A dev correcting the agent is the highest-value knowledge signal the system
// sees. This hook makes the MOMENT deterministic: a correction-shaped prompt is
// (a) queued to .rafa/reflex.jsonl (monotonic — an abandoned session loses
// nothing; the SessionStart digest resurfaces unprocessed corrections), and
// (b) answered with a steering injection so THIS session validates and banks it
// through the normal gates right now — same session, not next scan.
//
// The hook only detects CANDIDATES (narrow patterns, cheap, no LLM); judging
// whether it's durable repo knowledge is model work downstream (capture is
// cheap, distillation is rigorous). False positive cost: one injected line.
// Privacy: the queue stores a short prompt snippet + a LOCAL transcript path —
// nothing here ever ships; only a distilled, cited note passes the gates.
//
// Hard rules: never block (exit 0 everywhere), no network, no LLM.
// Honors RAFA_HOOKS_DISABLED=1 (headless/CI recursion guard).

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Narrow, strong correction shapes — leading negation/contradiction, or an
// explicit never/don't-use instruction. Deliberately NOT matching every "no"
// mid-sentence; missed captures still have the dev's "bank that" as a path.
const CORRECTION = [
  /^(no\b|nope\b|wrong\b|incorrect\b|that'?s (wrong|incorrect|not right)|not (quite|right)\b|actually[,\s])/i,
  /\b(never|don'?t|do not|stop) (use|do|call|import|write|put|add|touch)\b/i,
  /\buse\s+\S[^.!?]{0,60}\binstead\b/i,
  /\binstead of\b[^.!?]{0,60}\buse\b/i,
];

try {
  if (process.env.RAFA_HOOKS_DISABLED === "1") process.exit(0);

  let evt = null;
  try {
    evt = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    process.exit(0);
  }
  const root = process.env.CLAUDE_PROJECT_DIR || evt?.cwd || process.cwd();
  if (!existsSync(join(root, "rafa.json"))) process.exit(0);

  const prompt = typeof evt?.prompt === "string" ? evt.prompt.trim() : "";
  if (!prompt || prompt.startsWith("/")) process.exit(0); // commands are not corrections
  if (!CORRECTION.some((re) => re.test(prompt))) process.exit(0);

  const rafaDir = join(root, ".rafa");
  mkdirSync(rafaDir, { recursive: true });
  // Transport exclusion (same belt-and-braces as the dirty queue).
  const gi = join(rafaDir, ".gitignore");
  const body = existsSync(gi) ? readFileSync(gi, "utf8") : "";
  if (!/^reflex\.jsonl$/m.test(body))
    writeFileSync(gi, body + (body === "" || body.endsWith("\n") ? "" : "\n") + "reflex.jsonl\n");

  const id = `rx_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  appendFileSync(
    join(rafaDir, "reflex.jsonl"),
    JSON.stringify({
      id,
      p: prompt.slice(0, 300),
      t: new Date().toISOString(),
      tp: typeof evt?.transcript_path === "string" ? evt.transcript_path : null, // LOCAL pointer, never ships
    }) + "\n",
  );

  // The steering injection — arrives WITH the correction itself, so the session
  // handles it at exactly the right moment (no SOP memory involved).
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext:
          `[rafa · reflex ${id}] This prompt reads as a CORRECTION of prior agent output. ` +
          `After addressing it: judge whether it encodes DURABLE repo knowledge (code-groundable — a convention, contract, or fact a future session would need). ` +
          `If yes: bank it NOW through the gates — on a branch: author/edit the note under .rafa/brain/** with ≥1 resolving cite + \`rafa checkpoint\`; on main: full gates (verify-citations · compile · push). ` +
          `Then confirm to the dev in ONE line (note id + where it landed) and run \`rafa reflex --consume ${id}\`. ` +
          `If it is NOT durable repo knowledge (one-off steer, preference, out-of-code claim): say it stays session-only, and still \`rafa reflex --consume ${id}\` with reason "session-only". ` +
          `Never bank an ungroundable claim; never quote the transcript into any shared store.`,
      },
    }),
  );
} catch {
  /* a sensor must never take down the session */
}
process.exit(0);
