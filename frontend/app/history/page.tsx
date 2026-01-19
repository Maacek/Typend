'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface BatchSummary {
    id: string;
    name: string;
    status: string;
    createdAt: string;
    creativesCount: number;
    averageScore: number | null;
    isPublic: boolean;
    shareToken: string | null;
    shareSlug: string | null;
    shareUrl: string | null;
}

export default function HistoryPage() {
    const router = useRouter();
    const [batches, setBatches] = useState<BatchSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingSlug, setEditingSlug] = useState<string | null>(null);
    const [newSlug, setNewSlug] = useState('');

    useEffect(() => {
        loadBatches();
    }, []);

    const loadBatches = async () => {
        try {
            const response = await api.get('/batches');
            setBatches(response.data);
        } catch (error) {
            console.error('Failed to load batches:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async (batchId: string, customSlug?: string) => {
        try {
            const response = await api.post(`/batches/${batchId}/share`,
                customSlug ? { customSlug } : {}
            );

            const baseUrl = window.location.origin;
            const identifier = response.data.shareSlug || response.data.shareToken;
            const fullUrl = `${baseUrl}/share/${identifier}`;

            await navigator.clipboard.writeText(fullUrl);
            alert('Share link copied to clipboard!');

            setEditingSlug(null);
            loadBatches();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to generate share link');
        }
    };

    const handleRevokeShare = async (batchId: string) => {
        if (!confirm('Revoke sharing for this batch?')) return;

        try {
            await api.post(`/batches/${batchId}/share/revoke`);
            loadBatches();
        } catch (error) {
            console.error('Failed to revoke share link:', error);
        }
    };

    const handleCustomSlug = (batchId: string) => {
        if (!newSlug.trim()) {
            alert('Please enter a custom slug');
            return;
        }

        handleShare(batchId, newSlug);
    };

    if (loading) {
        return <div className="min-h-screen bg-gray-50 p-8"><p>Loading...</p></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Batch History</h1>
                    <button
                        onClick={() => router.push('/')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        ← Back to Upload
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                                <th className="px-6 py-3 text-center text-sm font-semibold">Creatives</th>
                                <th className="px-6 py-3 text-center text-sm font-semibold">Avg Score</th>
                                <th className="px-6 py-3 text-center text-sm font-semibold">Status</th>
                                <th className="px-6 py-3 text-center text-sm font-semibold">Share</th>
                            </tr>
                        </thead>
                        <tbody>
                            {batches.map(batch => (
                                <tr key={batch.id} className="border-t hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => router.push(`/?batchId=${batch.id}`)}
                                            className="text-blue-600 hover:underline font-medium"
                                        >
                                            {batch.name || 'Unnamed Batch'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {new Date(batch.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm">
                                        {batch.creativesCount}
                                    </td>
                                    <td className="px-6 py-4 text-center font-semibold">
                                        {batch.averageScore
                                            ? `${batch.averageScore}/100`
                                            : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${batch.status === 'DONE'
                                                ? 'bg-green-100 text-green-800'
                                                : batch.status === 'PROCESSING'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {batch.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {batch.isPublic ? (
                                            <div className="flex flex-col gap-2">
                                                {editingSlug === batch.id ? (
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={newSlug}
                                                            onChange={(e) => setNewSlug(e.target.value)}
                                                            placeholder="custom-slug"
                                                            className="px-2 py-1 border rounded text-sm"
                                                        />
                                                        <button
                                                            onClick={() => handleCustomSlug(batch.id)}
                                                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingSlug(null)}
                                                            className="px-2 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex gap-2 justify-center">
                                                            <button
                                                                onClick={() => handleShare(batch.id)}
                                                                className="text-blue-600 hover:text-blue-800 text-sm"
                                                            >
                                                                📋 Copy Link
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingSlug(batch.id);
                                                                    setNewSlug(batch.shareSlug || '');
                                                                }}
                                                                className="text-purple-600 hover:text-purple-800 text-sm"
                                                            >
                                                                ✏️ Rename
                                                            </button>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRevokeShare(batch.id)}
                                                            className="text-red-600 hover:text-red-800 text-xs"
                                                        >
                                                            🔒 Revoke
                                                        </button>
                                                        {batch.shareSlug && (
                                                            <span className="text-xs text-gray-500">
                                                                /{batch.shareSlug}
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleShare(batch.id)}
                                                className="text-green-600 hover:text-green-800 text-sm font-medium"
                                            >
                                                🔗 Share
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>


                    {batches.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            No batches yet. Upload some creatives to get started!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
