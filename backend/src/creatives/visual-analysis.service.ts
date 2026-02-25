import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VisualAnalysisService implements OnModuleInit {
    private readonly logger = new Logger(VisualAnalysisService.name);
    private genAI: GoogleGenerativeAI;

    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
    ) {
    }

    async onModuleInit() {
        try {
            const apiKey = this.configService.get<string>('GOOGLE_AI_API_KEY');

            if (!apiKey) {
                this.logger.error('GOOGLE_AI_API_KEY is not defined in environment variables!');
                return;
            }

            this.logger.log(`Initializing Gemini with key: ${apiKey.substring(0, 5)}...`);

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

            const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
            this.logger.log(`Sending image to Gemini (${imageBuffer.length} bytes)...`);
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
            this.logger.log('Gemini analysis received.');

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
        // Disabled heatmap generation on Railway free tier.
        // Doing Sharp multi-layered compositing + blur peaks at ~350MB of RAM, causing Docker OOM kills (502 Bad Gateway).
        this.logger.warn('Heatmap generation is DISABLED to prevent Out of Memory (OOM) kills on Railway free tier.');
        return `/uploads/${filename}`; // Just mock the heatmap for now with original file representation
    }
}
