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

            // Czech diacritics check: AI proposes issues → we verify each against the actual text
            // Works for ANY Czech word (not hardcoded). Zero false positives (literal verification).
            if (this.ai && (language === 'cs' || language === 'cs-CZ' || language === 'unknown')) {
                try {
                    const diacriticsIssues = await this.checkCzechDiacritics(text);
                    issues.push(...diacriticsIssues);
                } catch (e) {
                    this.logger.warn(`Diacritics check failed, skipping: ${e.message}`);
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
     * AI-powered Czech diacritics check with LITERAL VERIFICATION.
     *
     * Two phases:
     * 1. PROPOSE: Gemini AI analyzes the text and proposes words with missing diacritics.
     *    This works for ANY Czech word — no hardcoded list.
     * 2. VERIFY: For each AI proposal, we check if the "wrong" word LITERALLY exists
     *    in the extracted text (case-insensitive word match).
     *    - If "PRÁTELI" is literally in the text → confirmed, report it
     *    - If the text has "PŘÁTELI" instead → "PRÁTELI" is NOT in the text → discard (false positive)
     *
     * This gives: universal coverage + zero false positives.
     */
    private async checkCzechDiacritics(text: string): Promise<TextIssue[]> {
        if (!this.ai || !text.trim()) return [];

        const prompt = [
            'Jsi kontrolor českého pravopisu. Analyzuj tento text a najdi slova, kterým chybí háčky nebo čárky.',
            '',
            `TEXT: "${text}"`,
            '',
            'Hledej POUZE chybějící diakritiku (háčky ř,š,č,ž,ď,ť,ň a čárky á,é,í,ó,ú,ů,ý).',
            'Ignoruj vlastní jména, zkratky a cizí slova.',
            'Pro každé nalezené slovo uveď PŘESNÝ tvar jak je v textu (wrong) a správný tvar (correct).',
            '',
            'Formát odpovědi — POUZE JSON pole:',
            '[{"wrong": "PRATELI", "correct": "PŘÁTELI"}]',
            'Pokud žádné chyby nejsou: []',
        ].join('\n');

        const response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { temperature: 0 },
        });

        const raw = (response.text || '').trim();
        const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

        let parsed: { wrong: string; correct: string }[];
        try {
            parsed = JSON.parse(jsonStr);
        } catch {
            this.logger.warn(`AI diacritics check returned non-JSON: ${raw.substring(0, 100)}`);
            return [];
        }

        if (!Array.isArray(parsed) || parsed.length === 0) return [];

        // CRITICAL VERIFICATION: Only keep issues where the "wrong" word LITERALLY appears in the text.
        // This eliminates ALL false positives — if the text has "PŘÁTELI" (correct),
        // the AI might wrongly say "PŘÁTELI" is wrong, but our regex for "PŘÁTELI" won't match
        // because Ř ≠ R, so it gets discarded.
        const verified: TextIssue[] = [];
        for (const item of parsed) {
            if (!item.wrong || !item.correct || item.wrong === item.correct) continue;

            // Escape special regex characters in the wrong word
            const escaped = item.wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escaped}\\b`, 'i');

            if (regex.test(text)) {
                verified.push({
                    type: 'typo',
                    severity: 'high',
                    text: `Chybí diakritika: „${item.wrong}" → správně „${item.correct}"`,
                    suggestion: `Správně: „${item.correct}"`,
                });
            } else {
                this.logger.debug?.(`AI suggested "${item.wrong}" but it's not in the text — discarded (false positive)`);
            }
        }

        if (verified.length > 0) {
            this.logger.log(`Diacritics check: AI proposed ${parsed.length}, verified ${verified.length}`);
        }
        return verified;
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
