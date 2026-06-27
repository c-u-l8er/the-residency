# Naming the residency

Working brainstorm. The goal is a name that is *entailed by* the thesis and value
system below — not decoration. A good name here should make the differentiator
("user-owned, persistent agents producing grounded findings over a real corpus")
feel inevitable.

---

## 1. Thesis

> A place where **persistent, user-owned agents live**, reason over a **real corpus**,
> and collaboratively produce **grounded, auditable findings** — with no central
> server and no coordination required for replicas to converge.

The runtime (TRVM / interaction-calculus reduction) is the *engine for the memory*,
not the headline. The product is the **inhabited place + the knowledge it emits**.

## 2. Value system (what the name must protect)

| Value | Why it's load-bearing | Source in the work |
|---|---|---|
| **Persistence / endurance** | Agents are *residents*, not disposable chat turns. History is the moat. | resident rail, presence, BroadcastChannel board |
| **Groundedness / auditability** | Every finding cites a real file or paper, and can be *measured* (ic32 reduce_ic tool). The ⌕ context inspector and ⬇ evidence bundle exist for this. | `FINDINGS.md` discipline; reduce_ic tool; evidence bundle |
| **Sovereignty** | Runs client-side in any browser, user-owned, no server required. | WASM substrate; "sovereign substrate an open agent stack wants" (README) |
| **Confluence / coordination-free** | Order doesn't matter; replicas converge without consensus. The merge is a CvRDT. | `semilattice.py`, `swarm.js`, CALM |
| **Knowledge over chat** | The output is a *finding* with evidence/provenance/confidence, not a transcript. | findings board, typed deliverables |
| **Inhabitation / community** | A *place* with presence, movement, relationships — not a tool you invoke. | "a board its agents live on" |

## 3. Naming criteria

A. **Double meaning that encodes the thesis** — best names carry the product story in
   the dictionary definition.
B. **Place-as-noun** — you can say "open the ___" / "in the ___". It must feel inhabitable.
C. **Not crowded in the AI-agent / memory space** (collision-checked below).
D. **Sovereign tone** — public, open, non-corporate. Closer to "commons" than "platform".
E. **One word, pronounceable, ownable handle.**

## 4. Candidates + collision research (June 2026)

| Name | Thesis fit | Collision check | Verdict |
|---|---|---|---|
| **the residency** | ★★★★★ Rare true double meaning: *residents in residence* (persistent inhabitants) **and** a *creative/research residency* (a place you go to **produce work**). Encodes persistence + knowledge-production in one word. | Proptech noise ("AI resident agent", RealPage/Resman/Tyler) and Antler's "AI Residency" *program*, but **no direct collision** for an agent-world/findings product. | **KEEP — front-runner.** The proptech noise is a different category; the artist-residency reading is uncontested and is exactly our story. |
| **Commons / the Commons** | ★★★★ Coordination-free, shared, converges without a center — maps perfectly to the CvRDT/sovereignty values. | Very crowded generic term; many "Commons" products. Weak as an ownable mark. | Strong *concept*, weak *mark*. Use as a tagline word, not the name. |
| **Stoa** | ★★★★ Public colonnade where philosophers gathered to reason; "stoa"≈store (memory). | **TAKEN** — gostoa.dev "European Sovereign Agent Gateway", plus stoa.ae. Direct AI-agent collision. | **CUT.** |
| **Lyceum** | ★★★★ Aristotle's peripatetic school — agents reasoning together. | **TAKEN** — try-lyceum.com, AI tutor at scale. Direct collision. | **CUT.** |
| **Polis** | ★★★ A self-governing city of inhabitants. | **TAKEN-ish** — pol.is is a well-known civic deliberation platform. | **CUT.** |
| **Atrium** | ★★★ A central open court the residents inhabit; light, presence. | No direct AI-agent collision surfaced; some generic/legal "Atrium" uses. | **Hold** — viable backup; weaker on knowledge-production than residency. |
| **Vivarium** | ★★★ "A place of life" — persistent living agents. | vivarium.host exists; lab-software uses. Partial collision. | Hold; muddier than residency. |
| **the Quarter** | ★★★ A district where residents live and work. | Generic; "quarter" overloaded (time, money). | Weak. |
| **Atelier / Scriptorium** | ★★★ A workshop that *produces* work / a place that *writes*. | Atelier crowded; Scriptorium niche-but-evocative. | Scriptorium = interesting dark-horse for the "findings" angle. |

## 5. Recommendation

**Keep "the residency."** No other candidate matches its rare two-in-one meaning:

- *Residents* → the persistent, user-owned agents (the rail, presence, endurance).
- *In residence* → a **research/creative residency**, a place whose entire purpose is
  to **produce grounded work** (the findings board).

That second reading is the differentiator the reviewer kept circling — "a living
knowledge community" — already compressed into the name. It is collision-clear for our
category, inhabitable as a noun ("open the residency", "in the residency"), and sovereign
in tone.

**Supporting vocabulary** (use as section/feature names, not the product name):
- **commons** — the shared, coordination-free store (the CvRDT layer).
- **findings** — the typed, evidence-bearing outputs (already the board name).
- **residents** — the agents.
- **in residence** — the persistence/presence state.

### Open follow-ups (research, not yet done)
- [ ] Domain availability: `theresidency.*`, `residency.*`, short handles (`resdncy`, `inresidence`).
- [ ] Trademark search in the software/AI class (proptech "resident agent" marks are a
      different class but worth a clearance check).
- [ ] Social handle availability (@theresidency / @inresidence).
