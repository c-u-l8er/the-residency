# verify_run — Action 1 acceptance: `soloist + H3` vs `soloist alone`

**Date:** 2026-06-29 · **Corpus:** box-and-box @ `353d167` (cross-file threads c1–c4) ·
**Producer:** single critic (Gate 0.4 Arm A, verbatim) · **Stage:** `verify-entailment.mjs`
(H3 falsify + H6 commit-revise) · **No board anywhere.** · **$0** (local `claude` harness,
`claude-sonnet-4-6`, serialized) · **n = 4.**

This is the first time the Gate 0 keeper (H3) is applied to the **soloist's** findings rather
than to prop up a board — exactly the standing recommendation from Gate 0 closing negative.

## Result

| thread | ground truth | soloist | → verified | audit verdicts | what the audit did |
|---|---|---|---|---|---|
| c1 | liveness vs CTD escalation = **same design intent, separate code path** | **0.5** — right answer, overclaims a *shared mechanism* (spurious `norm.mjs` cite; "shared envelope confirms it") | **1.0** | 2 ENT / 4 NOT_ENT | dropped 4 overclaims; kept the design-intent comment + "supervise never imports norm.mjs" |
| c2 | SAFETY shield = **separate check, not the bridge's code path** | **1.0** — correct, grounded | **1.0** | 6 ENT / 0 | **left the clean finding untouched — no over-deny** |
| c3 | 0̲ annihilation vs deonticallyVetoed = **categorically different** | **0.5** — right kind-distinction, wrong staging ("before normative eval begins") | **1.0** | 5 ENT / 2 NOT_ENT / 1 HEDGE | dropped the staging error; committed the unwarranted hedge → added the *interleaved one-pass* insight |
| c4 | score can't override an obligatory-feasible option | **1.0** — correct | **1.0** | 6 ENT / 3 NOT_ENT / 1 HEDGE | held the core claim; trimmed cite paraphrases |

- **finding_precision:** soloist `[0.5, 1.0, 0.5, 1.0] = 0.75` → verified `[1.0, 1.0, 1.0, 1.0] = 1.0`.
- **verify lift = +0.25.** Consistent with the board-era H3 repair magnitude (+0.125–0.25) — the
  lever generalizes off the board path onto a single producer, as predicted.
- **Zero over-deny regression.** The two findings the soloist already got right (c2, c4) were left
  at 1.0; the falsifier did **not** knock down any true claim on in-window source. This was the
  specific failure mode the bar warned about — it did not occur.

## Acceptance verdict (Gate 0 briefing, Action 1)

- **Quality bar — PASS.** `soloist + H3` (1.0) ≥ `soloist alone` (0.75), and no over-deny regression.
- **Cost bar (≤2×) — PARTIAL, honestly.** The measured run used **always-revise** = **3×** every
  thread (soloist + falsify + revise). The *audit* (falsify) — the part that flags fabrications —
  is **+1 call = 2×**. The *repair* (revise) is the 3rd call and only earns its keep when the audit
  flags something (c2 was clean and paid for a wasted revise). **Fix shipped:** `verify()` now gates
  revise on a non-clean audit by default — clean findings cost **2×**, flagged findings **3×**
  (this run would average **2.75×**: c2 → 2×, c1/c3/c4 → 3×). To hit a flat ≤2× one would fold
  audit+repair into a single call; not done, flagged as follow-up.

## Mechanical notes

- **Window audits 4/4 healthy.** The selection-crowding fix (pin files the question names by
  filename) put the decisive files back in-window that Gate 0.4 had crowded out — **`bridge.mjs`
  into c2, `score.mjs` into c4**. This retroactively *partly explains* Gate 0.4's c2 "before the
  bridge runs" fabrication: `bridge.mjs` was never in c2's source window then. Some board-era
  fabrications were partly harness source-starvation, not pure model error.
- **`verify_rate = 0` on c3/c4 verified findings is a citation string-match artifact, not an error.**
  Both committed the correct answer but cited the `govern.mjs` precedence comment containing `▸`
  glyphs, so the literal `norm()` match failed. Content adjudicated correct against source. Same
  paraphrase divergence flagged in prior gates — it does not affect precision.

## Caveats (do not over-read)

- **Adjudicator = Claude**, the same model family as the producer and the auditor — the largest
  single error source. n = 4.
- The soloist's **0.75 baseline is unusually high** because windowed + *pinned* source handed it the
  decisive cross-file lines up front; on a weaker retrieval setup the soloist would fabricate more and
  the verify lift would likely be larger, not smaller.
- This is a verification pass over **one model**; it is not a claim about heterogeneous multi-agent.

## Standing conclusion

`producer + verify-entailment` is validated as the residency's default findings mechanism: it lifted
a strong soloist from 0.75 → 1.0 precision with no over-deny regression, at 2× cost on clean findings
and 3× when a repair is actually needed. **Ship it as the default; keep the board behind a research
flag.** Follow-up: fold falsify+revise into one call to make the flagged-finding case 2× as well.
