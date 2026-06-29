#!/usr/bin/env node
/* Gate 0.4 — is the board's edge COVERAGE + CALIBRATION (not raw precision)?
 *
 * After 2 corpora, board_lift(precision) is +0.125 (box-and-box, Gate 0.2) then 0.0 (PULSE,
 * Gate 0.3) — a tie that does NOT generalize. But Gate 0.3 surfaced TWO things the precision
 * metric and the thread design could not see, and that NO gate has yet actually tested:
 *
 *   H4 (untested) — the board's ONLY theory of advantage is COVERAGE/DECOMPOSITION. Its single
 *     win ever (Gate 0's b1) was surfacing a rung the soloist FLATTENED. Gate 0.3's p1/p2/p4
 *     saturated at 1.0 precisely because they were SINGLE-FILE lookups a soloist needs no help
 *     with. No gate has put the board on a thread that STRUCTURALLY REQUIRES cross-file synthesis.
 *   CALIBRATION (unmeasured) — on Gate 0.3's p3 the soloist FABRICATED confidently while board+H3
 *     ABSTAINED honestly; precision scored both 0.5 (a tie), but for "findings that survive human
 *     review" a confident fabrication is far costlier than an honest "insufficient evidence." This
 *     is the original H6 ("reward calibrated abstention"), never scored as designed.
 *
 * Gate 0.4 tests BOTH, and fixes the confound that broke p3:
 *   · CORPUS = box-and-box @353d1679 — the layered 8-rung kernel where coverage SHOULD matter
 *     (a bridge composing rungs that live in separate files).
 *   · CROSS-FILE THREADS (c1–c4) — each thread's ground truth is STATED in one file's comment but
 *     the MECHANISM lives in another, so a soloist reading only the top-relevance file misses half.
 *   · COVERAGE PANEL (H4) — the board is decompositional: one resident OWNS each rung/file and must
 *     answer "is my rung implicated? quote a line, or say 'not implicated'." Finding = UNION of
 *     grounded per-rung observations, NOT a debate-to-consensus.
 *   · WINDOWED SOURCE (the p3 fix) — relevance-windowed extraction keeps the file's HEAD comment
 *     (where the cross-file relationship is stated) AND a ±W window around every query-term hit, so
 *     the decisive line is never truncated out the way t05's body was in Gate 0.3.
 *
 * Arms (same local `claude` harness, $0; 7 calls/thread × 4 = 28 serialized):
 *   single      — ARM A: single strong critic (control), grounded + CITES               [1 call]
 *   board_pre   — ARM B': coverage panel (one resident/rung) → EXTRACTIVE UNION synthesis [3+1 calls]
 *   board_post  — ARM B'': board_pre → H3 falsifier → H6 commit-revision                  [1+1 calls]
 *
 * The harness MECHANICALLY measures verify_rate, DISTINCT-FILES-CITED (a coverage proxy for H4),
 * and an ABSTENTION flag (a calibration proxy). It does NOT decide precision/calibration — those
 * stay hand-adjudicated against source (adjudicator = Claude, the largest error source) in
 * gate0_4.md, exactly as in prior gates.
 *
 * Output: gate0_4.transcript.json (resumable; per-thread try/catch is non-fatal).
 * Usage:  node EVIDENCE/gate0_4.mjs                       (proxy on :8788)
 *         GATE0_THREADS=c1,c3 node EVIDENCE/gate0_4.mjs   (subset)
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const PROXY = process.env.GATE0_PROXY || 'http://localhost:8788/';
const REPO = 'c-u-l8er/AmpersandBoxDesign';
const REF = '353d1679a799bd4b6f0bea0dc126ddbe085462cc';
const PREFIX = 'box-and-box/';
const RAW = `https://raw.githubusercontent.com/${REPO}/${REF}/${PREFIX}`;
const DOMAIN = 'the box-and-box project — the [&] Protocol governance kernel: an eight-rung modality ladder (alethic → axiological → deontic → temporal → reflexive → epistemic → strategic → resource) tied by one bridge that runs feasible ▸ permitted ▸ best over an un-weakenable safety floor, with ~116 property-tested laws. The rungs live in SEPARATE files and the bridge/govern compose them — so many questions can only be settled by reading TWO OR MORE files together';
const SOURCE_NOUN = 'the box-and-box kernel (bridge.mjs, govern.mjs, supervise.mjs, value.mjs, score.mjs, reflexive.mjs)';

const FILES = [
  { path: 'README.md',     note: 'governance kernel overview + the eight-rung ladder map' },
  { path: 'bridge.mjs',    note: 'the composing bridge: floor-then-gradient, 0̲ annihilation; "no heuristic utility, however large, can resurrect a vetoed option"' },
  { path: 'value.mjs',     note: 'rung 1 alethic: V0/combine/chain; consume() is THE alethic floor (the boolean correctness gate)' },
  { path: 'score.mjs',     note: 'rung 2 axiological: the semiring gradient (tropical/probability/log); 0̲ annihilates ⊗ — the root of the veto' },
  { path: 'govern.mjs',    note: 'rung 3 deontic: alethic ▸ deontic ▸ axiological; FORBIDDEN is overridable (a norm, not a wall); OBLIGATORY&feasible is FORCED; obligatory-but-infeasible ⇒ contrary-to-duty ESCALATION' },
  { path: 'supervise.mjs', note: 'rung 4 temporal: SAFETY extends the alethic floor across time (a shield); LIVENESS extends the deontic OUGHT across time — "the same contrary-to-duty escalation as a 1-step deontic obligation"' },
  { path: 'reflexive.mjs', note: 'rung 5 reflexive: admissibility + ENTRENCHMENT — self-modification can strengthen but never weaken the entrenched core' },
  { path: 'norm.mjs',      note: 'the deontic norm machinery: adjudicateStatus/resolve/escalate/STATUS used by govern' },
  { path: 'index.mjs',     note: 'the ladder map' },
];
const FILESET = new Set(FILES.map((f) => f.path));

// CROSS-FILE threads — each requires >=2 files; the relationship is STATED in one file's comment
// but the MECHANISM lives in another. A soloist reading only the top-relevance file misses half.
const THREADS = {
  c1: 'Is the temporal LIVENESS escalation in supervise.mjs a DIFFERENT mechanism from govern.mjs\'s contrary-to-duty obligation escalation, or the SAME one generalized over a trajectory?',
  c2: 'Does the temporal SAFETY shield (supervise.mjs guard/residualOf) enforce the SAME alethic floor as consume()/the bridge, or a SEPARATE check — and is it the same code path?',
  c3: 'When an option is excluded, is the bridge\'s 0̲ annihilation (alethic veto) the SAME KIND of exclusion as govern\'s deonticallyVetoed (forbidden by a norm), or are they categorically different?',
  c4: 'Can a higher axiological score (the score.mjs gradient) ever override an OBLIGATORY-and-feasible option in govern, the way it can never override the alethic floor?',
};

// RUNG-OWNER personas — a COVERAGE panel (H4). Each owns a rung/file and answers "is my rung
// implicated? quote a line, or say it is NOT implicated." NOT a debate-to-consensus.
const P = {
  alethic:    { owns: 'value.mjs + bridge.mjs', stance: 'I own the ALETHIC floor — consume() and the bridge\'s 0̲ annihilation. A vetoed option is gone and no utility resurrects it. I report whether the floor is implicated and quote the exact gate line, or I say the floor is not implicated.', voice: 'absolutist about the floor; quotes consume()/the 0̲ law' },
  deontic:    { owns: 'govern.mjs + norm.mjs', stance: 'I own the DEONTIC layer — norms over the survivors. FORBIDDEN is overridable (a norm, not a wall); OBLIGATORY&feasible is FORCED; obligatory-but-infeasible escalates. I quote the govern/norm line that bears on the question, or say deontic is not implicated.', voice: 'precise about permission vs possibility; quotes govern.mjs' },
  temporal:   { owns: 'supervise.mjs + temporal.mjs', stance: 'I own the TEMPORAL rung — SAFETY extends the alethic floor across time (a shield), LIVENESS extends the deontic ought across time. I quote the supervise.mjs line that says how my rung relates to the others, or say temporal is not implicated.', voice: 'thinks in trajectories; quotes the supervise.mjs head comment + guard/residualOf' },
  axiological:{ owns: 'score.mjs', stance: 'I own the AXIOLOGICAL gradient — the semiring that ranks survivors. I rank, I do not gate. I quote the score.mjs line about what the gradient does (and does NOT) decide, or honestly say the gradient is not implicated in this question.', voice: 'pragmatic optimizer; careful that ranking is not gating' },
  reflexive:  { owns: 'reflexive.mjs', stance: 'I own the REFLEXIVE rung — entrenchment and admissibility of self-revision. I quote the reflexive.mjs line if entrenchment/amendment bears on the question, or honestly say reflexive is not implicated.', voice: 'constitutional; suspicious of unconstrained self-modification' },
};
// 3 owners per thread: the implicated rungs + one LIKELY-NOT-IMPLICATED control (tests honest "not my rung")
const PANEL = {
  c1: ['temporal', 'deontic', 'axiological'],   // axiological = the not-implicated control (escalation is not ranking)
  c2: ['temporal', 'alethic', 'reflexive'],     // reflexive = control
  c3: ['alethic', 'deontic', 'axiological'],     // axiological = control
  c4: ['deontic', 'axiological', 'alethic'],     // all three genuinely implicated (floor contrast)
};

const STOP = new Set('the a an of to is are in on for and or but with this that it as be by at from into via not no you your we they their our its if then so just like does do done can could would should how what when which who why one two real really make sure same different separate kind ever never always only'.split(' '));
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

const SRC_K = Number(process.env.GATE0_SRC_K || 5);   // more files in-window (cross-file threads)
const SRC_CAP = Number(process.env.GATE0_SRC_CAP || 3200);
const HEAD_LINES = Number(process.env.GATE0_HEAD_LINES || 12); // always keep the file's head comment
const WIN = Number(process.env.GATE0_WIN || 6);               // ± lines around each query hit

// --- the p3 FIX: relevance-windowed source. Keep the HEAD comment (where the cross-file
//     relationship is stated) AND a ±WIN window around every query-term hit, so the decisive
//     line is never truncated out the way t05KappaRouting()'s body was in Gate 0.3. ---
function windowed(text, query, cap = SRC_CAP) {
  if (text.length <= cap) return text;
  const lines = text.split('\n');
  const q = new Set(terms(query));
  const keep = new Array(lines.length).fill(false);
  for (let i = 0; i < HEAD_LINES && i < lines.length; i++) keep[i] = true; // head comment
  lines.forEach((ln, i) => {
    const lt = terms(ln);
    if (lt.some((t) => q.has(t))) for (let j = Math.max(0, i - WIN); j <= Math.min(lines.length - 1, i + WIN); j++) keep[j] = true;
  });
  // assemble kept ranges within budget, marking elisions
  let out = [], used = 0, prevKept = true;
  for (let i = 0; i < lines.length; i++) {
    if (keep[i]) {
      if (!prevKept) out.push('    …[elided]…');
      if (used + lines[i].length + 1 > cap) { out.push('    …[truncated — budget]'); break; }
      out.push(lines[i]); used += lines[i].length + 1; prevKept = true;
    } else prevKept = false;
  }
  return out.join('\n');
}
function sourceBlock(chunks, query, cap = SRC_CAP) {
  if (!chunks.length) return '';
  return `\n\nSOURCE — ${SOURCE_NOUN} (quote real lines, name the file; do NOT invent behavior). NOTE: many answers need TWO files — read across them:\n` +
    chunks.map((c) => `--- ${c.path} (${c.note}) [live @ ${REPO}@${REF}] ---\n${windowed(c.text, query, cap)}`).join('\n\n');
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
    catch (e) { lastErr = e; process.stderr.write(`[gate0.4]   attempt ${i + 1}/${ATTEMPTS} failed: ${e && e.message || e}\n`);
      await new Promise((r) => setTimeout(r, 2000 * (i + 1))); }
  }
  throw lastErr;
}

const FINDING_FMT = `
FORMAT — reply with EXACTLY these labels, each starting its own line (literal labels + colon, NOT markdown headers):
TYPE: finding
TITLE: <one specific, claim-like line>
CLAIM: <one sentence — the defensible takeaway; COMMIT, do not hedge into multiple options>
BODY: <evidence + reasoning, a few tight paragraphs, grounded in named files. If the answer depends on TWO files relating to each other, say so and quote BOTH.>
CITES: <one or more lines, EACH formatted exactly as>  <file> :: "<verbatim quote copied character-for-character from that file>"
  - EVERY material claim in BODY must be backed by at least one CITES line whose quote you copied LITERALLY from the source shown.
  - If you cannot find a literal quote for a claim, DROP the claim. Do NOT paraphrase a quote. Do NOT cite a file not shown above.
  - If the source genuinely does not settle the question, say so plainly in CLAIM — an honest "the source does not settle X" is better than a confident guess.`;

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
  const distinctFiles = [...new Set(checked.map((c) => c.file))];
  return { checked, total, verified, verify_rate: total ? +(verified / total).toFixed(3) : 0,
    grounded: total > 0 && verified > 0 && verified === total,
    distinct_files: distinctFiles, distinct_file_count: distinctFiles.length }; // COVERAGE proxy (H4)
}
// CALIBRATION proxy — does the finding honestly flag where the source does not settle it?
const ABSTAIN_RE = /\b(not implicated|does not settle|cannot be (?:established|determined)|insufficient|unclear|no(?:t)? (?:enough )?(?:evidence|basis)|not shown|underdetermined|does not specify)\b/i;
function abstentionFlag(finding) {
  return ABSTAIN_RE.test(finding.claim + ' ' + finding.body);
}
function extractiveCheck(cites, postsText) {
  const pt = norm(postsText);
  const fromPosts = cites.map((c) => ({ ...c, inPosts: pt.includes(norm(c.quote)) }));
  const n = fromPosts.length, k = fromPosts.filter((c) => c.inPosts).length;
  return { fromPosts, in_posts_rate: n ? +(k / n).toFixed(3) : 0 };
}

const idOf = (name) => `you are ${name}, a rung-owner on the box-and-box governance kernel team. you OWN ${P[name].owns}. ${P[name].stance}\nvoice: ${P[name].voice}. `;

// COVERAGE post — each owner reports whether THEIR rung is implicated, grounded or "not implicated"
async function coveragePost(name, tid, ctx) {
  const src = sourceBlock(relevant(THREADS[tid] + ' ' + ctx + ' ' + P[name].owns, 3), THREADS[tid], 2400);
  const sys = `${idOf(name)}\nwrite ONE short report. lowercase, casual forum voice, no greeting, no sign-off, no name prefix.\n- your job is COVERAGE, not consensus: report whether YOUR rung (${P[name].owns}) bears on the question. if it does, QUOTE the exact line from your file VERBATIM and say how it relates to the OTHER rung named in the question. if your rung is genuinely NOT implicated, say "my rung is not implicated here" and stop — do NOT invent relevance.\n- do not relitigate another owner's rung; own yours.${src}`;
  const usr = `question: "${THREADS[tid]}".\n\nprior owner reports (oldest first):\n${ctx || '(you are first)'}\n\nreport on YOUR rung only: implicated (with a verbatim quote + how it relates to the other rung) or not implicated.`;
  return call(sys, usr);
}

// ARM A — single critic (control)
async function singleCritic(tid) {
  const src = sourceBlock(relevant(THREADS[tid], SRC_K), THREADS[tid]);
  const sys = `you are a single, strong, careful technical reviewer of ${DOMAIN}.\nyou work ALONE — no committee. read the question and the source, reason to the MOST defensible conclusion, and emit one standing FINDING.\nmany questions here can only be settled by reading TWO files together (a rung file + the bridge/govern that composes it) — do not answer from one file if the answer lives across two.\nground EVERY claim in a verbatim quote; no hand-waving, no hedging into multiple options without committing.${FINDING_FMT}${src}`;
  const usr = `question to settle: "${THREADS[tid]}".\n\nproduce the single most defensible finding the source supports.`;
  return parseFinding(await call(sys, usr));
}

// ARM B' — coverage panel → EXTRACTIVE UNION synthesis (H1 + H2 + H4)
async function boardCoverage(tid) {
  const panel = PANEL[tid];
  let ctx = ''; const posts = [];
  for (const who of panel) {
    process.stderr.write(`[gate0.4] [${tid}] coverage · ${who} (owns ${P[who].owns}) …\n`);
    const body = await coveragePost(who, tid, ctx);
    posts.push({ who, body }); ctx += `${who} (owns ${P[who].owns}): ${body}\n\n`;
  }
  const synth = panel[0];
  process.stderr.write(`[gate0.4] [${tid}] EXTRACTIVE UNION synthesis · ${synth} …\n`);
  const src = sourceBlock(relevant(THREADS[tid] + ' ' + ctx, SRC_K), THREADS[tid]);
  const sys = `${idOf(synth)}\nthe rung-owners have each reported. SYNTHESIZE their reports into one standing FINDING by taking the UNION of the grounded per-rung observations.\nHARD RULES:\n- extractive: you may ONLY keep claims + quotes that ALREADY APPEARED in the reports below. rank, merge, drop — but do NOT introduce a new mechanism or a quote no owner posted.\n- this is a CROSS-FILE question: the answer is how the rungs RELATE. keep the grounded observation from EACH implicated rung and state the relationship between them.\n- if an owner honestly said their rung is "not implicated", do not manufacture relevance for it.${FINDING_FMT}${src}`;
  const usr = `question: "${THREADS[tid]}".\n\nthe rung-owner reports:\n${ctx}\n\nsynthesize the finding as the UNION of what the owners actually grounded — state how the implicated rungs relate.`;
  const finding = parseFinding(await call(sys, usr));
  return { panel, posts, synthesizedBy: synth, postsText: posts.map((p) => p.body).join('\n\n'), ...finding };
}

// ---- H3: stance-free FALSIFIER / entailment seat (unchanged from Gate 0.2/0.3) ----
const VERDICT_FMT = `
You are NOT a debater and you hold NO position. You are a FALSIFIER. Your only job is to try to BREAK the
finding below by reading the actual source. For EACH material claim in the finding, decide whether the source
ENTAILS it — not whether a quote merely exists, but whether the quoted line LOGICALLY SUPPORTS the claim.

Reply with one or more lines, EACH formatted EXACTLY as (literal '::' separators, one verdict per line):
VERDICT: <ENTAILED | NOT_ENTAILED | HEDGE_UNWARRANTED> :: <the claim fragment you are judging> :: <a VERBATIM source quote + file that proves your verdict, and one sentence why>

Rules:
- ENTAILED          — the source genuinely supports the claim. Quote the line that does.
- NOT_ENTAILED      — a cited quote is real BUT does not support the claim (an overclaim, a missed relationship
                      between two files, an invented behavior, or a coupling the code never makes). Quote the line that disproves it.
- HEDGE_UNWARRANTED — the finding hedged or called something "unclear / cannot be determined / not implicated",
                      but the in-corpus source actually SETTLES the question. Quote the settling line.
- Be adversarial and literal. This is a CROSS-FILE question: check whether the claimed RELATIONSHIP between two
  files is actually stated/entailed, not just that each file exists. Default to NOT_ENTAILED if you cannot find a
  line that truly entails the claim. Do NOT be charitable.`;

async function falsify(tid, finding) {
  const src = sourceBlock(relevant(THREADS[tid] + ' ' + finding.claim + ' ' + finding.body, SRC_K), THREADS[tid] + ' ' + finding.claim);
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

// ---- H6: revision — drop NOT_ENTAILED, COMMIT on HEDGE_UNWARRANTED (unchanged) ----
async function revise(tid, synthName, finding, falsifier) {
  const src = sourceBlock(relevant(THREADS[tid] + ' ' + finding.claim, Math.min(SRC_K, 4)), THREADS[tid] + ' ' + finding.claim, 2600);
  const vlines = falsifier.verdicts.map((v) => `- [${v.verdict}] ${v.claim}  (auditor: ${v.evidence})`).join('\n') || '(auditor returned no parseable verdicts — keep only what you can ground)';
  const sys = `you are ${synthName}, finalizing a standing FINDING about ${DOMAIN} AFTER an independent adversarial auditor checked every claim against source.
HARD RULES:
- DROP every claim the auditor marked NOT_ENTAILED — it is an overclaim or misread; do not restate it, even softened.
- Where the auditor marked HEDGE_UNWARRANTED, the source SETTLES the question: you MUST now COMMIT to that answer. Do NOT write "unclear", "cannot be determined", or "not implicated" about a point the auditor grounded.
- Keep only ENTAILED claims and the now-committed points. Every surviving claim still needs a literal CITES quote.
- This is a cross-file question: keep the grounded RELATIONSHIP between the rungs. Commit to ONE defensible answer. Calibrated commitment is rewarded; both overclaiming and unwarranted hedging are failures. But if the source truly does not settle a sub-point, an honest "the source does not settle X" is correct — do not fabricate.${FINDING_FMT}${src}`;
  const usr = `question to settle: "${THREADS[tid]}".\n\nyour pre-audit finding:\nCLAIM: ${finding.claim}\nBODY: ${finding.body}\n\nthe auditor's per-claim verdicts:\n${vlines}\n\nemit the FINAL revised finding, obeying the hard rules.`;
  return parseFinding(await call(sys, usr));
}

async function main() {
  const tids = (process.env.GATE0_THREADS ? process.env.GATE0_THREADS.split(',') : Object.keys(THREADS)).map((s) => s.trim());
  process.stderr.write(`[gate0.4] hydrating ${REPO}@${REF.slice(0, 7)} (${FILES.length} files) …\n`);
  await hydrate();
  process.stderr.write(`[gate0.4] ${CORPUS.length} files live. threads: ${tids.join(', ')}\n`);

  const outPath = new URL('./gate0_4.transcript.json', import.meta.url);
  let out = { meta: { repo: REPO, ref: REF, model_via_proxy: 'claude (harness)',
    corpus: 'box-and-box (the layered 8-rung kernel) — CROSS-FILE threads, where coverage should matter',
    design: 'tests H4 (coverage) + calibration. single critic (A) vs COVERAGE PANEL (one resident/rung) -> extractive UNION (B\') vs board+H3+H6 (B\'\'). cross-file threads c1-c4. windowed source (the Gate 0.3 p3 SRC_CAP fix).',
    arms: { A: 'single critic', "B'": 'coverage panel (rung-owners) -> extractive union (H1+H2+H4)', "B''": "B' -> H3 falsifier -> H6 commit-revision" },
    fixes: { src_truncation: 'relevance-windowed source: head comment + ±WIN around query hits (fixes Gate 0.3 p3 truncation)' },
    measures: { coverage: 'distinct_file_count per finding (H4 proxy)', calibration: 'abstention flag (does the finding honestly flag where source does not settle it)' },
    generated: new Date().toISOString(), threads: tids }, single: [], board_pre: [], board_post: [] };
  try {
    if (existsSync(outPath)) { const prev = JSON.parse(readFileSync(outPath, 'utf8'));
      if (prev.board_post) { out.single = prev.single || []; out.board_pre = prev.board_pre || []; out.board_post = prev.board_post; out.meta.resumedFrom = prev.meta?.generated; } }
  } catch (_) {}
  const have = (arr) => new Set(arr.map((f) => f.tid));
  const hS = have(out.single), hPre = have(out.board_pre), hPost = have(out.board_post);
  const save = () => writeFileSync(outPath, JSON.stringify(out, null, 2));

  for (const tid of tids) {
    if (hS.has(tid) && hPre.has(tid) && hPost.has(tid)) { process.stderr.write(`[gate0.4] [${tid}] done — skip\n`); continue; }
    try {
      if (!hS.has(tid)) {
        process.stderr.write(`[gate0.4] [${tid}] A single-critic …\n`);
        const a = await singleCritic(tid);
        out.single.push({ tid, question: THREADS[tid], claim: a.claim, title: a.title, body: a.body, cites: a.cites,
          verify: verifyCites(a.cites), abstains: abstentionFlag(a) }); save();
      }
      let b0 = out.board_pre.find((x) => x.tid === tid);
      if (!hPre.has(tid)) {
        const b = await boardCoverage(tid);
        b0 = { tid, question: THREADS[tid], panel: b.panel, posts: b.posts, synthesizedBy: b.synthesizedBy,
          type: b.type, title: b.title, claim: b.claim, body: b.body, cites: b.cites,
          verify: verifyCites(b.cites), extractive: extractiveCheck(b.cites, b.postsText), abstains: abstentionFlag(b) };
        out.board_pre.push(b0); save();
      }
      if (!hPost.has(tid)) {
        const pre = { claim: b0.claim, body: b0.body, cites: b0.cites };
        process.stderr.write(`[gate0.4] [${tid}] H3 falsifier auditing the board finding …\n`);
        const fal = await falsify(tid, pre);
        const counts = fal.verdicts.reduce((a, v) => (a[v.verdict] = (a[v.verdict] || 0) + 1, a), {});
        process.stderr.write(`[gate0.4] [${tid}]   verdicts: ${JSON.stringify(counts)}\n`);
        process.stderr.write(`[gate0.4] [${tid}] H6 revision by ${b0.synthesizedBy} …\n`);
        const post = await revise(tid, b0.synthesizedBy, pre, fal);
        out.board_post.push({ tid, question: THREADS[tid], synthesizedBy: b0.synthesizedBy,
          falsifier: { verdicts: fal.verdicts, counts, raw: fal.raw },
          type: post.type, title: post.title, claim: post.claim, body: post.body, cites: post.cites,
          verify: verifyCites(post.cites), abstains: abstentionFlag(post) }); save();
      }
    } catch (e) {
      process.stderr.write(`[gate0.4] [${tid}] FAILED after retries: ${e && e.message || e} — skipping, will resume on next run\n`);
    }
  }
  process.stderr.write(`[gate0.4] done. ${out.single.length} single, ${out.board_pre.length} board_pre, ${out.board_post.length} board_post.\n`);
}
main().catch((e) => { process.stderr.write('[gate0.4] FAILED: ' + (e && e.stack || e) + '\n'); process.exit(1); });
