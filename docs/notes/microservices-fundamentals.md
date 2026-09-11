# Microservices — Fundamentals

## What / why
- **Microservices**: an application built as a set of small, independently
  deployable services, each owning one business capability + its own data,
  communicating over the network.
- **Monolith**: one deployable unit. Simpler, faster to start, one DB, easy local
  dev + transactions. Scales as a whole; a change means redeploying everything;
  one bug can take the whole app down; team coordination gets hard at scale.

## When microservices help (and when they don't)
- **Use when**: large org with many teams needing independent deploy cadence;
  parts scale very differently; you need fault isolation; polyglot needs.
- **Don't use when**: small team / early product (a **modular monolith** is usually
  the right first step — split later along seams that proved stable). Microservices
  trade code complexity for **distributed-systems complexity** (network, partial
  failure, eventual consistency, ops). "You must be this tall to ride."
- **Strangler fig**: migrate a monolith incrementally — route new/【extracted】
  capabilities to new services behind a facade, shrinking the monolith over time.

## Decomposition — how to split
- By **business capability / bounded context** (DDD), NOT by technical layer.
  One bounded context → one service (see the backend repo's `docs/architecture/ddd.md`).
  Here: Products, Orders, Inventory, Payment are separate contexts.
- Aim for **high cohesion, low coupling**: a service changes for one reason; a
  feature change shouldn't require editing many services (a "distributed monolith"
  is the failure mode — services so chatty/coupled you get all the cost, none of
  the benefit).
- **Right-size**: not "micro" for its own sake. Too fine → coordination + latency
  explosion; too coarse → monolith. Follow team ownership + change patterns.

## Database-per-service (critical rule)
- Each service **owns its data**; no other service touches its tables. Sharing a DB
  re-couples services (schema changes ripple, hidden dependencies) → the #1
  microservices anti-pattern.
- Consequence: **no cross-service JOINs or distributed transactions**. You get data
  from another service via its API/events, and keep local copies (read models)
  updated by events. Consistency across services is **eventual**.
- In this repo each service keeps its own in-memory store; production = a real DB
  per service (often different engines per need — polyglot persistence).

## Key trade-offs (summary — full table in architecture/)
| Gain | Cost |
|---|---|
| Independent deploy + scale | Network latency, partial failure |
| Fault isolation | Eventual consistency, no easy transactions |
| Team autonomy, polyglot | Ops burden (CI/CD, observability, infra per service) |
| Tech flexibility | Harder testing/debugging across services |

## Interview signals
- Split by bounded context, not layers; database-per-service is non-negotiable.
- Start with a modular monolith; extract services along proven seams.
- The hard part isn't the services — it's the **distributed system** between them.
