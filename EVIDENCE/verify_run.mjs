#!/usr/bin/env node
/* verify_run.mjs — Action 1 acceptance harness: prove `soloist + H3` ≥ `soloist alone`.
 *
 * Gate 0 closed negative on board-vs-soloist; the keeper is H3 (entailment audit). This runner
 * wires the SOLOIST (Gate 0.4 Arm A, unchanged) straight into the extracted verify-entailment
 * stage — no board anywhere — over the box-and-box cross-file threads c1–c4.
 *
 * Acceptance bar (Gate 0 briefing, Action 1):
 *   · soloist + H3 ≥ soloist alone on precision (hand-adjudicated against source, in verify_run.md)
 *   · cost: falsify is +1 call (2× — the audit that flags fabrications); revise is the 3rd call
 *     (3×) and is GATED on a flagged audit, so a CLEAN finding costs 2× and a flagged one 3×.
 *     NOTE: the committed transcript was produced under the old always-revise default = 3× on all
 *     4 threads. The gated 2×/3× split is a code change, not yet a measured run (see verify_run.md).
 *   · NO regression into the over-deny failure mode on IN-WINDOW source: if the falsifier marks
 *     a TRUE claim NOT_ENTAILED while the decisive line is in-window, that is the failure to catch.
 *
 * Mechanical guard built in: per-thread `window_audit` runs droppedTerms() over every source file
 * for the thread query — it MUST be empty (no decisive line truncated). A non-empty audit fails
 * the Action 4 bar and invalidates any over-deny reading (can't blame the model for unseen lines).
 *
 * $0 via the local `claude` harness proxy on :8788. 3 calls/thread × 4 = 12 serialized.
 * Output: verify_run.transcript.json (resumable). Adjudication stays HUMAN, in verify_run.md.
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import {
  createVerifier,
  sourceBlock,
  parseFinding,
  verifyCites,
  droppedTerms,
  terms,
  FINDING_FMT,
} from './verify-entailment.mjs';

const PROXY = process.env.GATE0_PROXY || 'http://localhost:8788/';
const REPO = 'c-u-l8er/AmpersandBoxDesign';
const REF = '353d1679a799bd4b6f0bea0dc126ddbe085462cc';
const PREFIX = 'box-and-box/';
const RAW = `https://raw.githubusercontent.com/${REPO}/${REF}/${PREFIX}`;
const DOMAIN =
  'the box-and-box project — the [&] Protocol governance kernel: an eight-rung modality ladder (alethic → axiological → deontic → temporal → reflexive → epistemic → strategic → resource) tied by one bridge that runs feasible ▸ permitted ▸ best over an un-weakenable safety floor, with ~116 property-tested laws. The rungs live in SEPARATE files and the bridge/govern compose them — so many questions can only be settled by reading TWO OR MORE files together';
const SOURCE_NOUN =
  'the box-and-box kernel (bridge.mjs, govern.mjs, supervise.mjs, value.mjs, score.mjs, reflexive.mjs)';

const FILES = [
  { path: 'README.md', note: 'governance kernel overview + the eight-rung ladder map' },
  { path: 'bridge.mjs', note: 'the composing bridge: floor-then-gradient, 0̲ annihilation; "no heuristic utility can resurrect a vetoed option"' },
  { path: 'value.mjs', note: 'rung 1 alethic: consume() is THE alethic floor (the boolean correctness gate)' },
  { path: 'score.mjs', note: 'rung 2 axiological: the semiring gradient; 0̲ annihilates ⊗ — the root of the veto' },
  { path: 'govern.mjs', note: 'rung 3 deontic: alethic ▸ deontic ▸ axiological; FORBIDDEN overridable; OBLIGATORY&feasible FORCED; obligatory-but-infeasible ⇒ contrary-to-duty ESCALATION' },
  { path: 'supervise.mjs', note: 'rung 4 temporal: SAFETY extends the alethic floor across time; LIVENESS extends the deontic OUGHT across time — "the same contrary-to-duty escalation as a 1-step deontic obligation"' },
  { path: 'reflexive.mjs', note: 'rung 5 reflexive: admissibility + ENTRENCHMENT — self-modification can strengthen but never weaken the entrenched core' },
  { path: 'norm.mjs', note: 'the deontic norm machinery used by govern' },
  { path: 'index.mjs', note: 'the ladder map' },
];
const FILESET = new Set(FILES.map((f) => f.path));
const THREADS = {
  c1: "Is the temporal LIVENESS escalation in supervise.mjs a DIFFERENT mechanism from govern.mjs's contrary-to-duty obligation escalation, or the SAME one generalized over a trajectory?",
  c2: 'Does the temporal SAFETY shield (supervise.mjs guard/residualOf) enforce the SAME alethic floor as consume()/the bridge.mjs, or a SEPARATE check — and is it the same code path?',
  c3: "When an option is excluded, is the bridge.mjs's 0̲ annihilation (alethic veto) the SAME KIND of exclusion as govern.mjs's deonticallyVetoed (forbidden by a norm), or are they categorically different?",
  c4: 'Can a higher axiological score (the score.mjs gradient) ever override an OBLIGATORY-and-feasible option in govern.mjs, the way it can never override the value.mjs alethic floor?',
};
// the decisive code files per thread — the ground-truth mechanism lives here, NOT in the prose
// overview. The window audit is scoped to THESE (see windowAudit): they must be in-window AND
// keep every query-term. (c2/c3/c4 reference the bridge/value/score files by name in the question
// so the named-file pin below force-includes them — fixing the Gate 0.4 selection-crowding bug
// where README.md + index.mjs ate the slots and a decisive code file fell out of the prompt.)
const DECISIVE = {
  c1: ['supervise.mjs', 'govern.mjs'],
  c2: ['supervise.mjs', 'value.mjs', 'bridge.mjs'],
  c3: ['bridge.mjs', 'govern.mjs'],
  c4: ['govern.mjs', 'score.mjs', 'value.mjs'],
};

const SRC_K = Number(process.env.GATE0_SRC_K || 6);
const SRC_CAP = Number(process.env.GATE0_SRC_CAP || 3200);
const WIN_OPTS = { cap: SRC_CAP, headLines: 12, win: 6, fnTerms: terms, sourceNoun: SOURCE_NOUN };

let CORPUS = [];
const CORPUS_BY_PATH = {};
async function hydrate() {
  CORPUS = await Promise.all(
    FILES.map(async (f) => {
      const r = await fetch(RAW + f.path, { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status} for ${f.path}`);
      const text = await r.text();
      CORPUS_BY_PATH[f.path] = text;
      return { ...f, text };
    }),
  );
  return CORPUS.length;
}
// files the QUESTION names by filename are PINNED — a question that says "supervise.mjs" must see
// supervise.mjs, never have it crowded out of the top-k by a big prose file. (Gate 0.4 lesson.)
const namedFiles = (text) => [...new Set((String(text).match(/[A-Za-z][\w-]*\.(?:mjs|md|js)/g) || []))].filter((f) => FILESET.has(f));
function relevant(text, k = SRC_K) {
  const q = new Set(terms(text));
  const pins = namedFiles(text);
  const ranked = CORPUS.map((c) => {
    const ct = terms(c.path + ' ' + c.note + ' ' + c.text);
    let hit = 0;
    const seen = new Set();
    for (const t of ct) if (q.has(t) && !seen.has(t)) (hit++, seen.add(t));
    return { c, score: hit };
  }).sort((a, b) => b.score - a.score);
  const pinned = ranked.filter((x) => pins.includes(x.c.path)).map((x) => x.c);
  const rest = ranked.filter((x) => !pins.includes(x.c.path) && x.score > 0).map((x) => x.c);
  return [...pinned, ...rest].slice(0, Math.max(k, pinned.length)); // pins are never dropped
}
const buildSrc = (query) => sourceBlock(relevant(query, SRC_K), query, WIN_OPTS);

const CLIENT_TIMEOUT = Number(process.env.GATE0_TIMEOUT_MS || 180000);
async function callOnce(system, user) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), CLIENT_TIMEOUT);
  try {
    const r = await fetch(PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, messages: [{ role: 'user', content: user }] }),
      signal: ctl.signal,
    });
    const j = await r.json();
    if (j.type === 'error') throw new Error(j.error?.message || 'harness error');
    return (j.content?.[0]?.text || '').trim();
  } finally {
    clearTimeout(timer);
  }
}
async function call(system, user) {
  const ATTEMPTS = Number(process.env.GATE0_ATTEMPTS || 4);
  let lastErr;
  for (let i = 0; i < ATTEMPTS; i++) {
    try {
      return await callOnce(system, user);
    } catch (e) {
      lastErr = e;
      process.stderr.write(`[verify]   attempt ${i + 1}/${ATTEMPTS} failed: ${(e && e.message) || e}\n`);
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw lastErr;
}

// SOLOIST — Gate 0.4 Arm A, verbatim. This is the producer we are auditing.
async function singleCritic(tid) {
  const src = buildSrc(THREADS[tid]);
  const sys = `you are a single, strong, careful technical reviewer of ${DOMAIN}.\nyou work ALONE — no committee. read the question and the source, reason to the MOST defensible conclusion, and emit one standing FINDING.\nmany questions here can only be settled by reading TWO files together (a rung file + the bridge/govern that composes it) — do not answer from one file if the answer lives across two.\nground EVERY claim in a verbatim quote; no hand-waving, no hedging into multiple options without committing.${FINDING_FMT}${src}`;
  const usr = `question to settle: "${THREADS[tid]}".\n\nproduce the single most defensible finding the source supports.`;
  return parseFinding(await call(sys, usr));
}

// mechanical guard for the Action 4 bar — scoped to the DECISIVE code files (where the
// ground-truth mechanism lives), NOT the prose overview. Two checks:
//   1. every DECISIVE[tid] file is actually IN the selected source window (no selection crowding)
//   2. no decisive code file drops a query-term inside its window (no truncation)
// README.md prose elision is reported informationally — it is not a ground-truth line.
function windowAudit(tid) {
  const chunks = relevant(THREADS[tid], SRC_K);
  const inWindow = new Set(chunks.map((c) => c.path));
  const missing_decisive = (DECISIVE[tid] || []).filter((f) => !inWindow.has(f));
  const truncated = [];
  for (const c of chunks) {
    if (!/\.mjs$/.test(c.path)) continue; // code files carry the decisive lines
    const dropped = droppedTerms(c.text, THREADS[tid], WIN_OPTS);
    if (dropped.length) truncated.push({ file: c.path, dropped });
  }
  const prose_elided = chunks
    .filter((c) => /\.md$/.test(c.path) && c.text.length > SRC_CAP)
    .map((c) => c.path); // informational only
  return {
    files_in_window: chunks.map((c) => c.path),
    decisive: DECISIVE[tid] || [],
    missing_decisive,
    truncated,
    prose_elided,
    healthy: missing_decisive.length === 0 && truncated.length === 0,
  };
}

async function main() {
  const tids = (process.env.GATE0_THREADS ? process.env.GATE0_THREADS.split(',') : Object.keys(THREADS)).map((s) => s.trim());
  process.stderr.write(`[verify] hydrating ${REPO}@${REF.slice(0, 7)} (${FILES.length} files) …\n`);
  await hydrate();
  process.stderr.write(`[verify] ${CORPUS.length} files live. threads: ${tids.join(', ')}\n`);

  // corpusByPath enables the DETERMINISTIC, model-free layer: claims that reduce to a static
  // grep-able fact (e.g. "supervise.mjs never imports norm.mjs") are decided without a model and
  // override the model verdict — the non-circular precision signal that closes Claude-grades-Claude.
  const verifier = createVerifier({ call, buildSrc, domain: DOMAIN, corpusByPath: CORPUS_BY_PATH });
  const outPath = new URL('./verify_run.transcript.json', import.meta.url);
  let out = {
    meta: {
      repo: REPO,
      ref: REF,
      model_via_proxy: 'claude (harness)',
      design: 'Action 1 acceptance: SOLOIST -> verify-entailment (H3 falsify + H6 revise). NO board. cross-file threads c1-c4, windowed source.',
      cost_note: 'THIS transcript: 3 calls/thread (soloist + falsify + revise) = 3× on all 4 threads (produced under the OLD always-revise default). The shipped verify() now GATES revise on a flagged audit → clean=2×, flagged=3× (a code change, not measured here). Do not read 3× here as the steady-state cost.',
      adjudication: 'precision is HUMAN-adjudicated in verify_run.md; this transcript carries only mechanical signals (verify_rate, verdict counts, window_audit).',
      generated: new Date().toISOString(),
      threads: tids,
    },
    runs: [],
  };
  try {
    if (existsSync(outPath)) {
      const prev = JSON.parse(readFileSync(outPath, 'utf8'));
      if (prev.runs) {
        out.runs = prev.runs;
        out.meta.resumedFrom = prev.meta?.generated;
      }
    }
  } catch (_) {}
  const have = new Set(out.runs.map((r) => r.tid));
  const save = () => writeFileSync(outPath, JSON.stringify(out, null, 2));

  for (const tid of tids) {
    if (have.has(tid)) {
      process.stderr.write(`[verify] [${tid}] done — skip\n`);
      continue;
    }
    try {
      const audit = windowAudit(tid);
      if (!audit.healthy)
        process.stderr.write(`[verify] [${tid}] ⚠ WINDOW AUDIT FAIL: ${JSON.stringify(audit.offenders)}\n`);

      process.stderr.write(`[verify] [${tid}] soloist …\n`);
      const pre = await singleCritic(tid);

      process.stderr.write(`[verify] [${tid}] H3 falsify → H6 revise (revise gated on a flagged audit) …\n`);
      const { falsifier, post, revised } = await verifier.verify(THREADS[tid], pre, { authorName: 'the soloist' });
      const calls = 1 /*soloist*/ + 1 /*falsify*/ + (revised ? 1 : 0); // cost multiple vs soloist-alone
      process.stderr.write(`[verify] [${tid}]   verdicts: ${JSON.stringify(falsifier.counts)} · revised=${revised} · ${calls}× cost\n`);

      out.runs.push({
        tid,
        question: THREADS[tid],
        window_audit: audit,
        revised,
        cost_x: calls,
        soloist: { claim: pre.claim, title: pre.title, body: pre.body, cites: pre.cites, verify: verifyCites(pre.cites, { corpusByPath: CORPUS_BY_PATH, fileset: FILESET }) },
        falsifier: { verdicts: falsifier.verdicts, counts: falsifier.counts, raw: falsifier.raw },
        verified: { claim: post.claim, title: post.title, body: post.body, cites: post.cites, verify: verifyCites(post.cites, { corpusByPath: CORPUS_BY_PATH, fileset: FILESET }) },
      });
      save();
    } catch (e) {
      process.stderr.write(`[verify] [${tid}] FAILED after retries: ${(e && e.message) || e} — will resume\n`);
    }
  }
  process.stderr.write(`[verify] done. ${out.runs.length} runs. window audits: ${out.runs.filter((r) => r.window_audit.healthy).length}/${out.runs.length} healthy.\n`);
}
main().catch((e) => {
  process.stderr.write('[verify] FAILED: ' + ((e && e.stack) || e) + '\n');
  process.exit(1);
});
