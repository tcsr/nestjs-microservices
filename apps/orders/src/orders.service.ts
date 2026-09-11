/**
 * ORDERS domain — owns the order lifecycle + saga state.
 * State machine: PENDING -> CONFIRMED (payment ok) | CANCELLED (inventory/payment fail).
 * In-memory store here; a real service uses its own database (+ outbox for events).
 */

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { OrderItem } from '@app/contracts';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
}

@Injectable()
export class OrdersService {
  private readonly orders = new Map<string, Order>();

  create(customerId: string, items: OrderItem[]): Order {
    const total = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const order: Order = { id: randomUUID(), customerId, items, total, status: 'PENDING' };
    this.orders.set(order.id, order);
    return order;
  }

  setStatus(orderId: string, status: OrderStatus): Order | undefined {
    const order = this.orders.get(orderId);
    if (!order || order.status !== 'PENDING') return order; // idempotent: only transition once
    order.status = status;
    return order;
  }

  get(orderId: string) {
    return this.orders.get(orderId);
  }
}
