#!/usr/bin/env node
/* algebra_probe.mjs — GATE: point the residency's falsification discipline at the [&]
 * composition algebra (box-and-box), per the Gate-0 close-out recommendation. Deliverable:
 * ONE concrete bug a property law catches that the hand-written example tests (CP1–CP4) miss.
 *
 * THE FINDING (deterministic, NO model in the loop — the non-circular signal):
 *   The |> (pipeline) operator's documented guarantee — value.mjs:54-56 @REF 353d1679 "Defined
 *   only when phase(a) ≤ phase(b)… a backward step is REFUSED" — is NOT STABLE UNDER RE-ASSOCIATION.
 *   chain() sets the composite's exit phase to the LATER phase (value.mjs:62 @REF 353d1679
 *   `r.pi = firstNonNull(b.pi, a.pi)`), but its backward-step guard (value.mjs:58 @REF) only
 *   compares the IMMEDIATE pair. So a |> (b |> c) collapses (b|>c) to its EXIT phase and the
 *   outer guard never sees b's (earlier) ENTRY phase — an internal backward edge slips through
 *   the floor that (a |> b) |> c correctly refuses.
 *
 * MINIMAL COUNTEREXAMPLE — execution order act → retrieve → consolidate (act→retrieve is backward):
 *   (a@act |> b@retrieve) |> c@consolidate   ⇒  0̲     (floor fires — correct)
 *    a@act |> (b@retrieve |> c@consolidate)   ⇒  a VALID brick, exitπ=consolidate  (floor BYPASSED)
 *
 * WHY CP1 MISSES IT: test/compose-laws.mjs CP1 ('|> associative where feasible') draws phases
 * [i,j,k] SORTED non-decreasing, so BOTH groupings are always feasible — it never probes the
 * feasibility boundary. CP3 only tests pairwise (a,b). No stated law asserts the floor is
 * association-invariant, so 2000 sorted-phase trials pass while the bug sits one re-grouping away.
 *
 * Two property laws below catch it. Same harness idiom as test/compose-laws.mjs (trial/N=2000):
 *   CP5  the floor is ASSOCIATION-INVARIANT:  isZero((a|>b)|>c) === isZero(a|>(b|>c))  ∀ a,b,c
 *   CP6  NO BACKWARD execution step survives:  any descent in [πa,πb,πc] ⇒ BOTH groupings 0̲
 * Both are FALSIFIED; CP1 here draws its OWN sorted phases (as the original does) — that sorting
 * is exactly why it can't see the bug, and it HOLDS 2000/2000 because of it. (CP1 is NOT run on
 * unsorted bricks: by construction it never receives them; fed unsorted, the backward grouping
 * would floor and CP1 would hit 'unexpectedly-zero' and FAIL — structural blindness, not luck.)
 * All in-comment line numbers are REF 353d1679 coordinates (the SHA this falsifier hydrates).
 *
 * THE ROOT CAUSE (deepening — pointed the same kit at &, the sibling operator):
 *   "|> is non-associative" was a SYMPTOM, not the disease. The disease is Value.pi: a SINGLE-slot
 *   phase carrier set ORDER-DEPENDENTLY by combine()'s `firstNonNull(a.pi, b.pi)` (value.mjs) and
 *   READ by |>'s floor. That one root cause produces (at least) TWO distinct soundness symptoms:
 *     · symptom 1 — |> re-association (CP5/CP6 above)
 *     · symptom 2 — &-operand order leaking into a downstream |> floor (CP7 below)
 *   & is advertised COMMUTATIVE/idempotent. Its OWN floor IS commutative — isZero(a&b)==isZero(b&a)
 *   HOLDS 2000/2000 (floor reads only commutative inputs: certified AND, costClass max, sigma-set,
 *   kappa OR — NOT pi/authority/audit), so & in isolation has NO |>-class bug. We BANK that as a
 *   passing anchor (AC-COMM). But combine() still picks pi order-dependently, and |>'s floor reads
 *   pi, so the asymmetry LEAKS:
 *     CP7  &-operand order must not change a downstream |> floor:
 *          isZero((a&b)|>c) === isZero((b&a)|>c)               ∀ a,b,c        — FALSIFIED
 *     witness a@consolidate b@retrieve c@act:  (a&b) carries π=consolidate ⇒ (a&b)|>c = 0̲ (floor
 *          fires) but (b&a) carries π=retrieve ⇒ (b&a)|>c = LIVE.  Swapping two operands of a
 *          "commutative" operator turns a forbidden pipeline feasible. Ordinary inputs, fully reachable.
 *   CONSEQUENCE FOR THE FIX: this BREAKS Option 2. Option 2 ("declare |> left-fold-only, narrow the
 *   docstring") does nothing here — CP7 uses a SINGLE, un-re-associated |> on a commuted &; there is
 *   no |> re-grouping to outlaw. Only Option 1 — carry an [entry,exit] phase INTERVAL instead of one
 *   pi, floor checks the interval — fixes the carrier and kills BOTH symptoms.
 *   HONESTY: idempotence of & is left UNADJUDICATED (a naive a&a probe is vacuous on zero-quantity
 *   bricks, and the ⊗ quantity semiring is SUPPOSED to accumulate cost/confidence, so a&a doubling n
 *   may be by design). And CP7 needs MIXED-phase & operands; if coalitions are always phase-
 *   homogeneous in practice it never fires — but that is an unenforced, undocumented precondition the
 *   kernel does not check, which is the same Option-2-shaped gap again.
 *
 * Reproducible: hydrates the kernel from the pinned public REF and RUNS it (executable falsifier,
 * not a quote). $0 — no harness, no model, no network beyond the one pinned raw fetch.
 *
 * run: node EVIDENCE/algebra_probe.mjs
 */
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO = 'c-u-l8er/AmpersandBoxDesign';
const REF = '353d1679a799bd4b6f0bea0dc126ddbe085462cc'; // same pin as gate0_4; local HEAD == this
const RAW = `https://raw.githubusercontent.com/${REPO}/${REF}/box-and-box/`;
// At this REF value.mjs is self-contained (round() inline, no imports) and compose.mjs imports
// only ./value.mjs — so these two co-located files are the whole executable kernel we need.
// (numerics.mjs is optional: a later local edit split round() out; tolerate a 404.)
const NEED = ['value.mjs', 'compose.mjs'];
const OPTIONAL = ['numerics.mjs'];

async function hydrateKernel() {
  const dir = await mkdtemp(join(tmpdir(), 'bab-algebra-'));
  for (const f of NEED) {
    const r = await fetch(RAW + f, { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${f} @ ${REF.slice(0, 7)}`);
    await writeFile(join(dir, f), await r.text());
  }
  for (const f of OPTIONAL) {
    const r = await fetch(RAW + f, { cache: 'no-store' });
    if (r.ok) await writeFile(join(dir, f), await r.text());
  }
  const value = await import(pathToFileURL(join(dir, 'value.mjs')).href);
  const compose = await import(pathToFileURL(join(dir, 'compose.mjs')).href);
  return { value, compose, dir };
}

// ---- the property-test harness, copied from test/compose-laws.mjs (same idiom) ----
function trial(n, body) {
  for (let i = 0; i < n; i++) { const r = body(); if (r !== true) return { pass: false, cex: r, at: i + 1 }; }
  return { pass: true, at: n };
}

const main = async () => {
  const { value, compose } = await hydrateKernel();
  const { V, PHASES, phaseIdx } = value;
  const { Brick, isZero, composePipe, composeAnd } = compose;

  // a FEASIBLE certified brick pinned to a phase; wild contracts (no type-mismatch floor); the
  // floor passes (sigma empty, kappa false). Only the phase varies — exactly CP1's free variable.
  const certPoly = () => ({
    subject: { kind: 'weave-ir', hash: 'h' + ((Math.random() * 1e6) | 0) },
    analyzer: { name: 'probe', version: '0' },
    verdict: { certified: true, costClass: 'poly' },
    policy: { resourceDecision: 'allow', reason: 'probe' },
  });
  const brickAt = (pi, tag) => Brick({
    id: `${tag}@${pi}`, contract: { accepts_from: '*', feeds_into: '*' },
    value: V({ beta: 0.9, kappa: false, sigma: [], pi }),
    cost: certPoly(), q: { confidence: 1, cost: 0, latency: 0 },
  });
  const randPhase = () => PHASES[(Math.random() * PHASES.length) | 0];
  const descends = (ps) => ps.some((p, i) => i > 0 && phaseIdx(ps[i - 1]) > phaseIdx(p)); // any backward adjacent pair
  const cexTag = (pa, pb, pc) => `π=[${pa}, ${pb}, ${pc}]  (exec order ${pa}→${pb}→${pc})`;

  // ---- CP5 — the floor is ASSOCIATION-INVARIANT (a partial monoid's zero must not depend on grouping)
  const CP5 = (n) => trial(n, () => {
    const pa = randPhase(), pb = randPhase(), pc = randPhase();
    const a = brickAt(pa, 'a'), b = brickAt(pb, 'b'), c = brickAt(pc, 'c');
    const left = composePipe(composePipe(a, b), c);
    const right = composePipe(a, composePipe(b, c));
    return isZero(left) === isZero(right) ? true
      : `${cexTag(pa, pb, pc)}  →  (a|>b)|>c ${isZero(left) ? '0̲' : 'live'}  but  a|>(b|>c) ${isZero(right) ? '0̲' : 'live'}`;
  });

  // ---- CP6 — NO backward EXECUTION-ORDER step survives, in EITHER association
  const CP6 = (n) => trial(n, () => {
    const ps = [randPhase(), randPhase(), randPhase()];
    const [a, b, c] = ps.map((p, i) => brickAt(p, 'abc'[i]));
    const left = composePipe(composePipe(a, b), c);
    const right = composePipe(a, composePipe(b, c));
    if (!descends(ps)) return true; // law only constrains backward sequences
    return (isZero(left) && isZero(right)) ? true
      : `${cexTag(...ps)} has a backward step yet survives:  (a|>b)|>c ${isZero(left) ? '0̲' : 'LIVE'}, a|>(b|>c) ${isZero(right) ? '0̲' : 'LIVE'}`;
  });

  // ---- AC-COMM — &'s OWN floor IS commutative (the green anchor: pins what is SOUND about &)
  const ACcomm = (n) => trial(n, () => {
    const a = brickAt(randPhase(), 'a'), b = brickAt(randPhase(), 'b');
    return isZero(composeAnd(a, b)) === isZero(composeAnd(b, a)) ? true
      : `π=[${a.value.pi}, ${b.value.pi}] a&b ${isZero(composeAnd(a, b)) ? '0̲' : 'live'} but b&a ${isZero(composeAnd(b, a)) ? '0̲' : 'live'}`;
  });

  // ---- CP7 — &-operand order must NOT change a downstream |> floor (the LEAK: symptom 2 of the root cause)
  const CP7 = (n) => trial(n, () => {
    const pa = randPhase(), pb = randPhase(), pc = randPhase();
    const a = brickAt(pa, 'a'), b = brickAt(pb, 'b'), c = brickAt(pc, 'c');
    const l = composePipe(composeAnd(a, b), c), r = composePipe(composeAnd(b, a), c);
    return isZero(l) === isZero(r) ? true
      : `π=[${pa}, ${pb}, ${pc}]  →  (a&b)|>c ${isZero(l) ? '0̲' : 'LIVE'}  but  (b&a)|>c ${isZero(r) ? '0̲' : 'LIVE'}  (& is "commutative")`;
  });

  // ---- CP1 (re-run, sorted phases) — the EXISTING law; PASSES, proving example-style tests miss it
  const valEqPi = (l, r) => l.value.pi === r.value.pi; // narrow: the phase carrier CP1 also checks
  const CP1sorted = (n) => trial(n, () => {
    const [i, j, k] = [0, 0, 0].map(() => (Math.random() * PHASES.length) | 0).sort((x, y) => x - y);
    const a = brickAt(PHASES[i], 'a'), b = brickAt(PHASES[j], 'b'), c = brickAt(PHASES[k], 'c');
    const left = composePipe(composePipe(a, b), c), right = composePipe(a, composePipe(b, c));
    if (isZero(left) || isZero(right)) return 'unexpectedly-zero';
    return valEqPi(left, right) ? true : 'assoc';
  });

  const N = 2000;
  const run = (id, desc, fn, expectPass) => {
    const r = fn(N);
    const mark = r.pass === expectPass ? '✓' : '✗';
    const verdict = r.pass ? `HOLDS (${N}/${N})` : `FALSIFIED @trial ${r.at}`;
    console.log(`  ${mark} ${id}  ${desc}\n      ${verdict}${r.cex ? `\n      counterexample: ${r.cex}` : ''}`);
    return r;
  };

  console.log(`\n[&] composition-algebra falsifier · box-and-box @ ${REF.slice(0, 7)} · ${N} trials/law\n${'─'.repeat(72)}`);
  console.log('EXISTING example-style law (sorted phases) — expected to PASS and miss the bug:');
  const r1 = run('CP1', '|> associative where feasible (phases sorted non-decreasing)', CP1sorted, true);
  console.log('\nNEW property laws (unsorted phases) — expected to FALSIFY the floor (symptom 1: |> re-assoc):');
  const r5 = run('CP5', 'the floor is ASSOCIATION-INVARIANT: isZero((a|>b)|>c) == isZero(a|>(b|>c))', CP5, true);
  const r6 = run('CP6', 'NO backward execution step survives, in either association', CP6, true);
  console.log('\nROOT-CAUSE DEEPENING — & (sibling operator); green anchor + symptom 2 (&→|> operand-order leak):');
  const rAC = run('AC-COMM', "&'s OWN floor is commutative: isZero(a&b) == isZero(b&a)  (EXPECT HOLD — & in isolation is sound)", ACcomm, true);
  const r7 = run('CP7', '&-operand order must not change a downstream |> floor: isZero((a&b)|>c) == isZero((b&a)|>c)', CP7, true);
  // deterministic named witness for CP7 (no RNG) — the receipt the maintainer can paste
  const wa = brickAt('consolidate', 'a'), wb = brickAt('retrieve', 'b'), wc = brickAt('act', 'c');
  const wl = composePipe(composeAnd(wa, wb), wc), wr = composePipe(composeAnd(wb, wa), wc);
  console.log(`      witness a@consolidate b@retrieve c@act:  (a&b) π=${composeAnd(wa, wb).value?.pi} ⇒ (a&b)|>c ${isZero(wl) ? '0̲ (floor fires)' : 'LIVE'};  (b&a) π=${composeAnd(wb, wa).value?.pi} ⇒ (b&a)|>c ${isZero(wr) ? '0̲' : 'LIVE (BYPASSED)'}`);
  console.log('─'.repeat(72));

  const cp1Passed = r1.pass, cp5Failed = !r5.pass, cp6Failed = !r6.pass;
  const acHeld = rAC.pass, cp7Failed = !r7.pass;
  if (cp1Passed && cp5Failed && cp6Failed && acHeld && cp7Failed) {
    console.log('RESULT: CP1 (sorted/example-style) HOLDS while CP5 & CP6 FALSIFY the SAME operator (symptom 1).');
    console.log('        AC-COMM HOLDS (& floor is sound) yet CP7 FALSIFIES (symptom 2: the order-dependent π');
    console.log('        carrier leaks through |>). Root cause = Value.pi single-slot carrier; only Option 1 closes both.');
    console.log('A property kit catches a floor-bypass bug example tests miss, AND locates the root cause. ✓ gate met.\n');
    process.exit(0);
  }
  console.log('RESULT: unexpected — a law may have been fixed at this REF, or the probe is wrong. Investigate.\n');
  process.exit(1);
};

main().catch((e) => { console.error('probe error:', e.message); process.exit(2); });
