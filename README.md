# nestjs-microservices

Event-driven **e-commerce microservices** on **NestJS + Kafka** (monorepo). Built as
a learning source of truth: every microservices concept is demonstrated in running
code and documented with notes + trade-offs in [`docs/`](docs/README.md).

## The system

```
                 ┌─────────── HTTP ───────────┐         ┌── WebSocket (live status) ──┐
   client ──────▶│          GATEWAY           │◀────────┤   browser gets CONFIRMED/    │
                 │ (API gateway + WS + Kafka)  │         │   CANCELLED pushed live      │
                 └──────┬───────────────┬──────┘         └──────────────────────────────┘
             sync RPC   │               │  sync RPC
        ┌───────────────▼──┐        ┌───▼──────────────┐
        │    PRODUCTS      │        │      ORDERS       │  (saga state holder)
        │ price/validate   │        │ create + status   │
        └──────────────────┘        └───┬───────────────┘
                                        │ emits ORDER_CREATED
                     ┌──────────────────▼───────────────────┐   Kafka events (async)
                     │                                       │
             ┌───────▼────────┐                     ┌────────▼───────┐
             │   INVENTORY    │  reserved/rejected  │    PAYMENT     │
             │ reserve/release│─────────────────────▶│ charge/refund │
             └────────────────┘                     └────────────────┘
```

**Checkout saga (choreography)** — [`docs/notes/saga.md`](docs/notes/saga.md):

```
POST /checkout
  gateway --RPC--> products (price items)
  gateway --RPC--> orders (create) -> orderId returned to client (202)
  orders  --emit--> ORDER_CREATED
    inventory reserves stock
      OK  --emit--> INVENTORY_RESERVED --> payment charges
                       OK  --emit--> PAYMENT_SUCCEEDED --> orders CONFIRMED --emit--> ORDER_CONFIRMED
                       FAIL--emit--> PAYMENT_FAILED    --> orders CANCELLED --emit--> ORDER_CANCELLED
                                                                                        └─> inventory RELEASES (compensation)
      FAIL--emit--> INVENTORY_REJECTED --> orders CANCELLED --emit--> ORDER_CANCELLED
  gateway consumes ORDER_CONFIRMED / ORDER_CANCELLED --> WebSocket push to the browser
```

## Services (NestJS monorepo `apps/*`)
| Service | Role | Kafka |
|---|---|---|
| **gateway** | API gateway (HTTP) + WebSocket push + Kafka consumer | RPC caller + event consumer |
| **products** | catalog, pricing | RPC responder (`product.get`) |
| **orders** | order lifecycle + **saga state** | RPC responder + event pub/sub |
| **inventory** | stock reserve / release (**compensation**) | event pub/sub |
| **payment** | charge (mocked) | event pub/sub |

Shared contracts (topics, event payloads, envelope, idempotency, kafka config) live
in [`libs/contracts`](libs/contracts/src) — imported as `@app/contracts`. This is
the versioned boundary between services.

## Run
```bash
npm install
docker compose up -d        # Kafka (KRaft) + Kafka UI at http://localhost:8080
npm run start:all           # all 5 services (watch mode)

# place an order:
curl -X POST http://localhost:3000/checkout -H "Content-Type: application/json" \
  -d '{"customerId":"c1","items":[{"productId":"p1","quantity":1},{"productId":"p2","quantity":2}]}'
# -> { orderId, total, correlationId }  (202)  then watch the services log the saga.

# payment-FAILURE path (total 597 > limit 500): stock reserved, payment fails,
# order CANCELLED, inventory COMPENSATES (releases the stock):
curl -X POST http://localhost:3000/checkout -H "Content-Type: application/json" \
  -d '{"customerId":"c1","items":[{"productId":"p3","quantity":3}]}'

# inventory-REJECTION path (order more than in stock):
curl -X POST http://localhost:3000/checkout -H "Content-Type: application/json" \
  -d '{"customerId":"c1","items":[{"productId":"p3","quantity":10}]}'
```

Real-time: connect a Socket.IO client to `http://localhost:3000`, listen for
`orderStatus` events (`{ orderId, status, reason }`). A demo page is in
[`client/ws-demo.html`](client/ws-demo.html).

## Concepts covered (docs)
| Doc | Covers |
|---|---|
| [notes/microservices-fundamentals.md](docs/notes/microservices-fundamentals.md) | monolith vs microservices, when/why, decomposition, database-per-service |
| [notes/communication.md](docs/notes/communication.md) | sync vs async, RPC vs events, API gateway, service discovery, gRPC/REST/messaging |
| [notes/kafka.md](docs/notes/kafka.md) | topics, partitions, offsets, consumer groups, keys/ordering, replication, delivery semantics, DLQ, retention |
| [notes/saga.md](docs/notes/saga.md) | choreography vs orchestration, compensation, eventual consistency, this flow |
| [notes/patterns.md](docs/notes/patterns.md) | CQRS, event sourcing, outbox, idempotency, event-carried state, strangler fig |
| [notes/resilience.md](docs/notes/resilience.md) | retries, backoff, circuit breaker, bulkhead, timeout, DLQ, backpressure |
| [notes/observability-deployment.md](docs/notes/observability-deployment.md) | correlation ids, tracing, logging, metrics, health, containers, k8s, scaling, config, security |
| [architecture/microservices-tradeoffs.md](docs/architecture/microservices-tradeoffs.md) | the trade-off table, anti-patterns, when NOT to use microservices |

## Ops
- **Tests**: `npm test` — saga-logic unit tests (inventory/payment/orders) + a
  contract test on the event envelope (no broker needed). `npm run typecheck` for
  the whole monorepo.
- **CI**: `.github/workflows/ci.yml` — typecheck + build all 5 + tests on push.
- **Docker (per service)**: parameterized `Dockerfile`:
  `docker build --build-arg APP=orders -t msvc-orders .`
- **Docker (everything)**: `docker compose -f docker-compose.yml -f docker-compose.full.yml up -d --build`
  runs Kafka + all 5 services containerized (services use the internal `kafka:9094`).
- **Kubernetes**: `k8s/services.yaml` — a Deployment per service, Service + HPA for
  the gateway, shared config via ConfigMap (illustrative; needs a cluster + Kafka).

## Note
This is a learning system: services use **in-memory** stores (database-per-service
is documented; each would own a real DB in production). Focus is the **messaging,
saga, and distributed-systems concepts**, which are real. Requires Docker for Kafka.
