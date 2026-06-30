# PRE-REGISTRATION — the interface gate (frozen before arms were written)

**Question.** Gate 0 killed *board-as-producer* (agents deciding/synthesizing/herding). It said
nothing about *board-as-interface*: agents as a **rendering** of a computation that already happened,
never a step in producing it. This gate tests whether a multi-agent narration of a deterministic
trace is a *better interface* than the alternatives — and whether it can stay honest while doing it.

**Substrate under test.** The `|>`/`&` finding's trace, produced by the deterministic falsifier
(`algebra_probe.mjs`) at REF `353d1679`. The trace is the ground truth: carried `π` per grouping,
the `isZero` verdict per pipeline, the law results, the source-level mechanism. No model produced it.

## The four arms (all render the SAME trace)

1. **VERDICT** — the raw machine output (`isZero((a&b)|>c)=true`, …). Honest, unreadable. Baseline.
2. **SOLO** — one narrator explaining *why* the machine did what it did.
3. **PANEL** — 3 named personas (`falsifier`, `veto`, `norma`) narrating the same trace.
4. **RENDER** — a faithful structural rendering of the trace (the `π` each grouping carried, the
   floor-firing site, the witness) as *shown structure with zero generated sentences*. Nothing to
   fabricate because it asserts nothing beyond the tuples. **This is the null hypothesis the two
   narration arms (SOLO, PANEL) must beat.**

## Axis 1 — GROUNDEDNESS (hard, mechanical, no model; the sound pass/fail)

Every generated sentence in SOLO and PANEL is classified by a **no-model** trace-fact checker into:
- **mech-entailed** — its fact-claims match the emitted trace facts;
- **mech-flagged** — its fact-claims *contradict* the trace (a lie — the b2 fabrication as a UI feature);
- **model-defer** — it makes an interpretive claim with no decidable trace fact.

**The first sub-metric (the honest health check):** per arm, `% mechanically-decided` =
`(mech-entailed + mech-flagged) / sentences`. A *low* mechanically-decided fraction means the
entailment gate has slid back onto a model judge — i.e. the interface no longer inherits the
substrate's soundness; you've rebuilt the model-in-the-loop wearing a UI hat.

RENDER is grounded-by-construction (it projects facts; it asserts nothing else).

## Axis 2 — LEGIBILITY (soft; cannot be measured by entailment; a HUMAN read)

Entailment measures *didn't lie*. It cannot measure *more legible*. So legibility is a human read,
and these two guards (the reason this is a gate and not a vibe on the one axis with no mechanical
backstop) are fixed **now**, before any arm is read:

**Guard A — score blind to arm.** The arms are emitted label-stripped and shuffled. The human rates
them cold, then unblinds. (Claude authored the arms and holds the thesis "multi-agent is the right
interface" — so Claude must NOT self-score legibility; that is the unblinded-same-model problem
pointed at ourselves on the one axis with no mechanical check.)

**Guard B — pre-registered rubric (fixed target, no retrofit).** "More legible" is scored against
exactly one fixed task, decided here and not after reading:

> **From the rendering alone, a newcomer can correctly state (a) WHY the floor fired on `(a&b)|>c`
> but not on `(b&a)|>c`, and (b) WHICH mechanism owns the difference (the order-dependent `π`
> carrier).** Score each arm 0/1 on (a) and 0/1 on (b) for "could a newcomer get this right from
> this arm alone," plus a 1–5 ease rating. Target = (a)+(b) correct at the lowest ease cost.

## Kill criteria (stated up front)

- If SOLO/PANEL `% mechanically-decided` is low while RENDER is ~100% → narration trades soundness
  for prose; the grounded interface is the picture, and the talking is decoration. **Negative result.**
- If **RENDER** scores ≥ SOLO and ≥ PANEL on the pre-registered legibility task → the honest
  interface was never a panel of voices; it was the diagram. **Multi-agent-as-interface dies the way
  multi-agent-as-producer died.** Keep the renderer.
- **PANEL** only survives if it beats **SOLO** on legibility *at equal or better groundedness*. If
  SOLO matches PANEL on both axes, the agents are decoration and verdict+one-narrator was the answer.

## Honesty limitations (named before running)

- Claude authored all four arms; the narration arms were written in good faith to their best, but the
  author holds the thesis. The blind human read (Guard A) is the only defense and it is required.
- The trace-fact checker is a coarse literal-token matcher (same philosophy as the keeper's mechanical
  layer: decide by literal presence, no model). It is sound on the claims it *does* decide; its value
  is the *relative* model-defer fraction across arms, which is robust to its coarseness.
- N is one trace (the `|>`/`&` finding). This gate tests the interface *shape*, not a population.
