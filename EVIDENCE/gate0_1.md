# Gate 0.1 — does a GROUNDING-GATED board beat a (sampled) single critic?

**Verdict: still NO. `board_lift (precision) = −0.25`** (Gate 0 was −0.33 — improved, not
flipped). The grounding gate raised the board's *citations* but not its *correctness*.
The falsifiable bet from `deliberation-redesign.md` is **falsified**: not every board
loss traces to a missing quote — the worst one (b2) is a confident **misreading of real
quotes**, which a quote-existence gate cannot catch.

> Follow-up to `EVIDENCE/gate0.md`. Tests H1 (mechanical grounding gate — every claim
> carries a verbatim source quote, string-matched against hydrated source) + H2
> (extractive synthesizer — may only keep claims/quotes that appeared in the posts),
> plus an A′ control (k=3 self-consistency soloist + verifier, H5). Also fixes Gate 0's
> b3 bug by hydrating `compose.mjs`.

## Method (deltas from Gate 0)

- **Corpus:** Gate 0's 8 files **+ `compose.mjs`** (9 total), live @ `…@353d1679`. This
  removes Gate 0's one acknowledged unfairness — the `&`/`|>` operators are now in scope.
- **Three arms, same local `claude` harness (zero API cost):**
  - **A — single critic** (control), now emitting a `CITES:` block.
  - **A′ — k=3 self-consistency soloist + verifier** (H5): runs the critic 3×, keeps the
    sample with the highest citation-verify rate.
  - **B′ — board → EXTRACTIVE synthesis** (H1 + H2): 3 personas debate, then one
    synthesizes using *only* claims/quotes that appeared in the posts.
- **H1 verifier** (`EVIDENCE/reverify.mjs`, authoritative reproducible pass): each
  `file :: "quote"` is whitespace+backtick-normalized and literal-matched against the
  hydrated source. *(A normalization bug — not stripping markdown backticks — was found
  and fixed mid-run; it had spuriously zeroed grounded findings, e.g. b2-single `0/12 →
  11/12`. All numbers below are the corrected pass.)*
- **n = 6 threads → 18 findings.** Adjudicated by hand against source. **Limitation: the
  adjudicator is Claude, not an independent human.**

## Two metrics that DIVERGE — this is the headline

| metric | single (A) | sampled (A′) | board (B′) |
|---|---|---|---|
| **citation_verify_rate** (mechanical, H1) | 0.705 | 0.676 | **0.904** |
| **finding_precision** (hand-adjudicated correctness) | **0.833** | **0.833** | 0.583 |

- By **citation grounding**, the board now looks *best* (`+0.20` vs single).
- By **finding correctness**, the board is still *worst* (`−0.25` vs single).

**The grounding gate made the board cite better without making it reason better.** H1
verifies a quote *exists*; it cannot verify the quote *entails the claim*. The board's
residual losses are real quotes wrapped around wrong conclusions.

## Per-thread adjudication (correctness)

| thread | A single | A′ sampled | B′ board | winner | note |
|---|---|---|---|---|---|
| b1 ordering forced? | ✗ collapses layers | ✗ collapses layers | ✓ govern.mjs escalation | **board** | both soloists repeat Gate 0's "one `consume()` gate" error; board surfaces the deontic layer (the b1 pattern, again). |
| b2 which semiring? | ✓ tropical | ✓ tropical | ✗ **fabricated** | **single** | board STILL claims "log is correct + β/temperature owned by the resource rung" — now draped over *real* imports (`test/laws.mjs` imports `epistemic.mjs`/`resource.mjs`). Real quotes, fabricated mechanism. |
| b3 0̲ under &/`\|>`? | ✓ two paths | ✓ two paths + law names | ~ correct-but-hedged | **single** | with `compose.mjs` in corpus *both soloists now nail it* (the `consume` gate + cost-class `unknown⇒uncertified⇒0̲`); board commits the right core then drifts into an unresolved `entrench` tangent and "did not close." |
| l1 annihilate vs down-weight? | ✓ | ✓ | ✓ (+ true trajectory caveat) | **tie** | all three correct; board's `supervise`-residual caveat is real and on-point. |
| l2 escalate vs fallback? | ✓ | ✓ | ✓ | **tie** | **board fixed vs Gate 0** — under H1+H2 it no longer misattributes `residualOf`; clean, grounded (1/1, in_posts=1). |
| l3 weaken entrenched core? | ✓ ratchet | ✓ ratchet | ✗ manufactured doubt | **single** | `reflexive.mjs admissible` (in corpus) plainly blocks repeal/weakening, but board claims it "cannot be established from the export surface… unverified, not disproved." |

**Head-to-head:** single 3 · board 1 · tie 2. **Precision:** single 0.833 · sampled
0.833 · board 0.583.

```yaml
gate0_1_result:
  corpus:               box-and-box @ 353d1679 (+compose.mjs, 9 files, live)
  n_threads:            6
  n_findings:           18   # 6 single, 6 sampled, 6 board
  citation_verify_rate: { single: 0.705, sampled: 0.676, board: 0.904 }
  finding_precision:    { single: 0.833, sampled: 0.833, board: 0.583 }
  board_lift_precision: -0.25    # board - single (correctness)   → still < 0, FAIL
  board_lift_citation:  +0.20    # board - single (grounding)     → POSITIVE but misleading
  vs_gate0:             { board_lift: "-0.33 → -0.25 (improved, not flipped)" }
  head_to_head:         { single: 3, board: 1, tie: 2 }
  duplicate_rate:       0.0
  adjudicator:          claude (NOT an independent human)
  cost:                 $0
```

## What H1 + H2 actually changed (honest accounting)

**It helped, just not enough, and it shifted the failure mode:**
- **l2 fixed.** Gate 0's board misattributed `residualOf` as a deontic obligation
  residual; here the extractive+grounded synthesizer stays on the real `govern.mjs`
  escalation and scores 1/1. Genuine improvement.
- **b3 made fair and won by the soloist.** Adding `compose.mjs` let *both* soloists
  ground the `&`/`|>` annihilation directly — the corpus fix helped the careful critic
  most.
- **b2 NOT fixed.** The board reproduced the exact Gate 0 fabrication with a higher
  citation rate (0.75). This is the proof that **citation_verify_rate ≠ correctness.**
- **New failure: hedging.** Denied the ability to assert ungrounded mechanisms, the
  synthesizer sometimes **retreated to "unverified/unresolved" (b3, l3) instead of
  committing** to the answer the in-corpus source plainly supports. The soloist, forced
  to commit, committed correctly. So debate→synthesize now either **over-claims (b2)** or
  **under-commits (b3, l3)**; the soloist does neither.

## The refined lesson → the next lever is H3, not more H1

The board's three residual losses are **not citation failures**:
- **b2** — a real quote, a *fabricated interpretation* (imports ⇏ a coupling).
- **b3 / l3** — *manufactured doubt* about claims the in-corpus source settles.

A quote-existence floor cannot touch either. What can:
1. **H3 — a stance-free FALSIFIER / entailment seat.** Not "does a quote exist" but
   "does *this* line *entail* *this* claim?" A falsifier reading `reflexive.mjs admissible`
   answers l3 in one step; reading `score.mjs`/`bridge.mjs` defaults kills b2's log claim.
2. **H6 — reward calibrated commitment** symmetrically: penalize *both* confident-wrong
   (b2) *and* unwarranted hedging (b3, l3) when the corpus settles the question.

**H1 + H2 are necessary but insufficient. The board needs an adversary, not just a
floor.** Per `DIRECTION.md` ("the board is an implementation detail; the product is
verified findings"), the current standing recommendation is unchanged and now better
evidenced: **default to the single critic** (0.833, and the *cheaper* arm), and do not
harden the board until an H3 falsifier seat is shown to flip `board_lift (precision) >
0` on a re-run. Self-consistency sampling (A′) added **nothing** over a single critic
here (both 0.833) — so k-sampling is not the lever either.

## Caveats / threats to validity

- **n = 6, one corpus.** `box-and-box` is small, precise, and law-tested — a corpus that
  rewards a committed soloist and punishes both speculation and hedging. A larger/messier
  corpus (TRVM) may behave differently. The ROADMAP calls for 3–4 corpora; this is the 2nd.
- **Adjudicator is Claude, not a human** — the single largest error source; the
  `citation_verify_rate` column is mechanical and reproducible, but `finding_precision` is
  a model's judgment of a model.
- **A verifier-normalization bug was found mid-run** and corrected (`reverify.mjs`);
  always trust `reverify.mjs` over the transcript's stored `verify` field.

**Reproduce:** `node EVIDENCE/gate0_1.mjs` (proxy on :8788), then
`node EVIDENCE/reverify.mjs`. Full transcript: `EVIDENCE/gate0_1.transcript.json`.
