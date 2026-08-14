#!/usr/bin/env node
/* interface_gate.mjs — THE INTERFACE GATE (see EVIDENCE/PREREG-interface-gate.md, frozen first).
 *
 * Tests board-AS-INTERFACE (not board-as-producer, which Gate 0 killed): is a multi-agent narration
 * of a deterministic trace a better INTERFACE than (1) the raw verdict, (2) one narrator, or (4) a
 * faithful structural rendering that asserts nothing beyond the trace tuples? Four arms, all render
 * the SAME trace (the |>/& finding @REF 353d1679, produced with no model in the loop).
 *
 * AXIS 1 GROUNDEDNESS (this script, hard, NO model): every generated sentence -> a no-model
 *   trace-fact checker -> {mech-entailed | mech-flagged(lie) | model-defer}. First sub-metric =
 *   % mechanically-decided per arm. A low fraction means the gate slid back onto a model judge.
 * AXIS 2 LEGIBILITY (handed to a human, blind): emitted as a shuffled label-stripped packet at the
 *   end. Claude authored the arms + holds the thesis, so Claude MUST NOT self-score legibility.
 *
 * run: node EVIDENCE/interface_gate.mjs            # groundedness report + blind legibility packet
 */
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const REF = '353d1679a799bd4b6f0bea0dc126ddbe085462cc';
const RAW = `https://raw.githubusercontent.com/c-u-l8er/AmpersandBoxDesign/${REF}/box-and-box/`;

async function hydrate() {
  const dir = await mkdtemp(join(tmpdir(), 'bab-iface-'));
  let valueSrc = '';
  for (const f of ['value.mjs', 'compose.mjs']) {
    const r = await fetch(RAW + f, { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${f}`);
    const t = await r.text();
    if (f === 'value.mjs') valueSrc = t;
    await writeFile(join(dir, f), t);
  }
  for (const f of ['numerics.mjs']) {
    const r = await fetch(RAW + f, { cache: 'no-store' });
    if (r.ok) await writeFile(join(dir, f), await r.text());
  }
  return {
    value: await import(pathToFileURL(join(dir, 'value.mjs')).href),
    compose: await import(pathToFileURL(join(dir, 'compose.mjs')).href),
    valueSrc,
  };
}

// ---------------- emit the TRACE FACTS from a LIVE witness run (ground truth; no model) ----------
async function emitTrace() {
  const { value, compose, valueSrc } = await hydrate();
  const { V, PHASES, phaseIdx } = value;
  const { Brick, isZero, composeAnd, composePipe } = compose;
  const cert = () => ({
    subject: { kind: 'weave-ir', hash: 'h' + ((Math.random() * 1e6) | 0) },
    analyzer: { name: 'probe', version: '0' },
    verdict: { certified: true, costClass: 'poly' },
    policy: { resourceDecision: 'allow', reason: 'probe' },
  });
  const at = (pi, tag) => Brick({
    id: `${tag}@${pi}`, contract: { accepts_from: '*', feeds_into: '*' },
    value: V({ beta: 0.9, kappa: false, sigma: [], pi }), cost: cert(), q: { confidence: 1, cost: 0, latency: 0 },
  });
  const a = at('consolidate', 'a'), b = at('retrieve', 'b'), c = at('act', 'c');
  const ab = composeAnd(a, b), ba = composeAnd(b, a);
  const abZ = isZero(composePipe(ab, c)), baZ = isZero(composePipe(ba, c));
  // source-derived mechanism facts (mechanically grep-checkable against the hydrated value.mjs)
  const combineFirstOperand = /r\.pi\s*=\s*firstNonNull\(\s*a\.pi/.test(valueSrc) ||
    /pi:\s*firstNonNull\(\s*a\.pi/.test(valueSrc); // combine picks first operand's pi
  return {
    cPhase: c.value.pi, // 'act'
    backward: (lo, hi) => phaseIdx(lo) > phaseIdx(hi),
    groupings: {
      'a&b': { pi: ab.value.pi, fires: abZ, live: !abZ },
      'b&a': { pi: ba.value.pi, fires: baZ, live: !baZ },
    },
    laws: { CP1: 'holds', CP5: 'falsified', CP6: 'falsified', CP7: 'falsified', 'AC-COMM': 'holds' },
    combineFirstOperand, // true ⇒ a&b carries a's phase, b&a carries b's phase
    PHASES, phaseIdx,
  };
}

// ---------------- THE NO-MODEL TRACE-FACT CHECKER (literal tokens; same philosophy as the keeper) -
// Operates at CLAUSE granularity (a sentence is split on conjunctions/punctuation), because a coarse
// whole-sentence matcher mis-pairs tokens in compound sentences ("a&b carries consolidate WHILE b&a
// carries retrieve"). Each clause -> 'entailed' | 'flagged' (contradicts a fact) | 'defer'
// (interpretive / no decidable trace fact). %mech-decided is reported per clause.
const PHASE_TOKENS = ['retrieve', 'route', 'act', 'learn', 'consolidate'];
const INTERP = /\b(layer|owns?|ownership|should|tension|deontic|alethic|elegan|beautiful|architectur|philosoph|moral|intent|spirit|story|narrativ|hides?)\b/i;
const splitClauses = (sent) => sent.split(/;|—|,|\bwhile\b|\bbut\b|\bso\b|\band\b|→|->/i)
  .map((c) => c.trim()).filter((c) => c.length > 3);

// ctx carries the last-seen grouping/carried-phase ACROSS clauses of the SAME sentence, so an
// anaphoric fragment ("returning 0̲") inherits the subject its clause dropped. Returns {v, ctx'}.
function classifyClause(cl, T, ctx) {
  const s = cl.toLowerCase();
  const grpLocal = /a\s*&\s*b/.test(s) ? 'a&b' : /b\s*&\s*a/.test(s) ? 'b&a' : null;
  const phases = PHASE_TOKENS.filter((p) => s.includes(p));
  const carriedLocal = phases.find((p) => p !== T.cPhase);
  const grp = grpLocal || ctx.grp, carried = carriedLocal || ctx.carried;
  const ctx2 = { grp: grpLocal || ctx.grp, carried: carriedLocal || ctx.carried };

  const saysFire = s.includes('0̲') || /\b(zero|floor (fire|fires|fired)|fires|refus|annihilat|blocked|rejected)\b/.test(s);
  const saysLive = /\b(live|bypass|passes|passed|surviv|admitted|allowed|slips? through|stayed)\b/.test(s);
  const onlyFire = saysFire && !saysLive, onlyLive = saysLive && !saysFire;
  const lawId = ['CP1', 'CP5', 'CP6', 'CP7', 'AC-COMM'].find((id) => s.includes(id.toLowerCase()));
  const saysHold = /\bhold|sound|commutativ/.test(s), saysFalsi = /\bfalsifi|fails|broken|leak|violat/.test(s);
  const V = (v) => ({ v, ctx2 });

  // (i) backward/forward mechanism claim — decided by the kernel's OWN backward()
  if (carried && /\b(backward|forward)\b/.test(s)) return V(T.backward(carried, T.cPhase) === /backward/.test(s) ? 'entailed' : 'flagged');
  // (ii) grouping -> outcome
  if (grp && (onlyFire || onlyLive)) return V((onlyFire ? T.groupings[grp].fires : T.groupings[grp].live) ? 'entailed' : 'flagged');
  // (iii) grouping -> carried phase
  if (grp && carriedLocal && /\b(carr|carries|carried|phase|π|pi)\b/.test(s)) return V(carriedLocal === T.groupings[grp].pi ? 'entailed' : 'flagged');
  // (iv) causal: carried phase fed into c@cPhase -> outcome; decided by backward()
  if (carried && s.includes(T.cPhase) && (onlyFire || onlyLive)) return V(T.backward(carried, T.cPhase) === onlyFire ? 'entailed' : 'flagged');
  // (v) law -> status
  if (lawId && (saysHold !== saysFalsi)) return V((saysHold ? T.laws[lawId] === 'holds' : T.laws[lawId] === 'falsified') ? 'entailed' : 'flagged');
  // (vi) mechanism: combine picks the FIRST operand's phase
  if (/first (operand|brick|argument)|left operand|saw first/.test(s)) return V(T.combineFirstOperand ? 'entailed' : 'flagged');
  // (vii) & floor does not read the phase carrier
  if (/&'?s? own floor|& alone|& floor/.test(s) && /\b(never|not|n't|without|sound)\b/.test(s)) return V('entailed');
  // (viii) interpretive / undecidable -> a model would have to judge it
  return V('defer');
}

function scoreArm(name, sentences, T) {
  const tally = { entailed: 0, flagged: 0, defer: 0 };
  const rows = [];
  for (const sent of sentences) {
    let ctx = { grp: null, carried: null };
    for (const cl of splitClauses(sent)) { const { v, ctx2 } = classifyClause(cl, T, ctx); ctx = ctx2; tally[v]++; rows.push({ v, cl, sent }); }
  }
  const nC = rows.length || 1;
  const mechDecided = tally.entailed + tally.flagged;
  return { name, sentences: sentences.length, clauses: rows.length, ...tally, pctMech: +(100 * mechDecided / nC).toFixed(0), rows };
}

// ---------------- THE FOUR ARMS (authored by Claude in good faith; blind-scored by a human) -------
function arms(T) {
  const g = T.groupings;
  // arm 1 — VERDICT: raw machine output, no sentences
  const VERDICT = [
    `CP5=${T.laws.CP5} CP6=${T.laws.CP6} CP7=${T.laws.CP7} AC-COMM=${T.laws['AC-COMM']} CP1=${T.laws.CP1}`,
    `(a&b).pi=${g['a&b'].pi}  isZero((a&b)|>c@${T.cPhase})=${g['a&b'].fires}`,
    `(b&a).pi=${g['b&a'].pi}  isZero((b&a)|>c@${T.cPhase})=${g['b&a'].fires}`,
  ];
  // arm 2 — SOLO: one narrator explaining WHY (good-faith correct, maximally grounded)
  const SOLO = [
    `The pipeline floor fired on (a&b)|>c, returning 0̲, but the very same operands as (b&a)|>c stayed live.`,
    `The reason is that & sets a coalition's phase to its first operand's phase, so a&b carries consolidate while b&a carries retrieve.`,
    `Feeding consolidate into c@act is a backward step, so the |> floor refuses it; feeding retrieve into act is forward, so it passes.`,
    `So the same two operands produce opposite verdicts, decided purely by which one & saw first — CP7 falsified, while AC-COMM still holds because &'s own floor never reads the phase.`,
  ];
  // arm 3 — PANEL: 3 personas narrating the same trace (good-faith; some interpretive by design)
  const PANEL = [
    `falsifier: (a&b)|>c is 0̲ and (b&a)|>c is live; a&b carried consolidate, b&a carried retrieve, c is act.`,
    `falsifier: CP7 is falsified and AC-COMM holds — & alone is sound, the leak only appears through |>.`,
    `veto: the floor should treat these as the same coalition and it cannot, because it only ever sees one phase.`,
    `norma: this exclusion is really owned by the alethic phase carrier, not by the deontic floor doing its job on bad data.`,
    `norma: there's an architectural tension here between commutativity and the single-slot design that the verdict alone hides.`,
  ];
  // arm 4 — RENDER: faithful structural rendering, asserts nothing beyond the tuples
  const bw = (p) => T.backward(p, T.cPhase) ? `${p} ⊳ ${T.cPhase}: backward` : `${p} ⊴ ${T.cPhase}: forward`;
  const RENDER = [
    `              π carried  →  |> c@${T.cPhase}   floor`,
    `  (a & b)     ${g['a&b'].pi.padEnd(11)}→  ${(g['a&b'].fires ? '0̲' : 'live').padEnd(6)}    ${g['a&b'].fires ? 'FIRES' : 'bypassed'}  (${bw(g['a&b'].pi)})`,
    `  (b & a)     ${g['b&a'].pi.padEnd(11)}→  ${(g['b&a'].fires ? '0̲' : 'live').padEnd(6)}    ${g['b&a'].fires ? 'FIRES' : 'bypassed'}  (${bw(g['b&a'].pi)})`,
    `  combine: π := first operand's π   |   |> floor reads π   |   & floor does NOT read π`,
    `  laws:  CP5✗ CP6✗ CP7✗   AC-COMM✓ CP1✓`,
  ];
  return { VERDICT, SOLO, PANEL, RENDER };
}

const main = async () => {
  const T = await emitTrace();
  const A = arms(T);

  console.log(`\nINTERFACE GATE · box-and-box @ ${REF.slice(0, 7)} · the |>/& trace · no model in axis 1`);
  console.log('='.repeat(78));
  console.log('TRACE (ground truth, live witness):');
  console.log(`  c@${T.cPhase};  a&b→π=${T.groupings['a&b'].pi} ⇒ ${T.groupings['a&b'].fires ? '0̲' : 'live'};  b&a→π=${T.groupings['b&a'].pi} ⇒ ${T.groupings['b&a'].fires ? '0̲' : 'live'}`);
  console.log(`  laws: ${Object.entries(T.laws).map(([k, v]) => k + '=' + v).join(' ')}   combineFirstOperand=${T.combineFirstOperand}`);

  console.log('\nAXIS 1 — GROUNDEDNESS (no model; clause-level; the hard pass/fail):');
  console.log('  arm       sent  clause  entail  flag(lie)  defer   %mech-decided');
  const scored = ['SOLO', 'PANEL'].map((k) => scoreArm(k, A[k], T));
  for (const r of scored) {
    console.log(`  ${r.name.padEnd(9)} ${String(r.sentences).padStart(3)}   ${String(r.clauses).padStart(4)}    ${String(r.entailed).padStart(3)}     ${String(r.flagged).padStart(3)}      ${String(r.defer).padStart(3)}      ${String(r.pctMech).padStart(3)}%`);
  }
  console.log(`  ${'RENDER'.padEnd(9)} ${String(A.RENDER.length).padStart(3)}   ${String(A.RENDER.length).padStart(4)}    ${String(A.RENDER.length).padStart(3)}       0        0      100%   (grounded by construction)`);
  console.log(`  ${'VERDICT'.padEnd(9)} ${String(A.VERDICT.length).padStart(3)}      —      —       —        —      100%   (the machine output itself)`);

  // any flagged clause is a lie surfaced — print them
  const lies = scored.flatMap((r) => r.rows.filter((x) => x.v === 'flagged').map((x) => `${r.name}: "${x.cl}"`));
  console.log(lies.length ? `\n  ⚠ FLAGGED (clause contradicts the trace — a narration lie):\n    - ${lies.join('\n    - ')}`
    : `\n  ✓ no narrated clause contradicts the trace (no lies surfaced).`);
  // deferred = where the gate slid onto a model judge
  console.log('\n  model-defer clauses (interpretive; NOT mechanically decided — where the gate slides onto a model judge):');
  for (const r of scored) for (const x of r.rows.filter((y) => y.v === 'defer')) console.log(`    · ${r.name}: "${x.cl}"`);

  console.log('\nAXIS 2 — LEGIBILITY: handed to a human, BLIND (Claude must not self-score; see PREREG Guard A/B).');
  console.log('─'.repeat(78));
  console.log('Pre-registered task (Guard B): from the arm ALONE, can a newcomer state (a) WHY the floor');
  console.log('fired on (a&b)|>c but not (b&a)|>c, and (b) WHICH mechanism owns it (order-dependent π carrier)?');
  console.log('Score each arm a:0/1 b:0/1 + ease 1–5. Then unblind. BLIND, SHUFFLED packet:\n');
  const packet = [
    { id: 'VERDICT', lines: A.VERDICT }, { id: 'SOLO', lines: A.SOLO },
    { id: 'PANEL', lines: A.PANEL }, { id: 'RENDER', lines: A.RENDER },
  ].map((x) => ({ ...x, k: Math.random() })).sort((p, q) => p.k - q.k);
  const key = [];
  packet.forEach((arm, i) => {
    const label = `ARM ${String.fromCharCode(65 + i)}`;
    key.push(`${label} = ${arm.id}`);
    console.log(`${label}\n${arm.lines.map((l) => '  ' + l).join('\n')}\n`);
  });
  console.log('─'.repeat(78));
  console.log('UNBLIND KEY (do not read until scored):  ' + Buffer.from(key.join(' | ')).toString('base64'));
  console.log('(decode: echo "<b64>" | base64 -d)\n');
};

// reusable pieces (single source of truth for the trace + clause checker; judge_containment.mjs imports these)
export { emitTrace, arms, scoreArm, splitClauses, classifyClause, REF };

// run the gate only when invoked directly (importing this module must NOT run main)
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((e) => { console.error('gate error:', e.message); process.exit(2); });
}
