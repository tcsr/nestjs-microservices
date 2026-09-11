/**
 * PRODUCTS SERVICE — synchronous RPC responder.
 * ---------------------------------------------
 * Demonstrates REQUEST/RESPONSE messaging (@MessagePattern): the gateway asks for a
 * product and WAITS for the reply. This is the synchronous style — simple, but it
 * temporally couples caller and callee (products must be up for checkout to price
 * items). Contrast with the event-driven saga (fire-and-forget).
 *
 * Owns its OWN data (database-per-service) — here an in-memory catalog.
 */

import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PRODUCT_GET, type ProductGetRequest, type ProductGetResponse } from '@app/contracts';

const CATALOG: Record<string, { name: string; price: number; inStock: boolean }> = {
  p1: { name: 'Keyboard', price: 49.99, inStock: true },
  p2: { name: 'Mouse', price: 19.99, inStock: true },
  p3: { name: 'Monitor', price: 199.0, inStock: true },
  p4: { name: 'Discontinued', price: 0, inStock: false },
};

@Controller()
export class ProductsController {
  // Sync RPC: returns a value; Kafka routes the reply back to the caller.
  @MessagePattern(PRODUCT_GET)
  getProduct(@Payload() req: ProductGetRequest): ProductGetResponse {
    const p = CATALOG[req.productId];
    return {
      id: req.productId,
      name: p?.name ?? 'Unknown',
      price: p?.price ?? 0,
      inStock: p?.inStock ?? false,
    };
  }
}
