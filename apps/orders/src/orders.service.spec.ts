/**
 * Orders saga state — total computation + idempotent status transitions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OrdersService } from './orders.service.js';
import type { OrderItem } from '@app/contracts';

const items: OrderItem[] = [
  { productId: 'p1', quantity: 2, unitPrice: 50 }, // 100
  { productId: 'p2', quantity: 1, unitPrice: 20 }, // 20
];

describe('OrdersService', () => {
  let svc: OrdersService;
  beforeEach(() => {
    svc = new OrdersService();
  });

  it('creates a PENDING order with computed total', () => {
    const o = svc.create('c1', items);
    expect(o.status).toBe('PENDING');
    expect(o.total).toBe(120);
  });

  it('transitions PENDING -> CONFIRMED only once (idempotent)', () => {
    const o = svc.create('c1', items);
    svc.setStatus(o.id, 'CONFIRMED');
    svc.setStatus(o.id, 'CANCELLED'); // ignored: already left PENDING
    expect(svc.get(o.id)?.status).toBe('CONFIRMED');
  });
});
