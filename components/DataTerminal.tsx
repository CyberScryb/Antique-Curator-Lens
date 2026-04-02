
import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Zap, Loader2, PieChart, Info, AlertTriangle, ExternalLink, Globe } from 'lucide-react';
import { CollectionItem, MarketAnalysis } from '../types';
import { getMarketAnalysis } from '../services/geminiService';

interface MarketTrendsProps {
  items: CollectionItem[];
}

const generateTrendData = (trend: 'UP' | 'DOWN' | 'STABLE') => {
  const data = [];
  let value = 4000;
  for (let i = 0; i < 6; i++) {
    const month = ['01', '02', '03', '04', '05', '06'][i];
    let change = 0;
    if (trend === 'UP') change = Math.random() * 500 + 100;
    if (trend === 'DOWN') change = -(Math.random() * 500 + 100);
    if (trend === 'STABLE') change = Math.random() * 200 - 100;
    value += change;
    data.push({ name: month, value: Math.round(value) });
  }
  return data;
};

export const MarketTrends: React.FC<MarketTrendsProps> = ({ items }) => {
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>(generateTrendData('STABLE'));

  const latestItem = items.length > 0 ? items[0] : null;

  const fetchIntel = async () => {
    if (!latestItem) return;
    setLoading(true);
    setError(null);
    try {
      const query = `${latestItem.classification} ${latestItem.era} ${latestItem.itemName} ${latestItem.category}`;
      const result = await getMarketAnalysis(query);
      setAnalysis(result);
      setChartData(generateTrendData(result.trend));
    } catch (error) {
      setError("Market Uplink Failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntel();
  }, [latestItem?.id]); 

  const categories = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = Object.entries(categories).sort((a, b) => (b[1] as number) - (a[1] as number));

  if (!latestItem) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black p-8 text-center border-t border-zinc-800">
        <div className="w-24 h-24 bg-zinc-900 rounded-full mb-6 flex items-center justify-center border border-zinc-800 animate-pulse">
          <Globe size={32} className="text-zinc-600" />
        </div>
        <h2 className="text-xl font-display text-white mb-2">GLOBAL INTEL OFFLINE</h2>
        <p className="text-zinc-500 font-mono text-xs max-w-xs">Scan asset to initiate market tracking uplink.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black overflow-auto font-mono">
      <div className="bg-black p-6 border-b border-zinc-800 pt-[calc(20px+env(safe-area-inset-top))]">
        <h1 className="text-2xl font-display font-bold text-white mb-1">INTEL_FEED</h1>
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
          TARGET: <span className="text-blue-500">{latestItem.itemName}</span>
        </p>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {/* Main Chart Section */}
        <div className="bg-zinc-900/50 p-6 border border-zinc-800 relative overflow-hidden min-h-[300px]">
          {/* Grid lines background */}
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(0deg,transparent_24%,rgba(255,255,255,.3)_25%,rgba(255,255,255,.3)_26%,transparent_27%,transparent_74%,rgba(255,255,255,.3)_75%,rgba(255,255,255,.3)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(255,255,255,.3)_25%,rgba(255,255,255,.3)_26%,transparent_27%,transparent_74%,rgba(255,255,255,.3)_75%,rgba(255,255,255,.3)_76%,transparent_77%,transparent)] bg-[size:50px_50px]"></div>

          {loading ? (
            <div className="absolute inset-0 z-10 bg-black/80 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={24} className="animate-spin text-blue-500" />
                <span className="text-xs text-blue-400 font-bold uppercase tracking-widest">ESTABLISHING CONNECTION...</span>
              </div>
            </div>
          ) : error ? (
            <div className="absolute inset-0 z-10 bg-black/80 flex items-center justify-center text-center p-6">
               <AlertTriangle size={24} className="text-red-500 mb-2" />
               <p className="text-red-500 text-xs uppercase">{error}</p>
               <button onClick={fetchIntel} className="mt-4 px-4 py-2 border border-white/20 text-xs text-white hover:bg-white hover:text-black">RETRY</button>
            </div>
          ) : null}

          <div className="flex justify-between items-center mb-8 relative z-10">
            <h3 className="font-bold text-zinc-400 text-[10px] uppercase tracking-widest">6-Month Velocity</h3>
            {analysis && (
              <span className={`text-[10px] font-bold flex items-center gap-2 px-2 py-1 border ${analysis.trend === 'UP' ? 'bg-emerald-900/20 border-emerald-500 text-emerald-400' : 'bg-red-900/20 border-red-500 text-red-400'}`}>
                {analysis.trend === 'UP' ? <TrendingUp size={12} /> : <ArrowDownRight size={12} />} 
                {analysis.changePercent}
              </span>
            )}
          </div>
          
          <div className="h-48 -ml-6 relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={analysis?.trend === 'DOWN' ? '#ef4444' : '#3b82f6'} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={analysis?.trend === 'DOWN' ? '#ef4444' : '#3b82f6'} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 10, fontFamily: 'monospace'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 10, fontFamily: 'monospace'}} />
                <Area 
                  type="step" 
                  dataKey="value" 
                  stroke={analysis?.trend === 'DOWN' ? '#ef4444' : '#3b82f6'} 
                  strokeWidth={2} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Intelligence Report */}
        {analysis && !loading && !error && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-zinc-900/30 p-6 border-l-2 border-blue-500 relative mb-6">
              <div className="flex items-center gap-2 mb-3">
                 <Zap size={14} className="text-blue-500" />
                 <h3 className="font-bold text-blue-100 text-[10px] uppercase tracking-widest">Executive Summary</h3>
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed mb-4 font-serif italic">
                "{analysis.summary}"
              </p>
              
              <div className="grid grid-cols-2 gap-4 mt-4 border-t border-zinc-800 pt-4">
                 <div>
                    <span className="text-[9px] text-zinc-500 uppercase block mb-1">Key Insight</span>
                    <p className="text-xs text-white leading-tight">{analysis.keyInsight}</p>
                 </div>
                 <div className="text-right">
                    <span className="text-[9px] text-zinc-500 uppercase block mb-1">Market Heat</span>
                    <span className={`text-xs font-bold ${analysis.demandLevel === 'High' ? 'text-emerald-400' : 'text-zinc-300'}`}>{analysis.demandLevel.toUpperCase()} DEMAND</span>
                 </div>
              </div>
            </div>

            {/* Sources */}
            {analysis.sources && analysis.sources.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-bold text-zinc-600 text-[10px] uppercase tracking-widest pl-2">Verified Channels</h3>
                {analysis.sources.map((source, idx) => (
                  <a 
                    key={idx} 
                    href={source.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors group"
                  >
                    <span className="text-[10px] text-zinc-300 truncate max-w-[80%] uppercase">{source.title}</span>
                    <ExternalLink size={10} className="text-zinc-600 group-hover:text-white" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Inventory Stats */}
        <div className="grid grid-cols-2 gap-2">
           {sortedCategories.map(([cat, count], i) => (
             <div key={i} className="bg-zinc-900 p-3 border border-zinc-800 flex justify-between items-center">
               <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">{cat}</span>
               <span className="text-sm font-mono text-white">x{count}</span>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};
