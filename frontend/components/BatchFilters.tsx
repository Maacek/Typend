'use client';

import React from 'react';

export interface FilterState {
    overallScoreMin: number;
    overallScoreMax: number;
    textIssuesSeverity: 'all' | 'none' | 'low' | 'medium' | 'high';
    attractivenessMin: number;
    clarityMin: number;
    trustMin: number;
    ctaMin: number;
    status: 'all' | 'DONE' | 'PROCESSING' | 'FAILED';
}

interface BatchFiltersProps {
    filters: FilterState;
    onFiltersChange: (filters: FilterState) => void;
    onReset: () => void;
}

export const defaultFilters: FilterState = {
    overallScoreMin: 0,
    overallScoreMax: 10,
    textIssuesSeverity: 'all',
    attractivenessMin: 0,
    clarityMin: 0,
    trustMin: 0,
    ctaMin: 0,
    status: 'all',
};

export default function BatchFilters({ filters, onFiltersChange, onReset }: BatchFiltersProps) {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [tempFilters, setTempFilters] = React.useState<FilterState>(filters);

    // Update temp filters when parent filters change
    React.useEffect(() => {
        setTempFilters(filters);
    }, [filters]);

    const updateTempFilter = (key: keyof FilterState, value: any) => {
        setTempFilters({ ...tempFilters, [key]: value });
    };

    const applyFilters = () => {
        onFiltersChange(tempFilters);
    };

    const cancelFilters = () => {
        setTempFilters(filters);
    };

    const applyPreset = (preset: 'risky' | 'textProblems' | 'lowCTA') => {
        let newFilters: FilterState;
        switch (preset) {
            case 'risky':
                newFilters = {
                    ...defaultFilters,
                    overallScoreMax: 6,
                };
                break;
            case 'textProblems':
                newFilters = {
                    ...defaultFilters,
                    textIssuesSeverity: 'medium',
                };
                break;
            case 'lowCTA':
                newFilters = {
                    ...defaultFilters,
                    ctaMin: 0,
                    overallScoreMax: 5,
                };
                break;
        }
        setTempFilters(newFilters);
        onFiltersChange(newFilters);
    };

    const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
        const defaults = defaultFilters[key as keyof FilterState];
        return value !== defaults;
    }).length;

    // Check if temp filters differ from applied filters
    const hasChanges = React.useMemo(() => {
        return Object.keys(tempFilters).some(key => {
            const k = key as keyof FilterState;
            return tempFilters[k] !== filters[k];
        });
    }, [tempFilters, filters]);

    return (
        <div className="bg-white rounded-xl shadow-md border border-slate-100 p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-slate-800">🔍 Filtry</h3>
                    {activeFiltersCount > 0 && (
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
                            {activeFiltersCount} aktivních
                        </span>
                    )}
                    {hasChanges && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold animate-pulse">
                            Neuložené změny
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onReset}
                        className="px-3 py-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
                    >
                        Resetovat
                    </button>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition"
                    >
                        {isExpanded ? '▲ Skrýt' : '▼ Rozbalit'}
                    </button>
                </div>
            </div>

            {/* Filter Presets */}
            <div className="flex flex-wrap gap-2 mb-4">
                <button
                    onClick={() => applyPreset('risky')}
                    className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-100 transition border border-red-200"
                >
                    🚨 Rizikové kreativy
                </button>
                <button
                    onClick={() => applyPreset('textProblems')}
                    className="px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-semibold hover:bg-yellow-100 transition border border-yellow-200"
                >
                    ✏️ Textové problémy
                </button>
                <button
                    onClick={() => applyPreset('lowCTA')}
                    className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-xs font-semibold hover:bg-orange-100 transition border border-orange-200"
                >
                    📢 Slabé CTA
                </button>
            </div>

            {/* Expanded Filters */}
            {isExpanded && (
                <div className="space-y-4 pt-4 border-t border-slate-200">
                    {/* Overall Score Range */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Celkové skóre: {tempFilters.overallScoreMin} - {tempFilters.overallScoreMax}
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min="0"
                                max="10"
                                step="0.5"
                                value={tempFilters.overallScoreMin}
                                onChange={(e) => updateTempFilter('overallScoreMin', parseFloat(e.target.value))}
                                className="flex-1"
                            />
                            <input
                                type="range"
                                min="0"
                                max="10"
                                step="0.5"
                                value={tempFilters.overallScoreMax}
                                onChange={(e) => updateTempFilter('overallScoreMax', parseFloat(e.target.value))}
                                className="flex-1"
                            />
                        </div>
                    </div>

                    {/* Text Issues Severity */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Textové problémy
                        </label>
                        <select
                            value={tempFilters.textIssuesSeverity}
                            onChange={(e) => updateTempFilter('textIssuesSeverity', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="all">Všechny</option>
                            <option value="none">Bez problémů</option>
                            <option value="low">Nízká závažnost+</option>
                            <option value="medium">Střední závažnost+</option>
                            <option value="high">Vysoká závažnost</option>
                        </select>
                    </div>

                    {/* Individual Dimensions */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Atraktivita min: {tempFilters.attractivenessMin}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="10"
                                value={tempFilters.attractivenessMin}
                                onChange={(e) => updateTempFilter('attractivenessMin', parseInt(e.target.value))}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Přehlednost min: {tempFilters.clarityMin}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="10"
                                value={tempFilters.clarityMin}
                                onChange={(e) => updateTempFilter('clarityMin', parseInt(e.target.value))}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Důvěryhodnost min: {tempFilters.trustMin}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="10"
                                value={tempFilters.trustMin}
                                onChange={(e) => updateTempFilter('trustMin', parseInt(e.target.value))}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                CTA min: {tempFilters.ctaMin}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="10"
                                value={tempFilters.ctaMin}
                                onChange={(e) => updateTempFilter('ctaMin', parseInt(e.target.value))}
                                className="w-full"
                            />
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Status
                        </label>
                        <select
                            value={tempFilters.status}
                            onChange={(e) => updateTempFilter('status', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="all">Všechny</option>
                            <option value="DONE">Hotovo</option>
                            <option value="PROCESSING">Zpracovává se</option>
                            <option value="FAILED">Selhalo</option>
                        </select>
                    </div>

                    {/* Apply/Cancel Buttons */}
                    <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                        <button
                            onClick={applyFilters}
                            disabled={!hasChanges}
                            className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${hasChanges
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            ✓ Aplikovat filtry
                        </button>
                        <button
                            onClick={cancelFilters}
                            disabled={!hasChanges}
                            className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${hasChanges
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                                }`}
                        >
                            ✕ Zrušit
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
