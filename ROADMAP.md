# The Residency — Far-Horizon Roadmap

*Companion to `DIRECTION.md`. Where `DIRECTION.md` says "what to build next and what
not to," this says "where it all ends up, and why the missing pieces aren't new
construction — they're wires to things that already exist."*

---

## The question this answers

The Residency asks a different question from most agent systems. Rather than
optimizing how agents *complete tasks*, it optimizes how a codebase — and the
people and agents around it — **accumulate trustworthy knowledge over time**: not
just *what* is known, but *how it became known* (the provenance, evidence, and
verification behind every claim). Everything below is just the wiring required to
make that question operational.

That places the work where the field is still relatively open. Prompt-, agent-,
and workflow-engineering are fast becoming commodity enabling layers; the part
that stays hard is **provenance and knowledge-lifecycle management** — verifiable,
evolving memory, and eventually collaboration *between* bodies of knowledge, not
just between agents. This isn't a settled discipline with a name yet — "evidence
engineering" is a useful label, not an established term — but the underlying gap
is real: industry analysts flag AI provenance/lineage as a 2026 priority, the
W3C PROV data model has standardized *how* to express provenance for over a
decade, yet **memory provenance in agent systems remains underdeveloped** — most
systems store *what* they concluded, not *how* it became known. That gap is the
residency's whole premise.

---

## The one idea that completes the picture

The residency is **two things at once**:

1. the **capstone application** of the entire [&] portfolio — it is the consumer
   that finally makes Graphonomous, PRISM, PULSE, box-and-box, TRAAVIIS, and TRVM
   converge on a single useful loop; and
2. the **live demo** of TRVM's own thesis — a residency's memory is a
   content-addressed, CRDT-merged, coordination-free knowledge store, which is
   *exactly* what TRVM's IN-CRDT result proves is possible.

So almost every "future thing" we were missing is not a new platform to build. It
is a **connection** between the residency and a component you already shipped. That
is the whole roadmap. The empire stays unbuilt; the wiring gets done, gated, and
only when each prior gate is passed.

```
                    ┌──────────────────────────────┐
                    │         THE RESIDENCY         │
                    │   observe → discuss →         │
                    │   evidence → finding →        │
                    │   experiment → benchmark →    │
                    │   proposal → patch → verify   │
                    └──────────────────────────────┘

   wired to existing components — every future feature is a *connection*:
     • PULSE         declares the loop          (residency.pulse.json)
     • PRISM         measures it over cycles    (hit-rate · dedup · citations)
     • box-and-box   governs every output       (feasible ▸ permitted ▸ best)
     • Graphonomous  remembers                  (substrate: IN-CRDT merge)
     • TRAAVIIS      executes experiments       (Hermes gateway → Tier 0/1/2)
     • TRVM          the first corpus — and the *proof* the merge works
```

---

## Horizons (each gated; do not skip a gate)

### Horizon 0 — Trustworthy findings *(now → Gate 1)*
The only work that matters until the findings are proven reliable.
- Honesty/consistency across `paper.md` / `README.md` / `SPEC.md` (in progress).
- **Validate the core premise: does a multi-resident *board* beat a single agent?**
  The residency's whole bet is that a deliberating board produces better findings
  than one careful critic. That is **untested**, and it is not free to assume —
  the multi-agent-debate literature shows debate *can* raise factuality but also
  that agents **herd** and are **persuaded by confidently-wrong** peers, so a board
  can amplify a shared error as easily as catch it. Run the same corpus through (a)
  one strong single-agent critic and (b) the board; compare finding precision and
  duplicate rate. If the board does not win, fix the deliberation design before
  building anything on top of it.
- Make **corpus + personas swappable** (today they are hardcoded to TRVM / CS
  theory). This is the structural step toward product-hood.
- **Findings as first-class objects** (claim · evidence · status · supersedes) +
  a **dedup pass** + a **citation-verification** flag. (The typed
  finding/thesis/proposal/patch vocabulary mirrors recent work treating
  deliberation as *typed epistemic acts* rather than free-text chat — structure is
  what makes findings checkable.)
- Run on **3–4 corpora** (at least one non-TRVM portfolio repo).

> **Gate 0 — The board earns its existence.** The multi-resident board measurably
> beats a single-agent critic on the same corpus (higher finding precision and/or
> lower duplicate rate). *If it does not, there is no point hardening a board that
> a single agent could replace — redesign deliberation first.* This gate is cheap
> and comes before everything; it questions the residency's own reason to exist.

> **Gate 1 — Reliability.** Finding hit-rate (survives human verification) is high
> enough to be worth a reviewer's time; dedup and citation-soundness acceptable.
> *Nothing past here is built until Gate 1 passes.*

```yaml
# Gate 1 metrics. THRESHOLDS ARE PROVISIONAL — calibrate against the first 3–4
# corpus runs. Setting hard numbers before a baseline is the same false precision
# the residency exists to catch; these are placeholders to be replaced with
# measured baselines, not targets pulled from the air.
gate0:
  board_lift:         "> 0       # board finding_precision minus single-agent's; must be positive"
  # RUN 1 (box-and-box @353d1679, n=6): board_lift = -0.33 → FAIL. board 0.42 vs single 0.75.
  # Board lost to confident-wrong fabrication (herding); single critic committed & fabricated less.
  # Redesign deliberation before hardening. See EVIDENCE/gate0.md. n small (1 corpus); calibrate over 3-4.
  # RUN 1.1 (Gate 0.1, +compose.mjs, H1 grounding gate + H2 extractive synth + A' k=3 sampling):
  #   board_lift (precision) = -0.25 → still FAIL (improved from -0.33, NOT flipped).
  #   The falsifiable bet ("H1+H2 alone flip board_lift>=0") is FALSIFIED. See EVIDENCE/gate0_1.md.
  #   HEADLINE: two metrics DIVERGE. citation_verify_rate (mechanical) board 0.904 (BEST, +0.20) but
  #   finding_precision (correctness) board 0.583 (WORST, -0.25): H1 verifies a quote EXISTS, not that
  #   it ENTAILS the claim. k-sampling (A') added nothing (single==sampled, both 0.833).
  #   Next lever is H3 (stance-free falsifier/entailment seat) + H6 (penalize hedging), NOT more H1.
  #   Standing recommendation: default to the single critic until an H3 re-run flips board_lift>0.
  # RUN 1.2 (Gate 0.2, reuse 1.1 debate+board, add ONLY H3 falsifier + H6 commit-revision):
  #   board_lift (precision) = +0.125 → FIRST FLIP > 0 (board 0.875 vs single 0.75, n=4).
  #   H3 raised the SAME findings 0.50 -> 0.875; both designed fixes landed (b2 fabrication
  #   dropped 9/9 NOT_ENTAILED; l3 hedge reversed via 3 HEDGE_UNWARRANTED). New failure: l1
  #   over-deny (falsifier denied the real temporal/supervise rung) -> 0.5. See EVIDENCE/gate0_2.md.
  #   CAVEAT: n=4 not 6 (b3+l2 harness-timeout, resumable); still 1 corpus. Promote H3 only after
  #   b3+l2 close AND a 3rd corpus reproduces board_lift>0. Single critic stays the deployed default.
  # RUN 1.3 (Gate 0.3, 3rd corpus = PULSE @94eb994, MESSIER: TS+JSON-schema+docs; full pipeline, n=4):
  #   board_lift(H3 vs single) = 0.875 - 0.875 = 0.0 → TIE, the Gate 0.2 flip does NOT generalize.
  #   What DID replicate: H3 repair (board H1+H2 0.75 -> board+H3 0.875 = +0.125, same as 0.2) AND the
  #   H1+H2 board LOSS (-0.125, like Gate 0/0.1). Net: board+H3 ~= single, not > single. See gate0_3.md.
  #   p3 methodology finding: SRC_CAP=2600 truncated the t05KappaRouting body (char 4922) out of the
  #   window → single FABRICATED confidently, board+H3 retreated honestly ("insufficient evidence").
  #   VERDICT after 2 corpora: keep the SINGLE CRITIC as deployed default; H3 is a board-repair, not a
  #   board-advantage. Before a 4th corpus: FIX SRC_CAP truncation + use a more discriminating thread set.
  # RUN 1.4 (Gate 0.4, box-and-box cross-file threads c1-c4; tests H4 COVERAGE PANEL + calibration; n=4):
  #   board_lift(H3 vs single) = 1.0 - 1.0 = 0.0 → TIE A THIRD TIME, now on threads BUILT to favor coverage.
  #   H4 (one resident/rung, finding=union) is FALSIFIED as a board advantage: coverage board (B') LOSES
  #   (-0.25) AND under-covers the soloist (3.25 vs 2.25 distinct files cited). The single critic, merely
  #   TOLD "read across files", matched precision and out-covered the panel. New named failure: the coverage
  #   panel fabricates cross-file COUPLINGS (c1 "owned by norm.mjs"; c2 "before the bridge runs") the source
  #   never makes. H3 repaired both (+0.25, like prior). FIXED SRC_CAP (windowed source) — and this DEFLATED
  #   Gate 0.3's p3 win: with decisive lines back in-window the soloist did NOT fabricate, so the
  #   "structure converts fabrication->abstention" edge was largely a truncation-bug artifact. See gate0_4.md.
  #   VERDICT after 3 runs (precision -0.33->-0.25->+0.125->0.0->0.0): GATE 0 CLOSES NEGATIVE. Do not harden
  #   the board. Keep H3 as the one validated lever but apply it to the SOLOIST's findings, not to prop a board.
  # KEEPER (post-Gate-0, Action 1+4): promoted H3 out of the board path into a standalone, corpus-agnostic
  #   stage EVIDENCE/verify-entailment.mjs (H3 falsify + H6 commit-revise), pinned by verify-entailment.test.mjs
  #   (the source-truncation regression: 9/9), acceptance harness verify_run.mjs. ACCEPTANCE RUN (soloist+H3,
  #   NO board, box-and-box c1-c4, n=4): finding_precision soloist 0.75 -> verified 1.0 = VERIFY LIFT +0.25,
  #   ZERO over-deny regression (c2/c4 already 1.0 left untouched). Quality bar PASS. Cost: always-revise = 3x;
  #   revise now GATED on a flagged audit -> clean findings 2x, flagged 3x (avg 2.75x here). Bonus fix: pin
  #   files the question names by filename -> bridge.mjs back in c2, score.mjs in c4 (Gate 0.4 selection
  #   crowding partly explains the c2 "before the bridge runs" fabrication — that file was never in-window).
  #   See EVIDENCE/verify_run.md. Default mechanism is now producer+verify-entailment; board stays research-only.
gate1:
  finding_precision:  ">= 0.75   # findings that survive human verification"
  citation_accuracy:  ">= 0.95   # references that check out as stated"
  duplicate_rate:     "<= 0.08   # near-duplicate proposals / total (also a herding signal)"
  human_acceptance:   ">= 0.60   # findings a reviewer actually acts on"
  coverage:                      # are we even looking at the whole corpus?
    repository_surface: ">= 0.70 # share of source files some finding touches"
    orphaned_symbols:   "track   # exported symbols no finding references (blind spots)"
    stale_documents:    "track   # docs contradicted by code but unflagged"
```

Gates 2 and Far get their own metric blocks when reached — same rule: measure a
baseline first, then set the bar.

### Horizon 1 — Wire into the [&] stack *(Gate 1 → Gate 2)*
The residency stops being standalone and becomes a citizen of the portfolio. Each
item is a connection, not a new system:
- **PULSE manifest.** Declare the residency loop as `residency.pulse.json` (phases
  retrieve▸route▸act▸learn▸consolidate already match observe→…→verify). Now it is a
  first-class loop in the three-protocol stack.
- **PRISM measures it.** Hit-rate / dedup / citation-soundness become PRISM metrics
  tracked **over cycles** — the Gate-1 check becomes *automated and continuous*
  instead of a manual one-off. PRISM exists precisely to measure loops over time.
- **box-and-box governs outputs.** Findings/patches pass the
  `feasible ▸ permitted ▸ best` verdict over the un-weakenable safety floor before
  anything auto-applies. The residency gains the governance gate it currently lacks.
- **Tiered model routing (MODEL_TIER).** Residents route routine reading/triage to
  local models, frontier only for hard synthesis. Fits the zero-budget constraint.
- **Execution tiers via TRAAVIIS/Hermes.** Findings can run experiments: Tier 0
  in-browser (Pyodide/WebContainers) → Tier 1 local (TRAAVIIS) → Tier 2 remote
  (opt-in). Findings now cite *freshly-run* numbers, not corpus-reported ones.

> **Gate 2 — Verified, governed improvement.** The residency reliably proposes
> *executed* patches that pass governance and survive human review — i.e. it
> measurably improves real codebases with a human in the loop.

### Horizon 2 — The sovereign, self-referential endgame *(Gate 2 → far)*
The deep convergence, and the reason TRVM and the residency belong together:
- **IN-CRDT as the residency's memory substrate.** A residency's accumulated
  findings become content-addressed confluent computations — TRVM's actual research
  result (`research/INCRDT.md`: `merge = NF(A ∪ B)`). Merging two residencies'
  knowledge is then coordination-free `union + reduce`. TRVM's contribution finds
  its killer application; the residency's memory finds its theoretical foundation.
  *(This is the IN-CRDT ↔ Graphonomous decision resolving toward "substrate.")*
- **Peer-to-peer CRDT-merged sovereign residencies.** Several people each run a
  residency fully in-browser (it already uses a G-Set CRDT + BroadcastChannel
  locally); they merge findings peer-to-peer over WebRTC, **no server**. This is
  *literally TRVM's coordination-free distribution thesis applied to the
  residency's own memory* — the residency becomes both the demo of, and built on,
  the runtime it studies. Maximum sovereignty, zero infrastructure.
- **Residency Exchange — a findings interchange protocol.** Promote the Horizon-0
  findings object to a wire format (claim · evidence · confidence · provenance ·
  verification · experiment · benchmark · citations · supersedes), aligned to the
  W3C PROV data model so provenance is expressed in a standardized, already-
  interoperable vocabulary rather than a bespoke one. This is **not introduced
  because another protocol sounds desirable** — it *emerges* as a forced
  requirement: the peer-to-peer merge above cannot happen without a canonical,
  versioned representation of a finding to merge. Think ActivityPub/RSS but for
  *findings*: two codebases exchange verified knowledge without sharing internal
  implementation. Name it, version it, and the thing the P2P merge already needed
  becomes a reusable [&] protocol in its own right. The payoff is **two bodies of
  knowledge merging**, not another residency instance running.
- **Residency-per-repo.** A standing research board for each portfolio product. Not
  a new platform — a deployment pattern of the now-generic residency.

> **Far Gate — Worth accumulating.** Build distributed/durable memory only for
> findings the earlier gates proved are worth keeping. Do not build a coordination-
> free knowledge fabric for findings nobody trusts.

### Horizon 3 — Meta-learning *(strictly after Gate 2, and only if it earns it)*
Once the residency reliably proposes governed, executed, verified improvements,
the obvious next question is whether it can improve **its own loop** — better
prompts, personas, dedup heuristics, retrieval. There is real precedent: self-
improving agent systems (Darwin Gödel Machine / ADAS) edit their own scaffolding
and keep changes *only when an empirical benchmark validates them* — never on a
proof, always on measured outcomes. PRISM is exactly that benchmark harness, so
the residency already has the validator such a loop requires. But this is the most
dangerous horizon and is fenced accordingly:
- **Proposals, not self-modification.** The residency proposes changes to its own
  loop; a human (and box-and-box) approves them. No unsupervised self-editing.
- **Beware Goodhart.** A loop optimizing its own metrics will game them. Hold out
  fresh corpora the optimizer never sees; meta-learning is validated on those, not
  on the metrics it was tuned against.
- **Gated like everything else.** No meta-learning until Gate 2 is durably passed,
  and each self-improvement is itself a finding subject to Gates 0–2.

> **Meta Gate — Self-improvement that survives held-out validation.** A proposed
> change to the residency's own loop raises finding quality on corpora it was never
> tuned on. Anything that only improves the metric it optimized is rejected.

---

## What stays missing on purpose (non-goals carry over from `DIRECTION.md`)

Reputation / trust / influence graphs · world simulation · a bespoke memory
platform · "residents that feel alive" · autonomous empires · any reimplementation
of Graphonomous / PRISM / PULSE / [&] / TRAAVIIS. Every wire above goes to a thing
that already exists. If a feature does not raise the finding hit-rate or close a
real loop, it is out of scope.

---

## Two principles that hold across all horizons

1. **Sovereign-by-default, escalate only when forced.** Browser first, local
   second, remote opt-in. Local-first memory; cloud (Graphonomous) is an optional
   sink, never a runtime dependency. Honors the zero-budget constraint at every
   horizon.
2. **Gates over timelines.** Advance on evidence (a passed gate), not on a
   calendar. Each horizon is cheap to abandon if its gate fails — which is the
   protection against rebuilding the empire by accident.

---

## One-line summary

The far future of the residency is not a bigger residency — it is the residency
**wired into everything you already built**, governed by box-and-box, measured by
PRISM, declared in PULSE, remembering via IN-CRDT/Graphonomous, executing via
TRAAVIIS, and ultimately merging peer-to-peer as a living proof of TRVM's own
distribution thesis. Build it one gated wire at a time.
