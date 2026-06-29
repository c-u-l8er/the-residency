# Gate 0.4 — is the board's edge COVERAGE + CALIBRATION (not raw precision)?

**Verdict: NO. `board_lift(precision) = 0.0` a THIRD time — now on a cross-file thread set
explicitly built to favor the board's only theory of advantage (H4 coverage/decomposition).**
board+H3 (1.0) TIES the single critic (1.0) on n=4; the H1+H2 coverage panel alone LOSES
(0.75, board_lift −0.25). Worse for the coverage thesis: **the single critic out-COVERED the
panel** (3.25 vs 2.25 distinct files cited), and the coverage panel's failure mode is a *new,
named one — fabricated cross-file COUPLINGS* (it invented relationships between rungs that the
source never makes). H3 again repairs the board to parity (+0.25) but never past it. And the
SRC_CAP fix incidentally **deflated Gate 0.3's one positive qualitative finding**: with the
decisive lines back in-window, the single critic stopped fabricating, so the "structure converts
fabrication → honest abstention" edge from p3 was substantially an artifact of the truncation bug.

> Fourth run in the gate series, and the first to test **H4** (the decompositional coverage panel)
> and a deliberate **cross-file** thread set. Gate 0.3 left two untested hopes: (a) the board wins
> on questions that *require* synthesizing multiple files (its single historical win, b1, was
> coverage), and (b) structure's real value is *calibration* (honest abstention over confident
> fabrication), which `finding_precision` can't see. Gate 0.4 builds exactly the experiment those
> two hopes call for. Neither survives.

## Method — coverage panel + cross-file threads + the p3 truncation fix

A self-contained full pipeline (like Gate 0.3), with three deltas designed to give the board its
best possible shot:

- **Corpus: box-and-box @ `353d1679`** — the layered 8-rung kernel, where rungs live in **separate
  files** and `bridge.mjs`/`govern.mjs` compose them. If coverage ever helps, it helps here.
- **Cross-file threads (c1–c4)** — each thread's ground truth is *stated in one file's comment* but
  the *mechanism lives in another*, so a soloist reading only the top-relevance file misses half. I
  established each ground truth by reading the two files directly:
  - **c1** — is `supervise.mjs`'s liveness escalation a different mechanism from `govern.mjs`'s
    contrary-to-duty obligation escalation, or the same one over a trajectory? (GT: **conceptually
    the same** CTD pattern — `supervise.mjs` head: liveness "triggers the same contrary-to-duty
    escalation as a 1-step deontic obligation. (Deontic obligation = the 1-step case.)" — but
    **mechanically a separate re-implementation**: `supervise.mjs` imports only `temporal.mjs`,
    builds `r.escalation = spec.ctd || 'escalate-to-human'` inline, and never calls `norm.mjs`'s
    `escalate()`.)
  - **c2** — does the temporal SAFETY shield enforce the same alethic floor as `consume()`/the
    bridge, same code path? (GT: **same modality** — "SAFETY specs (G ¬bad) extend the alethic floor
    across time" — **distinct mechanism, zero shared code path** (LTL `progress`/`residualOf` vs the
    one-shot `consume()` predicate); no source establishes a pipeline ordering between them.)
  - **c3** — is the bridge's `0̲` annihilation the same kind of exclusion as `govern`'s
    `deonticallyVetoed`? (GT: **categorically different** — alethic `0̲` is an un-resurrectable wall
    ("no heuristic utility, however large, can resurrect a vetoed option"); deontic FORBIDDEN is an
    `overridable: true` norm reachable only by floor survivors. Nuance: in `govern.mjs` both layers
    *co-execute in one `map` pass* — the floor does not temporally precede norms there.)
  - **c4** — can a higher axiological score override an OBLIGATORY-and-feasible option? (GT: **no** —
    `pool = (obligatoryFeasible.length ? obligatoryFeasible : admissible)`: obligation *replaces* the
    pool, so utility only ranks *within* it; obligation is utility-proof like the floor, but at the
    deontic layer.)
- **Coverage panel (H4)** — Arm B′ is no longer a stance debate; it is **one resident per rung/file**
  ("is my rung implicated? quote a line, or say *not implicated*"), and the synthesis is the
  **UNION of grounded per-rung observations**, not a consensus. Each panel seats the implicated
  rungs **plus one likely-not-implicated control** to test honest "not my rung."
- **The Gate 0.3 p3 fix — relevance-windowed source.** Replaces the flat `slice(0, SRC_CAP)` (which
  hid `t05KappaRouting()` at char 4922) with a windowed extractor: always keep the file's **head
  comment** (where box-and-box states the cross-file relationship) **plus a ±6-line window around
  every query-term hit**. The decisive line is no longer truncated out.

Arms (same local `claude` harness, **$0**; 7 calls/thread × 4 = 28 serialized):
**single** (A) · **board_pre** coverage panel → extractive union (B′, H1+H2+H4) · **board_post**
B′ → H3 falsifier → H6 commit-revision (B″).

**Adjudicated by hand against source. Adjudicator is Claude, not an independent human.**

## Result

| metric (n=4) | single (A) | coverage board (B′) | board +H3+H6 (B″) |
|---|---|---|---|
| **finding_precision** | **1.0** | **0.75** | **1.0** |
| **distinct files cited (coverage proxy, H4)** | **3.25** | 2.25 | 2.25 |

- `board_lift(B″ vs single) =` **0.0** — TIE, the **third corpus/thread-set in a row** where the
  audited board does not beat the soloist (Gate 0.2 +0.125 on box-and-box was the lone, non-replicating exception).
- `board_lift(B′ vs single) =` **−0.25** — the H1+H2+H4 coverage board LOSES, exactly the magnitude
  of every prior unaudited board (Gate 0/0.1/0.3).
- **H3 repair (B′ → B″) = +0.25** — replicates the reliable falsifier repair (Gate 0.2/0.3 were
  +0.125); here it claws back *both* over-claims (c1, c2).
- **Coverage refuted on its own terms:** the **single critic cited MORE distinct files (3.25) than
  the coverage panel (2.25)**. A soloist *told to read across files* out-covers a panel of
  per-rung owners. H4's premise — that decomposition yields more coverage — does not hold.

## Per-thread adjudication

| thread | single | B′ (coverage) | B″ (+H3) | what happened |
|---|---|---|---|---|
| **c1** liveness vs CTD | 1.0 | **0.5** | 1.0 | **the H4 failure mode, named.** B′ fabricated a cross-file *coupling*: "the same CTD repair structure **owned by `norm.mjs`**, with `supervise.mjs` contributing only the multi-step detection." False — `supervise.mjs` imports only `temporal.mjs` and builds its escalation inline; it never calls `norm.mjs`'s `escalate()`. H3 fired **5 NOT_ENTAILED** (incl. "owned by norm.mjs", "same CTD field as norm.mjs's Norm") and forced B″ to the *fully correct two-layer* answer: "a structurally independent re-implementation … conceptually the multi-step generalization of govern.mjs's one-step CTD … but built entirely within supervise.mjs with no import from or call into norm.mjs's `escalate()`." The single got the headline (same, generalized) right and stayed careful — **1.0 without help.** |
| **c2** safety shield vs floor | 1.0 | **0.5** | 1.0 | **same failure mode.** B′ invented a *sequencing*: the temporal check "prunes candidate states **before the bridge ever runs**." No source orders supervise before the bridge. H3 fired NOT_ENTAILED on exactly that line and on "two gates on **the same** alethic floor" (over-merge), and B″ retreated to the calibrated truth: "same conceptual alethic floor through structurally separate … machinery with zero shared code path … **no source-established pipeline sequences them**." Single again **1.0** (separate code paths, "extension of the alethic floor"). |
| **c3** alethic 0̲ vs deontic veto | 1.0 | 1.0 | 1.0 | saturated — all three nail "categorically different" (un-resurrectable wall vs overridable norm). B″ adds a *true* refinement single & B′ glossed: in `govern.mjs` "both alethic and deontic evaluations **co-execute in the same synchronous map pass**" (govern's `options.map` computes `feas` and `status` together). Highest-quality, but precision already maxed. |
| **c4** obligation vs gradient | 1.0 | 1.0 | 1.0 | saturated — all three: a higher score cannot override an obligatory-feasible option. B″ is most precise — names the exact mechanism (`pool` restricted to obligatory-feasible, `verify_rate = 1.0`). |

**precision:** single (1+1+1+1)/4 = **1.0** · B′ (.5+.5+1+1)/4 = **0.75** · B″ (1+1+1+1)/4 = **1.0**.

## What this tells us (honest accounting)

1. **H4 — the board's last theory of advantage — does not beat a strong soloist, and is refuted on
   its own metric.** On a thread set *built* to require cross-file synthesis, the soloist that is
   simply *told* "many answers need two files — read across them" matched the board on precision
   (1.0 = 1.0) and **out-covered it** (3.25 > 2.25 files). Decomposition into per-rung owners did
   not surface more of the corpus; it surfaced less.
2. **The coverage panel has its own fabrication mode: invented cross-file COUPLINGS.** Asking
   per-rung owners to *relate* their rung to another's manufactures relationships the source never
   makes — c1's "owned by norm.mjs" (supervise re-implements, never delegates) and c2's "before the
   bridge ever runs" (no such ordering). This is the cross-file analog of Gate 0's herding/fabrication
   failure: structure that is supposed to *add* coverage instead adds *confident over-coupling*.
3. **H3 remains the single validated lever.** It caught both fabricated couplings (5 NOT_ENTAILED on
   c1, the sequencing NOT_ENTAILED on c2) and repaired the board to parity (+0.25, consistent with
   +0.125 in Gate 0.2/0.3). Across four runs H3 reliably *repairs* a board; it has never *advanced*
   one past the soloist on a second corpus.
4. **The SRC_CAP fix worked — and deflated Gate 0.3's one qualitative win.** With the decisive lines
   back in-window, **the single critic did not fabricate on any cross-file thread** (calibration
   saturated at correct-commit for both single and board_post; no arm abstained, none confabulated a
   final wrong answer). So Gate 0.3's p3 finding — "the soloist fabricates confidently, board+H3
   abstains honestly" — was **largely an artifact of the truncation bug**, not a general property of
   structure. Fix the harness and the soloist stops fabricating; the calibration gap closes with it.
   This is a correction to the prior gate, in the deflating direction.
5. **The only residual signal is qualitative, not precision.** On *every* thread, board_post was the
   most *complete* answer — it surfaced the mechanical nuance (separate re-implementation c1;
   no-pipeline-ordering c2; co-execution-in-one-map-pass c3; pool-restriction c4) that the soloist
   glossed while still scoring a defensible 1.0. If "depth/completeness of a verified finding" were
   the product axis, board+H3 has a real edge — but that is **not `finding_precision`**, the
   soloist's glosses were not *wrong*, and the edge costs **7× the calls**.

## Threats to validity

- **n = 4, adjudicator is Claude.** Same caveat as every prior gate; the falsifier verdict counts,
  the distinct-file coverage counts, and the windowing are mechanical/reproducible — the precision
  scores are model-judging-model.
- **c3 + c4 saturated at 1.0 across all arms** — even cross-file, two of four threads were settleable
  by a careful soloist, so discriminating power again concentrated in c1+c2 (the two B′ over-claims).
- **The single critic was prompted to read across files** ("many answers need two files"). That is
  the fair comparison — the board gets H4 decomposition, the soloist gets the instruction — but it
  means the soloist baseline is a *coached* soloist, not a naive one. A naive soloist might flatten
  more (cf. Gate 0's b1), which is exactly the niche H4 was meant to own; the coached soloist closes it.
- **Single-run, no resampling.** Each arm is one sample.
- **`verify_rate` artifact persists** — models paraphrase multi-line quotes onto one line (e.g. c3
  board_post `verify_rate = 0` despite a correct claim). Affects only the citation metric, not the
  hand-adjudicated precision.

## Standing recommendation (after 3 corpora/thread-sets)

**Default to the single critic — now strengthened, not merely held.** Across box-and-box (Gate 0/0.1/0.2),
PULSE (0.3), and box-and-box cross-file (0.4), the audited board's record vs the soloist on
`finding_precision` is **−0.33 → −0.25 → +0.125 → 0.0 → 0.0**: one non-replicating win on a small
law-tested corpus, ties or losses everywhere else, and now a tie *even on the cross-file threads
designed to favor it, where it also under-covered the soloist*. **H4 (coverage/decomposition) is
falsified as a board advantage; the coverage panel additionally introduces fabricated cross-file
couplings.** Keep **H3** (the stance-free falsifier) as the one validated structure — but apply it
**to the soloist's findings, not to prop up a board**: H3 repairs whatever produces the finding, and
the cheapest reliable producer remains one coached critic. Per `DIRECTION.md`, the board is an
implementation detail; three runs now say the implementation is a single critic with a falsifier
pass. The one thing left to value — board_post's qualitative *completeness* — is not the gate's
metric and does not justify 7× cost. **Gate 0 closes negative; do not harden the board.**

**Reproduce:** harness proxy on :8788, then `node EVIDENCE/gate0_4.mjs`
(`GATE0_THREADS=c1,c2,c4 …` for subsets). Transcript: `EVIDENCE/gate0_4.transcript.json`.
The windowed-source fix lives in `windowed()`; tune via `GATE0_WIN` / `GATE0_HEAD_LINES` / `GATE0_SRC_CAP`.
