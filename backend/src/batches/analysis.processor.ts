import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { OcrService } from '../ocr/ocr.service';
import { TextQaService } from '../text-qa/text-qa.service';
import { VisualAnalysisService } from '../creatives/visual-analysis.service';

@Processor('analysis')
export class AnalysisProcessor extends WorkerHost {
    private readonly logger = new Logger(AnalysisProcessor.name);

    constructor(
        private prisma: PrismaService,
        private storage: StorageService,
        private ocr: OcrService,
        private textQa: TextQaService,
        private visualAnalysis: VisualAnalysisService,
    ) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        const { creativeId } = job.data;
        this.logger.log(`Starting analysis for creative: ${creativeId}`);

        try {
            // Update status to processing
            await this.prisma.creative.update({
                where: { id: creativeId },
                data: { status: 'PROCESSING' },
            });

            // Get creative from DB
            const creative = await this.prisma.creative.findUnique({
                where: { id: creativeId },
            });

            if (!creative) {
                throw new Error(`Creative ${creativeId} not found`);
            }

            this.logger.log(`Fetching file: ${creative.originalUrl}`);

            // Get file from storage
            const imageBuffer = await this.storage.getFile(creative.originalUrl);

            // Phase 2A: OCR Text Extraction
            this.logger.log(`Running OCR extraction...`);
            const ocrResult = await this.ocr.extractText(imageBuffer);

            this.logger.log(
                `OCR completed. Confidence: ${ocrResult.confidence}%, Language: ${ocrResult.language}, Text length: ${ocrResult.text.length}`,
            );

            // Phase 2A.5: AI Text Filtering (Re-enabled with paid tier)
            // Paid tier allows 1,500 requests/day = 750 creatives/day with filtering
            let filteredText = ocrResult.text;
            if (ocrResult.text && ocrResult.text.trim().length > 0) {
                this.logger.log(`Filtering banner text from product text...`);
                filteredText = await this.ocr.filterBannerText(ocrResult.text, imageBuffer);
                this.logger.log(
                    `Text filtering completed. Original: ${ocrResult.text.length} chars → Filtered: ${filteredText.length} chars`,
                );
            }

            // Phase 2B: Text Quality Analysis (usando filteredText)
            let qaResult = null;
            if (filteredText && filteredText.trim().length > 0) {
                this.logger.log(`Running text QA analysis on filtered text...`);
                qaResult = await this.textQa.analyzeText(filteredText, ocrResult.language || 'unknown');
                this.logger.log(
                    `Text QA completed. Issues: ${qaResult.issues.length}, Score: ${qaResult.overallScore}`,
                );
            } else {
                this.logger.warn(`No banner text found after filtering, skipping Text QA`);
            }

            // Phase 3: Visual Analysis (New)
            this.logger.log(`Running visual analysis...`);
            const visualResult = await this.visualAnalysis.analyzeVisual(imageBuffer, creative.filename);
            this.logger.log(`Visual analysis completed. Scores: ${JSON.stringify(visualResult.scores)}`);

            // Phase 2C: Log consensus information if available
            const consensusScore = (ocrResult as any).consensusScore;
            if (consensusScore !== undefined) {
                this.logger.log(`Consensus score: ${consensusScore.toFixed(1)}%`);
            }

            // Create or update analysis result with all metadata (OCR + Text QA + Visual)
            await this.prisma.analysisResult.upsert({
                where: { creativeId: creative.id },
                create: {
                    creativeId: creative.id,
                    extractedText: filteredText, // Use filtered banner text
                    textConfidence: ocrResult.confidence,
                    textIssues: (qaResult ? qaResult.issues : []) as any,
                    // Dual-API metadata (Phase 2C)
                    ocrProvider: ocrResult.provider,
                    consensusScore: (ocrResult as any).consensusScore || null,
                    googleText: (ocrResult as any).googleText || null,
                    azureText: (ocrResult as any).azureText || null,
                    googleConfidence: (ocrResult as any).googleConfidence || null,
                    azureConfidence: (ocrResult as any).azureConfidence || null,
                    // Visual Scoring (Phase 3)
                    scores: visualResult.scores || null,
                    overallScore: visualResult.overallScore || null,
                    explanation: visualResult.explanation || null,
                    suggestions: (visualResult.suggestions || []) as any,
                    heatmapUrl: visualResult.heatmapUrl || null,
                },
                update: {
                    extractedText: filteredText, // Use filtered banner text
                    textConfidence: ocrResult.confidence,
                    textIssues: (qaResult ? qaResult.issues : []) as any,
                    // Dual-API metadata (Phase 2C)
                    ocrProvider: ocrResult.provider,
                    consensusScore: (ocrResult as any).consensusScore || null,
                    googleText: (ocrResult as any).googleText || null,
                    azureText: (ocrResult as any).azureText || null,
                    googleConfidence: (ocrResult as any).googleConfidence || null,
                    azureConfidence: (ocrResult as any).azureConfidence || null,
                    // Visual Scoring (Phase 3)
                    scores: visualResult.scores || null,
                    overallScore: visualResult.overallScore || null,
                    explanation: visualResult.explanation || null,
                    suggestions: (visualResult.suggestions || []) as any,
                    heatmapUrl: visualResult.heatmapUrl || null,
                },
            });

            // Determine final status
            let finalStatus: string;
            if (ocrResult.confidence < 50) {
                this.logger.warn(
                    `Low OCR confidence (${ocrResult.confidence}%) for creative ${creativeId}`,
                );
                finalStatus = 'PARTIAL_FAILED';
            } else {
                finalStatus = 'DONE';
            }

            // Update creative status
            await this.prisma.creative.update({
                where: { id: creativeId },
                data: { status: finalStatus as any },
            });

            this.logger.log(`Analysis finished for creative: ${creativeId} with status: ${finalStatus}`);
        } catch (error) {
            this.logger.error(`Analysis failed for creative: ${creativeId}`, error.stack);
            await this.prisma.creative.update({
                where: { id: creativeId },
                data: { status: 'FAILED' },
            }).catch((err) => {
                this.logger.error(`Failed to update status to FAILED: ${err.message}`);
            });
            throw error;
        }
    }
}
