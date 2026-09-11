# Observability & Deployment

## Observability (you can't debug what you can't see)
A request now spans many services — you need to reconstruct its path.

- **Correlation / trace id** — generate an id at the edge (gateway) and propagate it
  through every call + event (here: `correlationId` in the event envelope, seeded
  from the request). Every log line carries it → filter one checkout end-to-end.
- **Distributed tracing** — OpenTelemetry / Jaeger / Zipkin: each service records
  **spans** (operation + timing) tied by trace id → a flame graph of the whole
  request across services. Finds the slow hop.
- **Centralized logging** — ship structured (JSON) logs to one place (ELK / Loki),
  searchable by correlation id, service, level.
- **Metrics** — Prometheus + Grafana. Watch **RED** (Rate, Errors, Duration) per
  service and **USE** (Utilization, Saturation, Errors) for resources; for Kafka,
  **consumer lag** (how far behind consumers are) is the key health signal.
- **Alerting on SLOs** — page on symptoms users feel (error rate, latency, lag), not
  every blip.

## Deployment & scaling
- **Containers** — each service ships as an image (its own deps/runtime). Immutable,
  reproducible. This repo has the compose file for Kafka; each service would get its
  own Dockerfile.
- **Orchestration (Kubernetes)** — schedules containers, restarts on failure,
  **horizontal scaling** (more replicas — Kafka caps useful replicas at the partition
  count per group), rolling deploys, service DNS, config/secrets, autoscaling (HPA).
- **Independent deployability** — each service has its own pipeline; deploy one
  without the others. Requires **backward-compatible** event/API changes so old and
  new versions coexist during rollout (expand–contract; additive event fields).
- **Config & secrets** — externalize (env, ConfigMaps, Vault); never bake secrets
  into images. 12-factor.
- **Service mesh** (Istio/Linkerd) — offloads mTLS, retries, timeouts, traffic
  splitting, telemetry to sidecars, out of app code. Powerful but adds complexity —
  adopt when the fleet is large.

## Security across services
- **Edge auth** at the gateway (validate JWT/OIDC once); pass identity/claims inward.
- **Service-to-service auth** — mTLS (often via mesh) or signed service tokens; don't
  trust the network ("zero trust"). Least-privilege per service.
- **Topic ACLs** — restrict which services can produce/consume which topics.

## Versioning & schema
- Events are a public contract. Evolve them **backward-compatibly** (add optional
  fields; never remove/repurpose a field consumers read). A **schema registry**
  (Avro/Protobuf + compatibility checks) enforces this at the broker. Version topics
  when a breaking change is unavoidable (`order.created.v2`).

## Testing microservices
- **Unit** per service (pure logic). **Contract testing** (Pact / schema
  compatibility) so a producer change can't silently break consumers — the key
  cross-service safety net. **Integration/e2e** with the broker (testcontainers).
  **Chaos** for failure behavior.

## Interview signals
- Propagate a correlation/trace id everywhere; tracing + centralized logs + metrics
  (RED/USE + consumer lag) are the three pillars.
- Independent deploy needs backward-compatible contracts (expand–contract, schema
  registry).
- Zero-trust service auth (mTLS), edge auth at the gateway, topic ACLs.
- Contract tests catch cross-service breakage that unit tests can't.
