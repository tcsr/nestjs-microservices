/**
 * INVENTORY event handlers (choreography participant).
 * ---------------------------------------------------
 * Reacts to events, does its local work, and emits its own events. It never calls
 * other services directly — pure event choreography (loose coupling). Handlers are
 * IDEMPOTENT (dedup by eventId) because Kafka is at-least-once.
 */

import { Controller, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka, EventPattern, Payload } from '@nestjs/microservices';
import {
  ORDER_CREATED,
  ORDER_CANCELLED,
  INVENTORY_RESERVED,
  INVENTORY_REJECTED,
  IdempotencyStore,
  envelope,
  type EventEnvelope,
  type OrderCreated,
  type OrderCancelled,
} from '@app/contracts';
import { InventoryService } from './inventory.service.js';

@Controller()
export class InventoryController implements OnModuleInit {
  private readonly dedupe = new IdempotencyStore();

  constructor(
    private readonly inventory: InventoryService,
    @Inject('KAFKA') private readonly kafka: ClientKafka,
  ) {}

  async onModuleInit() {
    await this.kafka.connect(); // producer must connect before emitting
  }

  @EventPattern(ORDER_CREATED)
  onOrderCreated(@Payload() evt: EventEnvelope<OrderCreated>) {
    if (!this.dedupe.firstSight(evt.eventId)) return; // skip duplicate delivery
    const { orderId, items } = evt.data;

    const reason = this.inventory.reserve(orderId, items);
    if (reason) {
      this.kafka.emit(INVENTORY_REJECTED, envelope(INVENTORY_REJECTED, { orderId, reason }, evt.correlationId));
    } else {
      this.kafka.emit(INVENTORY_RESERVED, envelope(INVENTORY_RESERVED, { orderId }, evt.correlationId));
    }
  }

  // COMPENSATION: order failed downstream (payment) or was cancelled -> free stock.
  @EventPattern(ORDER_CANCELLED)
  onOrderCancelled(@Payload() evt: EventEnvelope<OrderCancelled>) {
    if (!this.dedupe.firstSight(evt.eventId)) return;
    this.inventory.release(evt.data.orderId);
  }
}
