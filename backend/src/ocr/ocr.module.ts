import { Module } from '@nestjs/common';
import { OcrService } from './ocr.service';
import { GoogleVisionProvider } from './providers/google-vision.provider';
import { AzureVisionProvider } from './providers/azure-vision.provider';

@Module({
    providers: [OcrService, GoogleVisionProvider, AzureVisionProvider],
    exports: [OcrService],
})
export class OcrModule { }
