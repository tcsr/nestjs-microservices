/**
 * IDEMPOTENCY helper
 * ------------------
 * Kafka (and most brokers) give AT-LEAST-ONCE delivery: a consumer may see the same
 * event twice (redelivery after a crash/rebalance before the offset was committed).
 * Consumers must therefore be IDEMPOTENT — processing the same eventId twice has the
 * same effect as once.
 *
 * This in-memory store demos the pattern. In production the processed-id set lives
 * in the service's OWN database (a `processed_events` table), ideally written in the
 * SAME transaction as the state change so dedup and effect commit atomically.
 */

export class IdempotencyStore {
  private readonly seen = new Set<string>();

  /** Returns true the FIRST time an id is seen, false on repeats. */
  firstSight(eventId: string): boolean {
    if (this.seen.has(eventId)) return false;
    this.seen.add(eventId);
    return true;
  }
}
