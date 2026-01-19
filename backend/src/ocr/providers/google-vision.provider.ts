import { Injectable, Logger } from '@nestjs/common';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { IOcrProvider, OcrResult, TextBlock } from './ocr-provider.interface';

@Injectable()
export class GoogleVisionProvider implements IOcrProvider {
    private readonly logger = new Logger(GoogleVisionProvider.name);
    private client: ImageAnnotatorClient;

    constructor() {
        // Initialize Google Vision client
        // Requires GOOGLE_APPLICATION_CREDENTIALS environment variable
        try {
            this.client = new ImageAnnotatorClient();
            this.logger.log('Google Vision API client initialized');
        } catch (error) {
            this.logger.error(`Failed to initialize Google Vision API: ${error.message}`);
            throw error;
        }
    }

    getName(): string {
        return 'google-vision';
    }

    async extractText(imageBuffer: Buffer): Promise<OcrResult> {
        const startTime = Date.now();

        try {
            this.logger.log('Starting Google Vision OCR...');

            // Call Google Vision API for text detection
            const [result] = await this.client.textDetection(imageBuffer);
            const detections = result.textAnnotations;

            if (!detections || detections.length === 0) {
                this.logger.warn('No text detected by Google Vision');
                return {
                    text: '',
                    confidence: 0,
                    language: 'unknown',
                    provider: 'google-vision',
                    blocks: [],
                    processingTime: Date.now() - startTime,
                };
            }

            // First annotation is the full text
            const fullText = detections[0].description || '';

            // Extract individual word blocks
            const blocks: TextBlock[] = detections.slice(1).map((annotation) => {
                const vertices = annotation.boundingPoly?.vertices || [];
                const bbox = vertices.length >= 4 ? {
                    x: vertices[0].x || 0,
                    y: vertices[0].y || 0,
                    width: (vertices[1].x || 0) - (vertices[0].x || 0),
                    height: (vertices[2].y || 0) - (vertices[0].y || 0),
                } : undefined;

                return {
                    text: annotation.description || '',
                    confidence: annotation.confidence ? annotation.confidence * 100 : 90, // Google doesn't always provide confidence
                    bbox,
                };
            });

            // Calculate average confidence
            const avgConfidence = blocks.length > 0
                ? blocks.reduce((sum, block) => sum + block.confidence, 0) / blocks.length
                : 90; // Default to 90% if no confidence data

            // Detect language from annotations
            const language = this.detectLanguage(detections);

            const processingTime = Date.now() - startTime;

            this.logger.log(
                `Google Vision completed. Confidence: ${avgConfidence.toFixed(2)}%, Text length: ${fullText.length}`,
            );

            return {
                text: fullText,
                confidence: avgConfidence,
                language,
                provider: 'google-vision',
                blocks,
                processingTime,
            };
        } catch (error) {
            this.logger.error(`Google Vision OCR failed: ${error.message}`, error.stack);
            throw error;
        }
    }

    private detectLanguage(annotations: any[]): string {
        // Google Vision provides language hints in the response
        if (annotations && annotations.length > 0 && annotations[0].locale) {
            return annotations[0].locale;
        }
        return 'cs'; // Default to Czech
    }
}
