import { Injectable, Logger } from '@nestjs/common';
import * as Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { franc } from 'franc';
import { IOcrProvider, OcrResult, TextBlock } from './ocr-provider.interface';

@Injectable()
export class TesseractProvider implements IOcrProvider {
    private readonly logger = new Logger(TesseractProvider.name);

    getName(): string {
        return 'tesseract';
    }

    async extractText(imageBuffer: Buffer): Promise<OcrResult> {
        const startTime = Date.now();

        try {
            this.logger.log('Starting Tesseract OCR extraction...');

            // Preprocess image for better OCR accuracy
            const preprocessedBuffer = await this.preprocessImage(imageBuffer);

            // Run Tesseract OCR
            const result = await Tesseract.recognize(preprocessedBuffer, 'ces+eng+slk', {
                logger: (m: any) => {
                    if (m.status === 'recognizing text') {
                        this.logger.debug(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                    }
                },
            });

            // For MVP: Use simple blocks extraction without word-level detail
            const blocks: TextBlock[] = [];

            // Calculate overall confidence
            const overallConfidence = result.data.confidence;

            // Detect language from extracted text
            const detectedLanguage = this.detectLanguage(result.data.text);

            const processingTime = Date.now() - startTime;

            this.logger.log(
                `Tesseract completed. Confidence: ${overallConfidence}%, Language: ${detectedLanguage}`,
            );

            return {
                text: result.data.text || '',
                confidence: overallConfidence || 0,
                language: detectedLanguage,
                provider: 'tesseract',
                blocks,
                processingTime,
            };
        } catch (error) {
            this.logger.error(`Tesseract OCR failed: ${error.message}`, error.stack);
            throw error;
        }
    }

    private async preprocessImage(buffer: Buffer): Promise<Buffer> {
        return sharp(buffer)
            .grayscale()
            .normalize()
            .sharpen()
            .toBuffer();
    }

    private detectLanguage(text: string): string {
        if (!text || text.trim().length < 10) return 'unknown';

        const langCode = franc(text, { minLength: 3 });

        const langMap: { [key: string]: string } = {
            ces: 'cs',
            eng: 'en',
            slk: 'sk',
        };

        return langMap[langCode] || langCode;
    }
}
