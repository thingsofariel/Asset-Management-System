import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BulkImportService } from './bulk-import.service';
import { BulkImportController } from './bulk-import.controller';
import { BULK_IMPORT_QUEUE_NAME, createProducerConnection } from './redis-connections';

@Module({
  imports: [
    BullModule.forRoot({ connection: createProducerConnection() }),
    BullModule.registerQueue({
      name: BULK_IMPORT_QUEUE_NAME,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        // Bounded history — unset, this is a documented BullMQ footgun
        // where completed/failed jobs accumulate in Redis forever.
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 1000 },
      },
    }),
  ],
  controllers: [BulkImportController],
  providers: [BulkImportService],
})
export class BulkImportModule {}
