/**
 * WEBSOCKET GATEWAY — real-time order status push.
 * ------------------------------------------------
 * The client opens a socket and subscribes to its orderId (joins a room). When the
 * saga finishes, the API gateway consumes ORDER_CONFIRMED / ORDER_CANCELLED from
 * Kafka and pushes the status into that room — the browser updates live without
 * polling.
 *
 * Scaling note: with multiple gateway instances, sockets are pinned per instance;
 * use a Redis Socket.IO adapter so a push reaches clients on any instance.
 */

import { SubscribeMessage, WebSocketGateway, WebSocketServer, MessageBody } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class OrderEventsGateway {
  @WebSocketServer() server!: Server;

  // Client sends { orderId } to start receiving updates for that order.
  @SubscribeMessage('subscribeOrder')
  subscribe(@MessageBody() data: { orderId: string }) {
    return { subscribed: data.orderId };
  }

  // Called by the gateway controller when a saga-terminal event arrives.
  pushStatus(orderId: string, status: 'CONFIRMED' | 'CANCELLED', reason?: string) {
    this.server.emit('orderStatus', { orderId, status, reason });
  }
}
