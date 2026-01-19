export enum JobStatus {
    QUEUED = 'QUEUED',
    PROCESSING = 'PROCESSING',
    DONE = 'DONE',
    FAILED = 'FAILED',
    PARTIAL_FAILED = 'PARTIAL_FAILED',
}

export interface AnalysisResult {
    scores: Record<string, number>;
    explanation: string;
    textIssues: any[];
    heatmapUrl?: string;
}
