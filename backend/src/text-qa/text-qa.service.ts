import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

export interface TextIssue {
    type: 'typo' | 'grammar' | 'readability' | 'capitalization';
    severity: 'low' | 'medium' | 'high';
    text: string;
    suggestion?: string;
    position?: { start: number; end: number };
}

export interface TextQaResult {
    issues: TextIssue[];
    overallScore: number; // 0-100, 100 = perfect
    readabilityScore: number;
    language: string;
}

@Injectable()
export class TextQaService implements OnModuleInit {
    private readonly logger = new Logger(TextQaService.name);
    private ai: GoogleGenAI | null = null;

    constructor(private configService: ConfigService) { }

    async onModuleInit() {
        const apiKey = this.configService.get<string>('GOOGLE_AI_API_KEY');
        if (apiKey) {
            this.ai = new GoogleGenAI({ apiKey });
            this.logger.log('Text QA Service initialized with AI spell-check');
        } else {
            this.logger.log('Text QA Service initialized (Spellcheck disabled for memory optimization)');
        }
    }

    private getLocalizedMessage(key: string, language: string): string {
        type MessageKey = 'double_spaces' | 'all_caps' | 'all_lowercase';
        type Messages = Record<MessageKey, string>;

        const messages: Record<'cs' | 'en', Messages> = {
            cs: {
                'double_spaces': 'Nalezeny dvojité mezery',
                'all_caps': 'Celý text je velkými písmeny',
                'all_lowercase': 'Celý text je malými písmeny',
            },
            en: {
                'double_spaces': 'Double spaces detected',
                'all_caps': 'Entire text is capitalized',
                'all_lowercase': 'Entire text is lowercase',
            },
        };

        const lang = language?.toLowerCase() === 'cs' ? 'cs' : 'en';
        return messages[lang][key as MessageKey] || messages['en'][key as MessageKey];
    }

    async analyzeText(text: string, language: string): Promise<TextQaResult> {
        try {
            this.logger.log(`Analyzing text in language: ${language}`);
            const issues: TextIssue[] = [];

            // Basic grammar checks (always run)
            const grammarIssues = this.checkBasicGrammar(text, language);
            issues.push(...grammarIssues);

            // AI-powered spell check for Czech diacritics
            if (this.ai && (language === 'cs' || language === 'cs-CZ' || language === 'unknown')) {
                try {
                    const diacriticsIssues = await this.checkCzechDiacritics(text);
                    issues.push(...diacriticsIssues);
                } catch (e) {
                    this.logger.warn(`AI spell check failed, skipping: ${e.message}`);
                }
            }

            // Readability analysis
            const readabilityScore = this.calculateReadability(text);

            // Calculate overall score
            const overallScore = this.calculateOverallScore(issues, readabilityScore);

            this.logger.log(`Text QA completed. Score: ${overallScore}, Issues: ${issues.length}`);

            return {
                issues,
                overallScore,
                readabilityScore,
                language,
            };
        } catch (error) {
            this.logger.error(`Text QA analysis failed: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Use Gemini to detect Czech words with missing diacritics (háčky, čárky).
     * This catches OCR mistakes where ř→r, š→s, č→c, ž→z, á→a, é→e, í→i, ó→o, ú→u, ů→u etc.
     */
    private async checkCzechDiacritics(text: string): Promise<TextIssue[]> {
        if (!this.ai || !text.trim()) return [];

        const prompt = [
            'Jsi specializovaný kontrolor českého pravopisu. Tvůj výstup musí být vždy konzistentní.',
            '',
            'TEXT K ANALÝZE:',
            `"${text}"`,
            '',
            'ÚKOL: Najdi slova s CHYBĚJÍCÍMI háčky nebo čárkami — typické chyby OCR čtečky textu z obrazu.',
            '',
            'Nejčastější OCR chyby v češtině (TYTO VŽDY HLÁSIT):',
            '- "PRÁTELI" → CHYBA, správně "PŘÁTELI" (chybí Ř na začátku)',
            '- "PRATELI" → CHYBA, správně "PŘÁTELI"',
            '- "PRATELE" → CHYBA, správně "PŘÁTELÉ"',
            '- "NEJRADSI" → CHYBA, správně "NEJRADŠÍ"',
            '- "HRAJETE", "DESKOVKY", "RODINOU" → správně (háčky nepotřebují)',
            '',
            'KLÍČOVÉ PRAVIDLO pro ŘE/ŘÁ:',
            '  Slovo "přáteli" / "přátelé" VŽDY obsahuje Ř. "PRÁTELI" bez Ř je vždy chyba OCR.',
            '',
            'Ignoruj zkratky, vlastní jména a cizí slova.',
            'Hledej POUZE chybějící háčky/čárky, ne jiné gramatické chyby.',
            '',
            'Výstup — POUZE JSON pole, žádný komentář:',
            '[',
            '  { "wrong": "PRÁTELI", "correct": "PŘÁTELI" }',
            ']',
            'Pokud žádné chyby nejsou → vrať: []',
        ].join('\n');


        const response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { temperature: 0 }, // Deterministic — same input MUST give same output
        });


        const raw = (response.text || '').trim();
        // Strip markdown code fences if present
        const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

        let parsed: { wrong: string; correct: string }[];
        try {
            parsed = JSON.parse(jsonStr);
        } catch {
            this.logger.warn(`AI diacritics check returned non-JSON: ${raw.substring(0, 100)}`);
            return [];
        }

        if (!Array.isArray(parsed) || parsed.length === 0) return [];

        this.logger.log(`AI found ${parsed.length} Czech diacritics issue(s)`);
        return parsed.map(item => ({
            type: 'typo' as const,
            severity: 'high' as const,
            text: `Slovo "${item.wrong}" pravděpodobně chybí háčky nebo čárky`,
            suggestion: `Správně: "${item.correct}"`,
        }));
    }

    private checkBasicGrammar(text: string, language: string): TextIssue[] {
        const issues: TextIssue[] = [];

        if (/[!?]{3,}/.test(text)) {
            const msg = language === 'cs'
                ? 'Přílišné použití vykřičníků nebo otazníků'
                : 'Excessive use of exclamation points or question marks';
            const sug = language === 'cs'
                ? 'Reducujte na 1-2 vykřičníky pro větší dopad'
                : 'Reduce to 1-2 exclamation points for greater impact';
            issues.push({
                type: 'grammar',
                severity: 'medium',
                text: msg,
                suggestion: sug,
            });
        }

        if (text.includes('  ')) {
            issues.push({
                type: 'grammar',
                severity: 'low',
                text: this.getLocalizedMessage('double_spaces', language),
            });
        }

        return issues;
    }

    private calculateReadability(text: string): number {
        if (!text || text.trim().length === 0) return 0;
        const length = text.trim().length;
        if (length < 10) return 60;
        if (length > 150) return 70;
        return 100;
    }

    private calculateOverallScore(issues: TextIssue[], readabilityScore: number): number {
        let score = 100;
        for (const issue of issues) {
            if (issue.severity === 'high') score -= 15;
            else if (issue.severity === 'medium') score -= 8;
            else score -= 3;
        }
        score = score * 0.8 + readabilityScore * 0.2;
        return Math.max(0, Math.min(100, Math.round(score)));
    }
}
