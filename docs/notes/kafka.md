# Apache Kafka

A distributed, durable, append-only **commit log**. Not a traditional queue — it's a
replayable log of records, ideal for event streaming.

## Core concepts
- **Topic** — a named stream of records (e.g. `order.created`). Producers append;
  consumers read.
- **Partition** — a topic is split into partitions; each is an **ordered, immutable
  append-only log**. Partitions are the unit of **parallelism** and **ordering**.
  - Ordering is guaranteed **only within a partition**, not across a topic.
  - Records with the same **key** hash to the same partition → same-key events stay
    ordered (e.g. key by `orderId` so all events for an order are ordered).
- **Offset** — a record's position in a partition. Consumers track "how far I've
  read" by committing offsets (not deleting messages).
- **Consumer group** — consumers sharing a `groupId`. Kafka assigns each partition
  to **exactly one** consumer in the group → scale by adding consumers (up to the
  partition count). Different groups each get **all** messages (pub/sub). In this
  repo each service = one group (see `GROUPS` in `libs/contracts`).
- **Broker / cluster** — servers holding partitions. **Replication factor** copies
  each partition across brokers; one is **leader** (reads/writes), others follow →
  fault tolerance. (KRaft mode replaces ZooKeeper for cluster metadata.)
- **Retention** — records persist for a configured time/size (not until consumed),
  so consumers can **replay** history or new consumers can read from the start.
  Log **compaction** keeps only the latest record per key (for state topics).

## Delivery semantics (know these cold)
- **At-most-once** — commit offset before processing; a crash loses the message. Rare.
- **At-least-once** — process, then commit; a crash before commit → **redelivery**
  (duplicate). **Kafka's practical default.** Consumers MUST be **idempotent**
  (dedup by event id — `IdempotencyStore` here).
- **Exactly-once** — Kafka transactions + idempotent producer give EOS *within
  Kafka* (consume-transform-produce). End-to-end with external side effects still
  needs idempotency/outbox. Costs throughput; don't reach for it reflexively.

## Producing / consuming (NestJS `@nestjs/microservices`)
- Producer: `ClientKafka.emit(topic, message)` (event) or `.send(topic, msg)`
  (request/response — needs `subscribeToResponseOf` + a reply topic).
- Consumer: `@EventPattern(topic)` (event) / `@MessagePattern(topic)` (RPC).
- Reliability knobs: `acks=all` (wait for replicas), producer `retries` +
  idempotent producer (no dup on retry), consumer `autoCommit` vs manual commit
  after successful processing.

## Dead Letter Queue (DLQ)
- A poison message (always fails) blocks its partition. Route it after N retries to
  a **DLQ topic** for later inspection/replay, so the partition keeps flowing.

## Kafka vs a queue (RabbitMQ)
| | Kafka | RabbitMQ |
|---|---|---|
| Model | durable log, pull, replayable | broker queues, push, ack-and-delete |
| Ordering | per partition | per queue |
| Replay / history | yes (retention) | no (consumed = gone) |
| Throughput | very high | high |
| Routing flexibility | topic + key | exchanges/bindings (rich) |
| Best for | event streaming, audit, replay | task queues, complex routing, RPC |

## Trade-offs / gotchas
- **Partition count** caps consumer parallelism and is awkward to change later
  (re-keys ordering) — plan it.
- Ordering only per partition → design keys around what must stay ordered.
- More partitions = more parallelism but more overhead + rebalancing pauses.
- **Rebalancing** (a consumer joins/leaves) briefly pauses consumption.
- Auto-create topics is convenient in dev, dangerous in prod (typos make ghost
  topics) — provision topics explicitly with chosen partitions/replication.

## Interview signals
- Ordering is per-partition; key by your consistency unit (orderId).
- Consumer group = one partition per consumer; groups = pub/sub fan-out.
- At-least-once is the default → idempotent consumers are mandatory.
- Retention enables replay + new consumers; compaction for state topics.
