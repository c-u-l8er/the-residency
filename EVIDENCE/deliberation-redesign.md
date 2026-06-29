# Deliberation redesign — what to do about `board_lift = −0.33`

*Follow-up to `EVIDENCE/gate0.md`. The gate said: if the board doesn't beat a single
critic, **redesign deliberation first**. This is that redesign — research + ranked,
falsifiable hypotheses, scoped to the residency's thesis and zero-budget values.*

---

## 1. The thesis already tells us how to read the negative

`DIRECTION.md` is explicit, and it changes everything about how `board_lift = −0.33`
should land:

> *"Findings are the API of the residency; everything else is implementation. Whether
> the residency uses agents, a single critic, symbolic reasoning, TRVM, or something
> not yet invented is an implementation detail. The product is verified findings — so
> that is the only thing the architecture must keep stable."*

So Gate 0's negative is **not existential**. It does not say "the residency fails."
It says **the current board *implementation* does not yet earn its complexity, and a
single strong critic is — on this corpus — the better substrate.** That is a perfectly
thesis-consistent outcome: the residency's job is verified findings; right now the
cheapest reliable producer of them is one careful reviewer, not a debate.

This is also the document *"written to model the restraint it argues for."* The honest,
restrained move is: **default to the soloist now, and only re-introduce board structure
where it provably raises the finding hit rate** (DIRECTION.md non-goals: *"If a feature
does not raise the finding hit rate, it is out of scope."*).

---

## 2. The failure mode is real, named, and reproducible in the literature

The board lost the same way three times (b2, b3, l3) and partially a fourth (l2): the
debate→synthesize step **amplified a confident panelist's invention** instead of
filtering it. This is not a quirk of our run — it is the central documented failure of
multi-agent debate:

- **"Talk Isn't Always Cheap: Understanding Failure Modes in Multi-Agent Debate"**
  (arXiv 2509.05396) — debate *degenerates* when debaters hold a stance regardless of
  correctness; extra rounds cost more and add little.
- **"Peacemaker or Troublemaker: How Sycophancy Shapes Multi-Agent Debate"**
  (2509.23055) — agents reinforce each other; **disagreement rate falls as debate
  proceeds, and that fall correlates with *performance degradation*.** Exactly our b2:
  three personas converged on a fabricated `log`-default + β/budget coupling.
- **CONSENSAGENT** (ACL Findings 2025) — without explicit sycophancy mitigation,
  multi-agent debate can underperform *both* single-agent and multi-agent baselines.
- **"No Free Labels: Limitations of LLM-as-a-Judge Without Human Grounding"**
  (2503.05061) — a judge/synthesizer with no grounding is unreliable. Our synthesizer
  had no mechanical grounding gate, so it laundered `residualOf` (l2) into a meaning the
  source never gives it.

And the *positive* direction is just as well-attested:

- **"Debate Helps Supervise Unreliable Experts"** (2311.08702) and **lechmazur/debate**
  (side-swapped matchups + multi-model judging) — debate *does* help **when it is
  adversarial and gated by a verifier/judge**, rather than collaborative-to-consensus.

**Read together:** our board has the collaborative-to-consensus shape (the losing one)
and lacks the verifier gate + adversarial structure (the winning one). That is a
*fixable design choice*, not a verdict on deliberation.

---

## 3. The one time the board won is the whole design clue

The board beat the soloist exactly once — **b1** — and the mechanism is instructive.
The solo critic *flattened* two rungs ("`bridge.mjs` collapses both checks into a single
`consume()` gate"); the panel happened to include `norma`, whose entire stance is *"the
deontic layer is distinct from the alethic floor."* So the debate **surfaced a layer the
soloist erased**.

> The board's value is **coverage / decomposition**, not **consensus**. It wins when
> different residents *own different rungs* and force each to be examined; it loses when
> it *averages opinions* into one confident synthesis.

Every redesign below pushes the board away from "debate to agreement" and toward
"decompose, ground, and only then rank."

---

## 4. Ranked redesign hypotheses (thin · sovereign · zero-cost)

Each is implementable in the single-file `index.html` with no new runtime dep and no
cloud call, scored `ROI = expected lift ÷ implementation cost`. Every one carries a
**falsifiable prediction** for a re-run (Gate 0.1).

### H1 — Mechanical grounding gate on every CLAIM *(highest ROI; this is Phase-1 task D)*
Require each `CLAIM`/`BODY` assertion to carry an evidence pointer `file#Lstart-Lend`
**and a verbatim quote**. A cheap post-pass string-matches the quote against the
hydrated source; any claim whose quote is **not literally present** is flagged
`unverified` and excluded from the finding. This is the residency's own
citation-verification step (`DIRECTION.md` Phase 1), used as the deliberation floor.

- *Why it works here:* **every** board loss this run (b2 log-default, b3 ⊕-veto-silence,
  l2 residualOf-as-deontic, l3 "lacks two guarantees") shares one property — **no literal
  source quote backs it.** A quote gate rejects exactly that set.
- *Thesis fit:* this is literally adding **box-and-box's alethic floor to the finding
  pipeline** — `feasible (claim is grounded = consume) ▸ permitted (doesn't overclaim) ▸
  best (rank)`. The board lost because its findings had no floor. Dogfoods the kernel.
- **Prediction:** `board_precision` rises from 0.42 toward ≥ 0.75; `board_lift ≥ 0`.

### H2 — Extractive synthesizer (distiller, not author)
Constrain the synthesizer to **select among claims that appeared verbatim in the debate
posts** — it may rank and merge, but may not introduce a new mechanism. Kills the
"launder a panelist's invention" path directly. Cheap: prompt constraint + an n-gram
overlap check between synthesis and posts.
- **Prediction:** removes l2/l3-style syntheses that assert beyond what any resident
  grounded.

### H3 — A falsifier seat (adversarial, stance-free)
Our personas are **stance advocates** ("argue from a real position") — none is a
*falsifier*. Add one resident whose only job is to **try to break each claim against
source**. Matches the literature's "debate + judge / side-swap" winning configuration.
- *Would have caught:* b2's `log`-default (no code defaults log), l2's `residualOf`
  misattribution (read the function — it's LTL, not deontic).
- **Prediction:** converts confident-wrong syntheses into flagged disputes.

### H4 — Decompositional, coverage-scored panel (generalize the b1 win)
Reframe the board from *debate→consensus* to **one resident per rung, each reporting
"is my rung implicated? quote it or say no."** The finding is the **union of grounded
per-rung observations**, not a consensus. Turns the board into the *coverage instrument*
it's actually good at (the b1 mechanism) and starves the herding channel.
- **Prediction:** board's edge shows up on **multi-layer** questions (like b1) and it
  stops losing single-layer ones (b2) by over-elaborating.

### H5 — Put the *real* baseline-to-beat in the experiment: k-sampled soloist + verifier
Honesty check demanded by the thesis ("board is an implementation detail"): maybe the
truer cheap win is **not a board at all** but a `k=3` self-consistency single critic with
the H1 verifier filter. If that beats the board at lower token cost, **the board should
not be hardened** — we'd be hardening something a *sampled soloist* replaces.
- **Prediction:** this is the arm that could honestly *retire* the board. Include it so
  Gate 0.1 can't flatter the board by omission.

### H6 — Reward calibrated abstention ("not in this corpus")
On b3 the *correct* finding was **"the `&`/`|>` operators live in `compose.mjs`, which
isn't in the provided corpus — cannot ground a mechanism."** Both arms confabulated
instead of abstaining. Add an abstain path and **score honest abstention as a win**.
Deeply on-thesis: *model the restraint it argues for.*
- **Prediction:** turns the weakest data point (b3) into a measure of honesty rather
  than a coin-flip between two confabulations.

---

## 5. Gate 0.1 — the cheapest experiment that could flip the verdict

Do **not** build the whole list. Per the thesis, build the smallest change most likely
to move the number, and measure:

1. **Fix the b3 corpus bug** — add `compose.mjs` to the hydrated set so the `&`/`|>`
   question is grounded for both arms (removes the one acknowledged unfairness).
2. **Arm A (control):** single critic, unchanged.
3. **Arm A′:** `k=3` self-consistency soloist + H1 verifier filter *(tests H5 — can a
   sampled soloist beat the board?)*.
4. **Arm B′:** board with **H1 + H2 only** (grounding gate + extractive synthesis) — the
   two cheapest structural changes, nothing else.
5. Re-run the same 6 threads; recompute `finding_precision`, `citation_accuracy`,
   `duplicate_rate`, `board_lift`.

**Falsifiable bet:** H1+H2 alone move `board_lift ≥ 0`, because every board loss this
run traces to a claim with **no literal source quote**, and H1 rejects exactly those.
**If `board_lift` stays negative even with the grounding gate**, that is strong evidence
the board's debate structure adds nothing a verified soloist doesn't, and the residency
should — per its own thesis — **default to the soloist substrate** and spend its restraint
budget elsewhere (better retrieval, faster human adjudication / time-to-value).

---

## 6. Explicitly out of scope (the non-goals still hold)

This redesign is a **prompt/verification-layer change to the existing single-file
board** — nothing more. Per `DIRECTION.md` non-goals, do **not** reach for reputation
graphs, trust/influence graphs, resident "personalities," or any reimplementation of
Graphonomous / PRISM / PULSE / [&] to fix this. The fix for a herding board is a
**grounding floor and an adversarial seat**, both of which fit in the file we already
have. If H1+H2 don't earn it, the board doesn't get hardened — that *is* the discipline.

---

### Sources
- Talk Isn't Always Cheap: Failure Modes in Multi-Agent Debate — arXiv 2509.05396
- Peacemaker or Troublemaker: How Sycophancy Shapes Multi-Agent Debate — arXiv 2509.23055
- CONSENSAGENT (sycophancy mitigation) — ACL Findings 2025 (2025.findings-acl.1141)
- No Free Labels: Limitations of LLM-as-a-Judge Without Human Grounding — arXiv 2503.05061
- Debate Helps Supervise Unreliable Experts — arXiv 2311.08702
- lechmazur/debate — adversarial side-swapped multi-judge debate benchmark
