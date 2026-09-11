import { Controller, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka, EventPattern, Payload } from '@nestjs/microservices';
import {
  ORDER_CREATED,
  INVENTORY_RESERVED,
  PAYMENT_SUCCEEDED,
  PAYMENT_FAILED,
  IdempotencyStore,
  envelope,
  type EventEnvelope,
  type OrderCreated,
  type InventoryReserved,
} from '@app/contracts';
import { PaymentService } from './payment.service.js';

@Controller()
export class PaymentController implements OnModuleInit {
  private readonly dedupe = new IdempotencyStore();

  constructor(
    private readonly payment: PaymentService,
    @Inject('KAFKA') private readonly kafka: ClientKafka,
  ) {}

  async onModuleInit() {
    await this.kafka.connect();
  }

  // Learn the amount for this order (build local read model).
  @EventPattern(ORDER_CREATED)
  onOrderCreated(@Payload() evt: EventEnvelope<OrderCreated>) {
    this.payment.rememberAmount(evt.data.orderId, evt.data.total);
  }

  // Charge only after stock is reserved.
  @EventPattern(INVENTORY_RESERVED)
  onInventoryReserved(@Payload() evt: EventEnvelope<InventoryReserved>) {
    if (!this.dedupe.firstSight(evt.eventId)) return;
    const { orderId } = evt.data;
    const result = this.payment.charge(orderId);

    if (result.ok) {
      this.kafka.emit(
        PAYMENT_SUCCEEDED,
        envelope(PAYMENT_SUCCEEDED, { orderId, amount: result.amount }, evt.correlationId),
      );
    } else {
      this.kafka.emit(
        PAYMENT_FAILED,
        envelope(PAYMENT_FAILED, { orderId, reason: result.reason }, evt.correlationId),
      );
    }
  }
}
