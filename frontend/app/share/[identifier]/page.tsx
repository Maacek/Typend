'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { BatchResults } from '@/lib/api';
import BatchTable from '@/components/BatchTable';

export default function SharedBatchPage() {
    const params = useParams();
    const identifier = params.identifier as string;

    const [batchResults, setBatchResults] = useState<BatchResults | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadSharedBatch();
    }, [identifier]);

    const loadSharedBatch = async () => {
        try {
            // Public endpoint - no auth needed
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4010/api/v1';
            const response = await fetch(
                `${apiUrl}/batches/share/${identifier}`
            );

            if (!response.ok) {
                throw new Error('Batch not found or no longer shared');
            }

            const data = await response.json();
            setBatchResults(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading shared results...</p>
                </div>
            </div>
        );
    }

    if (error || !batchResults) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <h1 className="text-3xl font-bold mb-4">⚠️ Results Not Found</h1>
                    <p className="text-gray-600 mb-4">
                        {error || 'This batch is no longer shared or does not exist.'}
                    </p>
                    <p className="text-sm text-gray-500">
                        If you believe this is an error, please contact the person who shared this link.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Shared badge */}
                <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-blue-800">
                                <strong>Shared Results</strong> - This batch has been shared with you (read-only access)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Batch info */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">
                        {batchResults.name || 'Creative Analysis Results'}
                    </h1>
                    <p className="text-gray-600">
                        {new Date(batchResults.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                        {' · '}
                        {batchResults.creatives.length} creative{batchResults.creatives.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Results table - reuse existing component */}
                <div className="bg-white rounded-lg shadow">
                    <BatchTable creatives={batchResults.creatives} />
                </div>

                {/* Footer note */}
                <div className="mt-6 text-center text-sm text-gray-500">
                    <p>Powered by Visual Analyzer</p>
                </div>
            </div>
        </div>
    );
}
