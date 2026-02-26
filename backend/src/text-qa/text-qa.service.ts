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

            // Czech diacritics check: simple literal matching on the extracted text
            // If a known wrong word appears → flag it. If the correct word appears → skip.
            // No AI, no diacritics stripping, no normalization. Just direct string matching.
            if (language === 'cs' || language === 'cs-CZ' || language === 'unknown') {
                const diacriticsIssues = this.checkKnownDiacritics(text);
                issues.push(...diacriticsIssues);
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
     * Check for Czech words with missing diacritics using DIRECT string matching.
     *
     * How it works:
     * - We have a list of [wrongWord, correctWord] pairs
     * - For each pair, we check if the EXACT wrong word appears in the text (case-insensitive)
     * - If yes → flag it. If the correct word is there instead → the regex won't match → no flag.
     *
     * Why this works perfectly:
     * - "S PRÁTELI" → regex /\bPRÁTELI\b/i matches "PRÁTELI" → ✅ flagged
     * - "S PŘÁTELI" → regex /\bPRÁTELI\b/i does NOT match "PŘÁTELI" (Ř ≠ R) → ✅ not flagged
     * - No diacritics stripping, no normalization, no AI. Just literal matching.
     */
    private checkKnownDiacritics(text: string): TextIssue[] {
        const issues: TextIssue[] = [];

        // Each entry: [exact wrong word, correct word]
        // The wrong word is searched as-is (case-insensitive) with word boundaries
        const corrections: [string, string][] = [
            // Missing ř (P + R instead of PŘ)
            ['PRATELI', 'PŘÁTELI'],
            ['PRÁTELI', 'PŘÁTELI'],
            ['PRATELE', 'PŘÁTELÉ'],
            ['PRÁTELE', 'PŘÁTELÉ'],
            ['PRATEL', 'PŘÁTEL'],
            ['PRÁTEL', 'PŘÁTEL'],
            ['PRITEL', 'PŘÍTEL'],
            ['PRITELE', 'PŘÍTELE'],
            ['PREKVAPENI', 'PŘEKVAPENÍ'],
            ['PRIRODA', 'PŘÍRODA'],
            ['PRIRODNI', 'PŘÍRODNÍ'],
            // Missing š (S instead of Š)
            ['NEJRADSI', 'NEJRADŠÍ'],
            ['NEJLEPSI', 'NEJLEPŠÍ'],
            ['NEJVETSI', 'NEJVĚTŠÍ'],
            ['SKOLKA', 'ŠKOLKA'],
            ['SKOLKY', 'ŠKOLKY'],
            // Missing č (C instead of Č)
            ['CESKY', 'ČESKY'],
            ['CESKE', 'ČESKÉ'],
            ['CESKA', 'ČESKÁ'],
            ['CERVENA', 'ČERVENÁ'],
            ['CERVENY', 'ČERVENÝ'],
            // Missing ž (Z instead of Ž)
            ['SOUTEZ', 'SOUTĚŽ'],
            ['SOUTEZE', 'SOUTĚŽE'],
            ['SOUTEZI', 'SOUTĚŽI'],
            // Missing í/ý
            ['ZISKEJ', 'ZÍSKEJ'],
            ['NABIDKA', 'NABÍDKA'],
            ['VYHODA', 'VÝHODA'],
            ['VYHODY', 'VÝHODY'],
        ];

        for (const [wrong, correct] of corrections) {
            // Build a case-insensitive word-boundary regex for the EXACT wrong word
            const regex = new RegExp(`\\b${wrong}\\b`, 'i');
            if (regex.test(text)) {
                issues.push({
                    type: 'typo',
                    severity: 'high',
                    text: `Chybí diakritika: „${wrong}" → správně „${correct}"`,
                    suggestion: `Správně: „${correct}"`,
                });
            }
        }

        if (issues.length > 0) {
            this.logger.log(`Diacritics check found ${issues.length} issue(s)`);
        }
        return issues;
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
