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

// ---------- prompts (faithful to the validated Gate 0.2/0.4 H3+H6) ----------
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
// deps: { call(system,user), buildSrc(query)->string, domain, srcLabel? }
export function createVerifier({ call, buildSrc, domain }) {
  async function falsify(question, finding) {
    const src = buildSrc(`${question} ${finding.claim} ${finding.body}`);
    const sys = `you are a meticulous, adversarial code/spec reader auditing a finding about ${domain}.${VERDICT_FMT}${src}`;
    const usr = `question under study: "${question}".\n\nFINDING TO BREAK:\nCLAIM: ${finding.claim}\nBODY: ${finding.body}\nCITES:\n${finding.cites
      .map((c) => `  ${c.file} :: "${c.quote}"`)
      .join('\n')}\n\nTry to break each material claim against the real source. Emit VERDICT lines only.`;
    const raw = await call(sys, usr);
    const verdicts = [];
    for (const line of raw.split('\n')) {
      const m = line.match(
        /^[\s\-*]*VERDICT:\s*(ENTAILED|NOT_ENTAILED|HEDGE_UNWARRANTED)\s*::\s*([\s\S]+?)\s*::\s*([\s\S]+?)\s*$/i,
      );
      if (m) verdicts.push({ verdict: m[1].toUpperCase(), claim: m[2].trim(), evidence: m[3].trim() });
    }
    const counts = verdicts.reduce((a, v) => ((a[v.verdict] = (a[v.verdict] || 0) + 1), a), {});
    return { raw, verdicts, counts };
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
