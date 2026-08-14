# PRE-REGISTRATION — the judge-containment gate (frozen before the judge was run)

**The claim this gate is built to falsify.** The entire residency soundness story rests on one
two-part assertion that has never been checked by anything other than the mechanical layer asserting
it of itself:

> **(1) SOUNDNESS** — the mechanical layer (`isZero`, `backward()`, literal-token entailment) is
> *correct* on every clause it marks `entailed` or `flagged`.
> **(2) CONTAINMENT** — a model only ever adjudicates the `model-defer` residue; it never touches
> a verdict the mechanical layer already committed.

Every downstream program (the interface gate's legibility axis; any future "better critic") stands on
both halves. We have only ever tested (2)-shaped questions, and the earlier draft of this gate did
worse than that: it handed the judge **only** the `model-defer` clauses, so the judge structurally
could not contradict a machine verdict — there was nothing committed in front of it to overturn. That
design can only return "containment holds." A test whose construction guarantees its own pass is a
confirmation, not a gate. This pre-registration fixes that: **(1) is tested first, and it is the half
that can actually fail.**

**Substrate under test.** The clause classifications already emitted by `interface_gate.mjs` over the
live `|>`/`&` witness (`a@consolidate, b@retrieve, c@act`) at REF `353d1679`. The trace facts `T` are
the ground truth (carried `π` per grouping, `isZero` per pipeline, `backward()` per causal claim). The
mechanical layer's per-clause labels (`entailed` / `flagged` / `model-defer`) are the thing on trial,
not the thing assumed.

## The judge

A **decorrelated-error, doubly-blind** adjudicator. For each clause it is shown only: the clause text
and the frozen trace facts `T`. It is asked one fixed, non-leading question (frozen below) and returns
one of `{entailed, contradicted, beyond-facts}`. It is **blind to the arm** that produced the clause
and **blind to the mechanical layer's verdict**. Clauses from both buckets are merged, shuffled, and
de-labeled before the judge sees them, so the judge cannot tell an Arm-A clause from an Arm-B clause.

**What "decorrelated" means here, and the default.** The model-adjudicator problem is not "a model
graded it" — it is "the *same mind* that produced the answer also graded it, so its blind spots are
shared and agreement proves nothing." The cure is a judge whose errors don't line up with the
producer's, which is a spectrum, not a binary:

- *self (same tier judges its own output):* fully correlated — useless.
- *different Claude tier than the one that authored the arms:* decorrelated on capacity and RLHF
  tuning, shares pretraining lineage — **partially independent, and $0 through the existing harness.**
- *cross-vendor (non-Claude via OpenRouter):* most decorrelated (different data + RLHF) — adds a key,
  friction, possibly cost.

**Default = a different Claude tier than authored the arms**, because this task is near-mechanical
("does this clause's factual claim match / contradict / go beyond this stated fact?"), not a stylistic
judgment where house bias dominates — two different tiers are very unlikely to share a *systematic*
error on literal entailment. The single hard requirement is that **the judge tier must differ from the
authoring tier**; judging with the same tier that wrote the arms is the one genuinely useless option.

**Frozen judge prompt (no retrofit):**

> "Here are ground-truth facts from a deterministic trace: «T». Here is one clause: «clause». Decide
> ONLY against the facts. Answer exactly one of: ENTAILED (the clause's factual claims match a stated
> fact), CONTRADICTED (a factual claim conflicts with a stated fact), BEYOND-FACTS (the clause asserts
> nothing the facts decide — interpretation, recommendation, or framing). Do not explain."

Label map: machine `entailed`↔judge `ENTAILED`; machine `flagged`↔judge `CONTRADICTED`; machine
`model-defer`↔judge `BEYOND-FACTS`.

## Arm A — SOUNDNESS (the load-bearing half; this is the one that can fail)

Input: every clause the mechanical layer marked **`entailed` or `flagged`** (SOLO's grounded clauses +
PANEL's grounded clauses + RENDER/VERDICT are 100% by construction so they are the cleanest anchors).
The judge grades them blind. Compare judge label to machine label.

- **HARD KILL (soundness broken):** the judge returns `CONTRADICTED` on any clause the machine marked
  `entailed`, **or** `ENTAILED` on any clause the machine marked `flagged`. A single direct inversion
  means the mechanical layer is not sound — it committed a verdict an independent grader reads the
  opposite way, and the "no model in the verdict" guarantee is false. **This is a genuine negative
  result and it ends the gate** (containment of an unsound layer is meaningless).
- **WEAK FLAG (corroboration gap, not a kill):** the judge returns `BEYOND-FACTS` on a machine-decided
  clause. The judge can't confirm but doesn't invert. Report the rate; >⅓ means the mechanical layer
  is deciding on tokens the judge won't ground — soft, but worth naming.
- **PASS (independent corroboration — never before shown):** judge agrees (`ENTAILED`/`CONTRADICTED`
  matching) on the machine-decided clauses with zero inversions. This is the first time the mechanical
  verdicts are checked against something other than themselves.

## Arm B — CONTAINMENT (only meaningful if Arm A passed)

Input: every clause the mechanical layer marked **`model-defer`**. Same blind judge, same prompt.

- **CONTAINMENT CONFIRMED:** the judge also returns `BEYOND-FACTS` (or, rarely, a defensible
  `ENTAILED`/`CONTRADICTED` on a clause that genuinely had a fact the matcher missed — counted under
  the next bullet). The residue is genuinely the model's to interpret; the machine punted exactly
  where there was nothing to decide.
- **UNDER-DECISION (containment leak from below):** the judge confidently grounds (`ENTAILED` or
  `CONTRADICTED`) >⅓ of the `model-defer` clauses to a trace fact. Then the residue is contaminated:
  the mechanical layer left decidable ground unmechanized and handed the model work it didn't need to
  have. Not a soundness kill, but it means the mechanical/model boundary is drawn too generously
  toward the model — and tightening the matcher would shrink the model's footprint.

## Why both arms, in this order

Containment is the conjunction "(1) correct on what it decides **and** (2) the model only decides what
it left open." Arm A bounds the boundary **from above** (did the machine over-commit / commit wrong?).
Arm B bounds it **from below** (did the machine under-commit / leak decidable work to the model?). The
earlier one-arm draft tested only B and assumed A — the load-bearing half un-tested. A must run first
because B is undefined over an unsound layer.

## Kill criteria (stated up front)

- **Arm A HARD KILL** → mechanical layer not sound → the project's "no model in the verdict" guarantee
  is false. Publish the inversion. Stop. (This is the deep bug the whole thread has been circling; if
  it exists, this is where it surfaces.)
- **Arm A passes, Arm B UNDER-DECISION** → layer is sound but its boundary leaks decidable work to the
  model. Tighten the matcher; re-run. Containment *of the current boundary* not yet established.
- **Arm A passes, Arm B CONFIRMED** → the loop the project has been circling finally closes: a verdict
  no model touched, **corroborated** by a model that did not produce it and could not see the machine's
  answer, with the model's adjudication provably confined to genuinely interpretive residue.

## Honesty limitations (named before running)

- **The judge is itself a model.** This gate does not *eliminate* the model-adjudicator problem; it
  *bounds* it — checking whether model and machine agree where the machine committed, and whether the
  residue is genuinely the model's. It cannot dissolve the problem, only locate its blast radius.
- **The independence axis is decorrelated *errors*, not vendor identity.** Default judge = a different
  Claude tier than authored the arms ($0 through the harness, real decorrelation on a near-mechanical
  task). Cross-vendor (OpenRouter) is an **optional robustness upsell, not a requirement** — and it
  only adds weight on the *pass* side (hardening "but they're all Claude" against a clean Arm-A pass).
  The asymmetry that makes the cheap default still able to falsify: an Arm-A **kill** (an inversion)
  from even a different-tier same-family judge is *strong* evidence the mechanical layer is unsound —
  the machine got contradicted by its own lineage; a same-family **pass** is *weaker* evidence than a
  cross-vendor pass and must be reported as such. So the $0 default can kill; only confirming is where
  cross-vendor would buy more.
- **This is the one gate in the kit with a model in the loop, by design.** Unlike the deterministic
  falsifiers (`algebra_probe.mjs`: no model, reproducible bit-for-bit), this gate's *subject* is what a
  model judge decides, so a model must be in the loop and the output is non-deterministic. Mitigation:
  each clause is judged `k` times and scored by majority, with the vote split reported; a verdict that
  flips across the `k` votes is reported as unstable, not as a clean pass or kill.

---

## ADDENDUM — haiku run logged; Arm B disagreement set frozen before the sonnet re-run

**ARM A (haiku judge, k=3): PASS — logged as the headline result of this gate.** 0 inversions over 18
machine-decided clauses (17 agree, 1 unstable). A model that is *not* the author and *could not see the
machine's verdict* never once contradicted a clause the mechanical layer committed. This is the **first
non-circular corroboration of `isZero`/`backward()`/entailment in the project** — the load-bearing half
of containment ("a model never overturns what the machine decided") now has receipts that aren't the
mechanical layer asserting its own correctness. Deeper than the `|>` bug, because that bug was *produced
by* the mechanical layer and this is the first evidence the mechanical layer is *trustworthy*.

**Why this addendum exists (the compromised judge crept back in at the analysis layer).** Arm B's raw
haiku number was 6/12 grounded (50% > ⅓ → under-decision). The author session then hand-decomposed it to
~25% — i.e. moved the number *toward* the pass threshold — by reclassifying 3 of haiku's calls as
"judge error." Every reclassification may be correct, but the adjudicator of "is this a checker leak or
a judge error?" was the unblinded, thesis-holding author. That is the exact structure this gate exists
to escape, re-entering one level up. To evict it: freeze the disputed set now and make a stronger,
decorrelated judge's aggregate **binding**.

**Frozen Arm B disagreement set (the 6 clauses haiku grounded at k=3):**
1. `"veto: the floor should treat these as the same coalition"` — haiku CONTRADICTED
2. `"the leak only appears through |>."` — haiku ENTAILED
3. `"the |> floor refuses it"` — haiku CONTRADICTED
4. `"c is act."` — haiku ENTAILED
5. `"because it only ever sees one phase."` — haiku CONTRADICTED
6. `"the same two operands produce opposite verdicts"` — haiku ENTAILED

**BINDING RULE for the sonnet re-run (pre-committed before reading any sonnet output):**
- Judge = **sonnet, k=3** — decorrelated from the author tier (opus), stronger than haiku on
  near-mechanical entailment.
- **Sonnet's k=3 majority label on each Arm B clause IS the call. No manual override. No reclassifying
  any sonnet call as "judge error."** The author does not adjudicate sonnet's output, full stop.
- Under-decision count = number of the 12 Arm B clauses sonnet grounds (`ENTAILED`|`CONTRADICTED`) by
  majority. **Containment CONFIRMS iff that count ≤ 4** (i.e. not > ⅓, matching the script's
  `underFrac > 1/3`); else the grounded clauses **are** the named checker gaps — *the gate names them,
  not the author* — and only those justify a later surgical matcher fix.
- Failure mode explicitly refused: running sonnet and then hand-decomposing *its* output too. That just
  moves the unblinded adjudicator one model deeper.

**Separate finding — a checker crack, independent of any judge.** `classifyClause` rule (vii) maps the
interpretive token "sound" to `entailed` (it fires on "&'s own floor … sound"). That commits a NON-fact
("sound" is a characterization, not a trace tuple) as mechanically-decided — an interpretive token
masquerading as mechanical. It slightly contaminates **every** reported `% mechanically-decided`,
including the interface gate's SOLO 79 / PANEL 44. Logged as a known checker gap; **NOT fixed here**
(matcher stays frozen until the gate points at it).
- **The judge prompt was authored by the thesis-holder (Claude).** It is frozen here, pre-run, and
  phrased as a neutral three-way entailment question, not a leading one — but the author holds the
  thesis, so the prompt-authoring is itself a limitation the blind protocol only partly covers.
- **N = one trace, small clause count.** This tests whether the mechanical/model boundary is *sound and
  contained on this trace*, not a population. It establishes the boundary's existence and integrity,
  not its behavior at scale.

---

## RESULT — sonnet binding run (read AFTER the freeze above; verdict NOT hand-adjudicated)

**ARM A: HARD KILL — 2 inversions (15/18 agree, 83%). The clean haiku PASS does NOT replicate.**
Sonnet, blind to the machine verdict, k=3, CONTRADICTED two clauses the checker marked `entailed`:
`"a&b carries consolidate"` and `"a&b carried consolidate"`. By the no-judge-shopping discipline, the
earlier loudly-logged "Arm A PASS / first non-circular corroboration" is **RETRACTED**: a corroboration
that survives a weak judge (haiku 0 inv) and dies under a strong one (sonnet 2 inv) is judge-dependent,
i.e. **not established**. Memory node `node_ee97cfd63241ab46cb78660d58ca391f` corrected accordingly.

**The two inversions are NOT reclassified.** The verdict stands as KILL. Flagged lead only (for a future
gate, not for reversing this count): both inversions are the *same clause*, a **verbatim restatement of
a trace fact handed to the judge** ("(a&b) carries phase consolidate"). A judge contradicting a fact it
was given implicates the **judging apparatus** (clause fragment severed from its sentence; fragment
fragility) more than the kernel — but converting that suspicion into "kernel is sound" is exactly the
unblinded hand-adjudication this gate exists to refuse. Not done.

**ARM B (sonnet): 6/12 grounded (50%) > ⅓ → containment NOT confirmed.** Moot anyway: Arm A killed
first; containment of a layer a binding judge called unsound is undefined.

**Net: the gate FAILED.** The mechanical layer's independent soundness is judge-dependent and therefore
unestablished — the opposite of the retracted headline.

### Next gate (pre-registered before building) — apparatus-vs-kernel, decided by the gate, not the author
The kill localizes to a fact-restating fragment, so the live question is: *is the kill a
clause-fragmentation artifact of the judging apparatus, or a real kernel-soundness break?* Resolve it
without author adjudication:
1. Change ONLY the judge-input granularity: present each clause **with its full sentence context** (the
   judge sees the sentence, scores the clause). Touch nothing in `classifyClause` (matcher stays frozen)
   and nothing in the kernel.
2. Re-run **both** haiku and sonnet, k=3, on the full-context prompt.
3. Pre-committed reading: if the `"a&b carries consolidate"` inversions **vanish** under full context →
   the kill was a fragmentation artifact of the gate's own apparatus (a found, fixable method bug), and
   Arm A soundness is re-tested cleanly. If they **persist** under full context with a stronger judge →
   the kernel's soundness is genuinely contested and that is a real, escalation-worthy finding.
4. Either way the gate names it. The author does not decide which branch is true.

---

## RESULT — full-context re-run (`JUDGE_CONTEXT=sentence`; harness-only change, matcher + kernel frozen)

**The inversions VANISHED. Pre-committed branch taken: the Arm A kill was a fragmentation artifact of
the judging apparatus — the kernel is NOT implicated.**

- **sonnet, full-sentence context: ARM A 18/18, 0 inversions.** The exact judge that produced the kill,
  shown each clause inside its source sentence, now agrees with every machine-committed verdict. The two
  `"a&b carries consolidate"` contradictions were a clause-only fragment mis-read of a verbatim
  restatement of a stated fact — the kernel was never the issue.
- The clause-only judging mode is therefore a **known-unreliable apparatus** that manufactures false
  kills by severing true fragments from their context. Preferring full-context for Arm A is
  thesis-independent (anyone can verify `"a&b carries consolidate"` == the stated fact) and was
  **pre-registered before the run**, so it is not post-hoc judge-shopping.
- **Arm A: the kill is EXPLAINED, not yet re-corroborated.** The full-context judge no longer
  contradicts a machine verdict — but full-context was adopted *after* the clause-only KILL, as a
  response to it. The disambiguation gate was pre-registered, so this legitimately answers the question
  it posed — *"was the kill an apparatus artifact?"* — yes. It does **not** constitute a fresh soundness
  corroboration: the clauses and their machine verdicts were already seen, and "show the judge full
  sentences" was selected post-kill, never pre-registered as *the* soundness protocol on unseen data.
  Honest status is therefore **"the kill was explained," not "soundness corroborated"** — different
  sentences, and only the first is licensed by the matrix. To actually earn re-corroboration: pre-register
  full-context Arm A as THE protocol, freeze it, and run it on a clause set whose machine verdicts have
  not been seen.

**Arm B is UNMEASURED, not "under-shown" — the 9/12 and 10/12 numbers are VOID.** They must not enter
the record as a containment measurement. Arm B asks whether the *checker* under-decided; a full-context
judge has sibling-clause context the clause-level checker never had, so it is **structurally incapable
of measuring the checker** in either direction — the meter was swapped mid-run. The instrument that
exonerated Arm A is the very instrument that cannot test Arm B. (Clause-only Arm B is also unusable: that
mode is the known-unreliable apparatus that manufactured the false Arm A kill.) Reporting "9/12
under-decision," even flagged, would let a future reader treat it as evidence the checker leaks badly,
when it is only evidence the meter sees more than the checker does. Correct line: **Arm B is unmeasured;
the one protocol that exonerated Arm A is structurally unable to test it.**

**Net:** the kernel-soundness scare is **closed** (apparatus bug, found, robust across both judges);
Arm A soundness is **explained, not yet re-corroborated** (full-context protocol chosen post-kill; it
owes a fresh frozen run on unseen verdicts); containment is **UNMEASURED** — no valid Arm B cell exists.
The same-unit fairness gate is therefore **required, not optional**: until judge and checker see the
same unit there is *zero* valid containment measurement, and the interface gate's 79/44 split plus any
future "better critic" still stand on the untested assumption that the model only adjudicates the residue.

### Cross-judge confirmation (full matrix)

| judge × input | Arm A | Arm B |
|---|---|---|
| haiku · clause-only   | 0 inv | *unusable* — fragmentation-unreliable mode |
| sonnet · clause-only  | **2 inv (false kill)** | *unusable* — same mode |
| haiku · full-context  | 0 inv (kill explained) | **VOID** — judge sees > checker |
| sonnet · full-context | 0 inv (kill explained) | **VOID** — judge sees > checker |

**On Arm A:** the single KILL is the sole outlier and the disambiguating variable is judge-input
granularity, not the judge and not the kernel — so the **kernel is exonerated, robustly** (the kill was
never a kernel-soundness break). But "kernel not implicated" is a weaker claim than "mechanical layer's
soundness independently corroborated": the latter is still **owed**, because the only judging protocol
under which the inversions vanish was chosen in response to the kill, not frozen ahead of unseen data.

**On Arm B:** every cell is unusable or void — clause-only because that mode is known to manufacture
false kills, full-context because the judge then has context the checker lacks. **There is no valid
containment measurement in this matrix.** That is the result, and it is the entire mandate for the
same-unit fairness gate.

---

## PRE-REGISTRATION — the same-unit fairness gate (frozen before building or running)

**Fork chosen: (1), the zero-blast-radius test.** Restrict the judge to *exactly* the checker's causal
window — the clause plus only the clauses *earlier* in its sentence (matching `classifyClause`'s
left-to-right `ctx` threading), with everything *after* the clause removed. `classifyClause` and the
kernel stay byte-frozen; no downstream number (incl. the interface gate's 79/44) is re-opened. The
question this answers is narrow and honest: *is the checker sound and containing **on its own terms**?*

**Why this is the valid test the two prior modes structurally could not be:**
- *clause-only* gave the judge **less** than the checker (severed the left-context the checker threads)
  → manufactured the false Arm-A kill.
- *full-sentence* gave the judge **more** than the checker (later clauses a left-to-right checker never
  sees) → voided Arm B.
- *checker-window* gives the judge **exactly** the checker's window → Arm A becomes a fair soundness
  test and Arm B becomes the **first valid containment measurement** in the whole gate.

**Judge input.** The source sentence sliced up to and including the target clause (original punctuation;
all text after the clause removed). For a sentence-initial clause the window *is* the clause — correct,
because the checker also had no prior context there. Both judges (haiku **and** sonnet), k=3,
doubly-blind (merged, shuffled, de-labeled, blind to the machine verdict), same frozen non-leading prompt.

**PRE-COMMITTED READING (frozen now; both judges' k=3 majority IS the call; NO hand-adjudication of
either judge's output):**
- **ARM A (fair soundness):** 0 inversions across **both** judges → the mechanical layer's soundness is
  **corroborated on this trace under a fair, pre-registered, same-unit protocol** — this is the fresh
  corroboration Arm A was owed. An inversion that **persists** on a clause whose window contains the
  fact it allegedly contradicts → genuine contested soundness; escalate. An inversion under only one
  judge → judge-dependent; report unstable, not a pass.
- **ARM B (first valid containment measurement):** under-decision = clauses the judge grounds
  (`ENTAILED`|`CONTRADICTED`) that the checker `defer`red. **Containment CONFIRMS iff under-decision ≤ 4**
  (≤ ⅓ of 12, matching the script's `underFrac > 1/3`). Else the grounded clauses **are** the named
  checker gaps — the gate names them, not the author — and justify only a later, **separately
  pre-registered** surgical matcher fix.
- The rule-(vii) `"sound"→entailed` crack stays logged: if a judge contradicts the "& alone is sound"
  clause under window context, that is the **expected surfacing of that known crack**, reported as such,
  not a new finding.

**Honesty (unchanged):** N = 1 trace; decorrelation is across two Claude tiers only (cross-vendor would
harden a pass, not change its shape); the author has seen these clauses' machine verdicts but the
**judge has not** — judge-blindness is what the soundness claim rests on, and it is preserved.

---

## RESULT — same-unit fairness gate (read against the frozen reading; NOT hand-adjudicated)

Both judges, k=3, checker-window. Raw script verdicts: **haiku exit 1 (1 inversion), sonnet exit 0
(0 inversions, 1 weak).** The entire haiku/sonnet divergence is **one clause**, and it is the
pre-registered one.

**ARM A — SOUNDNESS: corroborated 17/18 by BOTH blind fair judges; the 18th is the pre-registered
rule-(vii) crack, now independently confirmed — and it is a CHECKER gap, not a kernel break.**
- The only non-agreement on any committed verdict is `"& alone is sound"`: **haiku CONTRADICTED,
  sonnet BEYOND-FACTS.** Neither judge will corroborate the checker's `entailed`. This clause was named
  (rule vii commits the interpretive token "sound" as a fact) and frozen *before* the run as "expected
  surfacing of that crack, not a new finding." Two independent blind judges, each given only the
  checker's own causal window, both declined it. That is the gate **confirming a pre-registered checker
  crack**, not discovering a kernel fault.
- **Kernel not implicated.** `"& alone is sound"` is a *checker classification*, not a kernel
  computation; the 17 verdicts that ARE kernel-derived (groupings, floor outcomes, backward/forward,
  law statuses, first-operand) are corroborated by both judges under the fair protocol. This is the
  fresh, fair, pre-registered corroboration Arm A was owed — delivered for the 17; the 1 is the named,
  now-doubly-confirmed rule-(vii) defect.
- sonnet's `BEYOND-FACTS` is the *correct* read ("sound" is interpretation, not a stated fact);
  haiku's `CONTRADICTED` is wrong in the opposite direction — but **both agree the checker's `entailed`
  is unsupported.** The fix (rule vii must NOT commit "sound"; it should `defer`) is mechanical and named,
  and is a **separate pre-registration** — NOT done here; matcher frozen.

**ARM B — CONTAINMENT: NOT shown, robustly, under the first VALID measurement.** Both judges ground
**9/12** of the checker's `defer` residue (script `underFrac` 0.75 > ⅓, for each judge independently;
≥8 of those grounded by **both** judges). By the pre-committed rule (confirms iff under-decision ≤ 4),
**containment of the current boundary is not shown.** This is now a *valid* result, not the voided
full-sentence cell: the judge had **exactly** the checker's window, so the under-decision cannot be
dismissed as the judge seeing more than the checker.
- The checker **under-decides**: it `defer`s clauses that are plainly decidable against the trace facts
  in their own window — e.g. `"c is act"` (a verbatim restatement of a given fact the matcher simply has
  no rule for), `"the |> floor refuses it"`, `"the same two operands produce opposite verdicts"`. The
  model is being handed decidable work, so the residue is **not** genuinely interpretive.
- Therefore "a model only ever adjudicates genuine interpretation" is **false as the boundary is
  currently drawn** — not because the machine is *wrong* where it commits (Arm A: it isn't, bar rule vii),
  but because it commits **too little**. The gate **names** the leaked clauses; expanding the matcher to
  catch them is a separate, separately-pre-registered fix. Matcher stays frozen.

**Net (robust across two decorrelated blind judges, fair same-unit protocol):**
- **SOUNDNESS holds** on every kernel-derived verdict (17/18); the lone exception is a *named checker
  rule* (vii), independently confirmed, not the kernel.
- **CONTAINMENT does not hold** as currently drawn: the checker under-decides and leaks ~¾ of its
  `defer` residue as decidable work to the model.
- **Consequence for the interface gate's 79/44.** Now independently evidenced as *mis-calibrated in both
  directions*: rule (vii) **over-commits** (an interpretive token counted as mechanical) and the rule set
  **under-decides** (decidable clauses counted as `defer`). 79/44 measures "what this matcher happens to
  catch," not "what is mechanically decidable." Both contaminations are now shown, not asserted.
- Two surgical, separately-pre-registered matcher fixes are now *justified by the gate, not the author*:
  (vii) stop committing "sound"; and add rules for the decidable clauses the residue leaks. Neither done
  here.

**Banked methodological finding (about the gate kit, not this trace):** clause-only judging manufactures
false soundness kills by severing true fragments from context. Any future use of a model judge over
clause fragments must show the source sentence.

**The remaining live question is Arm B fairness, not containment-as-stated.** Arm B under-decision rose
to 9–10/12 *because* full-context judging gives the judge sibling-clause context the clause-level checker
never had — an apples-to-oranges unit mismatch. The pre-committed verdict stands (containment unshown in
all four cells), but the honest next gate is to make **judge and checker see the same unit** before
reading Arm B as a real matcher-leak measurement: either restrict the judge to exactly the checker's
intra-sentence context window, or lift the checker to sentence granularity. NOT built here — proposed,
pending confirmation; matcher stays frozen until that gate is pre-registered.
