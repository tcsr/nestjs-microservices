# Microservices Docs

Notes (concepts + trade-offs) mapped to the running code in `apps/*` and
`libs/contracts`.

## Study notes
- [microservices-fundamentals.md](notes/microservices-fundamentals.md)
- [communication.md](notes/communication.md)
- [kafka.md](notes/kafka.md)
- [saga.md](notes/saga.md)
- [patterns.md](notes/patterns.md)
- [resilience.md](notes/resilience.md)
- [observability-deployment.md](notes/observability-deployment.md)

## Architecture / trade-offs
- [architecture/microservices-tradeoffs.md](architecture/microservices-tradeoffs.md)

## How the code maps to the concepts
| Concept | Where |
|---|---|
| API gateway | `apps/gateway` |
| Sync RPC (request/response) | `products` `@MessagePattern`, gateway `ClientKafka.send` |
| Async events (pub/sub) | every `@EventPattern` + `ClientKafka.emit` |
| Saga (choreography) + compensation | `orders` (state) + `inventory.release` |
| Idempotent consumers | `IdempotencyStore` in each handler |
| Event envelope + correlation id | `libs/contracts/events.ts` |
| Event-carried state transfer | `payment` caches amount from `ORDER_CREATED` |
| Database-per-service | each service's in-memory store (would be its own DB) |
| Real-time push | `apps/gateway/events.gateway.ts` (WebSocket) |
| Shared contracts / versioning | `libs/contracts` (`@app/contracts`) |
