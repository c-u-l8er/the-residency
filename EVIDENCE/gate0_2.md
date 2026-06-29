# Gate 0.2 — does an H3 FALSIFIER seat flip the board ahead of the single critic?

**Verdict: YES — first positive flip. `board_lift (precision) = +0.125` on n=4** (board
0.875 vs single 0.75). The stance-free entailment auditor raised the *same* Gate 0.1 board
findings from precision **0.50 → 0.875** on these four threads, fixing exactly the two losses
it was designed for: b2's confident fabrication and l3's manufactured hedge. This is the
first arm in the gate series to beat the single critic — but it is **n=4, not 6** (b3+l2 are
harness-incomplete), and l1 shows the falsifier can *over-deny*. Treat as encouraging, not
settled.

> Follow-up to `EVIDENCE/gate0_1.md`. Gate 0.1 falsified the "every board loss is a missing
> quote" bet and named the next lever: **H3 — a stance-free FALSIFIER / entailment seat**
> ("does *this* line *entail* *this* claim?", not "does a quote exist") plus **H6 — reward
> calibrated commitment symmetrically** (penalize both confident-wrong AND unwarranted
> hedging when the corpus settles the question). Gate 0.2 builds exactly those two and
> re-runs.

## Method (deltas from Gate 0.1) — a clean single-variable test

To isolate H3+H6 as the *only* change, Gate 0.2 **reuses Gate 0.1's exact debate posts and
its extractive board findings** (loaded from `gate0_1.transcript.json`) and adds only:

- **H3 — falsifier seat** (`falsify()`): a stance-free auditor reads each board finding +
  the hydrated source and emits one verdict per claim —
  `VERDICT: <ENTAILED | NOT_ENTAILED | HEDGE_UNWARRANTED> :: <claim fragment> :: <verbatim quote + why>`.
  It does not argue a side; it only asks whether each line of source *entails* each claim.
- **H6 — symmetric-commitment revision** (`revise()`): DROP every `NOT_ENTAILED` claim,
  COMMIT wherever `HEDGE_UNWARRANTED` (the source settles it), keep only `ENTAILED` + the
  newly-committed points.
- **Control unchanged:** the single critic is **carried from Gate 0.1 verbatim** (precision
  0.833 over 6; **0.75 over these same 4**). No new soloist run — same arm, same scores.

- **Corpus:** identical — box-and-box @ `353d1679` (+`compose.mjs`, 9 files, live).
- **Same local `claude` harness, zero API cost.**
- **n = 4 threads** (b1, b2, l1, l3). **b3 + l2 did not complete** — repeated harness
  cold-start timeouts under memory pressure (electron + claude-code), even at 300 s and
  reduced source blocks. They are resumable (`GATE0_THREADS=b3,l2 node EVIDENCE/gate0_2.mjs`)
  when the box is less loaded. Crucially, **the two threads H3 was designed to fix (b2, l3)
  both completed**, so the mechanism test is intact even at n=4.
- **Adjudicated by hand against source. Adjudicator is Claude, not an independent human.**

## Result — the falsifier fires exactly where designed

| metric (same 4 threads) | single (A, carried) | Gate 0.1 board (B′) | Gate 0.2 board (B″) |
|---|---|---|---|
| **finding_precision** | 0.75 | **0.50** | **0.875** |

**`board_lift (precision) = 0.875 − 0.75 = +0.125` → first time > 0.** H3 raised the board
**0.50 → 0.875** on the identical findings — pure attribution to the falsifier+revision seat.

## Per-thread adjudication (correctness, revised findings vs source)

| thread | falsifier verdicts | revised board outcome | score | note |
|---|---|---|---|---|
| b1 ordering forced? | 5 NOT_ENTAILED / 3 ENTAILED | ✓ committed: filter-sequencing locks feasible▸permitted, 0̲-annihilation locks permitted▸best, contrary-to-duty escalation closes the silent-fallback gap | **1.0** | falsifier correctly killed the "type-constraint / category-error" overclaim (both `consume` + `adjudicateStatus` run in the same `.map()`); survives as a clean filter+algebra answer. Single critic still **0** here (collapses the deontic layer). |
| b2 which semiring? | **9 NOT_ENTAILED / 0 ENTAILED** | ✓ **fabrication fully dropped** → tropical (max,+) default for `vote`+`rollout`, all three available at call site, no rung couples to semiring | **1.0** | **the headline fix.** Gate 0/0.1's persistent "log is correct + β/temperature owned by resource rung" fabrication is rejected line-by-line; nothing survived the entailment check, and the revision lands the correct tropical answer (verify 1/1). |
| l1 annihilate vs down-weight? | 2 ENTAILED / 4 NOT_ENTAILED | ~ right core ("annihilates as semiring 0̲, not a down-weight") but **over-denied the trajectory layer** | **0.5** | **the H3 failure mode.** The falsifier was *right* that "per-step only" was unentailed, but the revision over-corrected into "there is no separate trajectory layer" — box-and-box *does* have a distinct temporal/`supervise` rung. Falsifier can swing from over-claim to over-deny. |
| l3 weaken entrenched core? | **3 HEDGE_UNWARRANTED** / 6 NOT_ENTAILED / 2 ENTAILED | ✓ **hedge reversed → committed**: self-revision can never weaken the entrenched core; `admissible` is a categorical boolean wall, no EVO pricing overrides it | **1.0** | **H6 working as specified.** Gate 0.1's board retreated to "cannot be established from the export surface… unverified"; the `HEDGE_UNWARRANTED` verdicts forced commitment to the answer `reflexive.mjs admissible` plainly settles (verify 1/1). |

**board_post precision:** (1.0 + 1.0 + 0.5 + 1.0) / 4 = **0.875**.
**single control (same 4):** b1 0 · b2 1 · l1 1 · l3 1 = **0.75**.

```yaml
gate0_2_result:
  corpus:               box-and-box @ 353d1679 (+compose.mjs, 9 files, live)
  design:               reuse Gate 0.1 debate+board; add ONLY H3 falsifier + H6 revision; single-critic control carried unchanged
  n_threads:            4          # b1,b2,l1,l3 — b3,l2 harness-incomplete (timeouts)
  finding_precision:    { single: 0.75, gate0_1_board: 0.50, gate0_2_board: 0.875 }
  board_lift_precision: +0.125     # gate0_2_board - single  → FIRST FLIP > 0
  h3_raised_board:      "0.50 → 0.875 on identical findings"
  designed_fixes_landed: { b2_fabrication: dropped (9/9 NOT_ENTAILED), l3_hedge: reversed (3 HEDGE_UNWARRANTED) }
  new_failure_mode:     l1 over-deny (falsifier over-corrected; denied the real temporal/supervise rung) → 0.5
  falsifier_counts:
    b1: { NOT_ENTAILED: 5, ENTAILED: 3 }
    b2: { NOT_ENTAILED: 9, ENTAILED: 0 }
    l1: { ENTAILED: 2, NOT_ENTAILED: 4 }
    l3: { HEDGE_UNWARRANTED: 3, NOT_ENTAILED: 6, ENTAILED: 2 }
  adjudicator:          claude (NOT an independent human)
  cost:                 $0
```

## What H3 + H6 actually changed (honest accounting)

- **b2 fixed — the proof H3 ≠ H1.** Gate 0.1's mechanical citation gate (verify 0.75) let
  the fabrication through *because the quotes existed*; the entailment seat asks the next
  question and rejects all 9 claims. This is the concrete instance the Gate 0.1 note
  predicted: a quote-existence floor cannot touch a real-quote/wrong-mechanism finding, but
  an entailment auditor can.
- **l3 fixed — H6 working.** Denied-ability-to-hedge (Gate 0.1's new failure) is now
  reversed in the *other* direction: `HEDGE_UNWARRANTED` forces commitment where the corpus
  settles it. The board no longer under-commits on l3.
- **l1 regression — the cost.** H3 introduces its own failure mode: **over-denial.** Forced
  to drop everything not strictly entailed by the cited lines, the synthesizer denied a true
  structural fact (the temporal/`supervise` rung) it simply hadn't cited. The falsifier
  trades over-claiming for over-denying; it does not eliminate error, it moves it.
- **Net:** on the threads where the prior board *fabricated or hedged*, H3+H6 is a large win
  (0.50 → 1.0 on b2+l3). On a thread where the prior board was *already roughly right*, H3
  can shave a correct nuance (l1: 1.0-equivalent core, but 0.5 as scored for the over-denial).

## Threats to validity / what this is NOT

- **n = 4, not the planned 6.** b3 + l2 are missing for *operational* (harness timeout), not
  scientific, reasons. The +0.125 is real on the completed subset but the headline number is
  fragile to those two threads. **Resume them before promoting this past "encouraging."**
- **One corpus.** box-and-box is small, precise, law-tested — friendly to an entailment
  auditor. ROADMAP calls for 3–4 corpora; this is still corpus #2. A 3rd (messier) corpus is
  the next de-risking step, and l1's over-denial suggests H3 may behave worse where the
  source is ambiguous or incomplete.
- **Adjudicator is Claude, not a human** — the single largest error source; `finding_precision`
  is a model judging a model. The falsifier verdict *counts* are mechanical/reproducible; the
  per-thread precision scores are judgment.
- **The control was carried, not re-run.** Single-critic = Gate 0.1's exact arm (0.75 on
  these 4). Fair for isolating H3, but it means the "single critic" baseline is one sample.

## Standing recommendation (updated)

Gate 0.1 said: *default to the single critic; do not harden the board until an H3 falsifier
seat flips `board_lift > 0`.* **That condition is now met on n=4** — but the bar for changing
the default to "board+H3" is a flip that **holds at n≥6 and across ≥1 more corpus**, given
l1's over-denial and the two incomplete threads. So: **H3 is the validated lever; promote it
to the standing board config for testing, keep the single critic as the deployed default**
until (a) b3+l2 close and (b) a 3rd corpus reproduces `board_lift > 0`. Per `DIRECTION.md`,
the product is verified findings — and H3 is the first structure-change that demonstrably
produced *more correct* findings, not just more cited ones.

**Reproduce:** ensure harness proxy on :8788, then `node EVIDENCE/gate0_2.mjs`
(resume gaps via `GATE0_THREADS=b3,l2 node EVIDENCE/gate0_2.mjs`), then
`node EVIDENCE/reverify.mjs`. Full transcript: `EVIDENCE/gate0_2.transcript.json`.
