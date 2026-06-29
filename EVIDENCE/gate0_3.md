# Gate 0.3 — does the Gate 0.2 H3 flip GENERALIZE to a 3rd, messier corpus?

**Verdict: the flip does NOT generalize to a win. On PULSE, `board_lift(H3) = 0.0` (board
0.875 = single 0.875, n=4) — a TIE, not the +0.125 win Gate 0.2 saw on box-and-box.** The H3
*repair* replicates almost exactly (board H1+H2 0.75 → board+H3 0.875, a +0.125 lift,
identical magnitude to Gate 0.2), but on this corpus it only lifts the board **up to parity**
with an already-strong single critic — it does not push past it. **The standing recommendation
holds and is now evidenced across two corpora: default to the single critic.** H3 is a
reliable board-repair, not a reliable board-advantage.

> Third corpus in the gate series. Gate 0.2 found the first positive `board_lift` (+0.125) on
> box-and-box — but box-and-box is small, precise, law-tested: structurally friendly to an
> entailment auditor, and the l1 thread already showed H3 can over-deny. The ROADMAP
> de-risking step is "run on a 3rd corpus and see whether the verdict generalizes." It does
> not, in the direction that matters.

## Method — full Gate 0→0.1→0.2 arc reproduced on one fresh corpus

Unlike Gate 0.2 (a falsifier bolted onto Gate 0.1's transcript), Gate 0.3 is a **self-contained
full pipeline**: for each thread it runs all three arms on the SAME fresh corpus, so they are
directly comparable in one pass —

- **single** (Arm A): one strong critic, grounded + CITES. `[1 call]`
- **board_pre** (Arm B′): 3-resident debate → EXTRACTIVE synthesis (H1 grounding + H2 extractive). `[4 calls]`
- **board_post** (Arm B″): board_pre → H3 falsifier → H6 commit-revision. `[2 calls]`

= 7 harness calls/thread × 4 threads = 28 serialized calls, same local `claude` harness, **$0**.

- **Corpus: PULSE (OS-010) @ `94eb994`** — deliberately MESSIER than box-and-box: mixed
  TypeScript runtime (`tokens.ts`, `conformance.ts`, `schema.ts`) + a JSON Schema + prose docs
  + a CLI. 6 files hydrated live from raw.githubusercontent.com.
- **4 threads**, each with a crisp source-settled ground truth I established by reading the
  schema enums, the `TOKEN_KINDS` array, and the conformance test bodies directly:
  - **p1** — how many phase KINDS? (GT: the `kind` enum has 6 — `retrieve, route, act, learn, consolidate, custom`)
  - **p2** — how many cross-loop tokens, and can a downstream protocol add its own? (GT: 6 canonical `TOKEN_KINDS` + fork-free vendor tokens `<vendor>.v<N>.<Name>`, v0.1.2; vendor tokens carry opaque data, no conformance coverage)
  - **p3** — when does conformance T05 FAIL a manifest for κ-routing? (GT: iff `invariants.kappa_routing === true` AND no `route` phase; a pure static pass/fail, never pending)
  - **p4** — which top-level fields are required; is `connections` one? (GT: 8 required; `connections` is optional)
- **Adjudicated by hand against source. Adjudicator is Claude, not an independent human.**

## Result

| metric (n=4) | single (A) | board H1+H2 (B′) | board +H3+H6 (B″) |
|---|---|---|---|
| **finding_precision** | **0.875** | **0.75** | **0.875** |

- `board_lift(B′ vs single) = 0.75 − 0.875 =` **−0.125** — the H1+H2 board LOSES, same direction
  and nearly the same magnitude as Gate 0/0.1 on box-and-box. The herding/over-deny failure of a
  grounded-but-unaudited board reproduces on a fresh corpus.
- `board_lift(B″ vs single) = 0.875 − 0.875 =` **0.0** — H3 recovers the board to **parity**, not
  a win.
- **H3 repair (B′ → B″) = +0.125** — *this* replicates Gate 0.2 exactly (Gate 0.2 raised the board
  0.50 → 0.875 on the threads it fixed; here 0.75 → 0.875). The falsifier reliably repairs ~1
  thread's worth of precision. What does NOT replicate is the board ending up *ahead* of the single
  critic.

## Per-thread adjudication

| thread | single | B′ (H1+H2) | B″ (H3+H6) | what happened |
|---|---|---|---|---|
| p1 phase kinds | 1.0 | 1.0 | 1.0 | all three correctly say six (`retrieve…custom`, closed enum, `additionalProperties:false`). No differentiation. |
| p2 tokens | 1.0 | 1.0 | 1.0 | all three correct: 6 canonical + fork-free vendor extension; vendor tokens opaque, no conformance coverage. Falsifier fired 3 NOT_ENTAILED — incl. over-denying "all six get a typed `*Data` interface" (they DO; the source block was truncated) — but B″ kept the correct canonical-vs-vendor distinction, so no precision loss. **Confirms H3 over-denies on truncated source (the l1 mode), here harmlessly.** |
| p3 T05 κ-routing | **0.5** | **0.0** | **0.5** | **the decisive thread, and a methodology finding.** The `t05KappaRouting()` body sits at char 4922 of `conformance.ts`; the harness's `SRC_CAP=2600` truncation **hid the answer from every arm.** single FABRICATED a confident wrong mechanism (a "κ-routing *signal connection*" trigger + an invented "pending runtime half" — neither exists; T05 keys off the `kappa_routing` *invariant flag* and is a pure pass/fail) → 0.5. B′ confidently asserted the OPPOSITE of the truth ("a missing route phase CANNOT be the T05 fail condition") → 0. B″'s falsifier caught B′'s overclaim and forced retreat to "cannot be established from the provided source" — honest, non-fabricated, correctly scoped to the truncated evidence → 0.5. |
| p4 required fields | 1.0 | 1.0 | 1.0 | all three correct: 8 required, `connections` optional. Notably B′ hedged the (tangential) conformance-pending point as "unknowable without truncated bodies"; **H6 correctly forced B″ to COMMIT** — the `conformance.ts` file-level comment DOES settle the pending policy (a clean HEDGE_UNWARRANTED → commit, H6 working). Both land 1.0 on the core; B″ is strictly higher-quality. |

## What this tells us (honest accounting)

1. **The Gate 0.2 "first flip" was corpus-specific, not a general property of H3.** Across the two
   corpora now measured, `board_lift(post)` is **+0.125 (box-and-box)** and **0.0 (PULSE)** — mean
   ≈ +0.06, n=8 threads total, and the win came entirely from one small, law-tested corpus where a
   single critic had more room to stumble. On PULSE the single critic was strong (0.875), so there
   was little headroom for a board to beat it.
2. **What DOES generalize is the H3 *repair magnitude* (+0.125 both times) and the H1+H2 board's
   *loss* (−0.25 box-and-box, −0.125 PULSE).** A grounded-but-unaudited board reliably
   underperforms the single critic; adding the falsifier reliably claws back ~one thread. The net
   is "board+H3 ≈ single," not "board+H3 > single."
3. **p3 is a methodology finding, not just a datapoint.** On a messier/larger corpus the gate's
   `relevant() + SRC_CAP` truncation can hide the decisive source line, after which the **single
   critic fabricates confidently** while **board+H3 retreats honestly.** If you weight "don't
   fabricate under insufficient evidence," board+H3 is *epistemically* better on p3 even though
   raw precision scores it a tie. This is the one axis where structure (the stance-free auditor)
   shows a qualitative, not just quantitative, edge — it converts a confident hallucination into a
   calibrated "insufficient evidence."
4. **H3's over-deny mode (l1 in Gate 0.2) reappeared on p2** — it denied a true "all six get typed
   interfaces" claim because the source was truncated. Same root cause as p3: truncation. The
   falsifier is only as good as the source window it is shown.

## Threats to validity

- **n = 4 per corpus, 8 total, adjudicator is Claude.** Same caveats as Gate 0.1/0.2. The
  precision scores are model-judging-model; the falsifier verdict counts and the truncation
  measurements are mechanical/reproducible.
- **p1, p2, p4 saturated at 1.0 across all arms** — three of four PULSE threads were answerable by
  a single critic with no help, so this corpus had little discriminating power. A harder thread set
  (or fixing the SRC_CAP truncation so p3-style threads are actually answerable) would sharpen the
  comparison. The truncation that broke p3 is a harness limitation to fix before a 4th corpus.
- **Single-run, no resampling.** Each arm is one sample.

## Standing recommendation (after 2 corpora)

**Default to the single critic. Do not promote the board.** The Gate 0.2 flip does not survive a
second corpus — board+H3 ties the single critic on PULSE and beat it only on the small law-tested
box-and-box. H3 remains the one validated lever (it reliably repairs the H1+H2 board's loss and,
on p3, converts fabrication into honest abstention), so **keep H3 in the board config for testing,
but the deployed default stays the single critic.** Before any further board work: **fix the
`SRC_CAP` source-truncation** (p3 proved it can hide the decisive line on larger files), then
re-run with a more discriminating thread set. Per `DIRECTION.md`, the board is an implementation
detail; two corpora now say structure has not earned its place over a strong soloist.

**Reproduce:** harness proxy on :8788, then `node EVIDENCE/gate0_3.mjs`. Transcript:
`EVIDENCE/gate0_3.transcript.json`.
