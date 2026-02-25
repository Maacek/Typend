import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BatchesService } from './batches.service';
import { BatchesController } from './batches.controller';
import { AnalysisProcessor } from './analysis.processor';
import { OcrModule } from '../ocr/ocr.module';
import { TextQaModule } from '../text-qa/text-qa.module';
import { CreativesModule } from '../creatives/creatives.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'analysis',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true, // Keep the queue clean
      },
    }),
    OcrModule,
    TextQaModule,
    CreativesModule,
  ],
  providers: [BatchesService, AnalysisProcessor],
  controllers: [BatchesController],
  exports: [BatchesService],
})
export class BatchesModule { }
