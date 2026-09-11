import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { kafkaClientConfig, GROUPS } from '@app/contracts';
import { InventoryController } from './inventory.controller.js';
import { InventoryService } from './inventory.service.js';

@Module({
  imports: [
    // 'KAFKA' producer client used to EMIT events (inventory.reserved/rejected).
    ClientsModule.register([
      { name: 'KAFKA', ...kafkaClientConfig('inventory', GROUPS.inventory) },
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
