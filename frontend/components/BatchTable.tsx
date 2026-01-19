'use client';

import React from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    SortingState,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table';
import { Creative } from '@/lib/api';

interface BatchTableProps {
    creatives: Creative[];
    onViewDetail: (creativeId: string) => void;
}

type CreativeRow = Creative & {
    overallScore: number;
    textIssuesCount: number;
};

const columnHelper = createColumnHelper<CreativeRow>();

export default function BatchTable({ creatives, onViewDetail }: BatchTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([]);

    // Transform data to include calculated fields
    const data = React.useMemo(() => {
        return creatives.map(creative => ({
            ...creative,
            overallScore: creative.analysisResult?.overallScore || 0,
            textIssuesCount: creative.analysisResult?.textIssues?.length || 0,
        }));
    }, [creatives]);

    const columns = React.useMemo(() => [
        columnHelper.accessor('filename', {
            header: 'Soubor',
            cell: info => (
                <div className="flex flex-col gap-2 py-2">
                    <img
                        src={`http://localhost:4010${info.row.original.originalUrl}`}
                        alt={info.getValue()}
                        className="w-20 h-20 object-cover rounded border border-slate-200"
                        onError={(e) => e.currentTarget.style.display = 'none'}
                    />
                    <span className="font-medium text-slate-800 text-xs max-w-[200px] break-words">{info.getValue()}</span>
                </div>
            ),
        }),
        columnHelper.accessor('overallScore', {
            header: 'Celkové skóre',
            cell: info => {
                const score = info.getValue();
                const color = score >= 8 ? 'text-green-600' :
                    score >= 6 ? 'text-yellow-600' :
                        score >= 4 ? 'text-orange-600' : 'text-red-600';
                return (
                    <span className={`text-xl font-black ${color}`}>
                        {score.toFixed(1)}
                    </span>
                );
            },
        }),
        columnHelper.accessor(row => row.analysisResult?.scores?.Attractiveness || 0, {
            id: 'attractiveness',
            header: 'Atraktivita',
            cell: info => <span className="font-semibold">{info.getValue()}/10</span>,
        }),
        columnHelper.accessor(row => row.analysisResult?.scores?.Clarity || 0, {
            id: 'clarity',
            header: 'Přehlednost',
            cell: info => <span className="font-semibold">{info.getValue()}/10</span>,
        }),
        columnHelper.accessor(row => row.analysisResult?.scores?.Trust || 0, {
            id: 'trust',
            header: 'Důvěryhodnost',
            cell: info => <span className="font-semibold">{info.getValue()}/10</span>,
        }),
        columnHelper.accessor(row => row.analysisResult?.scores?.CTA_Effectiveness || 0, {
            id: 'cta',
            header: 'CTA',
            cell: info => <span className="font-semibold">{info.getValue()}/10</span>,
        }),
        columnHelper.accessor('textIssuesCount', {
            header: 'Text Issues',
            cell: info => {
                const count = info.getValue();
                const color = count === 0 ? 'bg-green-100 text-green-700' :
                    count <= 2 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700';
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${color}`}>
                        {count}
                    </span>
                );
            },
        }),
        columnHelper.accessor('status', {
            header: 'Status',
            cell: info => {
                const status = info.getValue();
                const color = status === 'DONE' ? 'bg-green-100 text-green-700' :
                    status === 'PROCESSING' ? 'bg-blue-100 text-blue-700' :
                        status === 'FAILED' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-600';
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${color}`}>
                        {status === 'DONE' ? 'Hotovo' : status}
                    </span>
                );
            },
        }),
        columnHelper.display({
            id: 'actions',
            header: 'Akce',
            cell: info => (
                <button
                    onClick={() => onViewDetail(info.row.original.id)}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
                >
                    Detail
                </button>
            ),
        }),
    ], [onViewDetail]);

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <th
                                        key={header.id}
                                        className="px-4 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition"
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        <div className="flex items-center gap-2">
                                            {flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                            {{
                                                asc: ' 🔼',
                                                desc: ' 🔽',
                                            }[header.column.getIsSorted() as string] ?? null}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {table.getRowModel().rows.map(row => (
                            <tr
                                key={row.id}
                                className="hover:bg-slate-50 transition"
                            >
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} className="px-4 py-3 text-sm text-slate-700">
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext()
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {data.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                    Žádné výsledky k zobrazení
                </div>
            )}
        </div>
    );
}
