'use client';

import React from 'react';
import { TextIssue, BASE_URL } from '@/lib/api';

interface TextAnalysisPanelProps {
    filename: string;
    status: string;
    imageUrl: string;
    extractedText: string | null;
    textConfidence: number | null;
    textIssues: TextIssue[] | null;
    // Phase 3 fields
    scores: Record<string, number> | null;
    overallScore: number | null;
    explanation: string | null;
    suggestions: string[] | null;
    heatmapUrl: string | null;
}

export default function TextAnalysisPanel({
    filename,
    status,
    imageUrl,
    extractedText,
    textConfidence,
    textIssues,
    scores,
    overallScore,
    explanation,
    suggestions,
    heatmapUrl,
}: TextAnalysisPanelProps) {
    const [showHeatmap, setShowHeatmap] = React.useState(false);

    // Calculate overall score from issues
    const calculateScore = () => {
        if (!textIssues || textIssues.length === 0) return 100;
        let score = 100;
        textIssues.forEach((issue) => {
            if (issue.severity === 'high') score -= 10;
            else if (issue.severity === 'medium') score -= 5;
            else score -= 2;
        });
        return Math.max(0, score);
    };

    const textScore = calculateScore();

    // Confidence badge color
    const confidenceColor = (confidence: number | null) => {
        if (!confidence) return 'bg-gray-500';
        if (confidence >= 80) return 'bg-green-500';
        if (confidence >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    // Score bar color
    const scoreBarColor = (score: number) => {
        if (score >= 8) return 'bg-green-500';
        if (score >= 6) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    // Overall score color
    const overallScoreColor = (score: number | null) => {
        if (!score) return 'bg-gray-500';
        if (score >= 8) return 'bg-green-500';
        if (score >= 6) return 'bg-yellow-500';
        if (score >= 4) return 'bg-orange-500';
        return 'bg-red-500';
    };

    // Issue severity badge color
    const severityColor = (severity: string) => {
        switch (severity) {
            case 'high': return 'bg-red-100 text-red-800 border-red-300';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    // Issue type icon
    const issueIcon = (type: string) => {
        switch (type) {
            case 'typo': return '✏️';
            case 'grammar': return '📝';
            case 'capitalization': return '🔤';
            case 'readability': return '📖';
            default: return '❓';
        }
    };

    const copyToClipboard = () => {
        if (extractedText) {
            navigator.clipboard.writeText(extractedText);
        }
    };

    const fullImageUrl = `${BASE_URL}${imageUrl}`;
    const fullHeatmapUrl = heatmapUrl ? `${BASE_URL}${heatmapUrl}` : null;

    return (
        <div className="border rounded-xl p-6 bg-white shadow-md hover:shadow-lg transition-shadow border-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 p-2 rounded-lg">
                        <span className="text-xl">📷</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">{filename}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${status === 'DONE' ? 'bg-green-100 text-green-700' :
                            status === 'PROCESSING' ? 'bg-blue-100 text-blue-700 animate-pulse' :
                                status === 'FAILED' ? 'bg-red-100 text-red-700' :
                                    status === 'PARTIAL_FAILED' ? 'bg-orange-100 text-orange-700' :
                                        'bg-slate-100 text-slate-600'
                            }`}>
                            {status === 'DONE' ? 'Analyzováno' : status}
                        </span>
                    </div>
                </div>
                {/* Overall Score Badge */}
                {overallScore !== null && overallScore !== undefined && status === 'DONE' && (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${overallScoreColor(overallScore)} bg-opacity-10 border-2`}
                        style={{ borderColor: overallScoreColor(overallScore).replace('bg-', '').replace('-500', '') }}
                    >
                        <span className="text-xs font-black text-slate-600 uppercase">Celkové skóre</span>
                        <span className="text-2xl font-black text-slate-800">{overallScore.toFixed(1)}</span>
                        <span className="text-slate-400 font-bold">/10</span>
                    </div>
                )}
                {heatmapUrl && status === 'DONE' && (
                    <button
                        onClick={() => setShowHeatmap(!showHeatmap)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${showHeatmap
                            ? 'bg-indigo-600 text-white shadow-indigo-100 shadow-lg'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        🔥 {showHeatmap ? 'Skrýt heatmapu' : 'Zobrazit heatmapu'}
                    </button>
                )}
            </div>

            {/* Image Preview / Heatmap */}
            <div className="mb-6 relative group overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                <img
                    src={showHeatmap && fullHeatmapUrl ? fullHeatmapUrl : fullImageUrl}
                    alt={filename}
                    className="w-full h-auto max-h-[500px] object-contain mx-auto"
                    onError={(e) => {
                        e.currentTarget.parentElement!.style.display = 'none';
                        console.error('Failed to load image:', showHeatmap ? fullHeatmapUrl : fullImageUrl);
                    }}
                />
                {showHeatmap && (
                    <div className="absolute top-4 left-4 bg-indigo-900/80 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                        HEATMAPA POZORNOSTI
                    </div>
                )}
            </div>

            {/* Only show analysis results if DONE and has data */}
            {status === 'DONE' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Text Analysis */}
                    <div className="space-y-6">
                        <section>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="flex items-center gap-2 font-bold text-slate-800">
                                    <span className="text-indigo-600">A</span> Extrahovaný text
                                </h4>
                                <button
                                    onClick={copyToClipboard}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 bg-indigo-50 rounded-lg transition"
                                >
                                    KOPÍROVAT
                                </button>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 font-mono text-sm leading-relaxed whitespace-pre-wrap text-slate-700 shadow-inner min-h-[100px]">
                                {extractedText || '(žádný text nebyl rozpoznán)'}
                            </div>
                        </section>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <span className="block text-xs font-bold text-slate-500 uppercase mb-1">OCR Přesnost</span>
                                <div className="flex items-center gap-2">
                                    <span className={`w-3 h-3 rounded-full ${confidenceColor(textConfidence)}`}></span>
                                    <span className="text-xl font-black text-slate-800">
                                        {textConfidence !== null ? `${Math.round(textConfidence)}%` : 'N/A'}
                                    </span>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Text Score</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-black text-slate-800">{textScore}</span>
                                    <span className="text-slate-400 font-bold">/ 100</span>
                                </div>
                            </div>
                        </div>

                        {/* Issues List */}
                        <section>
                            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <span className="text-indigo-600">B</span> Textové nedostatky
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${textIssues?.length ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                    {textIssues?.length || 0}
                                </span>
                            </h4>
                            {textIssues && textIssues.length > 0 ? (
                                <div className="space-y-3">
                                    {textIssues.map((issue, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex items-start gap-3 p-3 rounded-xl border transition-all hover:translate-x-1 ${severityColor(issue.severity)}`}
                                        >
                                            <span className="text-xl">{issueIcon(issue.type)}</span>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-black uppercase tracking-wider opacity-70">{issue.severity}</span>
                                                    <span className="font-bold text-sm tracking-tight">{issue.text}</span>
                                                </div>
                                                {issue.suggestion && (
                                                    <div className="text-xs font-medium opacity-80 bg-white/40 p-1.5 rounded-lg mt-1 inline-block">
                                                        💡 {issue.suggestion}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-green-50 text-green-700 p-8 rounded-xl border border-green-100 text-center flex flex-col items-center justify-center">
                                    <span className="text-3xl mb-2">✨</span>
                                    <p className="font-bold">Text je v naprostém pořádku!</p>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Right Column: Visual Analysis (Phase 3) */}
                    <div className="space-y-6">
                        <section>
                            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="text-indigo-600">C</span> Vizuální skórování
                            </h4>
                            {scores ? (
                                <div className="grid grid-cols-2 gap-4">
                                    {Object.entries(scores).map(([name, score]) => {
                                        // Czech label mapping with explanations
                                        const dimensionInfo: Record<string, { label: string; tooltip: string }> = {
                                            'Attractiveness': {
                                                label: 'Atraktivita',
                                                tooltip: 'Vizuální přitažlivost a estetická kvalita reklamy'
                                            },
                                            'Clarity': {
                                                label: 'Přehlednost',
                                                tooltip: 'Jak jasně a srozumitelně je sdělení komunikováno'
                                            },
                                            'Trust': {
                                                label: 'Důvěryhodnost',
                                                tooltip: 'Míra důvěryhodnosti a profesionality vizuálu'
                                            },
                                            'CTA_Effectiveness': {
                                                label: 'Efektivita CTA',
                                                tooltip: 'Síla a viditelnost výzvy k akci (Call-to-Action)'
                                            },
                                            'CTA Effectiveness': {
                                                label: 'Efektivita CTA',
                                                tooltip: 'Síla a viditelnost výzvy k akci (Call-to-Action)'
                                            }
                                        };
                                        const info = dimensionInfo[name] || {
                                            label: name.replace('_', ' '),
                                            tooltip: ''
                                        };

                                        return (
                                            <div key={name} className="bg-slate-50 p-4 rounded-xl border border-slate-100 group relative">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span
                                                        className="text-[10px] font-black text-slate-500 uppercase tracking-wider cursor-help"
                                                        title={info.tooltip}
                                                    >
                                                        {info.label} ℹ️
                                                    </span>
                                                    <span className="font-black text-slate-800">{score}/10</span>
                                                </div>
                                                {/* Tooltip on hover */}
                                                {info.tooltip && (
                                                    <div className="absolute left-0 top-full mt-2 w-64 bg-slate-800 text-white text-xs p-3 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                                        {info.tooltip}
                                                    </div>
                                                )}
                                                <div className="w-full bg-slate-200 rounded-full h-1.5">
                                                    <div
                                                        className={`h-1.5 rounded-full transition-all duration-1000 ${scoreBarColor(score)}`}
                                                        style={{ width: `${score * 10}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-center animate-pulse">
                                    Čekám na data z LLM...
                                </div>
                            )}
                        </section>

                        <section className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100 relative">
                            <div className="absolute -top-3 left-4 bg-indigo-600 text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">
                                Senior Review
                            </div>
                            <p className="text-sm text-indigo-900 leading-relaxed italic font-medium pt-2">
                                "{explanation || 'Načítám odborné hodnocení...'}"
                            </p>
                        </section>

                        <section>
                            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <span className="text-indigo-600">D</span> Doporučení k vylepšení
                            </h4>
                            {suggestions && suggestions.length > 0 ? (
                                <div className="space-y-3">
                                    {suggestions.map((s, idx) => (
                                        <div key={idx} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-colors">
                                            <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0">
                                                {idx + 1}
                                            </div>
                                            <p className="text-sm font-medium text-slate-700">{s}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-slate-400 text-sm italic p-4 border border-dashed rounded-xl text-center">
                                    Žádná konkrétní doporučení nebyla vygenerována.
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            )}

            {/* Status Overlays */}
            {status === 'PROCESSING' && (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                        <span className="text-2xl">⚡</span>
                    </div>
                    <p className="text-slate-600 font-bold">Probíhá komplexní analýza vizuálu a textu...</p>
                </div>
            )}

            {status === 'FAILED' && (
                <div className="text-center py-12 bg-red-50 rounded-xl border border-red-100">
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl font-black">!</span>
                    </div>
                    <p className="text-red-700 font-bold">Analýza selhala. Zkuste prosím nahrát soubor znovu.</p>
                </div>
            )}
        </div>
    );
}
