/**
 * CONTRACT TEST (lightweight)
 * ---------------------------
 * Guards the shared event contract so a producer change can't silently break
 * consumers: verifies the envelope shape + that a known payload conforms. In a
 * bigger system this is where Pact (consumer-driven contracts) or schema-registry
 * compatibility checks live — see docs/notes/observability-deployment.md.
 */

import { describe, it, expect } from 'vitest';
import { envelope, ORDER_CREATED, type OrderCreated } from './index.js';

describe('event contract', () => {
  it('envelope carries id, type, correlationId, occurredAt + data', () => {
    const data: OrderCreated = { orderId: 'o1', customerId: 'c1', items: [], total: 0 };
    const evt = envelope(ORDER_CREATED, data, 'corr-1');

    expect(evt.type).toBe('order.created');
    expect(evt.correlationId).toBe('corr-1');
    expect(typeof evt.eventId).toBe('string');
    expect(Number.isNaN(Date.parse(evt.occurredAt))).toBe(false);
    expect(evt.data).toEqual(data);
  });

  it('each envelope gets a unique eventId (for idempotency/dedup)', () => {
    const a = envelope(ORDER_CREATED, {} as OrderCreated, 'c');
    const b = envelope(ORDER_CREATED, {} as OrderCreated, 'c');
    expect(a.eventId).not.toBe(b.eventId);
  });
});
