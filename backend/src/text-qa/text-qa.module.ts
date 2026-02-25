import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TextQaService } from './text-qa.service';

@Module({
    imports: [ConfigModule],
    providers: [TextQaService],
    exports: [TextQaService],
})
export class TextQaModule { }

