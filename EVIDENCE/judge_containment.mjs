#!/usr/bin/env node
/* judge_containment.mjs — THE JUDGE-CONTAINMENT GATE (see EVIDENCE/PREREG-judge-containment.md, frozen).
 *
 * Falsifies the two-part claim the residency's "no model in the verdict" guarantee rests on:
 *   (1) SOUNDNESS  — the mechanical layer (interface_gate.mjs's classifyClause: isZero/backward/
 *                    literal-token entailment) is CORRECT on every clause it marks entailed|flagged.
 *   (2) CONTAINMENT — a model only ever adjudicates the model-defer residue.
 *
 * The earlier one-arm draft tested (2) and ASSUMED (1) — and worse, it showed the judge only the
 * deferred clauses, so the judge could not contradict a committed verdict (nothing committed in front
 * of it). That design can only pass. This gate tests (1) FIRST, blind, where the machine COMMITTED.
 *
 *   ARM A (soundness, the half that can fail): judge grades the entailed|flagged clauses, blind to the
 *     machine's verdict. HARD KILL = any inversion (judge CONTRADICTED a machine-entailed clause, or
 *     ENTAILED a machine-flagged one). First independent check of the mechanical verdicts, ever.
 *   ARM B (containment, only meaningful if A passes): judge grades the model-defer residue. Confirmed
 *     = judge also can't ground them; UNDER-DECISION = judge confidently grounds >1/3 of them.
 *
 * The judge is a DIFFERENT Claude tier than authored the arms (decorrelated errors on a near-mechanical
 * entailment task, $0 through the harness). Doubly-blind: clauses are merged across both buckets,
 * shuffled, de-labeled; the judge sees only the clause + the frozen trace facts. This is the ONE gate
 * in the kit with a model in the loop by design (its subject IS what a model judge decides), so it is
 * non-deterministic: each clause is judged k times and scored by majority; vote splits are reported.
 *
 * env:  JUDGE_MODEL (default haiku; MUST differ from the tier that authored interface_gate's arms)
 *       JUDGE_K     (default 3; votes per clause, majority wins)
 * run:  JUDGE_MODEL=haiku node EVIDENCE/judge_containment.mjs
 * exits: 0 ran (Arm A passed; Arm B note inline) · 1 Arm A HARD KILL · 3 judge unavailable (packet emitted)
 */
import { spawnSync } from 'node:child_process';
import { emitTrace, arms, scoreArm, REF } from './interface_gate.mjs';

const JUDGE_MODEL = process.env.JUDGE_MODEL || 'haiku';
const JUDGE_K = Math.max(1, parseInt(process.env.JUDGE_K || '3', 10));
// JUDGE_CONTEXT selects judge-input granularity (classifyClause + kernel ALWAYS frozen):
//   (unset)    clause-only      — judge sees only the clause (known-unreliable: severs left-context the
//                                 checker threads; manufactured the false Arm-A kill).
//   =sentence  clause-in-sentence — judge sees the WHOLE sentence (more than the checker; VOIDS Arm B).
//   =window    checker-window   — judge sees the sentence sliced up to & including the clause, nothing
//                                 after = EXACTLY classifyClause's left-to-right causal window. The fair
//                                 same-unit protocol (PREREG "same-unit fairness gate"): Arm A becomes a
//                                 fair soundness test, Arm B the first VALID containment measurement.
const FULL_CONTEXT = process.env.JUDGE_CONTEXT === 'sentence';
const WINDOW = process.env.JUDGE_CONTEXT === 'window';
// the checker's causal window for a clause = its sentence up to & including that clause (nothing after).
const checkerWindow = (clause, sent) => {
  const pos = sent.indexOf(clause);
  return pos >= 0 ? sent.slice(0, pos + clause.length) : clause;
};

// ---- frozen trace-facts string for the judge (derived from the live witness; stays in sync) -------
function traceFacts(T) {
  const g = T.groupings;
  const out = (x) => (x.fires ? '0̲ (floor fires)' : 'live (floor bypassed)');
  return [
    `- c is a brick at phase "${T.cPhase}".`,
    `- grouping (a&b) carries phase "${g['a&b'].pi}"; the pipeline (a&b)|>c returns ${out(g['a&b'])}.`,
    `- grouping (b&a) carries phase "${g['b&a'].pi}"; the pipeline (b&a)|>c returns ${out(g['b&a'])}.`,
    `- phase order is retrieve(0) route(1) act(2) learn(3) consolidate(4); a higher-index phase feeding a lower-index one is a "backward" step, a lower-or-equal feeding a higher is "forward".`,
    `- combine (&) sets a grouping's phase to its FIRST operand's phase: ${T.combineFirstOperand}.`,
    `- law results: CP1 ${T.laws.CP1}, CP5 ${T.laws.CP5}, CP6 ${T.laws.CP6}, CP7 ${T.laws.CP7}, AC-COMM ${T.laws['AC-COMM']}.`,
    `- the & floor does NOT read the phase carrier; the |> floor DOES.`,
  ].join('\n');
}

// ---- the frozen, non-leading judge prompt (matches PREREG verbatim) -------------------------------
function judgePrompt(T_str, clause, sentence) {
  let head;
  if (WINDOW) {
    const win = checkerWindow(clause, sentence || clause);
    head = (win.trim() !== clause.trim())
      ? [`Here is the beginning of a sentence, up to AND INCLUDING the clause to judge — there is NO text after it; this is exactly the left-context the checker had: "${win}"`, ``,
         `Judge ONLY the final clause: "${clause}"`]
      : [`Here is one clause: "${clause}"`];
  } else if (FULL_CONTEXT && sentence && sentence.trim() !== clause.trim()) {
    head = [`Here is one full sentence from a narration: "${sentence}"`, ``,
       `Within that sentence, judge ONLY this clause (the rest is context): "${clause}"`];
  } else {
    head = [`Here is one clause: "${clause}"`];
  }
  return [
    `Here are ground-truth facts from a deterministic trace:`,
    T_str,
    ``,
    ...head,
    ``,
    `Decide ONLY against the facts. Answer exactly one of:`,
    `ENTAILED  (the clause's factual claims match a stated fact)`,
    `CONTRADICTED  (a factual claim conflicts with a stated fact)`,
    `BEYOND-FACTS  (the clause asserts nothing the facts decide — interpretation, recommendation, or framing)`,
    `Do not explain. Output only the one word.`,
  ].join('\n');
}

const norm = (s) => {
  const m = (s || '').toUpperCase().match(/\b(ENTAILED|CONTRADICTED|BEYOND[\s-]?FACTS)\b/);
  if (!m) return null;
  return m[1].replace(/\s/, '-') === 'BEYONDFACTS' ? 'BEYOND-FACTS' : m[1].startsWith('BEYOND') ? 'BEYOND-FACTS' : m[1];
};

// one judge call via the local harness ($0). Returns a label or null on failure.
function askOnce(T_str, clause, sentence) {
  const r = spawnSync('claude', ['-p', judgePrompt(T_str, clause, sentence), '--model', JUDGE_MODEL],
    { encoding: 'utf8', timeout: 120000 });
  if (r.error || r.status !== 0) return { label: null, err: r.error ? r.error.message : `exit ${r.status}` };
  return { label: norm(r.stdout), raw: (r.stdout || '').trim().slice(0, 60) };
}

// k votes -> majority + split. label 'ERROR' if the call mechanism is unavailable; 'UNSTABLE' on a tie.
function judge(T_str, clause, sentence) {
  const votes = {};
  let anyErr = null, ok = 0;
  for (let i = 0; i < JUDGE_K; i++) {
    const { label, err } = askOnce(T_str, clause, sentence);
    if (err) { anyErr = err; continue; }
    ok++;
    const key = label || 'UNPARSED';
    votes[key] = (votes[key] || 0) + 1;
  }
  if (ok === 0) return { label: 'ERROR', votes, err: anyErr };
  const ranked = Object.entries(votes).sort((a, b) => b[1] - a[1]);
  if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) return { label: 'UNSTABLE', votes };
  return { label: ranked[0][0], votes };
}

const MACH2JUDGE = { entailed: 'ENTAILED', flagged: 'CONTRADICTED', defer: 'BEYOND-FACTS' };

const main = async () => {
  const T = await emitTrace();
  const A = arms(T);
  const T_str = traceFacts(T);

  // build the two buckets from the SAME checker the interface gate used (single source of truth)
  const rows = ['SOLO', 'PANEL'].flatMap((k) => scoreArm(k, A[k], T).rows.map((r) => ({ ...r, src: k })));
  const items = rows.map((r) => ({
    src: r.src, machine: r.v, clause: r.cl, sent: r.sent,
    arm: r.v === 'defer' ? 'B' : 'A',            // A = machine-decided (entailed|flagged); B = residue
  }));
  // doubly-blind: merge both arms, shuffle, de-label (the judge never sees arm or machine verdict)
  const blind = items.map((it) => ({ ...it, k: Math.random() })).sort((p, q) => p.k - q.k);

  console.log(`\nJUDGE-CONTAINMENT GATE · box-and-box @ ${REF.slice(0, 7)} · judge=${JUDGE_MODEL} k=${JUDGE_K}` +
    ` · input=${WINDOW ? 'CHECKER-WINDOW' : FULL_CONTEXT ? 'CLAUSE-IN-SENTENCE' : 'clause-only'}`);
  console.log('='.repeat(82));
  console.log('TRACE FACTS shown to the judge (ground truth):');
  console.log(T_str.split('\n').map((l) => '  ' + l).join('\n'));
  console.log(`\nclauses: ${items.filter((i) => i.arm === 'A').length} machine-decided (Arm A) · ` +
    `${items.filter((i) => i.arm === 'B').length} model-defer (Arm B).  Judging blind…\n`);

  // ---- run the judge (graceful degrade if the harness call is unavailable) -----------------------
  const probe = judge(T_str, blind[0].clause, blind[0].sent);
  if (probe.label === 'ERROR') {
    console.log(`⚠ judge call unavailable (${probe.err}). Emitting BLIND packet for manual / different-model judging.`);
    console.log(`  frozen prompt template + trace facts above; grade each clause ENTAILED|CONTRADICTED|BEYOND-FACTS.\n`);
    blind.forEach((it, i) => console.log(`  [${String(i + 1).padStart(2)}] "${it.clause}"`));
    const key = blind.map((it, i) => `${i + 1}:${it.arm}/${it.machine}`).join(' ');
    console.log(`\n  (unblind key, base64 — do NOT consult before grading):  ` +
      Buffer.from(key).toString('base64'));
    process.exit(3);
  }
  blind[0].judged = probe;
  for (let i = 1; i < blind.length; i++) blind[i].judged = judge(T_str, blind[i].clause, blind[i].sent);

  // ---- score ARM A (soundness) -------------------------------------------------------------------
  const armA = blind.filter((i) => i.arm === 'A');
  const inversions = [], weak = [], agreeA = [], unstableA = [];
  for (const it of armA) {
    const j = it.judged.label, want = MACH2JUDGE[it.machine];
    if (j === 'UNSTABLE' || j === 'UNPARSED') { unstableA.push(it); continue; }
    const isInversion = (it.machine === 'entailed' && j === 'CONTRADICTED') ||
      (it.machine === 'flagged' && j === 'ENTAILED');
    if (isInversion) inversions.push(it);
    else if (j === 'BEYOND-FACTS') weak.push(it);
    else if (j === want) agreeA.push(it);
    else unstableA.push(it); // any other mismatch (shouldn't occur) — report, don't hide
  }

  // ---- score ARM B (containment) -----------------------------------------------------------------
  const armB = blind.filter((i) => i.arm === 'B');
  const confirmed = [], underDecision = [], unstableB = [];
  for (const it of armB) {
    const j = it.judged.label;
    if (j === 'UNSTABLE' || j === 'UNPARSED') unstableB.push(it);
    else if (j === 'BEYOND-FACTS') confirmed.push(it);
    else underDecision.push(it); // judge grounded a clause the machine punted on
  }

  // ---- report ------------------------------------------------------------------------------------
  const pct = (n, d) => (d ? (100 * n / d).toFixed(0) : '—') + '%';
  console.log('ARM A — SOUNDNESS (judge grades machine-decided clauses, blind to the verdict):');
  console.log(`  agree ${agreeA.length}/${armA.length} (${pct(agreeA.length, armA.length)})   ` +
    `weak(judge BEYOND-FACTS) ${weak.length}   unstable ${unstableA.length}   INVERSIONS ${inversions.length}`);
  for (const it of inversions) console.log(`    ✗ INVERSION  machine=${it.machine}  judge=${it.judged.label}  "${it.clause}"`);
  for (const it of weak) console.log(`    · weak  machine=${it.machine}  judge=BEYOND-FACTS  "${it.clause}"`);

  console.log('\nARM B — CONTAINMENT (judge grades the model-defer residue):');
  console.log(`  confirmed(BEYOND-FACTS) ${confirmed.length}/${armB.length} (${pct(confirmed.length, armB.length)})   ` +
    `UNDER-DECISION ${underDecision.length}   unstable ${unstableB.length}`);
  for (const it of underDecision) console.log(`    ! grounded  judge=${it.judged.label}  "${it.clause}"`);

  // ---- verdict -----------------------------------------------------------------------------------
  console.log('\n' + '='.repeat(82));
  if (inversions.length > 0) {
    console.log(`VERDICT: ARM A HARD KILL — ${inversions.length} inversion(s). The mechanical layer is NOT sound;`);
    console.log(`  an independent ${JUDGE_MODEL} judge contradicted a verdict the machine committed. "No model in`);
    console.log(`  the verdict" is false on this trace. (Same-family kill ⇒ strong: inverted by its own lineage.)`);
    process.exit(1);
  }
  console.log(`VERDICT: ARM A PASS — 0 inversions; mechanical verdicts independently corroborated by ${JUDGE_MODEL}`);
  console.log(`  (${pct(agreeA.length, armA.length)} agree, ${weak.length} could-not-confirm, no contradiction). First check vs a non-author.`);
  const underFrac = armB.length ? underDecision.length / armB.length : 0;
  if (underFrac > 1 / 3) {
    console.log(`ARM B: UNDER-DECISION — judge grounded ${underDecision.length}/${armB.length} defer clauses. The residue leaks`);
    console.log(`  decidable work to the model; tighten the matcher and re-run. Containment of the current boundary NOT shown.`);
  } else {
    console.log(`ARM B: CONTAINMENT CONFIRMED — judge could not ground ${confirmed.length}/${armB.length} of the residue.`);
    console.log(`  A verdict no model touched, corroborated by a model that didn't produce it and couldn't see its answer.`);
  }
  console.log(`(honesty: judge=${JUDGE_MODEL} is same-vendor; cross-vendor would harden the PASS, not the verdict shape.)`);
};

main().catch((e) => { console.error('judge-containment error:', e.message); process.exit(2); });
