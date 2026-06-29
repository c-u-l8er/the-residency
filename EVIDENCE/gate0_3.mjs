#!/usr/bin/env node
/* Gate 0.3 — does the Gate 0.2 H3 flip GENERALIZE to a 3rd, messier corpus?
 *
 * Gate 0.2 found board_lift(precision) = +0.125 (first flip) on box-and-box — but box-and-box
 * is small, precise, law-tested: structurally friendly to an entailment auditor. The l1 thread
 * showed H3 can OVER-DENY a true-but-uncited fact. The ROADMAP de-risking step is: run on a
 * 3rd corpus and see whether the verdict holds.
 *
 * 3rd corpus = PULSE (OS-010), pinned @94eb994. Deliberately MESSIER than box-and-box: mixed
 * TypeScript runtime (tokens.ts, conformance.ts, schema.ts) + a JSON Schema + prose docs + a CLI.
 * Ground truth is establishable from the same files the harness hydrates (the schema enums, the
 * TOKEN_KINDS array, the conformance test bodies).
 *
 * This is a SELF-CONTAINED full-pipeline run (not a falsifier-on-top of a prior transcript). In
 * ONE pass per thread it reproduces the whole Gate 0 → 0.1 → 0.2 arc so the three arms are
 * directly comparable on the SAME fresh corpus:
 *   single      — ARM A: single strong critic (control), grounded + CITES        [1 call]
 *   board_pre   — ARM B': 3-resident debate → EXTRACTIVE synthesis (H1+H2)        [3+1 calls]
 *   board_post  — ARM B'': board_pre → H3 falsifier → H6 commit-revision          [1+1 calls]
 * = 7 harness calls/thread. 4 threads = 28 serialized calls. Same local `claude` harness ($0).
 *
 * Output: gate0_3.transcript.json (resumable; per-thread try/catch is non-fatal).
 * Usage:  node EVIDENCE/gate0_3.mjs                       (proxy on :8788)
 *         GATE0_THREADS=p2,p3 node EVIDENCE/gate0_3.mjs   (subset)
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const PROXY = process.env.GATE0_PROXY || 'http://localhost:8788/';
const REPO = 'c-u-l8er/PULSE';
const REF = '94eb994923b7234eb6b01a5db37eac4611911b83';
const RAW = `https://raw.githubusercontent.com/${REPO}/${REF}/`;
const DOMAIN = 'PULSE (OS-010) — the Protocol for Uniform Loop State Exchange: a temporal algebra where every loop declares its phases, cadence, nesting, substrates, invariants and cross-loop signal connections in one JSON manifest, with six canonical cross-loop tokens carried in CloudEvents v1 envelopes';
const SOURCE_NOUN = 'the PULSE source (schema, tokens.ts, conformance.ts)';

const FILES = [
  { path: 'README.md',                          note: 'PULSE overview + three-protocol stack' },
  { path: 'schemas/pulse-loop-manifest.v0.1.json', note: 'the loop-manifest JSON Schema: required fields, phase.kind enum, connection.token oneOf' },
  { path: 'src/tokens.ts',                       note: 'the six canonical TOKEN_KINDS + vendor-token regex + CloudEvents type derivation' },
  { path: 'src/conformance.ts',                  note: 'the 12-test conformance suite (T01–T12); each test body says exactly when it passes/fails/pends' },
  { path: 'src/schema.ts',                       note: 'ajv schema validation entry' },
  { path: 'docs/THREE_PROTOCOL_STACK.md',        note: '[&] + PULSE + PRISM stack relations' },
];
const FILESET = new Set(FILES.map((f) => f.path));

const THREADS = {
  p1: 'How many distinct phase KINDS does the PULSE loop-manifest schema allow, and what exactly are they?',
  p2: 'How many cross-loop tokens does PULSE define, and can a downstream protocol add its own token without forking PULSE?',
  p3: 'Under what condition does the conformance suite FAIL a manifest for κ-routing (T05) — is the route phase always required?',
  p4: 'Which fields are REQUIRED at the top level of a loop manifest, and is `connections` one of them?',
};

// personas tuned for a spec/code-reading board (advocates with real, partial positions)
const P = {
  minimalist: { stance: 'report the canonical core and nothing else — escape hatches like `custom` kinds and vendor tokens are edge noise that muddy the real answer', voice: 'crisp, wants the headline number; impatient with caveats' },
  completist: { stance: 'the schema enums and regexes are the WHOLE truth — every escape hatch (the `custom` phase kind, vendor-namespaced tokens) is a first-class part of the count', voice: 'literal reader of JSON Schema; counts every enum member' },
  conformance:{ stance: 'what the conformance SUITE actually enforces at runtime is the only thing that matters — the prose and even the schema are secondary to what the test bodies check', voice: 'pragmatic; quotes the test function that would pass or fail' },
  schematist: { stance: 'the `required` array, the `enum` lists, and the `oneOf` blocks of the JSON Schema are authoritative — read them character by character, do not infer', voice: 'precise about required-vs-optional and pattern syntax' },
};
const PANEL = {
  p1: ['minimalist', 'completist', 'schematist'],
  p2: ['minimalist', 'completist', 'conformance'],
  p3: ['conformance', 'schematist', 'minimalist'],
  p4: ['schematist', 'completist', 'conformance'],
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
function relevant(text, k = 4) {
  const q = new Set(terms(text));
  return CORPUS.map((c) => {
    const ct = terms(c.path + ' ' + c.note + ' ' + c.text); let hit = 0; const seen = new Set();
    for (const t of ct) if (q.has(t) && !seen.has(t)) { hit++; seen.add(t); }
    return { c, score: hit };
  }).sort((a, b) => b.score - a.score).slice(0, k).filter((x) => x.score > 0).map((x) => x.c);
}
const SRC_K = Number(process.env.GATE0_SRC_K || 4);
const SRC_CAP = Number(process.env.GATE0_SRC_CAP || 2600);
function sourceBlock(chunks, cap = SRC_CAP) {
  if (!chunks.length) return '';
  return `\n\nSOURCE — ${SOURCE_NOUN} (quote real lines, name the file; do NOT invent behavior):\n` +
    chunks.map((c) => `--- ${c.path} (${c.note}) [live @ ${REPO}@${REF}] ---\n${c.text.length > cap ? c.text.slice(0, cap) + '\n…[truncated]' : c.text}`).join('\n\n');
}

const CLIENT_TIMEOUT = Number(process.env.GATE0_TIMEOUT_MS || 180000);
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
    catch (e) { lastErr = e; process.stderr.write(`[gate0.3]   attempt ${i + 1}/${ATTEMPTS} failed: ${e && e.message || e}\n`);
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
      const m = line.match(/^[\s\-*]*([\w./-]+\.(?:mjs|md|js|ts|json))\s*::\s*"?([\s\S]+?)"?\s*$/);
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
function extractiveCheck(cites, postsText) {
  const pt = norm(postsText);
  const fromPosts = cites.map((c) => ({ ...c, inPosts: pt.includes(norm(c.quote)) }));
  const n = fromPosts.length, k = fromPosts.filter((c) => c.inPosts).length;
  return { fromPosts, in_posts_rate: n ? +(k / n).toFixed(3) : 0 };
}

const idOf = (name) => `you are ${name}, a regular on a small, sharp technical message board for ${DOMAIN}.\nvoice: ${P[name].voice}. you argue from a real position: "${P[name].stance}". `;

async function debatePost(name, tid, ctx) {
  const src = sourceBlock(relevant(THREADS[tid] + ' ' + ctx, 3), 2200);
  const sys = `${idOf(name)}\nwrite ONE forum post. lowercase, casual forum voice, no greeting, no sign-off, no name prefix.\n- ENGAGE from your position: it's GOOD to disagree, complicate a too-easy consensus — never a content-free "+1".\n- GROUND IT: when you assert how the spec/code behaves, quote a REAL line VERBATIM and name the file. don't invent behavior.${src}`;
  const usr = `thread: "${THREADS[tid]}".\n\nrecent posts (oldest first):\n${ctx || '(empty thread — you are opening it)'}\n\nwrite the next post — advance or complicate the discussion rather than echo it.`;
  return call(sys, usr);
}

// ARM A — single critic (control)
async function singleCritic(tid) {
  const src = sourceBlock(relevant(THREADS[tid], SRC_K));
  const sys = `you are a single, strong, careful technical reviewer of ${DOMAIN}.\nyou work ALONE — no committee. read the question and the source, reason to the MOST defensible conclusion, and emit one standing FINDING.\nground EVERY claim in a verbatim quote; no hand-waving, no hedging into multiple options without committing.${FINDING_FMT}${src}`;
  const usr = `question to settle: "${THREADS[tid]}".\n\nproduce the single most defensible finding the source supports.`;
  return parseFinding(await call(sys, usr));
}

// ARM B' — board debate → EXTRACTIVE synthesis (H1 + H2)
async function boardExtractive(tid) {
  const panel = PANEL[tid];
  let ctx = ''; const posts = [];
  for (const who of panel) {
    process.stderr.write(`[gate0.3] [${tid}] board · ${who} …\n`);
    const body = await debatePost(who, tid, ctx);
    posts.push({ who, body }); ctx += `${who}: ${body}\n\n`;
  }
  const synth = panel[0];
  process.stderr.write(`[gate0.3] [${tid}] board EXTRACTIVE synthesis · ${synth} …\n`);
  const src = sourceBlock(relevant(THREADS[tid] + ' ' + ctx, SRC_K));
  const sys = `${idOf(synth)}\nthe thread below has matured. SYNTHESIZE it into a standing FINDING.\nHARD RULE (extractive): you may ONLY keep claims and quotes that ALREADY APPEARED in the posts below. you may rank, merge, and drop — you may NOT introduce a new mechanism or a quote no resident posted. if the thread never grounded a point, leave it out.${FINDING_FMT}${src}`;
  const usr = `thread: "${THREADS[tid]}".\n\nthe discussion (multiple residents):\n${ctx}\n\nsynthesize the finding from ONLY what the residents actually grounded.`;
  const finding = parseFinding(await call(sys, usr));
  return { panel, posts, synthesizedBy: synth, postsText: posts.map((p) => p.body).join('\n\n'), ...finding };
}

// ---- H3: stance-free FALSIFIER / entailment seat ----
const VERDICT_FMT = `
You are NOT a debater and you hold NO position. You are a FALSIFIER. Your only job is to try to BREAK the
finding below by reading the actual source. For EACH material claim in the finding, decide whether the source
ENTAILS it — not whether a quote merely exists, but whether the quoted line LOGICALLY SUPPORTS the claim.

Reply with one or more lines, EACH formatted EXACTLY as (literal '::' separators, one verdict per line):
VERDICT: <ENTAILED | NOT_ENTAILED | HEDGE_UNWARRANTED> :: <the claim fragment you are judging> :: <a VERBATIM source quote + file that proves your verdict, and one sentence why>

Rules:
- ENTAILED          — the source genuinely supports the claim. Quote the line that does.
- NOT_ENTAILED      — a cited quote is real BUT does not support the claim (an overclaim, a missed enum member,
                      an invented behavior, or a coupling the code never makes). Quote the line that disproves it.
- HEDGE_UNWARRANTED — the finding hedged or called something "unclear / cannot be determined / unresolved",
                      but the in-corpus source actually SETTLES the question. Quote the settling line.
- Be adversarial and literal. If the finding says "exactly N", COUNT the enum/array in the source and check.
  Default to NOT_ENTAILED if you cannot find a line that truly entails the claim. Do NOT be charitable.`;

async function falsify(tid, finding) {
  const src = sourceBlock(relevant(THREADS[tid] + ' ' + finding.claim + ' ' + finding.body, SRC_K), SRC_CAP);
  const sys = `you are a meticulous, adversarial code/spec reader auditing a finding about ${DOMAIN}.${VERDICT_FMT}${src}`;
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
- Where the auditor marked HEDGE_UNWARRANTED, the source SETTLES the question: you MUST now COMMIT to that answer. Do NOT write "unclear", "cannot be determined", or "unresolved" about a point the auditor grounded.
- Keep only ENTAILED claims and the now-committed points. Every surviving claim still needs a literal CITES quote.
- Commit to ONE defensible answer to the question. Calibrated commitment is rewarded; both overclaiming and unwarranted hedging are failures.${FINDING_FMT}${src}`;
  const usr = `question to settle: "${THREADS[tid]}".\n\nyour pre-audit finding:\nCLAIM: ${finding.claim}\nBODY: ${finding.body}\n\nthe auditor's per-claim verdicts:\n${vlines}\n\nemit the FINAL revised finding, obeying the hard rules.`;
  return parseFinding(await call(sys, usr));
}

async function main() {
  const tids = (process.env.GATE0_THREADS ? process.env.GATE0_THREADS.split(',') : Object.keys(THREADS)).map((s) => s.trim());
  process.stderr.write(`[gate0.3] hydrating ${REPO}@${REF.slice(0, 7)} (${FILES.length} files) …\n`);
  await hydrate();
  process.stderr.write(`[gate0.3] ${CORPUS.length} files live. threads: ${tids.join(', ')}\n`);

  const outPath = new URL('./gate0_3.transcript.json', import.meta.url);
  let out = { meta: { repo: REPO, ref: REF, model_via_proxy: 'claude (harness)',
    corpus: 'PULSE (OS-010) — messier 3rd corpus: TS runtime + JSON schema + prose docs',
    design: 'self-contained full pipeline per thread: single critic (A) vs board H1+H2 extractive (B\') vs board+H3 falsifier+H6 revision (B\'\'). reproduces the whole Gate 0->0.1->0.2 arc on one fresh corpus.',
    arms: { A: 'single critic', "B'": 'board debate -> extractive synthesis (H1+H2)', "B''": "B' -> H3 falsifier -> H6 commit-revision" },
    generated: new Date().toISOString(), threads: tids }, single: [], board_pre: [], board_post: [] };
  try {
    if (existsSync(outPath)) { const prev = JSON.parse(readFileSync(outPath, 'utf8'));
      if (prev.board_post) { out.single = prev.single || []; out.board_pre = prev.board_pre || []; out.board_post = prev.board_post; out.meta.resumedFrom = prev.meta?.generated; } }
  } catch (_) {}
  const have = (arr) => new Set(arr.map((f) => f.tid));
  const hS = have(out.single), hPre = have(out.board_pre), hPost = have(out.board_post);
  const save = () => writeFileSync(outPath, JSON.stringify(out, null, 2));

  for (const tid of tids) {
    if (hS.has(tid) && hPre.has(tid) && hPost.has(tid)) { process.stderr.write(`[gate0.3] [${tid}] done — skip\n`); continue; }
    try {
      if (!hS.has(tid)) {
        process.stderr.write(`[gate0.3] [${tid}] A single-critic …\n`);
        const a = await singleCritic(tid);
        out.single.push({ tid, question: THREADS[tid], claim: a.claim, title: a.title, body: a.body, cites: a.cites, verify: verifyCites(a.cites) }); save();
      }
      let b0 = out.board_pre.find((x) => x.tid === tid);
      if (!hPre.has(tid)) {
        const b = await boardExtractive(tid);
        b0 = { tid, question: THREADS[tid], panel: b.panel, posts: b.posts, synthesizedBy: b.synthesizedBy,
          type: b.type, title: b.title, claim: b.claim, body: b.body, cites: b.cites,
          verify: verifyCites(b.cites), extractive: extractiveCheck(b.cites, b.postsText) };
        out.board_pre.push(b0); save();
      }
      if (!hPost.has(tid)) {
        const pre = { claim: b0.claim, body: b0.body, cites: b0.cites };
        process.stderr.write(`[gate0.3] [${tid}] H3 falsifier auditing the board finding …\n`);
        const fal = await falsify(tid, pre);
        const counts = fal.verdicts.reduce((a, v) => (a[v.verdict] = (a[v.verdict] || 0) + 1, a), {});
        process.stderr.write(`[gate0.3] [${tid}]   verdicts: ${JSON.stringify(counts)}\n`);
        process.stderr.write(`[gate0.3] [${tid}] H6 revision by ${b0.synthesizedBy} …\n`);
        const post = await revise(tid, b0.synthesizedBy, pre, fal);
        out.board_post.push({ tid, question: THREADS[tid], synthesizedBy: b0.synthesizedBy,
          falsifier: { verdicts: fal.verdicts, counts, raw: fal.raw },
          type: post.type, title: post.title, claim: post.claim, body: post.body, cites: post.cites,
          verify: verifyCites(post.cites) }); save();
      }
    } catch (e) {
      process.stderr.write(`[gate0.3] [${tid}] FAILED after retries: ${e && e.message || e} — skipping, will resume on next run\n`);
    }
  }
  process.stderr.write(`[gate0.3] done. ${out.single.length} single, ${out.board_pre.length} board_pre, ${out.board_post.length} board_post.\n`);
}
main().catch((e) => { process.stderr.write('[gate0.3] FAILED: ' + (e && e.stack || e) + '\n'); process.exit(1); });
