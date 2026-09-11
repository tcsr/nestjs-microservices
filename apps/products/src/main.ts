/**
 * Products bootstrap — a pure Kafka microservice (no HTTP port).
 * createMicroservice connects to Kafka and dispatches @MessagePattern/@EventPattern
 * handlers. It only speaks the broker protocol.
 */

import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions } from '@nestjs/microservices';
import { kafkaOptions, GROUPS } from '@app/contracts';
import { ProductsModule } from './products.module.js';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ProductsModule,
    kafkaOptions('products', GROUPS.products),
  );
  await app.listen();
  console.log('[products] listening on Kafka');
}
await bootstrap();
