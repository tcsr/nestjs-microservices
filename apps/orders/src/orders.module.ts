import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { kafkaClientConfig, GROUPS } from '@app/contracts';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [
    ClientsModule.register([
      { name: 'KAFKA', ...kafkaClientConfig('orders', GROUPS.orders) },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
