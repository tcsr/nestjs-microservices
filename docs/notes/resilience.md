# Resilience & Failure Handling

Partial failure is the NORMAL state of a distributed system — one service is always
degraded/slow/restarting. Design for it.

## Patterns
- **Timeouts** — never wait forever on a remote call. A missing timeout turns one
  slow dependency into a thread/connection exhaustion outage.
- **Retries + exponential backoff + jitter** — retry transient failures, backing off
  (e.g. 100ms, 200ms, 400ms) with randomness to avoid a **thundering herd**. Only
  retry **idempotent** operations, or you double-charge.
- **Circuit breaker** — after N failures to a dependency, "open" the circuit and fail
  fast (don't hammer a dead service); periodically "half-open" to test recovery.
  Prevents cascading failure + gives the dependency room to recover.
- **Bulkhead** — isolate resources (thread/connection pools) per dependency so one
  slow dependency can't starve the whole app (like watertight compartments).
- **Rate limiting / throttling** — protect a service from overload; shed or queue
  excess.
- **Backpressure** — signal upstream to slow down when overwhelmed (Kafka's pull
  model gives this naturally: consumers read at their own pace).
- **Fallback / graceful degradation** — return cached/default/partial results when a
  dependency is down (e.g. show the catalog without live stock).
- **Dead Letter Queue** — park poison messages after retries so they don't block the
  partition; inspect/replay later.
- **Idempotency** — the safety net that makes retries + at-least-once delivery safe
  (see patterns.md).

## Async messaging is itself a resilience tool
- The broker **buffers** work: if payment is down, `INVENTORY_RESERVED` events wait in
  the topic and are processed when it recovers — no lost work, no cascading failure.
  This is a core reason to prefer events over sync chains for workflows.

## Health checks & self-healing
- **Liveness** (is the process alive? restart if not) vs **readiness** (can it serve
  traffic / is Kafka reachable? pull from LB if not). Orchestrators (k8s) use these to
  restart + route around unhealthy instances.
- **Graceful shutdown**: on SIGTERM stop taking new work, finish in-flight, commit
  offsets, disconnect — avoids dropping messages mid-process.

## Testing failure
- **Chaos engineering** — deliberately kill instances / inject latency to verify the
  system degrades gracefully. **Contract tests** ensure a producer's events still
  satisfy consumers' expectations across deploys.

## Interview signals
- Timeout + retry(backoff+jitter) + circuit breaker + bulkhead is the standard combo.
- Retries require idempotency; otherwise you duplicate side effects.
- Circuit breakers stop cascading failure; bulkheads stop resource starvation.
- Brokers give buffering + backpressure for free — a resilience win of async.
