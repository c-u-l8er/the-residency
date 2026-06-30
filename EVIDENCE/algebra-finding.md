# Finding — the order-dependent `Value.pi` carrier weakens the [&] floor (box-and-box @353d167)

> **Headline.** What first looked like "`|>` is non-associative" is one *symptom* of a single root
> cause: `Value.pi` is a **single-slot phase carrier set order-dependently** (`combine`'s
> `firstNonNull`) and **read by the floor**. That root cause produces (at least) **two** soundness
> symptoms — `|>` re-association (CP5/CP6) and `&`-operand-order leaking into a downstream `|>`
> (CP7) — and it **kills fix Option 2**, leaving **Option 1 (carry an `[entry,exit]` interval)** as
> the only fix that closes both. All five laws below were re-run against the real kernel @REF; the
> floor's own `isZero` is the verdict, no model in the loop.

**Gate.** After Gate 0 closed negative, the standing recommendation was to point the
residency's *falsification discipline* (not the board) at the **[&] composition algebra** and
produce **one concrete bug a property law catches that the hand-written example tests miss** — or
report that it can't. It can. This is the first finding the residency produces *about* the [&]
stack, and it is **non-circular**: no model judged it. The box-and-box kernel's own executable
code contradicts its own documented guarantee. The falsifier (`EVIDENCE/algebra_probe.mjs`) runs
the real kernel hydrated from the pinned public REF; $0, no harness, no model.

## Claim

The `|>` (pipeline) operator's documented guarantee — *"Defined only when phase(a) ≤ phase(b)…
a backward step is REFUSED"* (`value.mjs:54-56`) — **is not stable under re-association.** The same
three stages, regrouped, change whether the "un-weakenable safety floor" fires. A pipeline that
executes a genuine backward phase step survives the floor when right-associated.

## Mechanism (grounded)

`chain()` (`value.mjs:57-65`) does two things that disagree:

- **the guard** (`:58`) refuses a backward step by comparing the *immediate pair*: `phaseIdx(a.pi) > phaseIdx(b.pi)`.
- **the exit phase** (`:62`) collapses the composite to the *later* stage: `r.pi = firstNonNull(b.pi, a.pi)`.

A `Value` carries a **single** `pi`. So a composite `(b |> c)` remembers only its *exit* phase
(`c`'s), not its *entry* phase (`b`'s). When that composite is then fed as the right operand of an
outer `|>`, the outer guard checks the upstream stage against the composite's **exit** phase and
never sees the composite's earlier **entry** stage — so an internal backward edge slips through.
`compose.mjs:166-181` (`composePipe`) lifts this directly: the `chained.error` branch (`:170`) is
the only backward-step floor, and it inherits `chain()`'s single-phase blind spot.

*(All line numbers above are REF `353d1679` coordinates — the SHA this finding pins to and the
falsifier hydrates. The local working copy has since drifted ~+2 lines in value.mjs and ~+25 in
compose.mjs from added imports/content; cite the REF, not the working tree.)*

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

**CP1 only ever draws sorted phases** (`[i,j,k]` sorted non-decreasing) — that sorting is
*precisely* why it cannot see the bug, and it **HOLDS 2000/2000** because of it. (CP1 is not run
on unsorted bricks: by construction it never receives them, and if it did, the backward grouping
would floor and CP1 would hit its `'unexpectedly-zero'` branch and *fail* — not silently miss the
bug. The point is structural blindness, not a passing test on adversarial input.) CP5/CP6 draw
*unsorted* phases and that is the entire difference.

```
EXISTING example-style law (sorted phases):
  ✓ CP1      |> associative where feasible             HOLDS (2000/2000)
NEW property laws (unsorted phases) — symptom 1, |> re-association:
  ✗ CP5      floor is association-invariant             FALSIFIED @trial 10  π=[learn, retrieve, consolidate]
  ✗ CP6      no backward execution step survives        FALSIFIED @trial 5   π=[learn, retrieve, learn]
ROOT-CAUSE DEEPENING — & (sibling operator):
  ✓ AC-COMM  &'s OWN floor is commutative               HOLDS (2000/2000)   ← & in isolation is sound
  ✗ CP7      &-order doesn't change a downstream |>      FALSIFIED @trial 3   π=[learn, route, route]
             witness a@consolidate b@retrieve c@act:  (a&b)|>c 0̲  but  (b&a)|>c LIVE
```

## Root cause + second symptom — pointing the same kit at `&`

`|>` non-associativity was the *symptom*; the *disease* is the carrier. `combine()` (`value.mjs`)
sets `pi`, `iota`, `psi` via `firstNonNull(a.*, b.*)` and concatenates `authority`/`audit` in
operand order — all **order-dependent** — and `composeAnd` lifts it directly. `&` is advertised
**commutative**. So the obvious skeptic's question is whether `&` has a bug of the same class. Run
it, don't guess:

- **AC-COMM — `&`'s OWN floor is commutative:** `isZero(a&b) === isZero(b&a)`. **HOLDS 2000/2000.**
  Whether a coalition annihilates does *not* depend on operand order, because the floor reads only
  commutative inputs (`certified` AND, `costClass` max-like, `sigma`-emptiness, `kappa` OR) — it
  does **not** read `pi`/`authority`/`audit`. So **`&` in isolation has no `|>`-class bug.** Bank
  this as a *passing* anchor: a green law pinning what *is* sound is as valuable as the red ones.
- **CP7 — `&`-operand order must not change a downstream `|>` floor:**
  `isZero((a&b)|>c) === isZero((b&a)|>c)`. **FALSIFIED.** `combine` still picks `pi`
  order-dependently, and `|>`'s floor *reads* `pi`, so the asymmetry **leaks downstream**.
  Deterministic witness `a@consolidate, b@retrieve, c@act`:

  ```
  (a&b) carries π=consolidate  →  (a&b) |> c  ⇒  0̲     (floor fires — correct)
  (b&a) carries π=retrieve     →  (b&a) |> c  ⇒  live   (floor BYPASSED)
  ```

  A forbidden pipeline becomes feasible purely by **swapping the two operands of a "commutative"
  operator** — the most basic thing one can do — and the kernel accepts mixed-phase `&` without
  complaint. Random probe also falsifies (e.g. `π=[learn, route, route]`).

The point is not "two bugs." It is that the first finding's *diagnosis* was incomplete: the root
cause is `Value.pi` (single-slot, chosen order-dependently, read by the floor), and it has at least
two distinct triggers. This **breaks Option 2** below.

*Honesty on this run:* idempotence of `&` is left **unadjudicated** — a naive `a&a` probe is vacuous
on zero-quantity bricks, and the `⊗` quantity semiring is *supposed* to accumulate cost/confidence,
so `a&a` doubling `n` may be by design. And CP7 needs **mixed-phase** `&` operands; if coalitions are
always phase-homogeneous in practice it never fires — but that is an *unenforced, undocumented*
precondition the kernel does not check, which is the same Option-2-shaped gap again.

## Fix options (a DECISION for the maintainer — NOT applied here)

This changes the [&] governance kernel's semantics, so it is surfaced, not silently patched. Two
honest framings, and the fixes they imply:

1. **It is a code bug — the floor should be grouping-stable.** A `Value` must carry both an
   **entry** and an **exit** phase (a `[πlo, πhi]` interval, not a point), and `chain()` must
   refuse when the downstream operand's *entry* precedes the upstream operand's *exit*. Then CP5
   and CP6 both hold and `|>` is a genuine partial monoid with a stable zero. (Smallest sound fix;
   touches `value.mjs` chain/V0 and ripples to `consume`'s phase checks.)
2. **It is an over-strong stated law — `|>` should be a *left-associated* fold only.** Restate
   CP1's "associative" claim as *left-fold feasibility* and document that the floor is defined only
   on left-associated chains. **But this is NOT available as the kernel stands** — and that resolves
   the judgment call the way Option 1 needs it to. The public AST folder `composeTree`
   (`compose.mjs`) recurses on `node.a` and `node.b` and evaluates **arbitrary tree shapes**; there
   is no left-only builder, so `a |> (b |> c)` is a legal, supported, reachable expression. Verified
   directly: a **right-leaning** `composeTree({op:'|>', a, b:{op:'|>', a:b, b:c}})` on
   `π=[act,retrieve,consolidate]` returns a **LIVE** brick — the bypass fires through the public API,
   not just through manual nesting. So "we only build left-leaning trees in practice" is an
   *unstated precondition the docstring doesn't mention* and a *mitigation*, not a refutation. Taking
   Option 2 still requires a **code change** — adding and enforcing a left-association invariant
   (reject right-leaning `|>` trees in `composeTree`) plus documenting it.

**The `&` finding settles it: Option 2 is dead.** Option 2 only narrows the *re-association* of
`|>`. But CP7 leaks through a **single, un-re-associated `|>`** on a **commuted `&`** — there is no
`|>` re-grouping to outlaw, so a left-fold-only `|>` does nothing here. Only **Option 1** — carry an
`[entry, exit]` phase interval instead of one `pi`, and have the floor check the interval — fixes the
*carrier*, and therefore kills **both** symptoms at once. So the recommendation is no longer merely
"Option 1 is cleaner"; it is "**Option 1 is the only one of the two that closes both holes**, and
here is the `&`→`|>` witness that a left-fold patch would ship still leaking."

This is a **code-level soundness gap, full stop**: the [&] stack's single strongest advertised claim
— an *un-weakenable* governance floor a utility can't resurrect — is, as written, weakenable two ways
(by re-grouping `|>`, and by commuting `&`), both reachable through ordinary public-API inputs.

**Recommended: Option 1** (carry the `[entry, exit]` interval). For the suite, land alongside
CP5/CP6 a third xfail — **CP7: `&`-operand order does not change a downstream `|>` floor** — and keep
**AC-COMM (`&`-floor commutativity) as a *passing* law**: a green anchor pinning what is sound belongs
next to the red ones that pin what isn't.

## Caveats (honesty)

- The counterexample is a **fully reachable** configuration (ordinary feasible bricks; only the
  phase field varies) — not a contrived garbage input.
- "Bug in code" vs "over-strong law" is a genuine judgment call (see fix options); what is **not**
  a judgment call is that the documented "backward step is REFUSED" guarantee and CP1's
  associativity claim are *both* violated by the kernel's own execution.
- Scope: this probes the `|>` phase floor and the `&`→`|>` `pi`-carrier leak. `&`'s **own** floor is
  *cleared* (AC-COMM holds). It does **not** claim anything about the cost-class lattice, the CC2
  quantity semiring, `&` idempotence (left unadjudicated above), or the 8-rung bridge — those laws
  were not re-derived here.
- Non-circular by construction: the verdict is the kernel's own `isZero`, run on the real code at
  REF `353d1679`. No LLM adjudicated it.
