import { Injectable, Logger } from '@nestjs/common';
import { ComputerVisionClient } from '@azure/cognitiveservices-computervision';
import { ApiKeyCredentials } from '@azure/ms-rest-js';
import { IOcrProvider, OcrResult, TextBlock } from './ocr-provider.interface';

@Injectable()
export class AzureVisionProvider implements IOcrProvider {
    private readonly logger = new Logger(AzureVisionProvider.name);
    private client: ComputerVisionClient;

    constructor() {
        // Initialize Azure Computer Vision client
        // Requires AZURE_VISION_KEY and AZURE_VISION_ENDPOINT environment variables
        const key = process.env.AZURE_VISION_KEY;
        const endpoint = process.env.AZURE_VISION_ENDPOINT;

        if (!key || !endpoint) {
            throw new Error('Azure Vision API credentials not configured');
        }

        try {
            const credentials = new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': key } });
            this.client = new ComputerVisionClient(credentials, endpoint);
            this.logger.log('Azure Vision API client initialized');
        } catch (error) {
            this.logger.error(`Failed to initialize Azure Vision API: ${error.message}`);
            throw error;
        }
    }

    getName(): string {
        return 'azure-vision';
    }

    async extractText(imageBuffer: Buffer): Promise<OcrResult> {
        const startTime = Date.now();

        try {
            this.logger.log('Starting Azure Vision OCR...');

            // Call Azure Vision API Read operation
            const readResult = await this.client.readInStream(imageBuffer);

            // Get the operation location (URL with operation ID)
            const operationLocation = readResult.operationLocation;
            const operationId = operationLocation.substring(operationLocation.lastIndexOf('/') + 1);

            // Poll for results
            let result = await this.client.getReadResult(operationId);
            let attempts = 0;
            const maxAttempts = 10;

            while (result.status === 'running' || result.status === 'notStarted') {
                if (attempts >= maxAttempts) {
                    throw new Error('Azure Vision OCR timeout - max polling attempts reached');
                }
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms between polls
                result = await this.client.getReadResult(operationId);
                attempts++;
            }

            if (result.status !== 'succeeded') {
                throw new Error(`Azure Vision OCR failed with status: ${result.status}`);
            }

            // Extract text from results
            const pages = result.analyzeResult?.readResults || [];
            let fullText = '';
            const blocks: TextBlock[] = [];
            let totalConfidence = 0;
            let wordCount = 0;

            for (const page of pages) {
                for (const line of page.lines || []) {
                    fullText += line.text + '\n';

                    for (const word of line.words || []) {
                        const bbox = word.boundingBox && word.boundingBox.length >= 8 ? {
                            x: word.boundingBox[0],
                            y: word.boundingBox[1],
                            width: word.boundingBox[2] - word.boundingBox[0],
                            height: word.boundingBox[5] - word.boundingBox[1],
                        } : undefined;

                        const confidence = word.confidence ? word.confidence * 100 : 90;
                        totalConfidence += confidence;
                        wordCount++;

                        blocks.push({
                            text: word.text,
                            confidence,
                            bbox,
                        });
                    }
                }
            }

            const avgConfidence = wordCount > 0 ? totalConfidence / wordCount : 90;
            const processingTime = Date.now() - startTime;

            this.logger.log(
                `Azure Vision completed. Confidence: ${avgConfidence.toFixed(2)}%, Text length: ${fullText.trim().length}`,
            );

            return {
                text: fullText.trim(),
                confidence: avgConfidence,
                language: 'cs', // Azure detects language but we assume Czech for now
                provider: 'azure-vision',
                blocks,
                processingTime,
            };
        } catch (error) {
            this.logger.error(`Azure Vision OCR failed: ${error.message}`, error.stack);
            throw error;
        }
    }
}
