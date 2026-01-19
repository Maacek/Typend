import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CreativesService } from './creatives.service';
import { CreativesController } from './creatives.controller';
import { VisualAnalysisService } from './visual-analysis.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [ConfigModule],
  providers: [CreativesService, VisualAnalysisService, PrismaService],
  controllers: [CreativesController],
  exports: [VisualAnalysisService],
})
export class CreativesModule { }
