import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { StorageModule } from './storage/storage.module';
import { BatchesModule } from './batches/batches.module';
import { CreativesModule } from './creatives/creatives.module';
import { OcrModule } from './ocr/ocr.module';
import { TextQaModule } from './text-qa/text-qa.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    StorageModule,
    OcrModule,
    TextQaModule,
    BatchesModule,
    CreativesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
