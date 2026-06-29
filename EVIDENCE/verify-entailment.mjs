#!/usr/bin/env node
/* verify-entailment.mjs — Gate 0's one bankable result, extracted from the board path.
 *
 * THE KEEPER. Across Gate 0 → 0.4, a multi-resident board never reliably beat a single
 * strong critic at finding_precision (board_lift: -0.33, -0.25, +0.125, 0.0, 0.0). The
 * ONE component that helped every time it ran was H3 — a stance-free *entailment* audit:
 * "does this source line ENTAIL this claim?", not merely "does a quoted string exist?".
 * It repaired findings +0.125–0.25 wherever applied. H3 is NOT a board feature — it audits
 * any draft. This module promotes it to a first-class, corpus-agnostic pipeline stage that
 * runs on whatever produces a finding (today, the soloist).
 *
 *   falsify  (H3) — for each material claim, emit ENTAILED | NOT_ENTAILED | HEDGE_UNWARRANTED
 *   revise   (H6) — drop NOT_ENTAILED claims, COMMIT on HEDGE_UNWARRANTED, keep ENTAILED
 *
 * Caveat carried from the gates: every agent ran on ONE model (claude-sonnet-4-6) via one
 * harness. This stage is a verification pass over a single producer; it is NOT a verdict on
 * heterogeneous multi-agent. Adjudication of precision stays HUMAN/Claude, against source.
 *
 * Pure, dependency-injected. The caller supplies `call(system,user)` (the harness) and
 * `buildSrc(query)` (a windowed source block). No corpus is hard-coded here.
 */

// ---------- source utilities (parameterized; no hard-coded corpus) ----------
export const DEFAULT_STOP = new Set(
  'the a an of to is are in on for and or but with this that it as be by at from into via not no you your we they their our its if then so just like does do done can could would should how what when which who why one two real really make sure same different separate kind ever never always only'.split(
    ' ',
  ),
);
export const makeTerms = (stop = DEFAULT_STOP) => (s) =>
  (String(s || '').toLowerCase().match(/[a-z][a-z0-9+_-]{2,}/g) || []).filter((w) => !stop.has(w));
export const terms = makeTerms();
export const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[`"""'']/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// relevance-windowed source (the Gate 0.3 p3 truncation fix). Keep the HEAD comment (where a
// cross-file relationship is usually stated) AND a ±win window around every query-term hit, so
// a decisive line is never truncated out of the prompt.
export function windowed(text, query, { cap = 3200, headLines = 12, win = 6, fnTerms = terms } = {}) {
  if (text.length <= cap) return text;
  const lines = text.split('\n');
  const q = new Set(fnTerms(query));
  const keep = new Array(lines.length).fill(false);
  for (let i = 0; i < headLines && i < lines.length; i++) keep[i] = true; // head comment
  lines.forEach((ln, i) => {
    const lt = fnTerms(ln);
    if (lt.some((t) => q.has(t)))
      for (let j = Math.max(0, i - win); j <= Math.min(lines.length - 1, i + win); j++) keep[j] = true;
  });
  let out = [],
    used = 0,
    prevKept = true;
  for (let i = 0; i < lines.length; i++) {
    if (keep[i]) {
      if (!prevKept) out.push('    …[elided]…');
      if (used + lines[i].length + 1 > cap) {
        out.push('    …[truncated — budget]');
        break;
      }
      out.push(lines[i]);
      used += lines[i].length + 1;
      prevKept = true;
    } else prevKept = false;
  }
  return out.join('\n');
}

// REGRESSION GUARD (Gate 0.4 acceptance bar): every query-term that occurs anywhere in `text`
// MUST survive into the windowed view. If a ground-truth term is truncated out, the window is
// broken and a fabrication is being invited. Returns the list of dropped terms ([] == healthy).
export function droppedTerms(text, query, opts = {}) {
  const view = windowed(text, query, opts);
  const fnTerms = opts.fnTerms || terms;
  const present = new Set(fnTerms(text));
  const kept = new Set(fnTerms(view));
  return [...new Set(fnTerms(query))].filter((t) => present.has(t) && !kept.has(t));
}

export function sourceBlock(chunks, query, { sourceNoun = 'the source', ...winOpts } = {}) {
  if (!chunks.length) return '';
  return (
    `\n\nSOURCE — ${sourceNoun} (quote real lines, name the file; do NOT invent behavior). NOTE: many answers need TWO files — read across them:\n` +
    chunks
      .map((c) => `--- ${c.path} (${c.note || ''}) ---\n${windowed(c.text, query, winOpts)}`)
      .join('\n\n')
  );
}

// ---------- finding parse + literal-citation check ----------
export function parseFinding(raw) {
  const grab = (label) => {
    const m = raw.match(new RegExp('^' + label + ':\\s*(.+?)\\s*$', 'mi'));
    return m ? m[1].trim() : '';
  };
  const bodyM = raw.match(/^BODY:\s*([\s\S]*?)(?=^CITES:|\Z)/mi);
  const citesM = raw.match(/^CITES:\s*([\s\S]*)$/mi);
  const cites = [];
  if (citesM) {
    for (const line of citesM[1].split('\n')) {
      const m = line.match(/^[\s\-*]*([\w./-]+\.(?:mjs|md|js|ts|json))\s*::\s*"?([\s\S]+?)"?\s*$/);
      if (m && m[2].trim().length >= 8) cites.push({ file: m[1].trim(), quote: m[2].trim() });
    }
  }
  return {
    type: grab('TYPE') || 'finding',
    title: grab('TITLE'),
    claim: grab('CLAIM'),
    body: bodyM ? bodyM[1].trim() : raw,
    cites,
    raw,
  };
}
export function verifyCites(cites, { corpusByPath, fileset }) {
  const checked = cites.map((c) => {
    const src = corpusByPath[c.file];
    const inCorpus = fileset.has(c.file);
    const verified = !!src && norm(src).includes(norm(c.quote));
    return {
      ...c,
      inCorpus,
      verified,
      reason: !inCorpus ? 'file not in corpus' : verified ? 'literal match' : 'quote not found in file',
    };
  });
  const total = checked.length;
  const verified = checked.filter((c) => c.verified).length;
  const distinctFiles = [...new Set(checked.map((c) => c.file))];
  return {
    checked,
    total,
    verified,
    verify_rate: total ? +(verified / total).toFixed(3) : 0,
    grounded: total > 0 && verified > 0 && verified === total,
    distinct_files: distinctFiles,
    distinct_file_count: distinctFiles.length,
  };
}

// ---------- deterministic, model-free entailment (the non-circular signal) ----------
// The critic's upgrade: where an entailment check reduces to a STATIC, grep-able fact about the
// source, decide it WITHOUT a model in the loop. This closes the Claude-grades-Claude circularity
// exactly on the claims where closing it matters most, and reserves model-judged entailment for
// the genuinely interpretive claims. Mechanical verdicts are AUTHORITATIVE and override the model.
//
// Soundness discipline: a mechanical check emits a verdict ONLY in the direction it can prove
// completely from file text. Imports are complete (grep over the whole file sees every import),
// so BOTH directions are sound. A literal-default check can only PROVE absence (a real
// falsification), never that a present token is actually the default — so it stays silent on
// presence and lets the model judge. Anything it cannot decide soundly, it leaves to falsify().
const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const moduleBase = (f) => String(f).replace(/.*\//, '').replace(/\.(?:mjs|js|ts)$/, '');

// Does `text` import the module named by `targetFile` (by path basename)? Covers
// `import … from '…/norm.mjs'`, `import('…/norm.mjs')`, and `require('…/norm.mjs')`.
export function fileImports(text, targetFile) {
  const base = escapeRe(moduleBase(targetFile));
  const re = new RegExp(
    `(?:import\\b[^\\n;]*?\\bfrom|\\brequire\\s*\\(|\\bimport\\s*\\()\\s*['"][^'"]*\\b${base}(?:\\.(?:mjs|js|ts))?['"]`,
    'm',
  );
  return re.test(String(text));
}

// Does `text` contain a CALL SITE of `fnName` (excluding its own definition)? Conservative:
// skips `function name(` / `class name(`; an arrow/const-assigned def `const name = (` does not
// match `name(` at all. Residual limitation: a class/object METHOD definition `name(args){…}`
// can read as a call — noted; acceptable for the supervise/escalate-style claims this targets.
export function fileCalls(text, fnName) {
  const t = String(text);
  const re = new RegExp(`\\b${escapeRe(fnName)}\\s*\\(`, 'g');
  let m;
  while ((m = re.exec(t))) {
    const before = t.slice(Math.max(0, m.index - 24), m.index);
    if (/\b(?:function|class)\s+$/.test(before)) continue; // a definition, not a call
    return true;
  }
  return false;
}

// split into clauses on newlines, semicolons, and SENTENCE periods — a period is only a boundary
// when followed by whitespace or end-of-string, so filename dots (supervise.mjs) stay intact.
const _CLAUSES = (text) =>
  String(text || '')
    .split(/[\n;]+|\.(?=\s|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
const _NEG = /\b(?:never|not|no longer|does ?n['’]?t|do ?n['’]?t|cannot|can ?not|without|nor|none)\b/i;
const _FILES = (s) => [...new Set((s.match(/[A-Za-z][\w-]*\.(?:mjs|js|ts)/g) || []))];

// Pull grep-able structural assertions out of a finding's prose. Conservative: only patterns that
// map cleanly to a static fact are emitted; everything else falls through to the model.
export function extractMechanicalClaims(text) {
  const out = [];
  const seen = new Set();
  const push = (a) => {
    const k = `${a.kind}|${a.subject || ''}|${a.object}|${a.polarity}`;
    if (!seen.has(k)) (seen.add(k), out.push(a));
  };
  for (const cl of _CLAUSES(text)) {
    const neg = _NEG.test(cl);
    const files = _FILES(cl);
    if (/\bimports?\b|\bimporting\b/i.test(cl) && files.length >= 2) {
      push({ kind: 'import', subject: files[0], object: files[1], polarity: !neg, span: cl });
    }
    if (/\bcalls?\b|\binvok\w*\b|\bcalling\b/i.test(cl) && files.length >= 1) {
      const fnM = cl.match(/\b([A-Za-z_]\w*)\s*\(\s*\)/) || cl.match(/\b(?:calls?|invokes?)\s+(?:the\s+)?`?([A-Za-z_]\w*)`?/i);
      if (fnM) push({ kind: 'call', subject: files[0], object: fnM[1], polarity: !neg, span: cl });
    }
    const defM = cl.match(/\bdefaults?\s+to\s+`?([A-Za-z_][\w-]*)`?/i) || cl.match(/\bdefault\b[^.]*?\bis\s+`?([A-Za-z_][\w-]*)`?/i);
    if (defM && files.length >= 1) push({ kind: 'default', subject: files[0], object: defM[1], polarity: !neg, span: cl });
  }
  return out;
}

// Decide the extracted assertions deterministically against the real corpus text.
// Returns verdict objects shaped like the model's, tagged source:'mechanical'.
export function mechanicalChecks(findingText, { corpusByPath } = {}) {
  if (!corpusByPath) return [];
  const results = [];
  for (const a of extractMechanicalClaims(findingText)) {
    const src = corpusByPath[a.subject];
    if (!src) continue; // subject file not in corpus — cannot decide; leave to the model
    if (a.kind === 'import') {
      const has = fileImports(src, a.object);
      const ok = has === a.polarity;
      results.push({
        verdict: ok ? 'ENTAILED' : 'NOT_ENTAILED',
        claim: a.span,
        evidence: `[mechanical] ${a.subject} ${has ? 'DOES' : 'does NOT'} import ${a.object} (grep over full file)`,
        source: 'mechanical',
        assertion: a,
      });
    } else if (a.kind === 'call') {
      const has = fileCalls(src, a.object);
      const ok = has === a.polarity;
      results.push({
        verdict: ok ? 'ENTAILED' : 'NOT_ENTAILED',
        claim: a.span,
        evidence: `[mechanical] ${a.subject} ${has ? 'has a call site for' : 'never calls'} ${a.object}() (grep, def excluded)`,
        source: 'mechanical',
        assertion: a,
      });
    } else if (a.kind === 'default') {
      // sound only in the ABSENCE direction: if the literal token is nowhere in the file, a
      // "defaults to <token>" claim is falsified. Presence does NOT prove default → stay silent.
      const present = new RegExp(`\\b${escapeRe(a.object)}\\b`).test(src);
      if (!present && a.polarity) {
        results.push({
          verdict: 'NOT_ENTAILED',
          claim: a.span,
          evidence: `[mechanical] token "${a.object}" does not occur in ${a.subject} (grep) — cannot be its default`,
          source: 'mechanical',
          assertion: a,
        });
      }
    }
  }
  return results;
}

// Merge mechanical verdicts over model verdicts: a mechanical NOT_ENTAILED suppresses any model
// ENTAILED that names the same object token, and mechanical verdicts are prepended as the
// authoritative record. Object tokens are matched on the module/function base name.
export function mechanicalMerge(modelVerdicts, mech) {
  if (!mech || !mech.length) return modelVerdicts;
  const refuted = mech
    .filter((m) => m.verdict === 'NOT_ENTAILED')
    .map((m) => moduleBase(m.assertion.object).toLowerCase());
  const kept = modelVerdicts.filter((v) => {
    if (v.verdict !== 'ENTAILED') return true;
    const t = String(v.claim).toLowerCase();
    return !refuted.some((o) => o && t.includes(o));
  });
  return [
    ...mech.map((m) => ({ verdict: m.verdict, claim: m.claim, evidence: m.evidence, source: 'mechanical' })),
    ...kept,
  ];
}

// ---------- prompts (faithful to the Gate 0.2/0.4 H3+H6 producers — see calibration note) ----------
export const FINDING_FMT = `
FORMAT — reply with EXACTLY these labels, each starting its own line (literal labels + colon, NOT markdown headers):
TYPE: finding
TITLE: <one specific, claim-like line>
CLAIM: <one sentence — the defensible takeaway; COMMIT, do not hedge into multiple options>
BODY: <evidence + reasoning, a few tight paragraphs, grounded in named files. If the answer depends on TWO files relating to each other, say so and quote BOTH.>
CITES: <one or more lines, EACH formatted exactly as>  <file> :: "<verbatim quote copied character-for-character from that file>"
  - EVERY material claim in BODY must be backed by at least one CITES line whose quote you copied LITERALLY from the source shown.
  - If you cannot find a literal quote for a claim, DROP the claim. Do NOT paraphrase a quote. Do NOT cite a file not shown above.
  - If the source genuinely does not settle the question, say so plainly in CLAIM — an honest "the source does not settle X" is better than a confident guess.`;

export const VERDICT_FMT = `
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
- Be adversarial and literal. If this is a CROSS-FILE question: check whether the claimed RELATIONSHIP between two
  files is actually stated/entailed, not just that each file exists. Default to NOT_ENTAILED if you cannot find a
  line that truly entails the claim. Do NOT be charitable.`;

// ---------- the verifier (H3 falsify → H6 commit-revision) ----------
// deps: { call(system,user), buildSrc(query)->string, domain, corpusByPath? }
// If `corpusByPath` (path -> file text) is supplied, every claim that reduces to a static
// grep-able fact is decided DETERMINISTICALLY (no model) and overrides the model verdict.
export function createVerifier({ call, buildSrc, domain, corpusByPath }) {
  async function falsify(question, finding) {
    const src = buildSrc(`${question} ${finding.claim} ${finding.body}`);
    const sys = `you are a meticulous, adversarial code/spec reader auditing a finding about ${domain}.${VERDICT_FMT}${src}`;
    const usr = `question under study: "${question}".\n\nFINDING TO BREAK:\nCLAIM: ${finding.claim}\nBODY: ${finding.body}\nCITES:\n${finding.cites
      .map((c) => `  ${c.file} :: "${c.quote}"`)
      .join('\n')}\n\nTry to break each material claim against the real source. Emit VERDICT lines only.`;
    const raw = await call(sys, usr);
    const modelVerdicts = [];
    for (const line of raw.split('\n')) {
      const m = line.match(
        /^[\s\-*]*VERDICT:\s*(ENTAILED|NOT_ENTAILED|HEDGE_UNWARRANTED)\s*::\s*([\s\S]+?)\s*::\s*([\s\S]+?)\s*$/i,
      );
      if (m) modelVerdicts.push({ verdict: m[1].toUpperCase(), claim: m[2].trim(), evidence: m[3].trim(), source: 'model' });
    }
    // deterministic, model-free layer (the non-circular signal) — authoritative where it fires
    const findingText = `${finding.claim}\n${finding.body}\n${finding.cites.map((c) => `${c.file} :: ${c.quote}`).join('\n')}`;
    const mechanical = mechanicalChecks(findingText, { corpusByPath });
    const verdicts = mechanicalMerge(modelVerdicts, mechanical);
    const counts = verdicts.reduce((a, v) => ((a[v.verdict] = (a[v.verdict] || 0) + 1), a), {});
    return { raw, verdicts, modelVerdicts, mechanical, counts };
  }

  async function revise(question, finding, falsifier, { authorName = 'the reviewer' } = {}) {
    const src = buildSrc(`${question} ${finding.claim}`);
    const vlines =
      falsifier.verdicts
        .map((v) => `- [${v.verdict}] ${v.claim}  (auditor: ${v.evidence})`)
        .join('\n') || '(auditor returned no parseable verdicts — keep only what you can ground)';
    const sys = `you are ${authorName}, finalizing a standing FINDING about ${domain} AFTER an independent adversarial auditor checked every claim against source.
HARD RULES:
- DROP every claim the auditor marked NOT_ENTAILED — it is an overclaim or misread; do not restate it, even softened.
- Where the auditor marked HEDGE_UNWARRANTED, the source SETTLES the question: you MUST now COMMIT to that answer. Do NOT write "unclear", "cannot be determined", or "not implicated" about a point the auditor grounded.
- Keep only ENTAILED claims and the now-committed points. Every surviving claim still needs a literal CITES quote.
- Commit to ONE defensible answer. Calibrated commitment is rewarded; both overclaiming and unwarranted hedging are failures. But if the source truly does not settle a sub-point, an honest "the source does not settle X" is correct — do not fabricate.${FINDING_FMT}${src}`;
    const usr = `question to settle: "${question}".\n\nyour pre-audit finding:\nCLAIM: ${finding.claim}\nBODY: ${finding.body}\n\nthe auditor's per-claim verdicts:\n${vlines}\n\nemit the FINAL revised finding, obeying the hard rules.`;
    return parseFinding(await call(sys, usr));
  }

  // run the full stage on one finding. returns { pre, falsifier, post, revised }.
  // COST: falsify is +1 call (the audit). revise is +1 MORE call (the repair) — but it only
  // earns its keep when the audit actually FLAGGED something. So by default we SKIP revise when
  // the falsifier returns no NOT_ENTAILED and no HEDGE_UNWARRANTED: a clean finding costs 2×
  // (soloist + audit), a flagged finding costs 3× (soloist + audit + repair). Pass
  // { alwaysRevise: true } to force the repair call (e.g. to reproduce a 3×-everywhere run).
  async function verify(question, finding, opts = {}) {
    const { alwaysRevise = false, ...rev } = opts;
    const falsifier = await falsify(question, finding);
    const flagged = (falsifier.counts.NOT_ENTAILED || 0) + (falsifier.counts.HEDGE_UNWARRANTED || 0) > 0;
    if (!flagged && !alwaysRevise) return { pre: finding, falsifier, post: finding, revised: false };
    const post = await revise(question, finding, falsifier, rev);
    return { pre: finding, falsifier, post, revised: true };
  }

  return { falsify, revise, verify };
}
