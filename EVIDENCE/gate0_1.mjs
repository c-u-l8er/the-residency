#!/usr/bin/env node
/* Gate 0.1 — does a GROUNDING-GATED board beat a (sampled) single critic?
 *
 * Follow-up to gate0.mjs after Gate 0 returned board_lift = -0.33. The redesign note
 * (EVIDENCE/deliberation-redesign.md) bet that the board lost ONLY because free-text
 * debate let the synthesizer launder ungrounded claims, and that two cheap structural
 * changes flip board_lift >= 0:
 *
 *   H1  mechanical grounding gate — EVERY claim must carry a verbatim source quote;
 *       a post-pass string-matches each quote against the hydrated source. Claims whose
 *       quote is NOT literally present are flagged `unverified` and excluded. (This is
 *       box-and-box's alethic floor applied to the finding pipeline.)
 *   H2  extractive synthesizer — the board synthesizer may only keep claims+quotes that
 *       already appeared in the debate posts; it cannot introduce a new mechanism.
 *
 * Arms (same local `claude` harness, zero API cost, identical grounding):
 *   A   single critic                         (control, unchanged from Gate 0 + CITES)
 *   A'  k=3 self-consistency soloist + verifier (H5 — can a sampled soloist retire the board?)
 *   B'  board debate -> EXTRACTIVE synthesis    (H1 + H2)
 *
 * Also fixes the Gate 0 b3 corpus bug: compose.mjs (which defines & and |>) is now hydrated.
 *
 * The harness MEASURES groundedness mechanically (citation_verify_rate per finding). It does
 * NOT decide correctness — that still needs hand-adjudication against source, but the gate
 * shrinks each finding to its verifiable claims first. Output: gate0_1.transcript.json.
 *
 * Usage:  node EVIDENCE/gate0_1.mjs                 (proxy must be running on :8788)
 *         GATE0_THREADS=b2,b3 node EVIDENCE/gate0_1.mjs   (subset, for a cheap dry run)
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const PROXY = process.env.GATE0_PROXY || 'http://localhost:8788/';
const REPO = 'c-u-l8er/AmpersandBoxDesign';
const REF = '353d1679a799bd4b6f0bea0dc126ddbe085462cc';
const PREFIX = 'box-and-box/';
const RAW = `https://raw.githubusercontent.com/${REPO}/${REF}/${PREFIX}`;
const DOMAIN = 'the box-and-box project — the [&] Protocol governance kernel: an eight-rung modality ladder (alethic → axiological → deontic → temporal → reflexive → epistemic → strategic → resource) tied by one bridge that runs feasible ▸ permitted ▸ best over an un-weakenable safety floor, with 117 property-tested laws';
const SOURCE_NOUN = 'the box-and-box kernel';
const CITE = '`bridge.mjs`, `value.mjs`, `govern.mjs`, `compose.mjs`, `test/laws.mjs`';
const K = Number(process.env.GATE0_K || 3); // self-consistency samples for arm A'

// ---- corpus — Gate 0's 8 files + compose.mjs (the b3 fix) ----
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
const PANEL = {
  b1: ['veto', 'gradient', 'norma'],   b2: ['gradient', 'sophia', 'ledger'],
  b3: ['veto', 'gradient', 'entrench'], l1: ['veto', 'gradient', 'chronos'],
  l2: ['norma', 'chronos', 'veto'],     l3: ['entrench', 'norma', 'sophia'],
};

const STOP = new Set('the a an of to is are in on for and or but with this that it as be by at from into via not no you your we they their our its if then so just like does do done can could would should how what when which who why one two real really make sure'.split(' '));
const terms = (s) => (String(s || '').toLowerCase().match(/[a-z][a-z0-9+_-]{2,}/g) || []).filter((w) => !STOP.has(w));
// normalize for literal-quote matching: drop markdown backticks, surrounding quotes,
// and collapse whitespace. (Models often wrap a copied line in `backticks` or "quotes";
// that wrapper must not cause a false-negative against the raw source.)
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
function sourceBlock(chunks) {
  if (!chunks.length) return '';
  return `\n\nSOURCE — ${SOURCE_NOUN} (quote real lines, name the file; do NOT invent behavior):\n` +
    chunks.map((c) => `--- ${c.path} (${c.note}) [live @ ${REPO}@${REF}] ---\n${c.text.length > 1800 ? c.text.slice(0, 1800) + '\n…[truncated]' : c.text}`).join('\n\n');
}

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
// the local `claude -p` harness occasionally cold-starts/hangs; retry a few times with backoff.
async function call(system, user) {
  const ATTEMPTS = Number(process.env.GATE0_ATTEMPTS || 4);
  let lastErr;
  for (let i = 0; i < ATTEMPTS; i++) {
    try { return await callOnce(system, user); }
    catch (e) { lastErr = e; process.stderr.write(`[gate0.1]   attempt ${i + 1}/${ATTEMPTS} failed: ${e && e.message || e}\n`);
      await new Promise((r) => setTimeout(r, 2000 * (i + 1))); }
  }
  throw lastErr;
}

// ---- H1: the finding FORMAT now demands a verbatim-quote CITES block ----
const FINDING_FMT = `
FORMAT — reply with EXACTLY these labels, each starting its own line (literal labels + colon, NOT markdown headers):
TYPE: finding
TITLE: <one specific, claim-like line>
CLAIM: <one sentence — the defensible takeaway>
BODY: <evidence + reasoning, a few tight paragraphs, grounded in named files>
CITES: <one or more lines, EACH formatted exactly as>  <file> :: "<verbatim quote copied character-for-character from that file>"
  - EVERY material claim in BODY must be backed by at least one CITES line whose quote you copied LITERALLY from the source shown.
  - If you cannot find a literal quote for a claim, DROP the claim. Do NOT paraphrase a quote. Do NOT cite a file not shown above.
  - Prefer 2–5 short exact quotes over one long one.`;

function parseFinding(raw) {
  const grab = (label) => { const m = raw.match(new RegExp('^' + label + ':\\s*(.+?)\\s*$', 'mi')); return m ? m[1].trim() : ''; };
  const bodyM = raw.match(/^BODY:\s*([\s\S]*?)(?=^CITES:|\Z)/mi);
  const citesM = raw.match(/^CITES:\s*([\s\S]*)$/mi);
  const cites = [];
  if (citesM) {
    for (const line of citesM[1].split('\n')) {
      // <file> :: "<quote>"   (quote may also be unquoted)
      const m = line.match(/^[\s\-*]*([\w./-]+\.(?:mjs|md|js))\s*::\s*"?([\s\S]+?)"?\s*$/);
      if (m && m[2].trim().length >= 8) cites.push({ file: m[1].trim(), quote: m[2].trim() });
    }
  }
  return { type: grab('TYPE') || 'finding', title: grab('TITLE'), claim: grab('CLAIM'),
    body: bodyM ? bodyM[1].trim() : raw, cites, raw };
}

// ---- H1 verifier: does each quote literally appear in the hydrated source? ----
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
// ---- H2 extractive check: did each cited quote already appear in the debate posts? ----
function extractiveCheck(cites, postsText) {
  const pt = norm(postsText);
  const fromPosts = cites.map((c) => ({ ...c, inPosts: pt.includes(norm(c.quote)) }));
  const n = fromPosts.length, k = fromPosts.filter((c) => c.inPosts).length;
  return { fromPosts, in_posts_rate: n ? +(k / n).toFixed(3) : 0 };
}

const idOf = (name) => `you are ${name}, a regular on a small, sharp technical message board for ${DOMAIN}.\nvoice: ${P[name].voice}. you argue from a real position: "${P[name].stance}". `;

async function debatePost(name, tid, ctx) {
  const src = sourceBlock(relevant(THREADS[tid] + ' ' + ctx, 2));
  const sys = `${idOf(name)}\nwrite ONE forum post. lowercase, casual forum voice, no greeting, no sign-off, no name prefix.\n- ENGAGE from your position: it's GOOD to disagree, complicate a too-easy consensus — never a content-free "+1".\n- GROUND IT: when you assert how the code behaves, quote a REAL line VERBATIM and name the file. don't invent behavior.${src}`;
  const usr = `thread: "${THREADS[tid]}".\n\nrecent posts (oldest first):\n${ctx || '(empty thread — you are opening it)'}\n\nwrite the next post — advance or complicate the discussion rather than echo it.`;
  return call(sys, usr);
}

// ARM A — single critic (control), now with the CITES requirement
async function singleCritic(tid) {
  const src = sourceBlock(relevant(THREADS[tid], 3));
  const sys = `you are a single, strong, careful technical reviewer of ${DOMAIN}.\nyou work ALONE — no committee. read the question and the source, reason to the MOST defensible conclusion, and emit one standing FINDING.\nground EVERY claim in a verbatim quote (e.g. from ${CITE}); no hand-waving, no hedging into multiple options without committing.${FINDING_FMT}${src}`;
  const usr = `question to settle: "${THREADS[tid]}".\n\nproduce the single most defensible finding the source supports.`;
  return parseFinding(await call(sys, usr));
}

// ARM B' — board: debate then EXTRACTIVE synthesis (H2), grounded (H1)
async function boardExtractive(tid) {
  const panel = PANEL[tid];
  let ctx = ''; const posts = [];
  for (const who of panel) {
    process.stderr.write(`[gate0.1] [${tid}] board · ${who} …\n`);
    const body = await debatePost(who, tid, ctx);
    posts.push({ who, body }); ctx += `${who}: ${body}\n\n`;
  }
  const synth = panel[0];
  process.stderr.write(`[gate0.1] [${tid}] board EXTRACTIVE synthesis · ${synth} …\n`);
  const src = sourceBlock(relevant(THREADS[tid] + ' ' + ctx, 3));
  const sys = `${idOf(synth)}\nthe thread below has matured. SYNTHESIZE it into a standing FINDING.\nHARD RULE (extractive): you may ONLY keep claims and quotes that ALREADY APPEARED in the posts below. you may rank, merge, and drop — you may NOT introduce a new mechanism or a quote no resident posted. if the thread never grounded a point, leave it out.${FINDING_FMT}${src}`;
  const usr = `thread: "${THREADS[tid]}".\n\nthe discussion (multiple residents):\n${ctx}\n\nsynthesize the finding from ONLY what the residents actually grounded.`;
  const finding = parseFinding(await call(sys, usr));
  return { panel, posts, synthesizedBy: synth, postsText: posts.map((p) => p.body).join('\n\n'), ...finding };
}

async function main() {
  const tids = (process.env.GATE0_THREADS ? process.env.GATE0_THREADS.split(',') : Object.keys(THREADS)).map((s) => s.trim());
  process.stderr.write(`[gate0.1] hydrating ${REPO}@${REF.slice(0, 7)} (+compose.mjs) …\n`);
  await hydrate();
  process.stderr.write(`[gate0.1] ${CORPUS.length} files live. threads: ${tids.join(', ')}\n`);

  const outPath = new URL('./gate0_1.transcript.json', import.meta.url);
  let out = { meta: { repo: REPO, ref: REF, prefix: PREFIX, k: K, model_via_proxy: 'claude (harness)',
    arms: { A: 'single critic', "A'": `k=${K} self-consistency soloist + verifier`, "B'": 'board debate → extractive synthesis (H1+H2)' },
    generated: new Date().toISOString(), threads: tids }, single: [], sampled: [], board: [] };
  try {
    if (existsSync(outPath)) { const prev = JSON.parse(readFileSync(outPath, 'utf8'));
      if (prev.single && prev.board) { out.single = prev.single; out.sampled = prev.sampled || []; out.board = prev.board; out.meta.resumedFrom = prev.meta?.generated; } }
  } catch (_) {}
  const have = (arr) => new Set(arr.map((f) => f.tid));
  const hS = have(out.single), hK = have(out.sampled), hB = have(out.board);
  const save = () => writeFileSync(outPath, JSON.stringify(out, null, 2));

  for (const tid of tids) {
    if (hS.has(tid) && hK.has(tid) && hB.has(tid)) { process.stderr.write(`[gate0.1] [${tid}] done — skip\n`); continue; }
    try {
      // ARM A — single critic
      if (!hS.has(tid)) {
        process.stderr.write(`[gate0.1] [${tid}] A single-critic …\n`);
        const a = await singleCritic(tid);
        out.single.push({ tid, question: THREADS[tid], ...a, verify: verifyCites(a.cites) }); save();
      }
      // ARM A' — k self-consistency + verifier filter: keep the sample with the best verify_rate
      if (!hK.has(tid)) {
        const samples = [];
        for (let i = 0; i < K; i++) {
          process.stderr.write(`[gate0.1] [${tid}] A' sample ${i + 1}/${K} …\n`);
          const s = await singleCritic(tid); samples.push({ ...s, verify: verifyCites(s.cites) });
        }
        samples.sort((x, y) => (y.verify.verified - x.verify.verified) || (y.verify.verify_rate - x.verify.verify_rate));
        const best = samples[0];
        out.sampled.push({ tid, question: THREADS[tid], k: K, chosen: best,
          sample_verify_rates: samples.map((s) => s.verify.verify_rate) }); save();
      }
      // ARM B' — grounded extractive board
      if (!hB.has(tid)) {
        const b = await boardExtractive(tid);
        out.board.push({ tid, question: THREADS[tid], panel: b.panel, posts: b.posts, synthesizedBy: b.synthesizedBy,
          type: b.type, title: b.title, claim: b.claim, body: b.body, cites: b.cites,
          verify: verifyCites(b.cites), extractive: extractiveCheck(b.cites, b.postsText) }); save();
      }
    } catch (e) {
      process.stderr.write(`[gate0.1] [${tid}] FAILED after retries: ${e && e.message || e} — skipping, will resume on next run\n`);
    }
  }
  process.stderr.write(`[gate0.1] done. ${out.single.length} single, ${out.sampled.length} sampled, ${out.board.length} board.\n`);
}
main().catch((e) => { process.stderr.write('[gate0.1] FAILED: ' + (e && e.stack || e) + '\n'); process.exit(1); });
