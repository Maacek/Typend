import { Module } from '@nestjs/common';
import { TextQaService } from './text-qa.service';

@Module({
    providers: [TextQaService],
    exports: [TextQaService],
})
export class TextQaModule { }
