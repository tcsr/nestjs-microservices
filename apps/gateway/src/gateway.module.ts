import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { kafkaClientConfig, GROUPS } from '@app/contracts';
import { GatewayController } from './gateway.controller.js';
import { GatewayService } from './gateway.service.js';
import { OrderEventsGateway } from './events.gateway.js';

@Module({
  imports: [
    // 'KAFKA' client used for the sync RPCs (PRODUCT_GET, ORDER_CREATE).
    ClientsModule.register([
      { name: 'KAFKA', ...kafkaClientConfig('gateway', GROUPS.gateway) },
    ]),
  ],
  controllers: [GatewayController],
  providers: [GatewayService, OrderEventsGateway],
})
export class GatewayModule {}
