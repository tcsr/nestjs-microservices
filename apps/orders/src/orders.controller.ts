/**
 * ORDERS — saga state holder (choreography).
 * ------------------------------------------
 * - Handles the ORDER_CREATE command (sync RPC) from the gateway: creates the order
 *   and emits ORDER_CREATED to kick off the saga.
 * - Reacts to inventory/payment events to advance the order to CONFIRMED or
 *   CANCELLED, emitting ORDER_CONFIRMED / ORDER_CANCELLED. ORDER_CANCELLED is the
 *   COMPENSATION trigger for inventory (release stock).
 *
 * The order is the single source of truth for its status; transitions are
 * idempotent so duplicate events don't double-apply.
 */

import { Controller, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka, EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import {
  ORDER_CREATE,
  ORDER_CREATED,
  ORDER_CONFIRMED,
  ORDER_CANCELLED,
  INVENTORY_REJECTED,
  PAYMENT_SUCCEEDED,
  PAYMENT_FAILED,
  IdempotencyStore,
  envelope,
  type EventEnvelope,
  type OrderCreateRequest,
  type OrderCreateResponse,
  type InventoryRejected,
  type PaymentSucceeded,
  type PaymentFailed,
} from '@app/contracts';
import { OrdersService } from './orders.service.js';

@Controller()
export class OrdersController implements OnModuleInit {
  private readonly dedupe = new IdempotencyStore();

  constructor(
    private readonly orders: OrdersService,
    @Inject('KAFKA') private readonly kafka: ClientKafka,
  ) {}

  async onModuleInit() {
    await this.kafka.connect();
  }

  // SYNC RPC: create the order, then fire the async saga.
  @MessagePattern(ORDER_CREATE)
  createOrder(@Payload() req: OrderCreateRequest): OrderCreateResponse {
    const order = this.orders.create(req.customerId, req.items);
    this.kafka.emit(
      ORDER_CREATED,
      envelope(
        ORDER_CREATED,
        { orderId: order.id, customerId: order.customerId, items: order.items, total: order.total },
        req.correlationId,
      ),
    );
    return { orderId: order.id, total: order.total };
  }

  // Stock couldn't be reserved -> cancel (no compensation needed; nothing charged).
  @EventPattern(INVENTORY_REJECTED)
  onInventoryRejected(@Payload() evt: EventEnvelope<InventoryRejected>) {
    if (!this.dedupe.firstSight(evt.eventId)) return;
    const order = this.orders.setStatus(evt.data.orderId, 'CANCELLED');
    if (order) {
      this.kafka.emit(
        ORDER_CANCELLED,
        envelope(ORDER_CANCELLED, { orderId: order.id, reason: evt.data.reason }, evt.correlationId),
      );
    }
  }

  // Payment succeeded -> confirm the order.
  @EventPattern(PAYMENT_SUCCEEDED)
  onPaymentSucceeded(@Payload() evt: EventEnvelope<PaymentSucceeded>) {
    if (!this.dedupe.firstSight(evt.eventId)) return;
    const order = this.orders.setStatus(evt.data.orderId, 'CONFIRMED');
    if (order) {
      this.kafka.emit(ORDER_CONFIRMED, envelope(ORDER_CONFIRMED, { orderId: order.id }, evt.correlationId));
    }
  }

  // Payment failed -> cancel + emit ORDER_CANCELLED so inventory COMPENSATES (releases).
  @EventPattern(PAYMENT_FAILED)
  onPaymentFailed(@Payload() evt: EventEnvelope<PaymentFailed>) {
    if (!this.dedupe.firstSight(evt.eventId)) return;
    const order = this.orders.setStatus(evt.data.orderId, 'CANCELLED');
    if (order) {
      this.kafka.emit(
        ORDER_CANCELLED,
        envelope(ORDER_CANCELLED, { orderId: order.id, reason: evt.data.reason }, evt.correlationId),
      );
    }
  }
}
