# Gate 0 — does a multi-resident board beat a single strong critic?

**Verdict: NO (this run). `board_lift = −0.33`. Gate 0 does not pass.**

> Gate 0 (ROADMAP.md): *"The multi-resident board measurably beats a single-agent
> critic on the same corpus (higher finding precision and/or lower duplicate rate).
> If it does not, there is no point hardening a board a single agent could replace —
> redesign deliberation first."* The gate exists to question the residency's own
> reason to exist. On this run it returns a clean **negative**, and that is reported
> as-is, without inflation.

## Method

- **Corpus:** `box-and-box` (the [&] governance kernel), hydrated **live** from a
  pinned SHA — `c-u-l8er/AmpersandBoxDesign@353d1679`, path `box-and-box/`. 8 source
  files: `README.md`, `bridge.mjs`, `value.mjs`, `score.mjs`, `govern.mjs`,
  `reflexive.mjs`, `index.mjs`, `test/laws.mjs`. Every finding is grounded in real
  source the residency itself embeds. *(Note: `compose.mjs` — which actually defines
  the `&`/`|>` operators — was **not** in the hydrated set; this bites thread b3, see
  below.)*
- **Two arms, identical model + grounding + output format** (`EVIDENCE/gate0.mjs`):
  - **ARM A — single critic:** one strong reviewer reads the question + retrieved
    source and emits one `TYPE/TITLE/CLAIM/BODY` finding.
  - **ARM B — board:** 3 personas debate the thread (each sees the prior posts), then
    one panelist **synthesizes** a finding from the matured thread.
  - The *only* structural difference is the variable under test (solo vs. debate→synthesize).
- **Model:** local `claude` harness via `harness-proxy.mjs` (subscription, **zero API
  cost** — honors the zero-budget constraint). Neither arm gets a model/auth edge.
- **n = 6 threads** → 12 findings (6 single, 6 board). Threads: 3 about the kernel's
  bridge/semiring (`b1`–`b3`) and 3 about its modal laws (`l1`–`l3`).
- **Adjudication:** by hand against the live-pinned source files (read in full:
  `bridge.mjs`, `govern.mjs`, `value.mjs`, `score.mjs`, `reflexive.mjs`, `compose.mjs`,
  `supervise.mjs`). **Limitation: the adjudicator is Claude, not an independent human.**
  Treat precision numbers as directional, not authoritative.

## Per-thread adjudication

| thread | question (abbrev.) | single | board | winner | ground truth (file) |
|---|---|---|---|---|---|
| b1 | is `feasible ▸ permitted ▸ best` ordering forced? | ✗ imprecise | ✓ precise | **board** | `govern.mjs` evaluates `consume()`+`adjudicateStatus()` in one `.map` pass over every option before filtering; escalates obligatory-infeasible, never silent. |
| b2 | which semiring ranks survivors? | ✓ precise | ✗ fabricated | **single** | `score.mjs`: only **tropical** `⊕=max` is idempotent; `bridge.mjs` defaults `tropical`. |
| b3 | does `0̲` annihilate under `&` and `|>`? | ~ partial | ✗ fabricated | **single** | `compose.mjs` `composeAnd`/`composePipe`: explicit `if(isZero) return ZERO` + shared `floored()` gate. (Both arms missed it — file absent from corpus.) |
| l1 | does the alethic floor annihilate or down-weight? | ✓ precise | ✓ precise | **tie** | `value.mjs consume` = boolean gate; `bridge.mjs gatedScore` → `S.zero`; `govern.mjs` filters infeasible. Annihilates. |
| l2 | obligatory-but-infeasible: escalate or fall back? | ✓ precise | ~ partial | **single** | `govern.mjs`: `obligedButBlocked` → `escalation`, `chosen=null` — *"never a silent fallback."* |
| l3 | can self-revision weaken the entrenched core? | ✓ precise | ✗ speculative | **single** | `reflexive.mjs admissible`: repeal-entrenched blocked; amend only if stronger; `entrench` monotone. Strengthen-only. |

**Head-to-head:** single 4 · board 1 · tie 1.

### Where the board went wrong — the same failure mode three times

The board did not lose by being vague; it lost by **manufacturing confident,
real-sounding-but-ungrounded claims** — exactly the herding / confident-wrong
amplification the ROADMAP warned about. The debate→synthesize step *amplified* an
assertive panelist instead of filtering it:

- **b2:** board synthesized that `log` is *"the structurally correct default"* and
  invented a `β`/budget coupling on semiring choice. **Neither is in the code** —
  `bridge.mjs`/`govern.mjs` default `tropical`; nothing couples semiring to the
  epistemic or resource rungs. The single critic got this right.
- **b3:** board fabricated a *"⊕ veto-silence"* failure mode for `&` (`composeAnd`
  does no `⊕` vote at all) and dragged in an irrelevant `entrench`/reflexive
  dependency. Real-sounding, fully fabricated.
- **l2:** board's core answer (escalate) was right, but its distinctive addition cited
  `residualOf` in `supervise.mjs` as a *"deontic obligation residual at composed-brick
  boundaries."* `residualOf` is real — but it is an **LTL safety-shield formula
  residual** (`history.reduce(progress, formula)`), nothing to do with deontic
  obligation. Real symbol, fabricated semantics.
- **l3:** board barely answered the question, instead asserting the reflexive layer
  *"lacks two explicit property-tested guarantees."* Unfalsifiable from the corpus and
  ungrounded — confident elaboration in place of the clean correct answer the single
  critic gave (`reflexive.mjs admissible` is the strengthen-only gate).

The single critic's one clear miss (**b1**) was the mirror image: it over-collapsed,
claiming `bridge.mjs` *"collapses both checks into a single atomic `consume()` gate."*
`consume()` is alethic-only; the permitted/deontic check lives in `govern.mjs`. Here
the **board won** — debate surfaced the deontic layer the solo critic flattened.

## Aggregate metrics

Finding precision = mean over 6 findings, scoring each finding's central claim against
source (`1` defensible · `0.5` answer-right-but-mechanism-shaky-or-misattributed ·
`0` material fabrication / wrong mechanism):

| metric | single | board |
|---|---|---|
| per-thread scores | `0, 1, 0.5, 1, 1, 1` | `1, 0, 0, 1, 0.5, 0` |
| **finding_precision** | **0.75** | **0.42** |
| citation_accuracy (files+behavior cited correctly) | 5/6 ≈ 0.83 | 3/6 ≈ 0.50 |
| duplicate_rate | 0 (6 distinct findings) | 0 (6 distinct findings) |

```yaml
gate0_result:
  corpus:           box-and-box @ 353d1679 (live)
  n_threads:        6
  n_findings:       12   # 6 single, 6 board
  single_precision: 0.75
  board_precision:  0.42
  board_lift:       -0.33   # board_precision - single_precision  → MUST be > 0 to pass
  pass:             false
  head_to_head:     { single: 4, board: 1, tie: 1 }
  duplicate_rate:   0.0     # not the board's failure mode; fabrication was
  adjudicator:      claude (NOT an independent human)  # limitation
  cost:             $0      # local claude harness, no paid API
```

`board_lift = 0.42 − 0.75 = −0.33 < 0` → **Gate 0 not passed.**

## What this means (honestly)

1. **On this corpus, the board is worse than one strong critic** — and worse in a
   specific, diagnosable way: free-text debate let the synthesizer launder a
   confident panelist's invention into a "finding." A single careful reviewer,
   forced to commit, fabricated less.
2. **Do not harden the board yet.** Per the gate's own rule, *redesign deliberation
   first.* The lever is structure: the board needs the **findings-as-typed-objects +
   citation-verification flag + dedup pass** (Horizon-0, task D) so that every
   `CLAIM` must carry a checkable `evidence` pointer and a synthesis cannot assert a
   mechanism that no panelist grounded. The one place the board *won* (b1) is the
   template: debate is valuable when it **surfaces a layer the solo critic flattened**,
   not when it manufactures gaps.
3. **The single-agent advantage may be corpus-specific.** `box-and-box` is small,
   precise, and law-tested — a corpus that rewards a careful soloist and punishes
   speculation. A larger / messier corpus (e.g. TRVM) may invert this. Per the
   ROADMAP, the gate calibrates over **3–4 corpora**; this is **1**. The negative
   here is real but **n is small**.

## Caveats / threats to validity

- **n = 6, one corpus.** Not enough to set a stable baseline; the ROADMAP itself
  calls for 3–4. `board_lift = −0.33` is the measured value, not a law.
- **Adjudicator is Claude, not a human.** Precision scoring is the single largest
  source of error here. A human reviewer pass would supersede these numbers.
- **`compose.mjs` was absent from the b3 corpus**, so *neither* arm could ground the
  `&`/`|>` operators directly — b3 penalizes both, and is the weakest data point.
- **citation_accuracy was scored at file+behavior granularity**, not line-number
  granularity; some model-asserted line numbers (e.g. board's "`test/laws.mjs` line 9")
  were not individually verified and are flagged as model-asserted.

**Reproduce:** `node EVIDENCE/gate0.mjs` (proxy on :8788). Transcript with every post
and finding: `EVIDENCE/gate0.transcript.json`.
