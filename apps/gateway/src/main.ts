/**
 * Gateway bootstrap — a HYBRID app: HTTP server + WebSocket + Kafka consumer.
 * connectMicroservice attaches a Kafka consumer (for @EventPattern handlers) to the
 * same process that serves HTTP; startAllMicroservices() begins consuming.
 */

import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions } from '@nestjs/microservices';
import { kafkaOptions, GROUPS } from '@app/contracts';
import { GatewayModule } from './gateway.module.js';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);
  app.enableCors({ origin: '*' });

  // Attach the Kafka consumer (ORDER_CONFIRMED / ORDER_CANCELLED).
  app.connectMicroservice<MicroserviceOptions>(kafkaOptions('gateway', GROUPS.gateway));

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3000);
  console.log('[gateway] HTTP on 3000, consuming Kafka, WebSocket ready');
}
await bootstrap();
