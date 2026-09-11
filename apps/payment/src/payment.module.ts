import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { kafkaClientConfig, GROUPS } from '@app/contracts';
import { PaymentController } from './payment.controller.js';
import { PaymentService } from './payment.service.js';

@Module({
  imports: [
    ClientsModule.register([
      { name: 'KAFKA', ...kafkaClientConfig('payment', GROUPS.payment) },
    ]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
