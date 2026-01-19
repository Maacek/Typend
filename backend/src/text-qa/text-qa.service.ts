import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

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
    private spellCs: any; // Czech spell checker
    private spellEn: any; // English spell checker

    async onModuleInit() {
        try {
            // Dynamically import ESM modules
            // nspell might be sensitive to how it's imported
            const nspellModule = await import('nspell');
            const nspell = typeof nspellModule.default === 'function' ? nspellModule.default : (nspellModule as any);

            const dictionaryCsModule = await import('dictionary-cs');
            const csDict = dictionaryCsModule.default || dictionaryCsModule;

            const dictionaryEnModule = await import('dictionary-en');
            const enDict = dictionaryEnModule.default || dictionaryEnModule;

            // Initialize Czech spell checker
            if (csDict && csDict.aff && csDict.dic) {
                this.spellCs = nspell(csDict);
                this.logger.log('Czech spell checker initialized');
            } else {
                this.logger.error('Czech dictionary data missing or invalid format');
            }

            // Initialize English spell checker
            if (enDict && enDict.aff && enDict.dic) {
                this.spellEn = nspell(enDict);
                this.logger.log('English spell checker initialized');
            } else {
                this.logger.error('English dictionary data missing or invalid format');
            }
        } catch (error) {
            this.logger.error('Failed to initialize spell checkers:', error);
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

            // Spell checking with nspell
            if (this.spellCs || this.spellEn) {
                const spellIssues = this.checkSpelling(text, language);
                issues.push(...spellIssues);
            }

            // Basic grammar checks
            const grammarIssues = this.checkBasicGrammar(text, language);
            issues.push(...grammarIssues);

            // Readability analysis
            const readabilityScore = this.calculateReadability(text);

            // Calculate overall score
            const overallScore = this.calculateOverallScore(issues, readabilityScore);

            this.logger.log(`Text QA completed. Issues: ${issues.length}, Score: ${overallScore}`);

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

    private checkSpelling(text: string, language: string): TextIssue[] {
        const issues: TextIssue[] = [];
        const spell = language?.toLowerCase() === 'cs' ? this.spellCs : this.spellEn;

        if (!spell) return issues;

        // FIXED: Improved regex to properly handle Czech diacritics
        // Match whole words including all Czech letters with diacritics
        const words = text.match(/[a-zA-ZáčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]+/g) || [];

        for (const word of words) {
            // Skip very short words, numbers, and common ad words
            if (word.length < 3 || /^\d+$/.test(word)) continue;

            // Skip brand names (all caps words likely to be brands/logos)
            // Example: KAJOT, GAMES, BETOR, VISA, etc.
            if (word === word.toUpperCase() && word.length > 2) {
                this.logger.log(`Skipping brand name: ${word}`);
                continue;
            }

            // Skip common banner/marketing words that might not be in dictionary
            const marketingWords = /^(cta|seo|roas|roi|kpi|promo|cashback|bonus|vip|app)$/i;
            if (marketingWords.test(word)) continue;

            // For Czech text, check if word is valid English (banners often mix languages)
            if (language?.toLowerCase() === 'cs' && this.spellEn && this.spellEn.correct(word)) {
                this.logger.log(`Skipping English word in Czech banner: ${word}`);
                continue;
            }

            // Check if word is correct in primary language
            if (!spell.correct(word)) {
                // Get suggestions
                const suggestions = spell.suggest(word).slice(0, 3);

                issues.push({
                    type: 'typo',
                    severity: 'medium',
                    text: word,
                    suggestion: suggestions.length > 0 ? suggestions.join(', ') : undefined,
                });
            }
        }

        return issues;
    }

    private checkBasicGrammar(text: string, language: string): TextIssue[] {
        const issues: TextIssue[] = [];

        // BANNER-SPECIFIC CHECKS

        // Excessive punctuation (!!!, ???)
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

        // Double spaces
        if (text.includes('  ')) {
            issues.push({
                type: 'grammar',
                severity: 'low',
                text: this.getLocalizedMessage('double_spaces', language),
            });
        }

        // REMOVED: All caps check (banners often use caps for headlines)
        // REMOVED: All lowercase check (less relevant for ad copy)

        return issues;
    }

    private calculateReadability(text: string): number {
        // SIMPLIFIED: Readability for banners is different than articles
        // Just check basic text length appropriateness
        if (!text || text.trim().length === 0) return 0;

        const length = text.trim().length;

        // Banner text should be concise
        if (length < 10) return 60; // Too short, missing info
        if (length > 150) return 70; // Too long for banner

        return 100; // Good length for banner
    }

    private calculateOverallScore(issues: TextIssue[], readabilityScore: number): number {
        // Start with perfect score
        let score = 100;

        // Deduct points for issues (more aggressive for banners)
        for (const issue of issues) {
            if (issue.severity === 'high') score -= 15;
            else if (issue.severity === 'medium') score -= 8;
            else score -= 3;
        }

        // Lightly factor in readability (banner text is short)
        score = score * 0.8 + readabilityScore * 0.2;

        return Math.max(0, Math.min(100, Math.round(score)));
    }
}
