/**
 * INVENTORY domain logic — owns stock (database-per-service; in-memory here).
 * Reserve on order.created; release on order.cancelled (COMPENSATING action).
 * Reservations are tracked so a cancel can put the exact quantities back.
 */

import { Injectable } from '@nestjs/common';
import type { OrderItem } from '@app/contracts';

@Injectable()
export class InventoryService {
  // productId -> available quantity
  private readonly stock = new Map<string, number>([
    ['p1', 10],
    ['p2', 5],
    ['p3', 5], // ordering >5 triggers the inventory-rejection path;
    //          ordering 3 (price 199*3=597 > payment limit 500) passes stock but
    //          triggers the payment-failure + compensation path.
  ]);
  // orderId -> reserved items (for compensation on cancel)
  private readonly reservations = new Map<string, OrderItem[]>();

  /** Try to reserve all items atomically. Returns null on success, or a reason. */
  reserve(orderId: string, items: OrderItem[]): string | null {
    if (this.reservations.has(orderId)) return null; // idempotent: already reserved
    // Check availability for every line first (all-or-nothing).
    for (const it of items) {
      const have = this.stock.get(it.productId) ?? 0;
      if (have < it.quantity) return `Insufficient stock for ${it.productId}`;
    }
    // Commit the reservation.
    for (const it of items) {
      this.stock.set(it.productId, (this.stock.get(it.productId) ?? 0) - it.quantity);
    }
    this.reservations.set(orderId, items);
    return null;
  }

  /** Compensating action: return the reserved quantities to stock. */
  release(orderId: string): void {
    const items = this.reservations.get(orderId);
    if (!items) return; // nothing reserved / already released -> idempotent
    for (const it of items) {
      this.stock.set(it.productId, (this.stock.get(it.productId) ?? 0) + it.quantity);
    }
    this.reservations.delete(orderId);
  }

  snapshot() {
    return Object.fromEntries(this.stock);
  }
}
