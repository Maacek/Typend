'use client';

import React, { useState } from 'react';
import { Upload, X, FileImage, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../lib/api';

interface BatchUploadProps {
    onBatchCreated?: (batchId: string) => void;
}

export default function BatchUpload({ onBatchCreated }: BatchUploadProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            setFiles((prev) => [...prev, ...selectedFiles].slice(0, 50));
        }
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        setUploading(true);
        const formData = new FormData();
        files.forEach((file) => formData.append('files', file));

        try {
            const response = await api.post('/batches/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // Call parent callback with batchId
            if (onBatchCreated && response.data.batchId) {
                onBatchCreated(response.data.batchId);
            }

            setFiles([]);
        } catch (error) {
            console.error('Upload failed', error);
            alert('Nahrávání selhalo.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg border border-slate-100">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Nahrát vizuály</h2>
                    <p className="text-slate-500">Hromadné nahrávání (max. 50 souborů, JPG/PNG)</p>
                </div>
                <Upload className="w-8 h-8 text-indigo-600" />
            </div>

            <div
                className="border-2 border-dashed border-slate-200 rounded-lg p-12 text-center hover:border-indigo-400 transition-colors cursor-pointer relative"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files) {
                        const dropped = Array.from(e.dataTransfer.files);
                        setFiles((prev) => [...prev, ...dropped].slice(0, 50));
                    }
                }}
            >
                <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={onFileChange}
                />
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">Přetáhněte soubory sem nebo klikněte pro výběr</p>
            </div>

            {files.length > 0 && (
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-semibold text-slate-700">Připraveno k nahrání: {files.length}/50</span>
                        <button
                            onClick={() => setFiles([])}
                            className="text-sm text-red-500 hover:text-red-700 transition-colors"
                        >
                            Smazat vše
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                        {files.map((file, idx) => (
                            <div key={idx} className="group relative bg-slate-50 p-3 rounded-lg flex items-center gap-3 border border-slate-100">
                                <FileImage className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                                <span className="text-xs text-slate-700 truncate font-medium">{file.name}</span>
                                <button
                                    onClick={() => removeFile(idx)}
                                    className="absolute -top-2 -right-2 bg-white text-slate-400 p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className={`w-full mt-8 py-4 rounded-lg font-bold text-white shadow-xl transition-all ${uploading
                            ? 'bg-slate-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-700 active:transform active:scale-[0.98]'
                            }`}
                    >
                        {uploading ? 'Nahrávám...' : `Analyzovat ${files.length} kreativ`}
                    </button>
                </div>
            )}
        </div>
    );
}
