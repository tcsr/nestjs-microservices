/**
 * KAFKA TOPICS & MESSAGE PATTERNS — the shared contract between services.
 * ----------------------------------------------------------------------
 * Every service imports these constants so producers and consumers agree on names
 * (no magic strings). Two interaction styles:
 *
 *  - COMMANDS (request/response, @MessagePattern): synchronous RPC. The caller
 *    waits for a reply. Use sparingly — it couples services temporally.
 *  - EVENTS (fire-and-forget, @EventPattern): asynchronous facts. The publisher
 *    doesn't know or wait for consumers. This is the backbone of the saga.
 *
 * Event names are PAST TENSE (something happened). Commands are imperative.
 */

// --- Commands (sync RPC) ---
export const PRODUCT_GET = 'product.get'; // gateway -> products: fetch a product
export const ORDER_CREATE = 'order.create'; // gateway -> orders: create an order, returns orderId

// --- Events (async, the checkout saga) ---
export const ORDER_CREATED = 'order.created'; // orders -> (inventory)
export const INVENTORY_RESERVED = 'inventory.reserved'; // inventory -> (payment, orders)
export const INVENTORY_REJECTED = 'inventory.rejected'; // inventory -> (orders)
export const PAYMENT_SUCCEEDED = 'payment.succeeded'; // payment -> (orders)
export const PAYMENT_FAILED = 'payment.failed'; // payment -> (orders)
export const ORDER_CONFIRMED = 'order.confirmed'; // orders -> (gateway push)
export const ORDER_CANCELLED = 'order.cancelled'; // orders -> (inventory compensate, gateway push)

// A single Kafka consumer group id per service (see notes/kafka.md): all instances
// of a service share a group so each partition is processed by exactly one instance.
export const GROUPS = {
  gateway: 'gateway-consumer',
  products: 'products-consumer',
  orders: 'orders-consumer',
  inventory: 'inventory-consumer',
  payment: 'payment-consumer',
} as const;
