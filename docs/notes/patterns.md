# Distributed Data Patterns

## Idempotency (mandatory with at-least-once delivery)
- A handler is **idempotent** if processing the same message twice == once. Kafka
  redelivers on crash/rebalance, so this is required, not optional.
- Implement by recording processed **event ids** and skipping repeats
  (`IdempotencyStore` here). In production the processed-id set is a table written in
  the SAME transaction as the effect (dedup + effect commit atomically).

## Outbox pattern
- Problem: "update my DB" and "publish an event" can't be one atomic step across DB
  + broker (dual-write problem) → crash between them loses/duplicates events.
- Solution: write the event into an `outbox` table **in the same DB transaction** as
  the state change. A separate relay (poller or CDC like Debezium) reads the outbox
  and publishes to Kafka, marking rows sent. Guarantees **at-least-once** publish
  atomic with the state change.

## Event-carried state transfer (used by `payment`)
- Instead of calling back to another service for data, include the needed data in
  the event, and let consumers build their **own local read model**. Payment learns
  the order amount from `ORDER_CREATED` and caches it — no sync call to orders.
- Trade-off: duplicated data + must handle updates, but removes runtime coupling.

## CQRS (Command Query Responsibility Segregation)
- Separate the **write model** (commands, aggregates, normalized) from the **read
  model** (queries, denormalized/materialized views), often in different stores kept
  in sync by events.
- Wins: read + write scale + optimize independently; complex domains stay clean.
- Costs: more moving parts, eventual consistency between write and read side. Use
  where read/write needs genuinely diverge — not everywhere.

## Event sourcing
- Persist the **sequence of events** as the source of truth; current state = replay
  of events. Gives a full audit log, time-travel, and easy rebuilds/projections.
- Costs: event schema evolution, snapshots for performance, a real mindset shift,
  harder ad-hoc queries. Often paired with CQRS. Adopt where audit/history are
  first-class; overkill for CRUD.

## Read models / projections
- Services subscribe to others' events and maintain a **denormalized local copy** of
  just what they need (e.g. an order-history view joining data from several
  services), updated as events arrive. Avoids cross-service joins + runtime calls.

## Distributed transactions
- Avoid 2PC (blocking, poor availability). Use **sagas** (see saga.md) for
  cross-service consistency, **outbox** for atomic publish, **idempotency** for
  safe retries. Design for **eventual** consistency.

## API composition
- To answer a query needing data from several services (no cross-service join): the
  gateway **calls each service and composes** the result (or reads a pre-built CQRS
  view). Trade-off: fan-out latency + partial-failure handling.

## Strangler fig (migration)
- Incrementally extract capabilities from a monolith behind a facade/gateway, routing
  traffic to the new service, until the monolith is gone. Lower risk than a big-bang
  rewrite.

## Interview signals
- At-least-once → idempotent consumers (dedup by event id).
- Dual-write problem → outbox (+ CDC) for atomic state-change + publish.
- CQRS/event-sourcing are powerful but costly — apply where they earn their keep.
- Cross-service reads via events + local read models, not shared DBs or joins.
