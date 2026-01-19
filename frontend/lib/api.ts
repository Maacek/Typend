import axios from 'axios';

const getBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
    if (typeof window !== 'undefined') {
        const { protocol, hostname } = window.location;
        // In dev environment, backend is usually on 4010
        return `${protocol}//${hostname}:4010/api/v1`;
    }
    return 'http://localhost:4010/api/v1';
};

const API_URL = getBaseUrl();

export interface TextIssue {
    type: 'typo' | 'grammar' | 'readability' | 'capitalization';
    severity: 'low' | 'medium' | 'high';
    text: string;
    suggestion?: string;
    position?: { start: number; end: number };
}

export interface AnalysisResult {
    extractedText: string | null;
    textConfidence: number | null;
    textIssues: TextIssue[] | null;
    createdAt: string;
    updatedAt: string;
    // Phase 3 fields
    scores?: Record<string, number> | null;
    overallScore?: number | null;
    explanation?: string | null;
    suggestions?: string[] | null;
    heatmapUrl?: string | null;
}

export interface Creative {
    id: string;
    filename: string;
    status: string;
    originalUrl: string;
    mimeType: string;
    size: number;
    analysisResult: AnalysisResult | null;
}

export interface BatchResults {
    batchId: string;
    name: string | null;
    status: string;
    createdAt: string;
    creatives: Creative[];
}

const api = axios.create({
    baseURL: API_URL,
});

// Add interceptor for JWT
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export async function uploadBatch(files: File[], name?: string) {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    if (name) formData.append('name', name);

    const response = await api.post('/batches/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
}

export async function fetchBatchResults(batchId: string): Promise<BatchResults> {
    const response = await api.get(`/batches/${batchId}/results`);
    return response.data;
}

export default api;
