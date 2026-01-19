import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import * as sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VisualAnalysisService implements OnModuleInit {
    private readonly logger = new Logger(VisualAnalysisService.name);
    private genAI: GoogleGenerativeAI;
    private visionClient: ImageAnnotatorClient;

    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
    ) {
        this.visionClient = new ImageAnnotatorClient();
    }

    async onModuleInit() {
        try {
            const apiKey = this.configService.get<string>('GOOGLE_AI_API_KEY');

            if (!apiKey) {
                this.logger.error('GOOGLE_AI_API_KEY is not defined in .env');
                this.logger.error('Get your API key from: https://console.cloud.google.com/apis/credentials');
                return;
            }

            this.genAI = new GoogleGenerativeAI(apiKey);
            this.logger.log('Gemini 1.5 Flash initialized (1,500 RPD free tier)');
        } catch (error) {
            this.logger.error(`Failed to initialize Gemini: ${error.message}`);
        }
    }

    async analyzeVisual(imageBuffer: Buffer, filename: string): Promise<any> {
        this.logger.log(`Starting visual analysis for ${filename}...`);

        try {
            if (!this.genAI) {
                throw new Error('Gemini AI not initialized');
            }

            // 1. LLM Scoring & Senior Review
            const scoringPrompt = `
                Jsi Senior Performance Marketing Creative Director s 15+ lety zkušeností. Analyzuj tento reklamní vizuál KRITICKY a DETAILNĚ.
                
                DŮLEŽITÉ: Každý vizuál je UNIKÁTNÍ. Buď přísný a všímavý - každý detail má význam. Používej CELOU škálu 0-10, včetně desetinných míst (např. 6.5, 7.2, 8.7).
                
                HODNOTICÍ ŠKÁLA (0-10):
                0-3: Vážné problémy, neprofesionální
                4-5: Slabý průměr, značné nedostatky
                6-7: Standardní, ale s rezervami
                8-9: Velmi dobré, profesionální
                10: Perfektní, benchmark pro odvětví
                
                HODNOŤ podle těchto 4 DIMENZÍ:
                
                1. ATRAKTIVITA (Attractiveness) - Vizuální příťažlivost a estetika:
                   - Jak silně vizuál upoutá pozornost?
                   - Je barevná paleta harmonická a moderní?
                   - Působí kompozice profesionálně a premium?
                   - Je vizuál emotivně angažující?
                   - Používá moderní designové trendy?
                
                2. PŘEHLEDNOST (Clarity) - Jasnost sdělení:
                   - Je hlavní sdělení okamžitě pochopitelné (do 2 sekund)?
                   - Je vizuální hierarchie správná (co je hlavní vs. vedlejší)?
                   - Není vizuál přeplněný nebo chaotický?
                   - Je text čitelný (velikost, kontrast, font)?
                   - Podporují grafické elementy nebo narušují sdělení?
                
                3. DŮVĚRYHODNOST (Trust) - Profesionalita a kredibilita:
                   - Vypadá vizuál profesionálně a kvalitně?
                   - Jsou použité fotky/grafika vysoké kvality?
                   - Působí brand důvěryhodně?
                   - Nejsou zde typografické chyby nebo pixelace?
                   - Odpovídá vizuál kvalitě značky?
                
                4. EFEKTIVITA CTA (CTA_Effectiveness) - Síla výzvy k akci:
                   - Je CTA jasně viditelné a výrazné?
                   - Používá CTA akční slovesa?
                   - Je CTA v kontrastní barvě?
                   - Je umístění CTA správné?
                   - Je nabídka/důvod pro kliknutí jasný?
                
                BUĎ KRITICKÝ: Hledej i drobné nedostatky. Perfektní skóre (9-10) dávej pouze výjimečně.
                BUĎ PRECIZNÍ: Používej desetinná místa pro jemné rozdíly (např. 7.3 vs 7.7).
                BUĎ KONZISTENTNÍ: Stějné problémy = stejné skóre, různé problémy = různé skóre.
                
                FORMÁT ODPOVĚDI (POUZE JSON, BEZ dalšího textu):
                {
                    "scores": { 
                        "Attractiveness": 7.5, 
                        "Clarity": 6.8, 
                        "Trust": 8.2, 
                        "CTA_Effectiveness": 5.5 
                    },
                    "explanation": "Stručné hodnocení v češtině (2-3 věty) - co funguje a co ne",
                    "suggestions": [
                        "Konkrétní návrh 1 v češtině",
                        "Konkrétní návrh 2 v češtině", 
                        "Konkrétní návrh 3 v češtině"
                    ]
                }
            `;

            const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
            const result = await model.generateContent([
                scoringPrompt,
                {
                    inlineData: {
                        data: imageBuffer.toString('base64'),
                        mimeType: 'image/png',
                    },
                },
            ]);

            const response = await result.response;

            const text = response.text();
            if (!text) {
                throw new Error('Empty response from Gemini API');
            }

            // Extract JSON from response (handle potential markdown blocks)
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const analysis = JSON.parse(jsonStr);

            // Calculate overall score (weighted average)
            const scores = analysis.scores || {};
            const overallScore = this.calculateOverallScore(scores);

            // 2. Heatmap Generation
            const heatmapPath = await this.generateHeatmap(imageBuffer, filename);

            return {
                ...analysis,
                overallScore,
                heatmapUrl: heatmapPath,
            };
        } catch (error) {
            this.logger.error(`Visual analysis failed: ${error.message}`, error.stack);
            return {
                scores: { Attractiveness: 5, Clarity: 5, Trust: 5, CTA_Effectiveness: 5 },
                overallScore: 5,
                explanation: "Analysis failed due to technical error.",
                suggestions: ["Try re-uploading the image."],
                heatmapUrl: null,
            };
        }
    }

    /**
     * Calculate overall score from individual dimensions
     * Weighted average: Trust 20%, Clarity 35%, Attractiveness 35%, CTA 10%
     */
    private calculateOverallScore(scores: Record<string, number>): number {
        const attractiveness = scores.Attractiveness || 0;
        const clarity = scores.Clarity || 0;
        const trust = scores.Trust || 0;
        const ctaEffectiveness = scores.CTA_Effectiveness || scores['CTA Effectiveness'] || 0;

        const overall = (
            trust * 0.2 +
            clarity * 0.35 +
            attractiveness * 0.35 +
            ctaEffectiveness * 0.1
        );

        return Math.round(overall * 10) / 10; // Round to 1 decimal place
    }

    private async generateHeatmap(imageBuffer: Buffer, filename: string): Promise<string | null> {
        try {
            this.logger.log(`Generating heatmap for ${filename}...`);

            // Detect ROIs using Google Vision
            const [result] = await this.visionClient.annotateImage({
                image: { content: imageBuffer },
                features: [
                    { type: 'OBJECT_LOCALIZATION' },
                    { type: 'FACE_DETECTION' },
                    { type: 'TEXT_DETECTION' }
                ],
            });

            // Use sharp with proper import handling for ES/CommonJS compatibility
            const sharpInstance = (sharp as any).default || sharp;
            const metadata = await sharpInstance(imageBuffer).metadata();
            const width = metadata.width;
            const height = metadata.height;

            if (!width || !height) throw new Error('Could not get image metadata');

            const canvas = await sharpInstance({
                create: {
                    width,
                    height,
                    channels: 4,
                    background: { r: 0, g: 0, b: 0, alpha: 1 }
                }
            });

            // Collect attention points
            const points: { x: number; y: number; weight: number }[] = [];

            // Faces - Highest priority
            if (result.faceAnnotations) {
                result.faceAnnotations.forEach(face => {
                    const box = face.boundingPoly?.vertices;
                    if (box && box.length >= 4) {
                        const centerX = ((box[0].x || 0) + (box[1].x || 0)) / 2;
                        const centerY = ((box[0].y || 0) + (box[2].y || 0)) / 2;
                        points.push({ x: centerX, y: centerY, weight: 1.0 });
                    }
                });
            }

            // Objects
            if (result.localizedObjectAnnotations) {
                result.localizedObjectAnnotations.forEach(obj => {
                    const vertices = obj.boundingPoly?.normalizedVertices;
                    if (vertices && vertices.length >= 4) {
                        const centerX = ((vertices[0].x || 0) + (vertices[1].x || 0)) / 2 * width;
                        const centerY = ((vertices[0].y || 0) + (vertices[2].y || 0)) / 2 * height;
                        points.push({ x: centerX, y: centerY, weight: 0.7 });
                    }
                });
            }

            // Text blocks
            if (result.textAnnotations && result.textAnnotations.length > 1) {
                result.textAnnotations.slice(1, 10).forEach(text => {
                    const box = text.boundingPoly?.vertices;
                    if (box && box.length >= 4) {
                        const centerX = ((box[0].x || 0) + (box[1].x || 0)) / 2;
                        const centerY = ((box[0].y || 0) + (box[2].y || 0)) / 2;
                        points.push({ x: centerX, y: centerY, weight: 0.5 });
                    }
                });
            }

            // Draw attention points as white circles on black background
            const svgs = points.map(p => `
                <circle cx="${p.x}" cy="${p.y}" r="${Math.min(width, height) * 0.15}" fill="rgba(255,255,255,${p.weight})" />
            `).join('');

            const overlay = Buffer.from(`<svg width="${width}" height="${height}">${svgs}</svg>`);

            // Create the blurred mask
            const heatmapMask = await canvas
                .composite([{ input: overlay, blend: 'add' }])
                .blur(Math.min(width, height) * 0.08)
                .toBuffer();

            // Colorize and merge with original
            // Simplification: use sharp's modulate or tint to create a "heat" look
            // Better: use a CSS-like filter or sharp's color manipulation
            // For MVP: we'll create a semi-transparent red/yellow overlay

            await sharpInstance(imageBuffer)
                .composite([
                    {
                        input: heatmapMask,
                        blend: 'screen',
                        opacity: 0.5
                    }
                ])
                .toFile(`uploads/heatmap_${filename}`);

            return `/uploads/heatmap_${filename}`;
        } catch (error) {
            this.logger.error(`Heatmap generation failed: ${error.message}`, (error as any).stack);
            return null;
        }
    }
}
