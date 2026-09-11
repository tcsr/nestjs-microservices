/**
 * GATEWAY controller — HTTP entry + Kafka event consumer.
 * ------------------------------------------------------
 * POST /checkout runs the sync part and returns the orderId immediately.
 * @EventPattern handlers consume the saga's terminal events and push the final
 * status to the browser over WebSocket (real-time). The gateway is the ONLY
 * service the outside world talks to (API Gateway pattern) — it hides the internal
 * topology and does cross-cutting concerns (auth, rate limiting, aggregation).
 */

import { Body, Controller, Post, HttpCode } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
  ORDER_CONFIRMED,
  ORDER_CANCELLED,
  type EventEnvelope,
  type OrderConfirmed,
  type OrderCancelled,
} from '@app/contracts';
import { GatewayService, type CheckoutDto } from './gateway.service.js';
import { OrderEventsGateway } from './events.gateway.js';

@Controller()
export class GatewayController {
  constructor(
    private readonly gateway: GatewayService,
    private readonly ws: OrderEventsGateway,
  ) {}

  @Post('checkout')
  @HttpCode(202) // Accepted: order created, saga runs asynchronously
  checkout(@Body() dto: CheckoutDto) {
    return this.gateway.checkout(dto);
  }

  @EventPattern(ORDER_CONFIRMED)
  onConfirmed(@Payload() evt: EventEnvelope<OrderConfirmed>) {
    this.ws.pushStatus(evt.data.orderId, 'CONFIRMED');
  }

  @EventPattern(ORDER_CANCELLED)
  onCancelled(@Payload() evt: EventEnvelope<OrderCancelled>) {
    this.ws.pushStatus(evt.data.orderId, 'CANCELLED', evt.data.reason);
  }
}
