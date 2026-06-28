# The Residency — Direction

*The cheaper, truer move. A scoped counter-proposal to the "computational
civilization" vision. Written to model the restraint it argues for.*

---

## Thesis

The residency is a **thin deliberation + findings layer over infrastructure that
already exists**. Its job is to turn a corpus into evidence-grounded findings that
survive human review and improve real artifacts. Everything else — memory,
benchmarks, loop topology, composition, execution — is delegated to things already
built, or deferred until a finding actually needs it.

We do **not** build a persistent computational civilization. We build the smallest
loop that reliably produces good findings, prove it works, and only then grow it.

---

## The one fact that justifies this

The residency's first overnight run produced findings that survived hands-on
verification against the live TRVM corpus and turned into real `spec/paper.md`
edits in well under an hour. That is the unit of value. It is already real. It does
**not** require resident reputation graphs, trust graphs, world simulation, or a
new memory platform. It requires grounded retrieval, verification, and writing —
which the current single-file board already does.

Scale *that*. Not the org chart.

---

## Three principles

### 1. Thin layer, not a new platform

Most of the seductive "build this" list is **reinventing the portfolio under new
names**. Map, don't rebuild:

| Vision-doc concept | Already exists |
|---|---|
| confidence engine, novelty engine, evidence graph, institutional memory, knowledge graph, forgetting, provenance | **Graphonomous** (continual-learning graph, Wilson-interval frontier, κ-deliberation, consolidation, evidence-path tracing, forgetting policies) |
| benchmarks-as-memory, regression tracking over time | **PRISM** |
| research loop, daily rhythm, phase sequencing | **PULSE** (retrieve▸route▸act▸learn▸consolidate) |
| findings-as-objects, living papers, composition | **[&]** |

The residency builds **only** the part none of these cover: a multi-resident
**deliberation board** + **findings as first-class objects with provenance** + a
**living-paper update loop**. That is the only layer none of the existing portfolio
components address.

**Findings are the API of the residency; everything else is implementation.**
Whether the residency uses agents, a single critic, symbolic reasoning, TRVM, or
something not yet invented is an implementation detail. The product is *verified
findings* — so that is the only thing the architecture must keep stable.

### 2. Sovereign-by-default, with a tiered fallback for execution

Browser-sovereignty is not all-or-nothing. The residency is **already** sovereign
for everything that matters: corpus hydration (git CDN, pinned SHA), the board /
CRDT / memory (localStorage + BroadcastChannel), and the runtime under study
(`ic32.wasm` runs in-browser). The only off-browser piece is text generation, and
even that is a **local** process (the `claude` harness proxy), not a cloud service.

For findings that need to *run code*, use a tiered ladder and default to the most
sovereign tier that can do the job:

- **Tier 0 — in-browser (default, zero-cost, fully sovereign).** `ic32.wasm` is
  already embedded. Add **Pyodide** to run the TRVM Python (`ic_ref.py`,
  `dist_ic.py`, `p2.py`) and optionally **WebContainers** to run the JS
  (`swarm.js`) and `make`. This covers nearly every experiment the corpus already
  ships. Browser-native code execution for agents is now a well-trodden 2026
  pattern (WebLLM/WASM/WebWorkers).
- **Tier 1 — local process (still sovereign — user's machine, no cloud).** The
  harness proxy is already this shape. **TRAAVIIS** is the natural execution
  backend here: run `make test`, native `ic32.c`, real-IPC `dist_real.py`.
- **Tier 2 — remote sandbox (opt-in, only when unavoidable).** For genuinely
  distributed / heavy / multi-machine experiments — exactly the *autonomous IC32
  sharded-reduction regime the paper says is unbuilt* (§6.5). Fly Sprites / E2B /
  Modal / Daytona. This is the only tier that leaves the user's machine, and it is
  opt-in per experiment.

The point: **sovereign-by-default, escalate only when the experiment cannot be done
otherwise.** **Remote execution is a capability, not the architecture.**

### 3. Memory is browser-local-first; cloud is an optional sink

The residency already has its own memory: a G-Set CRDT (boards/threads/posts) +
TOPICS + TRACE + Lamport + agentMemory, mirrored to localStorage
(`residency.board.v1`). **That is the source of truth.** Graphonomous is an
*optional consolidation sink* — push findings to it when its MCP is reachable —
**not a runtime dependency**.

This directly answers the standing worry: Graphonomous cloud sync is **not fully
envisioned/built/shipped**, so the residency must not block on it. Local-first
means the residency works fully offline and sovereign today; cloud durability is
additive, behind a feature check, and can land whenever Graphonomous sync ships.

---

## Does TRAAVIIS need to tie in?

**Not for the MVP. Yes, as the eventual execution tier.**

- The current value (textual, evidence-grounded findings) needs retrieval +
  verification + writing — **no code execution**, so no TRAAVIIS.
- TRAAVIIS becomes relevant the moment you want findings backed by **freshly-run
  experiments** instead of the pinned corpus's reported numbers. At that point
  TRAAVIIS is the right home, because it already *is* a gateway/orchestrator.

The clean architecture is the **Hermes pattern** (Nous Research, 2026): split the
**gateway** (holds tokens, routes, orchestrates — TRAAVIIS) from the **sandbox**
(runs untrusted generated code — Tier 0/1/2 backend), on separate trust domains, so
a confused model never holds both tokens and execution. Files touched in the
sandbox sync back to the board as evidence on teardown.

```
  the-residency (browser)          TRAAVIIS (gateway)            sandbox backend
  ┌──────────────────────┐         ┌──────────────────┐         ┌──────────────┐
  │ board · deliberation │  finding│ orchestrate ·    │  run    │ Tier0 wasm/  │
  │ findings · memory    │ ───────▶│ tier-route ·     │ ───────▶│ pyodide      │
  │ (local-first CRDT)   │ needs   │ hold tokens ·    │ exec    │ Tier1 local  │
  │                      │◀─────── │ govern-gate      │◀─────── │ Tier2 remote │
  └──────────────────────┘ evidence└──────────────────┘ results └──────────────┘
```

Decouple now; wire later. Do not make the residency depend on TRAAVIIS to ship.

---

## The validation gate (do this before building anything bigger)

We have n=1: one run, verified good, but the same run also produced ~6 near-
duplicate proposals (the DUP-label cluster) and a citation set whose specific
section numbers were model-asserted. So the open question is **reliability**, not
possibility.

Gate: run the residency on **3–4 more corpora** and measure
- **precision** — findings that survive human verification vs. inflated/duplicate
- **utility** — findings that actually result in a merged change. *Distinct from
  precision:* a finding can be perfectly correct and still not matter, and a
  speculative one can spark a valuable fix. Measure both — precision keeps the
  residency honest, utility keeps it worth reading.
- **dedup quality** — distinct ideas / total proposals
- **citation soundness** — verifiable references / total
- **time-to-value** — median minutes from finding to human decision. The faster a
  reviewer can adjudicate a finding, the more practical the residency is; a correct
  finding that takes an hour to verify is worth less than one verifiable in a glance.

Only if precision *and* utility are high enough to be worth a human's review time
does the residency graduate from "promising demo" to "product." Everything past
Phase 1 below is gated on passing this.

---

## Scoped plan

**Phase 0 — already done.** Browser board, live corpus hydration, local-first CRDT
memory, offline `claude`-harness text generation, `ic32.wasm` in-browser, findings
export.

**Phase 1 — make the findings loop trustworthy (the only thing worth doing now).**
- Findings as first-class objects (claim · evidence refs · status · supersedes).
- A dedup pass so near-duplicate proposals collapse before they reach a human.
- A citation-verification step (flag model-asserted section/theorem numbers).
- Optional one-way export of accepted findings to Graphonomous *when reachable*.
- Run the **validation gate** above.

**Phase 2 — execution-backed findings (only if Phase 1 passes the gate).**
- Tier 0 in-browser runners (Pyodide for the TRVM Python; WebContainers for JS).
- TRAAVIIS as the Tier 1 local gateway (Hermes-style split), Tier 2 remote opt-in.
- Findings can now cite *freshly-run* numbers, not just corpus-reported ones.

**Phase 3 — durability (only if it earns its keep).**
- Graphonomous as the cross-session institutional sink, *if/when* cloud sync ships.

---

## Non-goals (explicitly do not build)

Reputation graphs · trust graphs · influence graphs · world simulation · a bespoke
semantic-memory platform · "residents that feel alive" · daily-rhythm autonomous
empires · any reimplementation of Graphonomous / PRISM / PULSE / [&].

None of these make the findings *better*. Grounded retrieval and verification do.
If a feature does not raise the finding hit rate, it is out of scope.

---

## One-paragraph summary

Keep the runtime (TRVM) and the [&] commercial stack as they are. Treat the
residency as a thin, sovereign-by-default board that produces verified findings,
delegating memory/benchmarks/loops/composition to Graphonomous/PRISM/PULSE/[&]
rather than rebuilding them, keeping its own memory local-first so it never blocks
on unshipped cloud sync, and reaching for TRAAVIIS (Hermes-style gateway) and
remote sandboxes only when a finding genuinely needs to run code. Prove the finding
hit rate is high before building anything bigger. That is the whole move.
