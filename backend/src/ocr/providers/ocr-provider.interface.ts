export interface TextBlock {
    text: string;
    confidence: number;
    bbox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export interface OcrResult {
    text: string;
    confidence: number;
    language?: string;
    provider: string;
    blocks?: TextBlock[];
    processingTime: number;
}

export interface IOcrProvider {
    extractText(imageBuffer: Buffer): Promise<OcrResult>;
    getName(): string;
}
