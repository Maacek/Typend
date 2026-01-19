import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class BatchesService {
    constructor(
        private prisma: PrismaService,
        private storage: StorageService,
        @InjectQueue('analysis') private analysisQueue: Queue,
    ) { }

    async createBatch(workspaceId: string, files: Express.Multer.File[], name?: string) {
        console.log('Creating batch for workspaceId:', workspaceId);
        if (!workspaceId) {
            console.error('ERROR: workspaceId is missing!');
            throw new InternalServerErrorException('Workspace ID is missing');
        }
        const batch = await this.prisma.batch.create({
            data: {
                name: name || `Batch ${new Date().toLocaleString()}`,
                workspace: { connect: { id: workspaceId } },
            },
        });

        const creativePromises = files.map(async (file) => {
            const filename = `${batch.id}-${Date.now()}-${file.originalname}`;
            const originalUrl = await this.storage.uploadFile(filename, file.buffer);

            const creative = await this.prisma.creative.create({
                data: {
                    filename: file.originalname,
                    originalUrl,
                    mimeType: file.mimetype,
                    size: file.size,
                    batch: { connect: { id: batch.id } },
                },
            });

            await this.analysisQueue.add('analyze', { creativeId: creative.id });
            return creative;
        });

        const creatives = await Promise.all(creativePromises);

        return {
            batchId: batch.id,
            creativeCount: creatives.length,
        };
    }

    async findAll(workspaceId: string) {
        const batches = await this.prisma.batch.findMany({
            where: { workspaceId },
            select: {
                id: true,
                name: true,
                status: true,
                createdAt: true,
                isPublic: true,
                shareToken: true,
                shareSlug: true,
                _count: {
                    select: { creatives: true }
                },
                creatives: {
                    select: {
                        status: true,
                        analysisResult: {
                            select: { overallScore: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return batches.map(batch => ({
            id: batch.id,
            name: batch.name,
            status: batch.status,
            createdAt: batch.createdAt,
            creativesCount: batch._count.creatives,
            averageScore: this.calculateAverageScore(batch.creatives),
            isPublic: batch.isPublic,
            shareToken: batch.shareToken,
            shareSlug: batch.shareSlug,
            shareUrl: this.getShareUrl(batch),
        }));
    }

    private calculateAverageScore(creatives: any[]): number | null {
        const scores = creatives
            .map(c => c.analysisResult?.overallScore)
            .filter(s => s !== null && s !== undefined);

        if (scores.length === 0) return null;

        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        return Math.round(avg * 10) / 10;
    }

    private getShareUrl(batch: any): string | null {
        if (!batch.isPublic) return null;

        // Prioritize custom slug over token
        const identifier = batch.shareSlug || batch.shareToken;
        return identifier ? `/share/${identifier}` : null;
    }

    async getBatchResults(batchId: string, workspaceId: string) {
        const batch = await this.prisma.batch.findFirst({
            where: {
                id: batchId,
                workspaceId, // Security: ensure batch belongs to user's workspace
            },
            include: {
                creatives: {
                    include: {
                        analysisResult: true,
                    },
                    orderBy: { filename: 'asc' }, // Sort by filename to preserve upload order
                },
            },
        });

        if (!batch) {
            return null;
        }

        return {
            batchId: batch.id,
            name: batch.name,
            status: batch.status,
            createdAt: batch.createdAt,
            creatives: batch.creatives.map(creative => ({
                id: creative.id,
                filename: creative.filename,
                status: creative.status,
                originalUrl: `/uploads/${creative.originalUrl.split('\\').pop()?.split('/').pop() ?? creative.filename}`,
                mimeType: creative.mimeType,
                size: creative.size,
                analysisResult: creative.analysisResult ? {
                    extractedText: creative.analysisResult.extractedText,
                    textConfidence: creative.analysisResult.textConfidence,
                    textIssues: creative.analysisResult.textIssues as any,
                    consensusScore: creative.analysisResult.consensusScore,
                    ocrProvider: creative.analysisResult.ocrProvider,
                    scores: creative.analysisResult.scores as any,
                    overallScore: creative.analysisResult.overallScore,
                    explanation: creative.analysisResult.explanation,
                    suggestions: creative.analysisResult.suggestions as any,
                    heatmapUrl: creative.analysisResult.heatmapUrl,
                    createdAt: creative.analysisResult.createdAt,
                    updatedAt: creative.analysisResult.updatedAt,
                } : null,
            })),
        };
    }

    async exportToCsv(batchId: string, workspaceId: string): Promise<string> {
        const batchResults = await this.getBatchResults(batchId, workspaceId);

        if (!batchResults) {
            throw new InternalServerErrorException('Batch not found');
        }

        // Comprehensive CSV Headers organized by section
        const headers = [
            // Basic Info
            'Filename',
            'Status',

            // Overall Score
            'Overall Score',

            // Section A: OCR & Extracted Text
            'A_ExtractedText',
            'A_OCR_Confidence',
            'A_Consensus',
            'A_OCR_Provider',

            // Section B: Text QA
            'B_TextScore',
            'B_IssuesCount',
            'B_Issues_Details',

            // Section C: Visual Analysis Scores
            'C_Attractiveness',
            'C_Clarity',
            'C_Trust',
            'C_CTA_Effectiveness',

            // Section D: Senior Reviewer & Recommendations
            'D_SeniorReview',
            'D_Suggestion_1',
            'D_Suggestion_2',
            'D_Suggestion_3',

            // Additional Fields
            'HeatmapURL',
        ];

        // CSV Rows with comprehensive data
        const rows = batchResults.creatives.map(creative => {
            const result = creative.analysisResult;
            const scores = result?.scores as any || {};
            const suggestions = result?.suggestions as any[] || [];
            const textIssues = result?.textIssues as any[] || [];

            // Format text issues for readability
            const issuesDetails = textIssues.map(issue =>
                `${issue.text} (${issue.severity}${issue.suggestion ? `: ${issue.suggestion}` : ''})`
            ).join('; ');

            return [
                // Basic Info
                this.escapeCsv(creative.filename),
                creative.status,

                // Overall Score
                result?.overallScore?.toFixed(1) || 'N/A',

                // Section A: OCR
                this.escapeCsv(result?.extractedText || ''),
                result?.textConfidence ? `${Math.round(result.textConfidence)}%` : 'N/A',
                result?.consensusScore ? `${Math.round(result.consensusScore)}%` : 'N/A',
                result?.ocrProvider || 'N/A',

                // Section B: Text QA (calculate score from issues)
                this.calculateTextQaScore(textIssues).toString(),
                textIssues.length.toString(),
                this.escapeCsv(issuesDetails),

                // Section C: Visual Scores
                scores.Attractiveness?.toFixed(1) || 'N/A',
                scores.Clarity?.toFixed(1) || 'N/A',
                scores.Trust?.toFixed(1) || 'N/A',
                scores.CTA_Effectiveness?.toFixed(1) || 'N/A',

                // Section D: Recommendations
                this.escapeCsv(result?.explanation || ''),
                this.escapeCsv(suggestions[0] || ''),
                this.escapeCsv(suggestions[1] || ''),
                this.escapeCsv(suggestions[2] || ''),

                // Additional
                result?.heatmapUrl || '',
            ].join(',');
        });

        return [headers.join(','), ...rows].join('\n');
    }

    private escapeCsv(value: string): string {
        if (!value) return '';
        // Escape quotes and wrap in quotes if contains comma, newline, or quote
        const escaped = value.replace(/"/g, '""');
        if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
            return `"${escaped}"`;
        }
        return escaped;
    }

    private calculateTextQaScore(issues: any[]): number {
        // Calculate score from issues (same logic as Text QA service)
        let score = 100;
        for (const issue of issues) {
            if (issue.severity === 'high') score -= 15;
            else if (issue.severity === 'medium') score -= 8;
            else score -= 3;
        }
        return Math.max(0, Math.round(score));
    }

    // Share token generation and management
    async generateShareToken(batchId: string, workspaceId: string, customSlug?: string) {
        const batch = await this.prisma.batch.findFirst({
            where: { id: batchId, workspaceId }
        });

        if (!batch) {
            throw new InternalServerErrorException('Batch not found');
        }

        // If custom slug provided, validate it
        if (customSlug) {
            // Validate slug format (alphanumeric, hyphens, underscores only)
            if (!/^[a-z0-9-_]+$/i.test(customSlug)) {
                throw new InternalServerErrorException(
                    'Slug can only contain letters, numbers, hyphens, and underscores'
                );
            }

            // Check if slug already exists
            const existing = await this.prisma.batch.findUnique({
                where: { shareSlug: customSlug }
            });

            if (existing && existing.id !== batchId) {
                throw new InternalServerErrorException('This slug is already in use');
            }
        }

        // Generate token if doesn't exist
        let shareToken = batch.shareToken;
        if (!shareToken) {
            shareToken = require('crypto').randomBytes(12).toString('base64url');
        }

        const updated = await this.prisma.batch.update({
            where: { id: batchId },
            data: {
                shareToken,
                shareSlug: customSlug || batch.shareSlug,
                isPublic: true
            }
        });

        return {
            shareToken: updated.shareToken,
            shareSlug: updated.shareSlug,
            shareUrl: this.getShareUrl(updated),
            isPublic: updated.isPublic
        };
    }

    async revokeShareToken(batchId: string, workspaceId: string) {
        const batch = await this.prisma.batch.findFirst({
            where: { id: batchId, workspaceId }
        });

        if (!batch) {
            throw new InternalServerErrorException('Batch not found');
        }

        await this.prisma.batch.update({
            where: { id: batchId },
            data: { isPublic: false }
        });

        return { success: true };
    }

    async getBatchByShareToken(identifier: string) {
        // Try to find by slug first, then token
        const batch = await this.prisma.batch.findFirst({
            where: {
                OR: [
                    { shareSlug: identifier },
                    { shareToken: identifier }
                ],
                isPublic: true
            },
            include: {
                creatives: {
                    include: {
                        analysisResult: true
                    },
                    orderBy: { filename: 'asc' }
                }
            }
        });

        if (!batch) {
            throw new InternalServerErrorException('Shared batch not found or no longer public');
        }

        // Return same format as getBatchResults
        return {
            batchId: batch.id,
            name: batch.name,
            status: batch.status,
            createdAt: batch.createdAt,
            isShared: true,
            creatives: batch.creatives.map(creative => ({
                id: creative.id,
                filename: creative.filename,
                status: creative.status,
                originalUrl: `/uploads/${creative.originalUrl.split('\\').pop()?.split('/').pop() ?? creative.filename}`,
                mimeType: creative.mimeType,
                size: creative.size,
                analysisResult: creative.analysisResult ? {
                    extractedText: creative.analysisResult.extractedText,
                    textConfidence: creative.analysisResult.textConfidence,
                    textIssues: creative.analysisResult.textIssues as any,
                    consensusScore: creative.analysisResult.consensusScore,
                    ocrProvider: creative.analysisResult.ocrProvider,
                    scores: creative.analysisResult.scores as any,
                    overallScore: creative.analysisResult.overallScore,
                    explanation: creative.analysisResult.explanation,
                    suggestions: creative.analysisResult.suggestions as any,
                    heatmapUrl: creative.analysisResult.heatmapUrl,
                    createdAt: creative.analysisResult.createdAt,
                    updatedAt: creative.analysisResult.updatedAt,
                } : null,
            })),
        };
    }
}
