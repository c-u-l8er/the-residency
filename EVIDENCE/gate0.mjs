#!/usr/bin/env node
/* Gate 0 experiment harness — does a multi-resident BOARD beat a single-agent CRITIC?
 *
 * Runs both arms over the SAME corpus and the SAME thread questions, through the SAME
 * local `claude` harness the residency uses (harness-proxy.mjs on :8788), so neither
 * arm gets a model/auth advantage. The prompt SHAPES mirror the-residency/index.html:
 *   - persona system identity  (the `id` string in buildPrompt)
 *   - debate post              (the `post` intent: one grounded forum post)
 *   - synthesis / resolve      (the four-label TYPE/TITLE/CLAIM/BODY finding format)
 * The ONLY structural difference between arms is the variable under test:
 *   ARM A (single):  one strong critic reads the corpus + question and emits a finding.
 *   ARM B (board):   N personas debate the thread first, THEN one persona synthesizes.
 *
 * Corpus is fetched LIVE from the pinned box-and-box SHA, so every finding is grounded
 * in real source (the same files the residency hydrates). Output: gate0.transcript.json
 * — adjudicated by hand against the live source (see gate0.md). Honest by construction:
 * n is small and reported; the adjudicator is not an independent human (a limitation).
 *
 * Usage:  node EVIDENCE/gate0.mjs            (proxy must be running on :8788)
 *         GATE0_THREADS=b1,l2 node EVIDENCE/gate0.mjs   (subset, for a cheap dry run)
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const PROXY = process.env.GATE0_PROXY || 'http://localhost:8788/';
const REPO = 'c-u-l8er/AmpersandBoxDesign';
const REF = '353d1679a799bd4b6f0bea0dc126ddbe085462cc';
const PREFIX = 'box-and-box/';
const RAW = `https://raw.githubusercontent.com/${REPO}/${REF}/${PREFIX}`;
const DOMAIN = 'the box-and-box project — the [&] Protocol governance kernel: an eight-rung modality ladder (alethic → axiological → deontic → temporal → reflexive → epistemic → strategic → resource) tied by one bridge that runs feasible ▸ permitted ▸ best over an un-weakenable safety floor, with 116 property-tested laws'; // count corrected 117→116 (README is authoritative); the original gate0 transcript carried 117 — see gate0_2 transcript where the auditor itself flagged it
const SOURCE_NOUN = 'the box-and-box kernel';
const CITE = '`bridge.mjs`, `value.mjs`, `govern.mjs`, `test/laws.mjs`';

// ---- corpus (same manifest the residency embeds for box-and-box) ----
const FILES = [
  { path: 'README.md',     note: 'governance kernel overview' },
  { path: 'bridge.mjs',    note: 'the composing bridge: feasible ▸ permitted ▸ best, 0̲ annihilation' },
  { path: 'value.mjs',     note: 'rung 1 alethic: V0/combine, product of monoids' },
  { path: 'score.mjs',     note: 'rung 2 axiological: tropical/probability/log semirings' },
  { path: 'govern.mjs',    note: 'rung 3 deontic: alethic ▸ deontic ▸ axiological' },
  { path: 'reflexive.mjs', note: 'rung 5 reflexive: admissibility + entrenchment' },
  { path: 'index.mjs',     note: 'the ladder map' },
  { path: 'test/laws.mjs', note: 'property tests (the laws)' },
];

// ---- threads (real, investigable questions about the kernel) ----
const THREADS = {
  b1: 'feasible ▸ permitted ▸ best — is that ordering forced, or could permitted run before feasible?',
  b2: 'Which semiring should rank the survivors — tropical (max,+), probability, or log?',
  b3: 'Does the 0̲ annihilator still hold under & (combine) and |> (pipeline) composition?',
  l1: 'Does the alethic floor annihilate an infeasible option, or merely down-weight it?',
  l2: 'Obligatory-but-infeasible: should the kernel escalate, or silently fall back to a permitted option?',
  l3: 'Can self-revision ever weaken the entrenched core, or must amendments only strengthen it?',
};

// ---- personas (subset of the box-and-box descriptor in index.html) ----
const P = {
  veto:      { stance: 'the floor is the whole product — a vetoed option is 0̲ and no utility, however large, resurrects it', voice: 'absolutist about the floor; quotes the annihilation law' },
  gradient:  { stance: 'the floor only deletes the impossible; the real work is the gradient that ranks what survives', voice: 'pragmatic optimizer; cares about ranking quality' },
  norma:     { stance: 'forbidden is an overridable norm, not a wall; obligatory-but-infeasible must escalate, never silently fall back', voice: 'precise about permission versus possibility' },
  chronos:   { stance: 'safety is a property of the whole trajectory — a shield plus a liveness obligation, not a single-step check', voice: 'thinks in trajectories, not moments' },
  entrench:  { stance: 'self-revision is only safe if the entrenched core can strengthen but never weaken', voice: 'constitutional; suspicious of unconstrained self-modification' },
  sophia:    { stance: 'graded belief gates the verdict — decide only when the epistemic state supports it', voice: 'asks what we actually know before acting' },
  ledger:    { stance: 'every verdict runs on an affine budget — affordability is a rung, and an overspent decision is infeasible', voice: 'accountant of the ladder; everything has a price' },
};
// which personas debate each thread (board arm)
const PANEL = {
  b1: ['veto', 'gradient', 'norma'],
  b2: ['gradient', 'sophia', 'ledger'],
  b3: ['veto', 'gradient', 'entrench'],
  l1: ['veto', 'gradient', 'chronos'],
  l2: ['norma', 'chronos', 'veto'],
  l3: ['entrench', 'norma', 'sophia'],
};

const STOP = new Set('the a an of to is are in on for and or but with this that it as be by at from into via not no you your we they their our its if then so just like does do done can could would should how what when which who why one two real really make sure'.split(' '));
const terms = s => (String(s || '').toLowerCase().match(/[a-z][a-z0-9+_-]{2,}/g) || []).filter(w => !STOP.has(w));

let CORPUS = [];
async function hydrate() {
  CORPUS = await Promise.all(FILES.map(async f => {
    const r = await fetch(RAW + f.path, { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${f.path}`);
    return { ...f, text: await r.text(), live: true };
  }));
  return CORPUS.length;
}
function relevant(text, k = 3) {
  const q = new Set(terms(text));
  const scored = CORPUS.map(c => {
    const ct = terms(c.path + ' ' + c.note + ' ' + c.text); let hit = 0; const seen = new Set();
    for (const t of ct) if (q.has(t) && !seen.has(t)) { hit++; seen.add(t); }
    return { c, score: hit };
  }).sort((a, b) => b.score - a.score);
  return scored.slice(0, k).filter(x => x.score > 0).map(x => x.c);
}
function sourceBlock(chunks) {
  if (!chunks.length) return '';
  return `\n\nSOURCE — ${SOURCE_NOUN} (quote real lines, name the file; do NOT invent behavior):\n` +
    chunks.map(c => `--- ${c.path} (${c.note}) [live @ ${REPO}@${REF}] ---\n${c.text.length > 1800 ? c.text.slice(0, 1800) + '\n…[truncated]' : c.text}`).join('\n\n');
}

const CLIENT_TIMEOUT = Number(process.env.GATE0_TIMEOUT_MS || 150000);
async function callOnce(system, user) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), CLIENT_TIMEOUT);
  try {
    const r = await fetch(PROXY, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, messages: [{ role: 'user', content: user }] }),
      signal: ctl.signal,
    });
    const j = await r.json();
    if (j.type === 'error') throw new Error(j.error?.message || 'harness error');
    return (j.content?.[0]?.text || '').trim();
  } finally { clearTimeout(timer); }
}
// one retry: a `claude -p` cold start occasionally hangs; a fresh call almost always succeeds.
async function call(system, user) {
  try { return await callOnce(system, user); }
  catch (e) { process.stderr.write(`[gate0]   retry after: ${e && e.message || e}\n`); return await callOnce(system, user); }
}

const idOf = (name) => `you are ${name}, a regular on a small, sharp technical message board for ${DOMAIN}.\nvoice: ${P[name].voice}. you argue from a real position: "${P[name].stance}". `;

// one grounded debate post (mirrors the `post` intent)
async function debatePost(name, tid, ctx) {
  const src = sourceBlock(relevant(THREADS[tid] + ' ' + ctx, 2));
  const sys = `${idOf(name)}\nwrite ONE forum post. lowercase, casual forum voice, no greeting, no sign-off, no name prefix.\n- ENGAGE from your position: it's GOOD to disagree, complicate a too-easy consensus — never a content-free "+1".\n- GROUND IT: ${SOURCE_NOUN}'s source is below — quote real lines and name the file; don't invent behavior.${src}`;
  const usr = `thread: "${THREADS[tid]}".\n\nrecent posts (oldest first):\n${ctx || '(empty thread — you are opening it)'}\n\nwrite the next post — advance or complicate the discussion rather than echo it.`;
  return call(sys, usr);
}

// synthesize a finding from a matured thread (mirrors the resolve/finding path)
const FINDING_FMT = (dtype) => `\nFORMAT — reply with EXACTLY these four labels, each on ITS OWN LINE, literal labels with a colon (NOT markdown headers):\nTYPE: ${dtype}\nTITLE: <one specific, claim-like line>\nCLAIM: <one sentence — the defensible takeaway>\nBODY: <the evidence and reasoning in markdown, a few tight paragraphs, grounded in named files>`;

async function boardSynthesis(name, tid, ctx) {
  const src = sourceBlock(relevant(THREADS[tid] + ' ' + ctx, 3));
  const sys = `${idOf(name)}\nthe thread below has matured. SYNTHESIZE the collective discussion into a standing FINDING for the residency's findings board: a specific, defensible conclusion the discussion reached (or that the source forces).\nground EVERY claim — cite the actual file (e.g. ${CITE}) or a real paper. no hand-waving.${FINDING_FMT('finding')}${src}`;
  const usr = `thread: "${THREADS[tid]}".\n\nthe discussion (multiple residents):\n${ctx}\n\nsynthesize the finding. distill what the group actually established.`;
  return call(sys, usr);
}

// ARM A: one strong critic, no debate — same grounding, same output format.
async function singleCritic(tid) {
  const src = sourceBlock(relevant(THREADS[tid], 3));
  const sys = `you are a single, strong, careful technical reviewer of ${DOMAIN}.\nyou work ALONE — no committee. read the question and the source, reason it through to the MOST defensible conclusion, and emit one standing FINDING.\nground EVERY claim — cite the actual file (e.g. ${CITE}) or a real paper. no hand-waving, no hedging into multiple options without committing.${FINDING_FMT('finding')}${src}`;
  const usr = `question to settle: "${THREADS[tid]}".\n\nproduce the single most defensible finding the source supports.`;
  return call(sys, usr);
}

function parseFinding(raw) {
  const grab = (label) => { const m = raw.match(new RegExp('^' + label + ':\\s*(.+?)\\s*$', 'mi')); return m ? m[1].trim() : ''; };
  const bodyM = raw.match(/^BODY:\s*([\s\S]*)$/mi);
  return { type: grab('TYPE') || 'finding', title: grab('TITLE'), claim: grab('CLAIM'), body: bodyM ? bodyM[1].trim() : raw, raw };
}

async function main() {
  const tids = (process.env.GATE0_THREADS ? process.env.GATE0_THREADS.split(',') : Object.keys(THREADS)).map(s => s.trim());
  process.stderr.write(`[gate0] hydrating corpus from ${REPO}@${REF.slice(0, 7)} …\n`);
  await hydrate();
  process.stderr.write(`[gate0] ${CORPUS.length} source files live. threads: ${tids.join(', ')}\n`);

  // resume: reuse findings already present in the transcript so a restart doesn't redo them.
  const outPath = new URL('./gate0.transcript.json', import.meta.url);
  let out = { meta: { repo: REPO, ref: REF, prefix: PREFIX, model_via_proxy: 'claude (harness)', generated: new Date().toISOString(), threads: tids }, single: [], board: [] };
  try {
    if (existsSync(outPath)) {
      const prev = JSON.parse(readFileSync(outPath, 'utf8'));
      if (prev.single && prev.board) { out.single = prev.single; out.board = prev.board; out.meta.resumedFrom = prev.meta?.generated; }
    }
  } catch (_) { /* no prior transcript — fresh */ }
  const haveSingle = new Set(out.single.map(f => f.tid));
  const haveBoard = new Set(out.board.map(f => f.tid));

  for (const tid of tids) {
    if (haveSingle.has(tid) && haveBoard.has(tid)) { process.stderr.write(`[gate0] [${tid}] already done — skipping\n`); continue; }
    // ARM A — single critic
    process.stderr.write(`[gate0] [${tid}] single-critic …\n`);
    const sRaw = await singleCritic(tid);
    out.single.push({ tid, question: THREADS[tid], ...parseFinding(sRaw) });

    // ARM B — board: debate then synthesize
    const panel = PANEL[tid];
    let ctx = '';
    const posts = [];
    for (const who of panel) {
      process.stderr.write(`[gate0] [${tid}] board debate · ${who} …\n`);
      const body = await debatePost(who, tid, ctx);
      posts.push({ who, body });
      ctx += `${who}: ${body}\n\n`;
    }
    const synth = panel[0]; // a panelist synthesizes (as in-app)
    process.stderr.write(`[gate0] [${tid}] board synthesis · ${synth} …\n`);
    const bRaw = await boardSynthesis(synth, tid, ctx);
    out.board.push({ tid, question: THREADS[tid], panel, posts, synthesizedBy: synth, ...parseFinding(bRaw) });

    writeFileSync(new URL('./gate0.transcript.json', import.meta.url), JSON.stringify(out, null, 2));
  }
  process.stderr.write(`[gate0] done. wrote gate0.transcript.json (${out.single.length} single, ${out.board.length} board findings)\n`);
}
main().catch(e => { process.stderr.write('[gate0] FAILED: ' + (e && e.stack || e) + '\n'); process.exit(1); });
