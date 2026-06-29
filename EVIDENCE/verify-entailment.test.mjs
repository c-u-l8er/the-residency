#!/usr/bin/env node
/* verify-entailment.test.mjs — the Gate 0.4 acceptance bar for the source-truncation fix.
 *
 * Bar (from the Gate 0 briefing, Action 4): "a regression test FAILS if any query-term hit
 * for a thread's ground-truth falls outside the kept source window. No decisive line is ever
 * truncated out of a prompt again."
 *
 * Gate 0.3's one positive *qualitative* finding turned out to be a truncation ARTIFACT: the
 * decisive line sat at ~char 4922 while the cap was 2600, so the soloist never saw it and
 * fabricated. Gate 0.4's windowed() fixed it. This test pins that fix so it cannot regress.
 *
 * Pure + offline. No harness, no network. Run: node EVIDENCE/verify-entailment.test.mjs
 */
import {
  windowed,
  droppedTerms,
  terms,
  fileImports,
  fileCalls,
  extractMechanicalClaims,
  mechanicalChecks,
  mechanicalMerge,
} from './verify-entailment.mjs';

let pass = 0,
  fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) {
    pass++;
    process.stdout.write(`  ok   ${name}\n`);
  } else {
    fail++;
    process.stdout.write(`  FAIL ${name}${detail ? ' — ' + detail : ''}\n`);
  }
};

// naive head-only truncation — the PRE-fix behavior we are guarding against.
const naiveHeadCut = (text, cap) => (text.length <= cap ? text : text.slice(0, cap));

// ---------------------------------------------------------------------------
// Fixture: a long source file whose DECISIVE line sits well past a tight cap,
// reproducing the Gate 0.3 p3 geometry (decisive content ~char 4900, cap 2600).
// ---------------------------------------------------------------------------
const headComment = [
  '// supervise.mjs — rung 4 temporal',
  '// SAFETY extends the alethic floor across time (a shield).',
  '// LIVENESS extends the deontic OUGHT across time.',
].join('\n');
const filler = Array.from({ length: 120 }, (_, i) => `const pad${i} = noise(${i}); // unrelated trajectory bookkeeping line ${i}`).join('\n');
const DECISIVE =
  'r.escalation = spec.ctd || "escalate-to-human"; // the SAME contrary-to-duty escalation as a 1-step deontic obligation';
const longFile = `${headComment}\n${filler}\n${DECISIVE}\n${filler}`;
const CAP = 2600;
const decisiveChar = longFile.indexOf(DECISIVE);

process.stdout.write('verify-entailment — source windowing regression\n');
ok('fixture reproduces the p3 geometry (decisive line past the cap)', decisiveChar > CAP, `decisive@${decisiveChar} cap=${CAP}`);

// THE canary: the PRE-fix head-cut MUST have dropped the decisive line (otherwise the
// fixture is too easy and the test proves nothing).
const naiveView = naiveHeadCut(longFile, CAP);
ok('PRE-fix head-cut DROPS the decisive line (the bug we are guarding)', !naiveView.includes('escalate-to-human'));

// THE bar: querying the decisive line's own terms, windowed() keeps it and droppedTerms is [].
const query = 'is temporal liveness escalation the same contrary-to-duty obligation escalation';
const view = windowed(longFile, query, { cap: CAP });
ok('windowed() KEEPS the decisive line when the query names its terms', view.includes('escalate-to-human'));
ok('windowed() KEEPS the head comment (cross-file relationship is stated there)', view.includes('SAFETY extends the alethic floor'));

const dropped = droppedTerms(longFile, query, { cap: CAP });
ok('droppedTerms([]) — NO ground-truth query-term is truncated out', dropped.length === 0, `dropped: ${dropped.join(', ')}`);

// General invariant: for ANY query whose terms appear in the text, every present query-term
// survives windowing (each hit opens a ±win window around itself). This is the guarantee.
const probes = [
  'escalation deontic obligation',
  'safety shield alethic floor across time',
  'liveness ought trajectory',
  `pad7 pad42 pad119`, // terms scattered throughout the filler
];
let invariantHeld = true;
for (const p of probes) {
  const d = droppedTerms(longFile, p, { cap: CAP });
  if (d.length) {
    invariantHeld = false;
    process.stdout.write(`       invariant break on "${p}": dropped ${d.join(', ')}\n`);
  }
}
ok('invariant: present query-terms ALWAYS survive the window', invariantHeld);

// Sanity: a term that is NOT in the source can never be "dropped" (nothing to keep).
ok('absent query-terms are not reported as dropped', droppedTerms(longFile, 'nonexistent_zzz_token', { cap: CAP }).length === 0);

// Sanity: short files (<= cap) pass through verbatim.
const shortFile = `${headComment}\n${DECISIVE}`;
ok('short files pass through unchanged', windowed(shortFile, query, { cap: CAP }) === shortFile);

// terms() ignores stopwords and short tokens (used to derive ground-truth terms).
ok('terms() filters stopwords + <3-char tokens', JSON.stringify(terms('the SAME escalation is a CTD')) === JSON.stringify(['escalation', 'ctd']));

// ---------------------------------------------------------------------------
// LIMITATION NOTE (carried from the second critique): the window guard above checks query-TERM
// survival, not decisive-LINE survival, and the fixture conveniently couples the two. "No
// decisive line truncated" holds at FILE granularity (via named-file pinning in verify_run.mjs),
// NOT at LINE granularity within an in-window file — droppedTerms cannot catch a decisive line
// that shares all its terms with surviving lines. Treat that as the guard's known blind spot.
// ---------------------------------------------------------------------------

// ===========================================================================
// DETERMINISTIC, MODEL-FREE ENTAILMENT (the critic's upgrade) — closes the
// Claude-grades-Claude loop on claims that reduce to static grep-able facts.
// Pure + offline: NO harness, NO model. These are the non-circular precision signal.
// ===========================================================================
process.stdout.write('\nverify-entailment — deterministic mechanical checks\n');

const supervise = [
  '// supervise.mjs — rung 4 temporal',
  "import { ok, err } from './value.mjs';",
  "import { gradient } from './score.mjs';",
  'export function safety(traj) { return ok(traj.every((s) => floorHolds(s))); }',
  'export function liveness(spec) { const r = {}; r.escalation = spec.ctd || "escalate-to-human"; return r; }',
].join('\n');
const norm = [
  '// norm.mjs — rung 3 deontic',
  'export function escalate(o) { return o.ctd ? deon(o.ctd) : veto(); }',
].join('\n');
const corpusByPath = { 'supervise.mjs': supervise, 'norm.mjs': norm };

// --- the grep primitives ---
ok('fileImports TRUE for an import that exists', fileImports(supervise, 'value.mjs'));
ok('fileImports FALSE for a module never imported', !fileImports(supervise, 'norm.mjs'));
ok('fileImports ignores basename substrings (abnorm ≠ norm)', !fileImports("import x from './abnorm.mjs';", 'norm.mjs'));
ok('fileCalls excludes the definition, sees a real call site', fileCalls(norm, 'deon') && !fileCalls(supervise, 'escalate'));
ok('fileCalls FALSE when only a definition is present (function escalate)', !fileCalls(norm, 'escalate'));

// --- assertion extraction from prose ---
const claims = extractMechanicalClaims('supervise.mjs never imports norm.mjs. The bridge defaults to tropical.');
ok('extractMechanicalClaims pulls the negative import assertion', claims.some((c) => c.kind === 'import' && c.object === 'norm.mjs' && c.polarity === false));

// --- the sound verdict: a TRUE "never imports" is mechanically ENTAILED ---
const trueClaim = { claim: 'supervise.mjs never imports norm.mjs', body: 'The temporal shield is a separate code path.', cites: [] };
const mTrue = mechanicalChecks(`${trueClaim.claim}\n${trueClaim.body}`, { corpusByPath });
ok('mechanical ENTAILED for a TRUE never-imports claim (no model)', mTrue.some((m) => m.verdict === 'ENTAILED' && m.source === 'mechanical'));

// --- the sound falsification: a FALSE "imports" claim is mechanically NOT_ENTAILED ---
const falseClaim = 'supervise.mjs imports norm.mjs to share the escalation envelope';
const mFalse = mechanicalChecks(falseClaim, { corpusByPath });
ok('mechanical NOT_ENTAILED falsifies a FALSE imports claim (no model)', mFalse.some((m) => m.verdict === 'NOT_ENTAILED' && m.source === 'mechanical'));

// --- the override: a mechanical NOT_ENTAILED suppresses a model ENTAILED on the same object ---
const modelVerdicts = [
  { verdict: 'ENTAILED', claim: 'supervise.mjs imports norm.mjs for a shared envelope', evidence: 'looks plausible', source: 'model' },
  { verdict: 'ENTAILED', claim: 'the safety shield is a separate check', evidence: 'fine', source: 'model' },
];
const merged = mechanicalMerge(modelVerdicts, mFalse);
ok('mechanicalMerge suppresses the model ENTAILED that the grep refutes', !merged.some((v) => v.source === 'model' && /imports norm/i.test(v.claim)));
ok('mechanicalMerge keeps an unrelated model ENTAILED', merged.some((v) => v.source === 'model' && /separate check/i.test(v.claim)));
ok('mechanicalMerge prepends the authoritative mechanical verdict', merged[0] && merged[0].source === 'mechanical' && merged[0].verdict === 'NOT_ENTAILED');

// --- soundness discipline: literal-default fires only on ABSENCE, never on presence ---
const defAbsent = mechanicalChecks('supervise.mjs defaults to tropical scoring', { corpusByPath });
ok('literal-default NOT_ENTAILED when the token is absent from the file', defAbsent.some((m) => m.verdict === 'NOT_ENTAILED'));
const defPresent = mechanicalChecks('supervise.mjs defaults to escalate-to-human', { corpusByPath });
ok('literal-default STAYS SILENT on presence (presence ≠ default — leave to the model)', defPresent.length === 0);

// --- no corpus → no mechanical verdicts (graceful fall-through to the model) ---
ok('mechanicalChecks returns [] when no corpusByPath is supplied', mechanicalChecks('supervise.mjs imports norm.mjs', {}).length === 0);

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
