/**
 * EVENT PAYLOAD TYPES + ENVELOPE
 * ------------------------------
 * Every event is wrapped in an EventEnvelope carrying metadata used for:
 *  - eventId       : idempotency / dedup (consumers skip an eventId seen before).
 *  - correlationId : distributed tracing — ties all events of one checkout together
 *                    (propagated from the gateway request-id).
 *  - occurredAt    : ordering / debugging.
 *  - type          : the topic/event name.
 *
 * Versioning: add fields as OPTIONAL (backward compatible). Never repurpose/remove
 * a field consumers still read — evolve events like public APIs (see notes).
 */

export interface EventEnvelope<T> {
  eventId: string;
  type: string;
  occurredAt: string; // ISO
  correlationId: string;
  data: T;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

// --- Event data shapes (the saga) ---
export interface OrderCreated {
  orderId: string;
  customerId: string;
  items: OrderItem[];
  total: number;
}
export interface InventoryReserved {
  orderId: string;
}
export interface InventoryRejected {
  orderId: string;
  reason: string;
}
export interface PaymentSucceeded {
  orderId: string;
  amount: number;
}
export interface PaymentFailed {
  orderId: string;
  reason: string;
}
export interface OrderConfirmed {
  orderId: string;
}
export interface OrderCancelled {
  orderId: string;
  reason: string;
}

// --- Command shapes (sync RPC) ---
export interface ProductGetRequest {
  productId: string;
}
export interface ProductGetResponse {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
}
export interface OrderCreateRequest {
  customerId: string;
  items: OrderItem[];
  correlationId: string;
}
export interface OrderCreateResponse {
  orderId: string;
  total: number;
}

// Helper to build an envelope with a fresh eventId.
export function envelope<T>(type: string, data: T, correlationId: string): EventEnvelope<T> {
  return {
    eventId: crypto.randomUUID(),
    type,
    occurredAt: new Date().toISOString(),
    correlationId,
    data,
  };
}
