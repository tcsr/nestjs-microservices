/**
 * Inventory saga logic — pure unit tests (no Kafka/broker).
 * Verifies reservation (all-or-nothing), rejection on insufficient stock, and the
 * compensating release. Fast + deterministic.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InventoryService } from './inventory.service.js';
import type { OrderItem } from '@app/contracts';

const items = (productId: string, quantity: number): OrderItem[] => [
  { productId, quantity, unitPrice: 10 },
];

describe('InventoryService', () => {
  let svc: InventoryService;
  beforeEach(() => {
    svc = new InventoryService(); // stock: p1:10, p2:5, p3:5
  });

  it('reserves when stock is sufficient', () => {
    expect(svc.reserve('o1', items('p1', 3))).toBeNull();
    expect(svc.snapshot().p1).toBe(7);
  });

  it('rejects when stock is insufficient (no partial reserve)', () => {
    const reason = svc.reserve('o2', items('p3', 99));
    expect(reason).toMatch(/Insufficient/);
    expect(svc.snapshot().p3).toBe(5); // unchanged
  });

  it('release compensates by restoring reserved quantities', () => {
    svc.reserve('o3', items('p2', 4));
    expect(svc.snapshot().p2).toBe(1);
    svc.release('o3');
    expect(svc.snapshot().p2).toBe(5); // restored
  });

  it('reserve is idempotent for the same order', () => {
    svc.reserve('o4', items('p1', 2));
    svc.reserve('o4', items('p1', 2)); // duplicate delivery
    expect(svc.snapshot().p1).toBe(8); // deducted once, not twice
  });
});
