import { Module } from '@nestjs/common';
import { OcrService } from './ocr.service';
import { GoogleVisionProvider } from './providers/google-vision.provider';
import { AzureVisionProvider } from './providers/azure-vision.provider';
import { TesseractProvider } from './providers/tesseract.provider';

@Module({
    providers: [OcrService, GoogleVisionProvider, AzureVisionProvider, TesseractProvider],
    exports: [OcrService],
})
export class OcrModule { }
