import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { IOcrProvider, OcrResult } from './providers/ocr-provider.interface';
import { GoogleVisionProvider } from './providers/google-vision.provider';
import { AzureVisionProvider } from './providers/azure-vision.provider';

export interface ConsensusResult extends OcrResult {
    consensusScore: number;
    googleText?: string;
    azureText?: string;
    googleConfidence?: number;
    azureConfidence?: number;
}

@Injectable()
export class OcrService {
    private readonly logger = new Logger(OcrService.name);
    private googleProvider: GoogleVisionProvider | null = null;
    private azureProvider: AzureVisionProvider | null = null;
    private ai: GoogleGenAI | null = null;

    private readonly CONSENSUS_THRESHOLD = 95; // User required 95% agreement

    constructor(private configService: ConfigService) {
        // Try to initialize cloud providers
        try {
            this.googleProvider = new GoogleVisionProvider();
        } catch (error) {
            this.logger.warn('Google Vision API not available');
        }

        try {
            this.azureProvider = new AzureVisionProvider();
        } catch (error) {
            this.logger.warn('Azure Vision API not available');
        }

        // Log which providers are available
        const providers = [];
        if (this.googleProvider) providers.push('Google Vision');
        if (this.azureProvider) providers.push('Azure Vision');
        this.logger.log(`OCR providers initialized: ${providers.join(', ')}`);

        // Initialize Gemini AI for text filtering
        try {
            const apiKey = this.configService.get<string>('GOOGLE_AI_API_KEY');
            if (apiKey) {
                this.ai = new GoogleGenAI({ apiKey });
                this.logger.log('Gemini AI initialized for text filtering');
            } else {
                this.logger.warn('GOOGLE_AI_API_KEY not set - text filtering will be skipped');
            }
        } catch (error) {
            this.logger.error(`Failed to initialize Gemini AI: ${error.message}`);
        }
    }

    async extractText(imageBuffer: Buffer): Promise<ConsensusResult> {
        // If both cloud providers available, use dual-API consensus
        if (this.googleProvider && this.azureProvider) {
            return this.extractWithConsensus(imageBuffer);
        }

        // If only one cloud provider available, use it
        if (this.googleProvider) {
            this.logger.warn('Only Google Vision available - no consensus validation');
            const result = await this.googleProvider.extractText(imageBuffer);
            return { ...result, consensusScore: 100 }; // No consensus to compare
        }

        if (this.azureProvider) {
            this.logger.warn('Only Azure Vision available - no consensus validation');
            const result = await this.azureProvider.extractText(imageBuffer);
            return { ...result, consensusScore: 100 };
        }

        // Fall back to nothing if Tesseract removed to save memory
        this.logger.warn('No cloud OCR available - unable to extract text due to Tesseract removal (OOM prevention)');
        return { text: '', confidence: 0, language: 'unknown', provider: 'none', blocks: [], processingTime: 0, consensusScore: 0 };
    }

    private async extractWithConsensus(imageBuffer: Buffer): Promise<ConsensusResult> {
        this.logger.log('Running dual-API OCR with consensus validation...');

        try {
            // Execute both APIs in parallel using allSettled so one failure doesn't bypass the other
            const [googleSettled, azureSettled] = await Promise.allSettled([
                this.googleProvider!.extractText(imageBuffer),
                this.azureProvider!.extractText(imageBuffer),
            ]);

            const googleResult = googleSettled.status === 'fulfilled' ? googleSettled.value : null;
            const azureResult = azureSettled.status === 'fulfilled' ? azureSettled.value : null;

            if (googleSettled.status === 'rejected') {
                this.logger.error(`Google Vision failing locally or API issue: ${googleSettled.reason?.message}`);
            }
            if (azureSettled.status === 'rejected') {
                this.logger.error(`Azure Vision failing locally or API issue: ${azureSettled.reason?.message}`);
            }

            if (!googleResult && !azureResult) {
                throw new Error('Both Google Vision and Azure Vision failed concurrently');
            }

            if (googleResult && azureResult) {
                // Calculate similarity using simple ratio since levenshtein is removed
                const similarity = this.calculateBasicSimilarity(googleResult.text, azureResult.text);

                this.logger.log(
                    `Consensus analysis: Google=${googleResult.text.length}chars (${googleResult.confidence.toFixed(1)}%), ` +
                    `Azure=${azureResult.text.length}chars (${azureResult.confidence.toFixed(1)}%), ` +
                    `Similarity=${similarity.toFixed(1)}%`,
                );

                // Decide based on consensus threshold
                return this.mergeResults(googleResult, azureResult, similarity);
            } else if (azureResult) {
                this.logger.warn('Fallback: Using standalone Azure Vision because Google Vision failed.');
                return { ...azureResult, consensusScore: 100 };
            } else {
                this.logger.warn('Fallback: Using standalone Google Vision because Azure Vision failed.');
                return { ...googleResult!, consensusScore: 100 };
            }
        } catch (error) {
            this.logger.error(`Dual-API OCR catastrophic failure: ${error.message}`);
            this.logger.warn('All OCR fallbacks failed, returning empty result');
            return { text: '', confidence: 0, language: 'unknown', provider: 'none', blocks: [], processingTime: 0, consensusScore: 0 };
        }
    }

    private calculateBasicSimilarity(text1: string, text2: string): number {
        if (!text1 && !text2) return 100;
        if (!text1 || !text2) return 0;

        const normalize = (str: string) => str.toLowerCase().trim().replace(/\s+/g, ' ');
        const norm1 = normalize(text1);
        const norm2 = normalize(text2);

        // Simple length-based similarity approximation to replace fastest-levenshtein
        const maxLength = Math.max(norm1.length, norm2.length);
        const minLength = Math.min(norm1.length, norm2.length);

        if (maxLength === 0) return 100;

        let matchCount = 0;
        // Naive bag-of-words similarity for basic functionality without extra packages
        const words1 = norm1.split(' ');
        const words2 = norm2.split(' ');

        for (const word of words1) {
            if (words2.includes(word)) matchCount += word.length;
        }

        const similarity = (matchCount / maxLength) * 100;
        return Math.max(0, Math.min(100, similarity));
    }

    private mergeResults(
        googleResult: OcrResult,
        azureResult: OcrResult,
        similarity: number,
    ): ConsensusResult {
        // High consensus (≥95%): merge both results
        if (similarity >= this.CONSENSUS_THRESHOLD) {
            const avgConfidence = (googleResult.confidence + azureResult.confidence) / 2 + 10; // Bonus for consensus

            return {
                text: googleResult.text.length >= azureResult.text.length ? googleResult.text : azureResult.text,
                confidence: Math.min(100, avgConfidence),
                language: googleResult.language || azureResult.language,
                provider: 'dual-consensus',
                blocks: [...(googleResult.blocks || []), ...(azureResult.blocks || [])],
                processingTime: Math.max(googleResult.processingTime, azureResult.processingTime),
                consensusScore: similarity,
                googleText: googleResult.text,
                azureText: azureResult.text,
                googleConfidence: googleResult.confidence,
                azureConfidence: azureResult.confidence,
            };
        }

        // Medium consensus (85-94%): use longer result
        if (similarity >= 85) {
            const longerResult = googleResult.text.length >= azureResult.text.length ? googleResult : azureResult;
            this.logger.warn(`Medium consensus (${similarity.toFixed(1)}%) - using longer result from ${longerResult.provider}`);

            return {
                ...longerResult,
                consensusScore: similarity,
                googleText: googleResult.text,
                azureText: azureResult.text,
                googleConfidence: googleResult.confidence,
                azureConfidence: azureResult.confidence,
            };
        }

        // Low consensus (<85%): use Google by default with penalty
        this.logger.warn(`Low consensus (${similarity.toFixed(1)}%) - using Google result with confidence penalty`);

        return {
            ...googleResult,
            confidence: Math.max(0, googleResult.confidence - 20), // Penalty for low consensus
            consensusScore: similarity,
            googleText: googleResult.text,
            azureText: azureResult.text,
            googleConfidence: googleResult.confidence,
            azureConfidence: azureResult.confidence,
        };
    }

    /**
     * Filter banner text from product text using AI
     * Distinguishes between text created for the banner vs text on displayed products
     */
    async filterBannerText(rawText: string, imageBuffer: Buffer): Promise<string> {
        // If no text or AI not available, return original text
        if (!rawText || !rawText.trim()) {
            return rawText;
        }

        if (!this.ai) {
            this.logger.warn('Gemini AI not initialized - skipping text filtering');
            return rawText;
        }

        try {
            this.logger.log('Filtering banner text using AI...');

            const filterPrompt = `
Jsi expert na rozlišení GRAFICKÉHO TEXTU vytvořeného designérem od TEXTU NA FOTOGRAFOVANÝCH PRODUKTECH.

ÚKOL: Identifikuj POUZE text overlay, který designér VYTVOŘIL přímo pro banner (ne text na fotografiích).

✅ ZACHOVAT (text vytvořený designérem):
- Nadpisy kampaně (overlay text "zapsaný" pro banner)
- CTA buttony ("Koupit nyní", "Zjistit více")
- Akční nálepky/razítka ("-50% SLEVA", "NOVINKA") - jsou to GRAFICKÉ prvky, ne fotografie
- Kontaktní info (web, tel.) pokud je to overlay text
- Slogany kampaně

❌ VYMAZAT (text na fotografovaných objektech):
- VEŠKERÝ text NA kartičkách/kartách (jména, ceny, statistiky)
- VEŠKERÝ text NA krabicích/obalech produktů
- VEŠKERÝ text NA láhvích/lahvičkách
- VEŠKERÝ text NA etiketách produktů
- VEŠKERÁ loga (brand loga, certifikační značky)
- Prostě COKOLI co je na fotografovaném produktu/objektu

KLÍČ K ROZLIŠENÍ:
- Text overlay = vytvořen v grafickém editoru PŘES foto
- Text na produktu = je SOUČÁSTÍ fotografie

PŘÍKLADY:

**Banner: "Soutěž o vlastní hrací kartu!" + foto kartiček LINDA + krabice hry**
✅ ZACHOVAT: "Soutěž o vlastní hrací kartu!" (overlay text)
❌ VYMAZAT: "LINDA" (text NA kartičce)
❌ VYMAZAT: "Cena hráče 90 000 €" (text NA kartičce)
❌ VYMAZAT: "FOTBALOVÝ TÝM HVĚZD" (text NA krabici)

**Banner: "Získej vlasy snů -30%" + foto lahvičky šampónu**
✅ ZACHOVAT: "Získej vlasy snů" (overlay text)
✅ ZACHOVAT: "-30%" (pokud je to razítko/nálepka, ne text na produktu)
❌ VYMAZAT: "Head & Shoulders" (text NA lahvičce)
❌ VYMAZAT: "500ml" (text NA lahvičce)
❌ VYMAZAT: Brand logo (logo NA lahvičce)

**Banner: "SLEVA 50%" razítko + foto produktu**
✅ ZACHOVAT: "SLEVA 50%" (grafické razítko)
❌ VYMAZAT: vše co je na produktu

FORMÁT ODPOVĚDI:
Vrať POUZE text overlay (ne text z produktů), jeden řádek per text.

BEZ komentářů, vysvětlení, odrážek.

Pokud není žádný overlay text → vrať prázdný řetězec.`.trim();

            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash-lite', // Same as visual analysis
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: filterPrompt },
                            {
                                inlineData: {
                                    data: imageBuffer.toString('base64'),
                                    mimeType: 'image/png',
                                },
                            },
                        ],
                    },
                ],
            });

            const filteredText = (response.text || '').trim();

            if (!filteredText) {
                this.logger.warn('AI returned empty text - using original OCR text');
                return rawText;
            }

            this.logger.log(`Text filtering: ${rawText.length} → ${filteredText.length} chars`);
            return filteredText;
        } catch (error) {
            this.logger.error(`Text filtering failed: ${error.message}`);
            this.logger.warn('Using original OCR text due to filtering error');
            return rawText;
        }
    }
}
