# Microservices — Trade-offs & Anti-patterns

## The core trade-off
Microservices trade **code/organizational complexity** for **distributed-systems
complexity**. You buy independent deploy/scale/fault-isolation and pay with network
latency, partial failure, eventual consistency, and heavy ops. Worth it at scale +
many teams; a net loss for a small team on a young product.

## Benefits vs costs
| Benefit | Cost / consequence |
|---|---|
| Independent deployability (per-team cadence) | Versioning + backward-compatible contracts required |
| Independent scaling (scale hot services only) | More infra, orchestration, cost |
| Fault isolation (one service down ≠ all down) | Must design for partial failure (timeouts, breakers) |
| Team autonomy / clear ownership | Coordination moves to API/event contracts |
| Polyglot (right tech per service) | Ops must support many stacks; less code reuse |
| Smaller, focused codebases | System-level reasoning is harder |
| Replaceability (rewrite one service) | No cross-service transactions; eventual consistency |

## Anti-patterns (how it goes wrong)
- **Distributed monolith** — services so coupled/chatty they must deploy together.
  All the cost, none of the benefit. Usually from wrong boundaries or shared DB.
- **Shared database** across services — re-couples schemas; the #1 mistake. Each
  service owns its data.
- **Too fine-grained ("nano-services")** — a service per class; latency + operational
  overhead explode. Right-size to bounded contexts + team ownership.
- **Chatty communication** — N sync calls to render one page → latency + cascading
  failure. Aggregate, cache, or use events + read models.
- **Sync call chains** — A→B→C→D synchronously: latency adds up, any hop down fails
  the whole chain. Prefer async choreography for workflows.
- **No observability** — impossible to debug across services. Correlation ids +
  tracing are table stakes, not add-ons.
- **Ignoring idempotency / eventual consistency** — duplicates and races in
  production. At-least-once is the default; design for it.
- **Premature microservices** — splitting before you understand the domain; you cut
  boundaries wrong and pay to move them. Start with a **modular monolith**.

## When NOT to use microservices
- Small team / early-stage product / unproven domain.
- The domain boundaries aren't clear yet (you'll cut them wrong).
- You don't have the ops maturity (CI/CD, monitoring, on-call, IaC).
- A modular monolith would meet the scaling + team needs — it usually does for a long
  time. **Prefer it until the pain (deploy coupling, divergent scaling, team
  contention) is real**, then extract along stable seams.

## Decision checklist
1. Do multiple teams need to deploy independently? 
2. Do parts scale very differently? 
3. Is fault isolation worth the distributed complexity? 
4. Are the bounded contexts stable + well understood? 
5. Do you have the ops maturity to run it?
Mostly "no" → modular monolith. Mostly "yes" → microservices, split by bounded
context, database-per-service, async-first, observable from day one.
