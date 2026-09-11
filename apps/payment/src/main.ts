import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions } from '@nestjs/microservices';
import { kafkaOptions, GROUPS } from '@app/contracts';
import { PaymentModule } from './payment.module.js';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    PaymentModule,
    kafkaOptions('payment', GROUPS.payment),
  );
  await app.listen();
  console.log('[payment] listening on Kafka');
}
await bootstrap();
