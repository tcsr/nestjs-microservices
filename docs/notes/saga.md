# Sagas & Distributed Transactions

## The problem
Database-per-service means **no ACID transaction spans services**. You can't
"reserve stock AND charge payment AND confirm order" in one commit. A **saga** is a
sequence of **local** transactions, each in one service, coordinated by events; if a
step fails, earlier steps are undone by **compensating transactions**.

## Why not two-phase commit (2PC)?
- 2PC (a coordinator locks all participants, then commits) gives distributed
  atomicity but is **blocking** (a slow/dead participant holds locks), doesn't scale,
  and couples availability. Sagas trade atomicity for **availability + eventual
  consistency** — the microservices-friendly choice.

## Two coordination styles
| | Choreography (this repo) | Orchestration |
|---|---|---|
| Control | each service reacts to events, decides next | a central **orchestrator** issues commands + tracks state |
| Coupling | loose; no central brain | orchestrator knows the whole flow |
| Visibility | flow is emergent (harder to see end-to-end) | flow is explicit in one place |
| Best for | simple/linear flows, few steps | complex flows, many branches, need control |
| Risk | cyclic event chains, hard to trace | orchestrator becomes a mini-monolith / SPOF |

This demo uses **choreography**: services emit + react. The **orders** service holds
the saga state (PENDING → CONFIRMED/CANCELLED) and drives the terminal decision. An
**orchestration** variant would have an "order orchestrator" send `ReserveStock`,
`ChargePayment` commands and await replies.

## The checkout saga here
```
ORDER_CREATED
  └─ inventory.reserve
        success → INVENTORY_RESERVED
              └─ payment.charge
                    success → PAYMENT_SUCCEEDED → orders: CONFIRMED → ORDER_CONFIRMED
                    failure → PAYMENT_FAILED    → orders: CANCELLED → ORDER_CANCELLED
                                                       └─ inventory.release   ← COMPENSATION
        failure → INVENTORY_REJECTED → orders: CANCELLED → ORDER_CANCELLED
```
- **Compensation** ≠ rollback: it's a NEW action that semantically undoes a prior
  one (release the reserved stock, refund a charge). Compensations must be
  **idempotent** and should (ideally) always succeed or be retried.
- Some steps are **not compensatable** (e.g. an email sent) — order the saga so
  irreversible steps come last (pivot transaction), or design around it.

## Eventual consistency
- Between "order placed" and "confirmed" the system is temporarily inconsistent
  (order PENDING, stock reserved, payment not yet done). It **converges** as events
  flow. The UI must handle intermediate states (here: live status via WebSocket).
- Consumers must be **idempotent** (Kafka at-least-once) and tolerate **out-of-order
  / duplicate** events.

## Related: the Outbox pattern (see patterns.md)
Emitting an event AND committing local state must be atomic — otherwise a crash
between them loses the event (or emits a phantom). The **outbox** writes the event to
an `outbox` table in the same DB transaction as the state change; a relay publishes
it to Kafka afterward. This repo emits directly (in-memory) — real services use an
outbox.

## Interview signals
- Saga = local transactions + compensations; replaces cross-service ACID/2PC.
- Choreography (events, loose) vs orchestration (central control, visible) — pick by
  flow complexity.
- Compensations are semantic undo, must be idempotent; sequence irreversible steps
  last.
- Pair with the outbox pattern for atomic state-change + publish.
