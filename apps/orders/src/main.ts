import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions } from '@nestjs/microservices';
import { kafkaOptions, GROUPS } from '@app/contracts';
import { OrdersModule } from './orders.module.js';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    OrdersModule,
    kafkaOptions('orders', GROUPS.orders),
  );
  await app.listen();
  console.log('[orders] listening on Kafka');
}
await bootstrap();
