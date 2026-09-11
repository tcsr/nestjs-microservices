# Inter-Service Communication

## Synchronous vs Asynchronous
| | Synchronous (request/response) | Asynchronous (messaging/events) |
|---|---|---|
| Caller waits? | Yes | No (fire-and-forget) |
| Coupling | **Temporal** — callee must be up now | Loose — broker buffers |
| Examples | REST, gRPC, Kafka `@MessagePattern` | Kafka/RabbitMQ events `@EventPattern` |
| Failure blast radius | Cascades (callee down → caller fails/blocks) | Contained (consume later) |
| Consistency | immediate | eventual |
| Best for | queries needing an answer now | workflows, fan-out, decoupling |

In this repo: **sync RPC** for pricing (`product.get`) + order creation
(`order.create`) — the client needs an answer. **Async events** for the saga
(reserve → charge → confirm) — no one waits; services react.

**Rule of thumb**: prefer async/events for cross-service workflows; use sync only
when you truly need an immediate answer. Every sync call adds a temporal coupling
and a failure path.

## Protocols for synchronous calls
- **REST/HTTP** — ubiquitous, human-readable, cache-friendly; verbose, no schema by
  default.
- **gRPC** — HTTP/2 + Protobuf: fast, strongly-typed (schema-first), streaming;
  binary (harder to debug), needs codegen. Great for internal service-to-service.
- **GraphQL** — flexible client-driven queries, good at the edge/gateway
  (aggregation).

## Messaging styles (async)
- **Point-to-point queue** — one consumer processes each message (work distribution).
- **Publish/subscribe** — every subscriber group gets the event (fan-out). Kafka
  does both via consumer groups (see kafka.md).
- **Broker choice**: Kafka (log, replay, high throughput, ordering per partition,
  stream processing) vs RabbitMQ/NATS (flexible routing, lower-latency RPC, simpler)
  vs cloud (SNS+SQS, EventBridge). Kafka shines for event streaming + replay.

## API Gateway pattern (`apps/gateway`)
- Single entry point for clients; hides internal topology. Responsibilities:
  routing, **aggregation** (compose multiple services into one response), auth,
  rate limiting, TLS termination, request-id, protocol translation (HTTP↔Kafka).
- **BFF** (Backend-for-Frontend): a gateway tailored per client (web/mobile).
- Trade-off: can become a bottleneck / a mini-monolith — keep it thin (no business
  logic; orchestration only).

## Service discovery
- Services need to find each other's network locations, which change (scaling,
  restarts). Options: **client-side** (registry like Consul/Eureka + client picks
  an instance) or **server-side** (a load balancer / k8s Service DNS in front).
- With a **message broker** (Kafka), services don't discover each other at all —
  they only know the broker + topic names. That's a big operational simplification
  (another reason events reduce coupling).

## Interview signals
- Sync couples temporally + cascades failures; default to async for workflows.
- gRPC for fast typed internal calls; REST at the edge; events for decoupling.
- Gateway centralizes cross-cutting concerns but must stay thin.
- Brokers remove the need for service discovery between producers/consumers.
