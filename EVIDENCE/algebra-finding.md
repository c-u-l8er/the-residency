# Finding — the `|>` floor is not association-invariant (box-and-box @353d167)

**Gate.** After Gate 0 closed negative, the standing recommendation was to point the
residency's *falsification discipline* (not the board) at the **[&] composition algebra** and
produce **one concrete bug a property law catches that the hand-written example tests miss** — or
report that it can't. It can. This is the first finding the residency produces *about* the [&]
stack, and it is **non-circular**: no model judged it. The box-and-box kernel's own executable
code contradicts its own documented guarantee. The falsifier (`EVIDENCE/algebra_probe.mjs`) runs
the real kernel hydrated from the pinned public REF; $0, no harness, no model.

## Claim

The `|>` (pipeline) operator's documented guarantee — *"Defined only when phase(a) ≤ phase(b)…
a backward step is REFUSED"* (`value.mjs:56-58`) — **is not stable under re-association.** The same
three stages, regrouped, change whether the "un-weakenable safety floor" fires. A pipeline that
executes a genuine backward phase step survives the floor when right-associated.

## Mechanism (grounded)

`chain()` (`value.mjs:59-66`) does two things that disagree:

- **the guard** (`:60`) refuses a backward step by comparing the *immediate pair*: `phaseIdx(a.pi) > phaseIdx(b.pi)`.
- **the exit phase** (`:64`) collapses the composite to the *later* stage: `r.pi = firstNonNull(b.pi, a.pi)`.

A `Value` carries a **single** `pi`. So a composite `(b |> c)` remembers only its *exit* phase
(`c`'s), not its *entry* phase (`b`'s). When that composite is then fed as the right operand of an
outer `|>`, the outer guard checks the upstream stage against the composite's **exit** phase and
never sees the composite's earlier **entry** stage — so an internal backward edge slips through.
`compose.mjs:191-198` (`composePipe`) lifts this directly: the `chained.error` branch (`:196`) is
the only backward-step floor, and it inherits `chain()`'s single-phase blind spot.

## Minimal counterexample (deterministic, executable)

Execution order **act → retrieve → consolidate** (the `act → retrieve` step is backward):

```
(a@act |> b@retrieve) |> c@consolidate   ⇒  0̲                      ← floor fires (correct)
 a@act |> (b@retrieve |> c@consolidate)   ⇒  live brick, exitπ=consolidate   ← floor BYPASSED
```

Right-associated, `(b@retrieve |> c@consolidate)` collapses to exit phase `consolidate`; the outer
guard then checks `act ≤ consolidate` ✓ and admits a pipeline whose actual execution runs `act`
*before* `retrieve`. Both operands are ordinary: wild contracts, certified-poly cost, feasible
floor (σ empty, κ false). Only the phases differ — exactly CP1's free variable.

## Why the existing example tests miss it

- **CP1** (`test/compose-laws.mjs:104`, *"|> associative where feasible"*) draws phases
  `[i,j,k]` **sorted non-decreasing** (`:106`), so *both* groupings are always feasible. It tests
  equality of two *defined* results and never probes the **feasibility boundary** where one
  grouping floors and the other does not.
- **CP3/CP4** only test the **pairwise** `(a,b)` case — there is no third stage to re-associate.
- No stated law asserts the floor is **association-invariant**, so 2000 sorted-phase trials pass
  while the bug sits exactly one re-grouping away.

This is the property-vs-example gap in one shot: the bug lives in the region example tests are
written *not* to visit.

## The property laws that catch it (`EVIDENCE/algebra_probe.mjs`, N=2000, same harness idiom)

- **CP5 — the floor is ASSOCIATION-INVARIANT:** `isZero((a|>b)|>c) === isZero(a|>(b|>c))` ∀ a,b,c.
  *FALSIFIED* (e.g. `π=[route, retrieve, consolidate]`).
- **CP6 — no backward execution step survives, in either association:** any descent in
  `[πa,πb,πc]` ⇒ both groupings `0̲`. *FALSIFIED* (e.g. `π=[act, retrieve, consolidate]`).

Re-running **CP1 on the same (unsorted) bricks** still **HOLDS 2000/2000** — proof the existing
law cannot see what CP5/CP6 catch.

```
EXISTING example-style law (sorted phases):
  ✓ CP1  |> associative where feasible           HOLDS (2000/2000)
NEW property laws (unsorted phases):
  ✗ CP5  floor is association-invariant           FALSIFIED @trial 21  π=[route, retrieve, consolidate]
  ✗ CP6  no backward execution step survives      FALSIFIED @trial 9   π=[act, retrieve, consolidate]
```

## Fix options (a DECISION for the maintainer — NOT applied here)

This changes the [&] governance kernel's semantics, so it is surfaced, not silently patched. Two
honest framings, and the fixes they imply:

1. **It is a code bug — the floor should be grouping-stable.** A `Value` must carry both an
   **entry** and an **exit** phase (a `[πlo, πhi]` interval, not a point), and `chain()` must
   refuse when the downstream operand's *entry* precedes the upstream operand's *exit*. Then CP5
   and CP6 both hold and `|>` is a genuine partial monoid with a stable zero. (Smallest sound fix;
   touches `value.mjs` chain/V0 and ripples to `consume`'s phase checks.)
2. **It is an over-strong stated law — `|>` is only a *left-associated* fold.** If pipelines are
   always built left-to-right (`composeTree` folds that way), then `a |> (b |> c)` is simply not a
   legal expression and CP1's "associative" claim is too strong; restate it as *left-fold
   feasibility* and document that the floor is only defined on left-associated chains.

Option 1 preserves the advertised monoid/associativity; option 2 honestly narrows the advertised
guarantee. Either way **the kernel as written today violates its own docstring** and CP1's
associativity claim, and the property laws above belong in `test/compose-laws.mjs` as CP5/CP6
regardless of which fix is chosen.

## Caveats (honesty)

- The counterexample is a **fully reachable** configuration (ordinary feasible bricks; only the
  phase field varies) — not a contrived garbage input.
- "Bug in code" vs "over-strong law" is a genuine judgment call (see fix options); what is **not**
  a judgment call is that the documented "backward step is REFUSED" guarantee and CP1's
  associativity claim are *both* violated by the kernel's own execution.
- Scope: this probes only the `|>` phase floor. It does **not** claim anything about `&`, the
  cost-class lattice, the CC2 quantity semiring, or the 8-rung bridge — those CX/CA laws were not
  re-derived here.
- Non-circular by construction: the verdict is the kernel's own `isZero`, run on the real code at
  REF `353d1679`. No LLM adjudicated it.
