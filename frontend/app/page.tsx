'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import BatchUpload from "@/components/BatchUpload";
import TextAnalysisPanel from "@/components/TextAnalysisPanel";
import BatchTable from "@/components/BatchTable";
import BatchFilters, { FilterState, defaultFilters } from "@/components/BatchFilters";
import { LogOut } from 'lucide-react';
import { fetchBatchResults, type BatchResults, type Creative } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [uploadedBatchId, setUploadedBatchId] = useState<string | null>(null);
  const [batchResults, setBatchResults] = useState<BatchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table'); // Table as default for MVP
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token) {
      router.push('/login');
    } else if (userData) {
      setUser(JSON.parse(userData));
    }
  }, [router]);

  // Check for batchId in URL query params (from history page)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const batchIdFromUrl = urlParams.get('batchId');
    if (batchIdFromUrl && batchIdFromUrl !== uploadedBatchId) {
      setUploadedBatchId(batchIdFromUrl);
    }
  }, []);

  // Fetch batch results when a batch is uploaded
  useEffect(() => {
    if (!uploadedBatchId) return;

    const fetchResults = async () => {
      try {
        setLoading(true);
        const results = await fetchBatchResults(uploadedBatchId);
        setBatchResults(results);

        // Check if all creatives are done processing
        const allDone = results.creatives.every(c =>
          c.status === 'DONE' || c.status === 'FAILED' || c.status === 'PARTIAL_FAILED'
        );

        // If not all done, poll again in 5 seconds
        if (!allDone) {
          setTimeout(fetchResults, 5000);
        }
      } catch (error) {
        console.error('Failed to fetch batch results:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [uploadedBatchId]);

  const handleBatchCreated = (batchId: string) => {
    setUploadedBatchId(batchId);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  // Filter creatives based on active filters
  const filteredCreatives = useMemo(() => {
    if (!batchResults) return [];

    console.log('Filtering with:', filters);

    const filtered = batchResults.creatives.filter(creative => {
      const result = creative.analysisResult;
      if (!result) {
        console.log('No result for:', creative.filename);
        return false;
      }

      // Calculate overall score if missing (for legacy data)
      const scores = result.scores || {};
      let overallScore = result.overallScore;
      if (!overallScore || overallScore === 0) {
        const attractiveness = scores.Attractiveness || 0;
        const clarity = scores.Clarity || 0;
        const trust = scores.Trust || 0;
        const ctaEffectiveness = scores.CTA_Effectiveness || 0;
        overallScore = Math.round((
          trust * 0.2 +
          clarity * 0.35 +
          attractiveness * 0.35 +
          ctaEffectiveness * 0.1
        ) * 10) / 10;
      }

      console.log(`${creative.filename} - Overall: ${overallScore}, Min: ${filters.overallScoreMin}, Max: ${filters.overallScoreMax}`);
      if (overallScore < filters.overallScoreMin || overallScore > filters.overallScoreMax) {
        console.log('Filtered out by overall score');
        return false;
      }

      // Text issues severity filter
      if (filters.textIssuesSeverity !== 'all') {
        const issues = result.textIssues || [];
        if (filters.textIssuesSeverity === 'none' && issues.length > 0) return false;
        if (filters.textIssuesSeverity === 'high' && !issues.some(i => i.severity === 'high')) return false;
        if (filters.textIssuesSeverity === 'medium' && !issues.some(i => i.severity === 'medium' || i.severity === 'high')) return false;
        if (filters.textIssuesSeverity === 'low' && issues.length === 0) return false;
      }

      // Individual dimension filters
      console.log(`${creative.filename} - Scores:`, scores);
      console.log(`Attractiveness: ${scores.Attractiveness}, Min: ${filters.attractivenessMin}`);

      if ((scores.Attractiveness || 0) < filters.attractivenessMin) {
        console.log('Filtered out by attractiveness');
        return false;
      }
      if ((scores.Clarity || 0) < filters.clarityMin) return false;
      if ((scores.Trust || 0) < filters.trustMin) return false;
      if ((scores.CTA_Effectiveness || 0) < filters.ctaMin) return false;

      // Status filter
      if (filters.status !== 'all' && creative.status !== filters.status) return false;

      console.log('Passed all filters!');
      return true;
    });

    console.log(`Filtered: ${filtered.length} of ${batchResults.creatives.length}`);
    return filtered;
  }, [batchResults, filters]);

  if (!user) return null;

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl">
              Visual<span className="text-indigo-600">Analyzer</span>
            </h1>
            <p className="mt-2 text-slate-600">
              Vítejte zpět, <span className="font-semibold">{user.name}</span>
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push('/history')}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg shadow-sm hover:bg-purple-700 transition-all font-medium"
            >
              📚 Historie
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-600 rounded-lg shadow-sm border border-slate-200 hover:text-red-600 hover:border-red-100 transition-all font-medium"
            >
              <LogOut className="w-4 h-4" />
              Odhlásit se
            </button>
          </div>
        </header>

        {/* Upload Section */}
        <section className="bg-indigo-50/30 p-8 rounded-2xl border border-indigo-100/50">
          <BatchUpload onBatchCreated={handleBatchCreated} />
        </section>

        {/* Results Section */}
        {batchResults && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Výsledky analýzy</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Batch: {batchResults.name || batchResults.batchId}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${viewMode === 'grid'
                      ? 'bg-white text-indigo-600 shadow'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    📋 Grid
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${viewMode === 'table'
                      ? 'bg-white text-indigo-600 shadow'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    📊 Tabulka
                  </button>
                </div>
                {/* CSV Export Button */}
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('token');
                      const response = await fetch(`http://localhost:4010/api/v1/batches/${batchResults.batchId}/export/csv`, {
                        headers: {
                          'Authorization': `Bearer ${token}`,
                        },
                      });
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `batch-${batchResults.batchId}-${Date.now()}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      window.URL.revokeObjectURL(url);
                    } catch (error) {
                      console.error('CSV export failed:', error);
                      alert('Export selhal. Zkuste to prosím znovu.');
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition flex items-center gap-2"
                >
                  📥 Export CSV
                </button>
                {loading && (
                  <span className="text-sm text-indigo-600 animate-pulse">
                    ⏳ Aktualizuji...
                  </span>
                )}
              </div>
            </div>

            {/* Progress Indicator */}
            {(() => {
              const total = batchResults.creatives.length;
              const completed = batchResults.creatives.filter(c =>
                c.status === 'DONE' || c.status === 'FAILED' || c.status === 'PARTIAL_FAILED'
              ).length;
              const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

              return (
                <div className="mb-6 bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Průběh analýzy: {completed} / {total} ({percentage}%)
                    </span>
                    {completed < total && (
                      <span className="text-xs text-gray-500 animate-pulse">
                        Analyzuji...
                      </span>
                    )}
                    {completed === total && (
                      <span className="text-xs text-green-600 font-semibold">
                        ✓ Hotovo
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${completed === total ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })()}

            {/* Filters */}
            <BatchFilters
              filters={filters}
              onFiltersChange={setFilters}
              onReset={() => setFilters(defaultFilters)}
            />

            {/* Results Count */}
            <div className="text-sm text-slate-600">
              Zobrazeno: <span className="font-bold">{filteredCreatives.length}</span> z {batchResults.creatives.length} kreativ
            </div>

            {/* Conditional View: Grid or Table */}
            {viewMode === 'grid' ? (
              <div className="grid gap-6">
                {filteredCreatives.map((creative) => (
                  <div key={creative.id} id={`creative-${creative.id}`} className="transition-all">
                    <TextAnalysisPanel
                      filename={creative.filename}
                      status={creative.status}
                      imageUrl={creative.originalUrl}
                      extractedText={creative.analysisResult?.extractedText || null}
                      textConfidence={creative.analysisResult?.textConfidence || null}
                      textIssues={creative.analysisResult?.textIssues || null}
                      // Phase 3 fields
                      scores={creative.analysisResult?.scores || null}
                      overallScore={creative.analysisResult?.overallScore || null}
                      explanation={creative.analysisResult?.explanation || null}
                      suggestions={creative.analysisResult?.suggestions || null}
                      heatmapUrl={creative.analysisResult?.heatmapUrl || null}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <BatchTable
                creatives={filteredCreatives}
                onViewDetail={(id) => {
                  // Switch to Grid view
                  setViewMode('grid');
                  // Scroll to the creative after a short delay to allow view switch
                  setTimeout(() => {
                    const element = document.getElementById(`creative-${id}`);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      // Highlight briefly
                      element.classList.add('ring-4', 'ring-indigo-500');
                      setTimeout(() => {
                        element.classList.remove('ring-4', 'ring-indigo-500');
                      }, 2000);
                    }
                  }, 100);
                }}
              />
            )}
          </section>
        )}
      </div>
    </main>
  );
}
