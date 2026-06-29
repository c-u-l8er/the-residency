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
import { windowed, droppedTerms, terms } from './verify-entailment.mjs';

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

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
