import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions } from '@nestjs/microservices';
import { kafkaOptions, GROUPS } from '@app/contracts';
import { InventoryModule } from './inventory.module.js';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    InventoryModule,
    kafkaOptions('inventory', GROUPS.inventory),
  );
  await app.listen();
  console.log('[inventory] listening on Kafka');
}
await bootstrap();
