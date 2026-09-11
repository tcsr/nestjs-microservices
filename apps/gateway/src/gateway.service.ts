/**
 * GATEWAY service — orchestrates the SYNCHRONOUS part of checkout.
 * ---------------------------------------------------------------
 * 1. Price + validate each item via the products service (sync RPC PRODUCT_GET).
 * 2. Create the order via the orders service (sync RPC ORDER_CREATE) -> orderId.
 * The rest (reserve stock, charge, confirm/cancel) happens ASYNCHRONOUSLY via the
 * event saga; the client is told the orderId immediately and gets the final status
 * pushed over WebSocket.
 *
 * ClientKafka.send() is request/response; you must subscribeToResponseOf() each
 * request pattern before use.
 */

import { BadRequestException, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { randomUUID } from 'node:crypto';
import { firstValueFrom } from 'rxjs';
import {
  PRODUCT_GET,
  ORDER_CREATE,
  type ProductGetResponse,
  type OrderCreateResponse,
  type OrderItem,
} from '@app/contracts';

export interface CheckoutDto {
  customerId: string;
  items: { productId: string; quantity: number }[];
}

@Injectable()
export class GatewayService implements OnModuleInit {
  constructor(@Inject('KAFKA') private readonly kafka: ClientKafka) {}

  async onModuleInit() {
    // Register the reply topics for each RPC, then connect.
    this.kafka.subscribeToResponseOf(PRODUCT_GET);
    this.kafka.subscribeToResponseOf(ORDER_CREATE);
    await this.kafka.connect();
  }

  async checkout(dto: CheckoutDto): Promise<{ orderId: string; total: number; correlationId: string }> {
    if (!dto.items?.length) throw new BadRequestException('No items');
    const correlationId = randomUUID();

    // Price + validate every item (parallel RPCs).
    const priced: OrderItem[] = await Promise.all(
      dto.items.map(async (line) => {
        const product = await firstValueFrom(
          this.kafka.send<ProductGetResponse>(PRODUCT_GET, { productId: line.productId }),
        );
        if (!product.inStock) throw new BadRequestException(`${line.productId} not available`);
        return { productId: line.productId, quantity: line.quantity, unitPrice: product.price };
      }),
    );

    // Create the order (orders service emits ORDER_CREATED to start the saga).
    const created = await firstValueFrom(
      this.kafka.send<OrderCreateResponse>(ORDER_CREATE, {
        customerId: dto.customerId,
        items: priced,
        correlationId,
      }),
    );

    return { orderId: created.orderId, total: created.total, correlationId };
  }
}
