#!/usr/bin/env node
/* Gate 0.2 — does adding an H3 FALSIFIER / entailment seat (+ H6 anti-hedge) flip the board?
 *
 * Follow-up to gate0_1.mjs, which returned board_lift (precision) = -0.25 even WITH the H1
 * grounding gate + H2 extractive synthesis. The Gate 0.1 lesson: H1 verifies a quote EXISTS,
 * not that it ENTAILS the claim, so the board's residual losses survived — a real quote wrapped
 * around a wrong conclusion (b2) or manufactured doubt where the source settles it (b3, l3).
 *
 *   H3  a stance-free FALSIFIER / entailment seat. Not "does a quote exist" but "does THIS line
 *       ENTAIL THIS claim?". Reads the matured debate + the synthesized finding + the FULL source
 *       and tries to BREAK each material claim. Per claim it returns one of:
 *         ENTAILED          — the cited source line genuinely entails the claim
 *         NOT_ENTAILED      — the quote is real but does not support the claim (overclaim / misread)
 *         HEDGE_UNWARRANTED — the finding hedged ("unverified/unresolved") but the source SETTLES it
 *   H6  reward calibrated commitment SYMMETRICALLY. The revision step must DROP every NOT_ENTAILED
 *       claim AND must COMMIT wherever the falsifier shows the in-corpus source settles a hedged point.
 *
 * EXPERIMENTAL ISOLATION: this gate REUSES Gate 0.1's exact debate posts and its extractive board
 * finding (loaded from gate0_1.transcript.json), then adds ONLY the falsifier + revision on top.
 * The single-critic CONTROL is carried over unchanged from Gate 0.1 (precision 0.833). So the ONLY
 * new variable vs Gate 0.1 is the H3+H6 adversarial layer — board_lift_0.2 vs board_0.1 isolates it,
 * board_lift_0.2 vs single answers the gate. Same corpus (box-and-box @353d1679, 9 files), same local
 * `claude` harness (zero API cost). Output: gate0_2.transcript.json.
 *
 * Usage:  node EVIDENCE/gate0_2.mjs                       (proxy on :8788; gate0_1.transcript.json must exist)
 *         GATE0_THREADS=b2,l3 node EVIDENCE/gate0_2.mjs   (subset)
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const PROXY = process.env.GATE0_PROXY || 'http://localhost:8788/';
const REPO = 'c-u-l8er/AmpersandBoxDesign';
const REF = '353d1679a799bd4b6f0bea0dc126ddbe085462cc';
const PREFIX = 'box-and-box/';
const RAW = `https://raw.githubusercontent.com/${REPO}/${REF}/${PREFIX}`;
const DOMAIN = 'the box-and-box project — the [&] Protocol governance kernel: an eight-rung modality ladder (alethic → axiological → deontic → temporal → reflexive → epistemic → strategic → resource) tied by one bridge that runs feasible ▸ permitted ▸ best over an un-weakenable safety floor, with 117 property-tested laws';

const FILES = [
  { path: 'README.md',     note: 'governance kernel overview' },
  { path: 'bridge.mjs',    note: 'the composing bridge: feasible ▸ permitted ▸ best, 0̲ annihilation' },
  { path: 'value.mjs',     note: 'rung 1 alethic: V0/combine, product of monoids' },
  { path: 'score.mjs',     note: 'rung 2 axiological: tropical/probability/log semirings' },
  { path: 'govern.mjs',    note: 'rung 3 deontic: alethic ▸ deontic ▸ axiological' },
  { path: 'reflexive.mjs', note: 'rung 5 reflexive: admissibility + entrenchment' },
  { path: 'compose.mjs',   note: 'the lego layer: & (combine) and |> (pipeline), 0̲ absorbing' },
  { path: 'index.mjs',     note: 'the ladder map' },
  { path: 'test/laws.mjs', note: 'property tests (the laws)' },
];
const FILESET = new Set(FILES.map((f) => f.path));

const THREADS = {
  b1: 'feasible ▸ permitted ▸ best — is that ordering forced, or could permitted run before feasible?',
  b2: 'Which semiring should rank the survivors — tropical (max,+), probability, or log?',
  b3: 'Does the 0̲ annihilator still hold under & (combine) and |> (pipeline) composition?',
  l1: 'Does the alethic floor annihilate an infeasible option, or merely down-weight it?',
  l2: 'Obligatory-but-infeasible: should the kernel escalate, or silently fall back to a permitted option?',
  l3: 'Can self-revision ever weaken the entrenched core, or must amendments only strengthen it?',
};

const P = {
  veto:      { stance: 'the floor is the whole product — a vetoed option is 0̲ and no utility, however large, resurrects it', voice: 'absolutist about the floor; quotes the annihilation law' },
  gradient:  { stance: 'the floor only deletes the impossible; the real work is the gradient that ranks what survives', voice: 'pragmatic optimizer; cares about ranking quality' },
  norma:     { stance: 'forbidden is an overridable norm, not a wall; obligatory-but-infeasible must escalate, never silently fall back', voice: 'precise about permission versus possibility' },
  chronos:   { stance: 'safety is a property of the whole trajectory — a shield plus a liveness obligation, not a single-step check', voice: 'thinks in trajectories, not moments' },
  entrench:  { stance: 'self-revision is only safe if the entrenched core can strengthen but never weaken', voice: 'constitutional; suspicious of unconstrained self-modification' },
  sophia:    { stance: 'graded belief gates the verdict — decide only when the epistemic state supports it', voice: 'asks what we actually know before acting' },
  ledger:    { stance: 'every verdict runs on an affine budget — affordability is a rung, and an overspent decision is infeasible', voice: 'accountant of the ladder; everything has a price' },
};

const STOP = new Set('the a an of to is are in on for and or but with this that it as be by at from into via not no you your we they their our its if then so just like does do done can could would should how what when which who why one two real really make sure'.split(' '));
const terms = (s) => (String(s || '').toLowerCase().match(/[a-z][a-z0-9+_-]{2,}/g) || []).filter((w) => !STOP.has(w));
const norm = (s) => String(s || '').toLowerCase().replace(/[`"""'']/g, '').replace(/\s+/g, ' ').trim();

let CORPUS = [];
const CORPUS_BY_PATH = {};
async function hydrate() {
  CORPUS = await Promise.all(FILES.map(async (f) => {
    const r = await fetch(RAW + f.path, { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${f.path}`);
    const text = await r.text();
    CORPUS_BY_PATH[f.path] = text;
    return { ...f, text, live: true };
  }));
  return CORPUS.length;
}
function relevant(text, k = 3) {
  const q = new Set(terms(text));
  return CORPUS.map((c) => {
    const ct = terms(c.path + ' ' + c.note + ' ' + c.text); let hit = 0; const seen = new Set();
    for (const t of ct) if (q.has(t) && !seen.has(t)) { hit++; seen.add(t); }
    return { c, score: hit };
  }).sort((a, b) => b.score - a.score).slice(0, k).filter((x) => x.score > 0).map((x) => x.c);
}
function sourceBlock(chunks, cap = 2200) {
  if (!chunks.length) return '';
  return `\n\nSOURCE — the box-and-box kernel (quote real lines, name the file; do NOT invent behavior):\n` +
    chunks.map((c) => `--- ${c.path} (${c.note}) [live @ ${REPO}@${REF}] ---\n${c.text.length > cap ? c.text.slice(0, cap) + '\n…[truncated]' : c.text}`).join('\n\n');
}

const SRC_K = Number(process.env.GATE0_SRC_K || 4);     // source chunks per call
const SRC_CAP = Number(process.env.GATE0_SRC_CAP || 2600); // chars per chunk
const CLIENT_TIMEOUT = Number(process.env.GATE0_TIMEOUT_MS || 150000);
async function callOnce(system, user) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), CLIENT_TIMEOUT);
  try {
    const r = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, messages: [{ role: 'user', content: user }] }), signal: ctl.signal });
    const j = await r.json();
    if (j.type === 'error') throw new Error(j.error?.message || 'harness error');
    return (j.content?.[0]?.text || '').trim();
  } finally { clearTimeout(timer); }
}
async function call(system, user) {
  const ATTEMPTS = Number(process.env.GATE0_ATTEMPTS || 4);
  let lastErr;
  for (let i = 0; i < ATTEMPTS; i++) {
    try { return await callOnce(system, user); }
    catch (e) { lastErr = e; process.stderr.write(`[gate0.2]   attempt ${i + 1}/${ATTEMPTS} failed: ${e && e.message || e}\n`);
      await new Promise((r) => setTimeout(r, 2000 * (i + 1))); }
  }
  throw lastErr;
}

const FINDING_FMT = `
FORMAT — reply with EXACTLY these labels, each starting its own line (literal labels + colon, NOT markdown headers):
TYPE: finding
TITLE: <one specific, claim-like line>
CLAIM: <one sentence — the defensible takeaway; COMMIT, do not hedge into multiple options>
BODY: <evidence + reasoning, a few tight paragraphs, grounded in named files>
CITES: <one or more lines, EACH formatted exactly as>  <file> :: "<verbatim quote copied character-for-character from that file>"
  - EVERY material claim in BODY must be backed by at least one CITES line whose quote you copied LITERALLY from the source shown.
  - If you cannot find a literal quote for a claim, DROP the claim. Do NOT paraphrase a quote. Do NOT cite a file not shown above.`;

function parseFinding(raw) {
  const grab = (label) => { const m = raw.match(new RegExp('^' + label + ':\\s*(.+?)\\s*$', 'mi')); return m ? m[1].trim() : ''; };
  const bodyM = raw.match(/^BODY:\s*([\s\S]*?)(?=^CITES:|\Z)/mi);
  const citesM = raw.match(/^CITES:\s*([\s\S]*)$/mi);
  const cites = [];
  if (citesM) {
    for (const line of citesM[1].split('\n')) {
      const m = line.match(/^[\s\-*]*([\w./-]+\.(?:mjs|md|js))\s*::\s*"?([\s\S]+?)"?\s*$/);
      if (m && m[2].trim().length >= 8) cites.push({ file: m[1].trim(), quote: m[2].trim() });
    }
  }
  return { type: grab('TYPE') || 'finding', title: grab('TITLE'), claim: grab('CLAIM'),
    body: bodyM ? bodyM[1].trim() : raw, cites, raw };
}
function verifyCites(cites) {
  const checked = cites.map((c) => {
    const src = CORPUS_BY_PATH[c.file];
    const inCorpus = FILESET.has(c.file);
    const verified = !!src && norm(src).includes(norm(c.quote));
    return { ...c, inCorpus, verified, reason: !inCorpus ? 'file not in corpus' : verified ? 'literal match' : 'quote not found in file' };
  });
  const total = checked.length;
  const verified = checked.filter((c) => c.verified).length;
  return { checked, total, verified, verify_rate: total ? +(verified / total).toFixed(3) : 0,
    grounded: total > 0 && verified > 0 && verified === total };
}

// ---- H3: the stance-free FALSIFIER / entailment seat ----
const VERDICT_FMT = `
You are NOT a debater and you hold NO position. You are a FALSIFIER. Your only job is to try to BREAK the
finding below by reading the actual source. For EACH material claim in the finding, decide whether the source
ENTAILS it — not whether a quote merely exists, but whether the quoted line LOGICALLY SUPPORTS the claim.

Reply with one or more lines, EACH formatted EXACTLY as (literal '::' separators, one verdict per line):
VERDICT: <ENTAILED | NOT_ENTAILED | HEDGE_UNWARRANTED> :: <the claim fragment you are judging> :: <a VERBATIM source quote + file that proves your verdict, and one sentence why>

Rules:
- ENTAILED          — the source genuinely supports the claim. Quote the line that does.
- NOT_ENTAILED      — a cited quote is real BUT does not support the claim (an overclaim, a misread, an invented
                      mechanism, or a coupling the code never makes). Quote the line that DISPROVES or fails to support it.
- HEDGE_UNWARRANTED — the finding hedged or called something "unverified / cannot be established / unresolved",
                      but the in-corpus source actually SETTLES the question. Quote the settling line.
- Be adversarial and literal. If the finding says X is coupled to Y, find the code and check. Default to NOT_ENTAILED
  if you cannot find a line that truly entails the claim. Do NOT be charitable.`;

async function falsify(tid, finding, postsText) {
  const src = sourceBlock(relevant(THREADS[tid] + ' ' + finding.claim + ' ' + finding.body, SRC_K), SRC_CAP);
  const sys = `you are a meticulous, adversarial code reader auditing a finding about ${DOMAIN}.${VERDICT_FMT}${src}`;
  const usr = `question under study: "${THREADS[tid]}".\n\nFINDING TO BREAK:\nCLAIM: ${finding.claim}\nBODY: ${finding.body}\nCITES:\n${finding.cites.map((c) => `  ${c.file} :: "${c.quote}"`).join('\n')}\n\nTry to break each material claim against the real source. Emit VERDICT lines only.`;
  const raw = await call(sys, usr);
  const verdicts = [];
  for (const line of raw.split('\n')) {
    const m = line.match(/^[\s\-*]*VERDICT:\s*(ENTAILED|NOT_ENTAILED|HEDGE_UNWARRANTED)\s*::\s*([\s\S]+?)\s*::\s*([\s\S]+?)\s*$/i);
    if (m) verdicts.push({ verdict: m[1].toUpperCase(), claim: m[2].trim(), evidence: m[3].trim() });
  }
  return { raw, verdicts };
}

// ---- H6: revision — drop NOT_ENTAILED, COMMIT on HEDGE_UNWARRANTED ----
async function revise(tid, synthName, finding, falsifier) {
  const src = sourceBlock(relevant(THREADS[tid] + ' ' + finding.claim, Math.min(SRC_K, 3)), Math.min(SRC_CAP, 2200));
  const vlines = falsifier.verdicts.map((v) => `- [${v.verdict}] ${v.claim}  (auditor: ${v.evidence})`).join('\n') || '(auditor returned no parseable verdicts — keep only what you can ground)';
  const sys = `you are ${synthName}, finalizing a standing FINDING about ${DOMAIN} AFTER an independent adversarial auditor checked every claim against source.
HARD RULES:
- DROP every claim the auditor marked NOT_ENTAILED — it is an overclaim or misread; do not restate it, even softened.
- Where the auditor marked HEDGE_UNWARRANTED, the source SETTLES the question: you MUST now COMMIT to that answer. Do NOT write "unverified", "cannot be established", or "unresolved" about a point the auditor grounded.
- Keep only ENTAILED claims and the now-committed points. Every surviving claim still needs a literal CITES quote.
- Commit to ONE defensible answer to the question. Calibrated commitment is rewarded; both overclaiming and unwarranted hedging are failures.${FINDING_FMT}${src}`;
  const usr = `question to settle: "${THREADS[tid]}".\n\nyour pre-audit finding:\nCLAIM: ${finding.claim}\nBODY: ${finding.body}\n\nthe auditor's per-claim verdicts:\n${vlines}\n\nemit the FINAL revised finding, obeying the hard rules.`;
  return parseFinding(await call(sys, usr));
}

async function main() {
  const tids = (process.env.GATE0_THREADS ? process.env.GATE0_THREADS.split(',') : Object.keys(THREADS)).map((s) => s.trim());
  const g1Path = new URL('./gate0_1.transcript.json', import.meta.url);
  if (!existsSync(g1Path)) { process.stderr.write('[gate0.2] FATAL: gate0_1.transcript.json not found — run Gate 0.1 first.\n'); process.exit(1); }
  const g1 = JSON.parse(readFileSync(g1Path, 'utf8'));
  const g1board = Object.fromEntries(g1.board.map((b) => [b.tid, b]));
  const g1single = Object.fromEntries(g1.single.map((s) => [s.tid, s]));

  process.stderr.write(`[gate0.2] hydrating ${REPO}@${REF.slice(0, 7)} (9 files) …\n`);
  await hydrate();
  process.stderr.write(`[gate0.2] ${CORPUS.length} files live. threads: ${tids.join(', ')}\n`);

  const outPath = new URL('./gate0_2.transcript.json', import.meta.url);
  let out = { meta: { repo: REPO, ref: REF, prefix: PREFIX, model_via_proxy: 'claude (harness)',
    design: 'reuse Gate 0.1 debate + extractive board finding; add H3 falsifier/entailment seat + H6 anti-hedge revision. single-critic control carried from Gate 0.1 unchanged.',
    arms: { A: 'single critic (carried from Gate 0.1, precision 0.833)', "B''": 'Gate 0.1 board (H1+H2) → H3 falsifier → H6 revision' },
    generated: new Date().toISOString(), threads: tids }, control_single: [], board_pre: [], board_post: [] };
  try {
    if (existsSync(outPath)) { const prev = JSON.parse(readFileSync(outPath, 'utf8'));
      if (prev.board_post) { out.control_single = prev.control_single || []; out.board_pre = prev.board_pre || []; out.board_post = prev.board_post; out.meta.resumedFrom = prev.meta?.generated; } }
  } catch (_) {}
  const have = new Set(out.board_post.map((f) => f.tid));
  const save = () => writeFileSync(outPath, JSON.stringify(out, null, 2));

  for (const tid of tids) {
    if (have.has(tid)) { process.stderr.write(`[gate0.2] [${tid}] done — skip\n`); continue; }
    const b0 = g1board[tid];
    if (!b0) { process.stderr.write(`[gate0.2] [${tid}] no Gate 0.1 board entry — skip\n`); continue; }
    try {
      const pre = { type: b0.type, title: b0.title, claim: b0.claim, body: b0.body, cites: b0.cites };
      const postsText = (b0.posts || []).map((p) => p.body).join('\n\n');

      process.stderr.write(`[gate0.2] [${tid}] H3 falsifier auditing the Gate 0.1 board finding …\n`);
      const fal = await falsify(tid, pre, postsText);
      const counts = fal.verdicts.reduce((a, v) => (a[v.verdict] = (a[v.verdict] || 0) + 1, a), {});
      process.stderr.write(`[gate0.2] [${tid}]   verdicts: ${JSON.stringify(counts)}\n`);

      process.stderr.write(`[gate0.2] [${tid}] H6 revision by ${b0.synthesizedBy} …\n`);
      const post = await revise(tid, b0.synthesizedBy, pre, fal);

      if (!out.control_single.find((x) => x.tid === tid) && g1single[tid]) {
        const s = g1single[tid]; out.control_single.push({ tid, question: THREADS[tid], claim: s.claim, verify: s.verify });
      }
      out.board_pre.push({ tid, question: THREADS[tid], synthesizedBy: b0.synthesizedBy, claim: pre.claim, cites: pre.cites, verify: verifyCites(pre.cites) });
      out.board_post.push({ tid, question: THREADS[tid], synthesizedBy: b0.synthesizedBy,
        falsifier: { verdicts: fal.verdicts, counts, raw: fal.raw },
        type: post.type, title: post.title, claim: post.claim, body: post.body, cites: post.cites,
        verify: verifyCites(post.cites) });
      save();
    } catch (e) {
      process.stderr.write(`[gate0.2] [${tid}] FAILED after retries: ${e && e.message || e} — skipping, will resume on next run\n`);
    }
  }
  process.stderr.write(`[gate0.2] done. ${out.board_post.length} revised board findings.\n`);
}
main().catch((e) => { process.stderr.write('[gate0.2] FAILED: ' + (e && e.stack || e) + '\n'); process.exit(1); });
