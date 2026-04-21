import React, { useState, useMemo } from 'react';
import { historicalDatabase } from '../data/historicalDatabase';
import { HistoricalRecord } from '../types';
import { Search, Database, Fingerprint, TrendingUp, TrendingDown, Minus, BookOpen, AlertTriangle } from 'lucide-react';

export const ArchiveTerminal: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [selectedRecord, setSelectedRecord] = useState<HistoricalRecord | null>(null);

    const categories = ['ALL', ...Array.from(new Set(historicalDatabase.map(item => item.category)))];

    const filteredRecords = useMemo(() => {
        return historicalDatabase.filter(record => {
            const matchesSearch = record.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  record.historicalSignificance.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'ALL' || record.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, selectedCategory]);

    const TrendIcon = ({ trend }: { trend: string }) => {
        if (trend === 'Bullish') return <TrendingUp size={14} className="text-emerald-500" />;
        if (trend === 'Bearish') return <TrendingDown size={14} className="text-red-500" />;
        return <Minus size={14} className="text-blue-500" />;
    };

    if (selectedRecord) {
        return (
            <div className="h-full flex flex-col bg-black font-sans relative overflow-auto p-8 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="max-w-3xl mx-auto w-full pt-4 pb-24">
                    <button 
                        onClick={() => setSelectedRecord(null)}
                        className="mb-8 flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest hover:text-white transition-colors"
                    >
                        &lt; Return_To_Index
                    </button>

                    <div className="flex items-center gap-2 mb-2 opacity-60">
                        <Database size={12} className="text-blue-500" />
                        <span className="text-[10px] font-mono text-blue-500 uppercase tracking-[0.3em]">{selectedRecord.category} // {selectedRecord.era}</span>
                    </div>
                    
                    <h1 className="text-3xl lg:text-4xl font-display text-white tracking-widest uppercase mb-8">{selectedRecord.name}</h1>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-zinc-900/40 border border-white/5 p-4 rounded-2xl">
                            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Origin</p>
                            <p className="text-sm font-mono text-zinc-300">{selectedRecord.origin}</p>
                        </div>
                        <div className="bg-zinc-900/40 border border-white/5 p-4 rounded-2xl">
                            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Value Index</p>
                            <p className="text-sm font-mono text-emerald-400">{selectedRecord.estimatedValueRange}</p>
                        </div>
                        <div className="bg-zinc-900/40 border border-white/5 p-4 rounded-2xl">
                            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Market Trend</p>
                            <div className="flex items-center gap-2">
                                <TrendIcon trend={selectedRecord.marketTrend} />
                                <span className="text-sm font-mono text-zinc-300">{selectedRecord.marketTrend}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-[32px] mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <BookOpen size={16} className="text-blue-500" />
                            <h2 className="text-[11px] font-bold text-blue-500 uppercase tracking-[0.2em]">Historical_Significance</h2>
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed">
                            {selectedRecord.historicalSignificance}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-6">
                            <div className="bg-zinc-950/50 border border-white/5 p-6 rounded-[24px]">
                                <div className="flex items-center gap-3 mb-4">
                                    <Fingerprint size={16} className="text-emerald-500" />
                                    <h2 className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Key_Characteristics</h2>
                                </div>
                                <ul className="space-y-3">
                                    {selectedRecord.keyCharacteristics.map((item, idx) => (
                                        <li key={idx} className="flex gap-3 text-xs text-zinc-400 leading-relaxed">
                                            <span className="text-emerald-500/50">›</span> {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="bg-zinc-950/50 border border-white/5 p-6 rounded-[24px]">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    <h2 className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Rarity_Indicators</h2>
                                </div>
                                <ul className="space-y-3">
                                    {selectedRecord.rarityIndicators.map((item, idx) => (
                                        <li key={idx} className="flex gap-3 text-xs text-zinc-400 leading-relaxed">
                                            <span className="text-zinc-600">›</span> {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div>
                            <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-[24px] h-full">
                                <div className="flex items-center gap-3 mb-4">
                                    <AlertTriangle size={16} className="text-red-500" />
                                    <h2 className="text-[10px] font-bold text-red-500 uppercase tracking-[0.2em]">Forgery_Markers</h2>
                                </div>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Warning: Counterfeit Tactics Identified</p>
                                <ul className="space-y-4">
                                    {selectedRecord.forgeryMarkers.map((item, idx) => (
                                        <li key={idx} className="flex gap-3 text-xs text-red-200/70 leading-relaxed p-3 bg-red-500/10 rounded-xl border border-red-500/10">
                                            <span className="text-red-500 font-bold mt-0.5">!</span> {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-black font-sans relative overflow-auto p-4 md:p-8">
            <div className="max-w-4xl mx-auto w-full pt-8 pb-24">
                <div className="flex items-center gap-2 mb-2 opacity-40">
                    <Database size={10} className="text-blue-500" />
                    <span className="text-[9px] font-mono text-white uppercase tracking-[0.3em]">Global_Archive</span>
                </div>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <h1 className="text-3xl font-display text-white tracking-widest uppercase">Historical_Index</h1>
                    
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                        <input 
                            type="text" 
                            placeholder="QUERY_DATABASE..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-3 pl-9 pr-4 text-[10px] font-mono text-white uppercase tracking-widest placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                        />
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-full border text-[9px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                                selectedCategory === cat 
                                    ? 'bg-blue-500 text-white border-blue-500' 
                                    : 'bg-zinc-900/40 text-zinc-500 border-white/5 hover:border-white/20'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredRecords.map(record => (
                        <div 
                            key={record.id}
                            onClick={() => setSelectedRecord(record)}
                            className="bg-zinc-900/30 border border-white/5 hover:border-blue-500/30 p-5 rounded-3xl cursor-pointer group transition-all"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-[8px] font-mono text-blue-500 uppercase tracking-widest border border-blue-500/20 px-2 py-0.5 rounded-full bg-blue-500/5">
                                    {record.category}
                                </span>
                                <span className="text-[10px] font-mono text-zinc-600">{record.era}</span>
                            </div>
                            <h3 className="text-sm font-display text-white tracking-wide mb-2 group-hover:text-blue-400 transition-colors line-clamp-1">{record.name}</h3>
                            <p className="text-xs text-zinc-500 line-clamp-2 mb-4 h-8">{record.historicalSignificance}</p>
                            
                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                <div className="flex items-center gap-2">
                                    <TrendIcon trend={record.marketTrend} />
                                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{record.marketTrend}</span>
                                </div>
                                <span className="text-[10px] font-mono text-zinc-500">{record.id}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredRecords.length === 0 && (
                    <div className="text-center py-20">
                        <Database size={32} className="mx-auto text-zinc-800 mb-4" />
                        <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">No_Records_Found</p>
                    </div>
                )}
            </div>
        </div>
    );
};
