
import React, { useState, useMemo } from 'react';
import { CollectionItem } from '../types';
import { Search, Trash2, ArrowRight, ShieldCheck, ShieldAlert, Shield, Grip, List, Database, Lock, SlidersHorizontal, ArrowDownWideNarrow, ArrowUpNarrowWide, Clock, DollarSign, ALargeSmall, Filter, Check, X, ScanLine, Plus } from 'lucide-react';
import { soundManager } from '../services/soundService';
import { toast } from './Toast';

interface CollectionManagerProps {
  items: CollectionItem[];
  onDelete: (id: string) => void;
  onSelect: (item: CollectionItem) => void;
  onAddItem: () => void;
}

type SortOption = 'RECENT' | 'VALUE_HIGH' | 'VALUE_LOW' | 'ALPHA';

interface FilterState {
    minCondition: number;
    eras: string[];
    origins: string[];
}

export const CollectionManager: React.FC<CollectionManagerProps> = ({ items, onDelete, onSelect, onAddItem }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<SortOption>('RECENT');
  const [showSortMenu, setShowSortMenu] = useState(false);
  
  // Filter State
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
      minCondition: 0,
      eras: [],
      origins: []
  });

  const totalValue = items.reduce((sum, item) => sum + item.valuation.mid, 0);

  // Derived Options for Filters
  const availableEras = useMemo(() => Array.from(new Set(items.map(i => i.era))).filter(Boolean).sort(), [items]);
  const availableOrigins = useMemo(() => Array.from(new Set(items.map(i => i.origin))).filter(Boolean).sort(), [items]);

  const activeFilterCount = (filters.minCondition > 0 ? 1 : 0) + filters.eras.length + filters.origins.length;

  // Sorting & Filtering Logic
  const filteredAndSortedItems = useMemo(() => {
      let res = items.filter(i => {
          // 1. Search Term
          const matchesSearch = i.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                i.classification.toLowerCase().includes(searchTerm.toLowerCase());
          
          // 2. Condition Filter
          const matchesCondition = i.conditionScore >= filters.minCondition;

          // 3. Era Filter
          const matchesEra = filters.eras.length === 0 || filters.eras.includes(i.era);

          // 4. Origin Filter
          const matchesOrigin = filters.origins.length === 0 || filters.origins.includes(i.origin);

          return matchesSearch && matchesCondition && matchesEra && matchesOrigin;
      });

      return res.sort((a, b) => {
          switch (sortBy) {
              case 'VALUE_HIGH': return b.valuation.mid - a.valuation.mid;
              case 'VALUE_LOW': return a.valuation.mid - b.valuation.mid;
              case 'ALPHA': return a.itemName.localeCompare(b.itemName);
              case 'RECENT': default: return new Date(b.dateScanned).getTime() - new Date(a.dateScanned).getTime();
          }
      });
  }, [items, searchTerm, sortBy, filters]);

  const handleSortChange = (option: SortOption) => {
      soundManager.playClick();
      setSortBy(option);
      setShowSortMenu(false);
  };

  const toggleFilter = (type: 'eras' | 'origins', value: string) => {
      soundManager.playClick();
      setFilters(prev => {
          const list = prev[type];
          return {
              ...prev,
              [type]: list.includes(value) ? list.filter(v => v !== value) : [...list, value]
          };
      });
  };

  const setConditionFilter = (score: number) => {
      soundManager.playClick();
      setFilters(prev => ({ ...prev, minCondition: prev.minCondition === score ? 0 : score }));
  };

  const clearFilters = () => {
      soundManager.playClick();
      setFilters({ minCondition: 0, eras: [], origins: [] });
      toast.info("Filters Cleared");
  };

  const getSortLabel = () => {
      switch(sortBy) {
          case 'VALUE_HIGH': return 'Highest Value';
          case 'VALUE_LOW': return 'Lowest Value';
          case 'ALPHA': return 'A - Z';
          default: return 'Recently Added';
      }
  };

  const getTrustBadge = (tier: string) => {
      if (tier.includes('Level 3')) return { icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
      if (tier.includes('Level 2')) return { icon: Shield, color: 'text-blue-500', bg: 'bg-blue-500/10' };
      return { icon: ShieldAlert, color: 'text-amber-500', bg: 'bg-amber-500/10' };
  };

  return (
    <div className="h-full flex flex-col bg-black font-sans relative">
      
      {/* 1. Secure Header */}
      <div className="bg-black/90 backdrop-blur-md p-6 pt-[calc(20px+env(safe-area-inset-top))] border-b border-zinc-800 sticky top-0 z-20 shadow-lg">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
                <Lock size={12} className="text-emerald-500" />
                <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest">SECURE_VAULT_V4</span>
            </div>
            <h1 className="text-3xl font-display text-white tracking-wide">DATABASE</h1>
          </div>
          
          <div className="text-right flex flex-col items-end gap-2">
               {/* Prominent Manual Add Button */}
               <button 
                  onClick={onAddItem}
                  className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-sm hover:bg-zinc-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)] group"
               >
                   <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                   <span className="text-xs font-bold uppercase tracking-widest">New Asset</span>
               </button>
               <div className="flex items-center gap-2 text-zinc-500 mt-1">
                 <span className="text-[10px] uppercase tracking-widest">Total Valuation</span>
                 <span className="font-display text-lg text-white tracking-tight leading-none">${totalValue.toLocaleString()}</span>
               </div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-white transition-colors" size={14} />
            <input 
              type="text" 
              placeholder="SEARCH ASSET ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 text-sm text-white focus:border-blue-500 focus:bg-zinc-900 outline-none placeholder:text-zinc-700 transition-all font-mono uppercase rounded-sm"
            />
          </div>

          {/* Filter Button */}
          <div className="relative">
              <button 
                  onClick={() => { setShowFilterMenu(!showFilterMenu); setShowSortMenu(false); soundManager.playClick(); }}
                  className={`h-full px-3 border flex items-center gap-2 transition-all rounded-sm relative ${showFilterMenu || activeFilterCount > 0 ? 'bg-blue-600 border-blue-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}
              >
                  <Filter size={16} />
                  {activeFilterCount > 0 && (
                      <span className="absolute -top-2 -right-2 w-4 h-4 bg-white text-blue-600 text-[9px] font-bold flex items-center justify-center rounded-full shadow-lg">
                          {activeFilterCount}
                      </span>
                  )}
              </button>

              {/* Filter Panel */}
              {showFilterMenu && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-zinc-900 border border-zinc-700 shadow-2xl z-50 rounded-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-800">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Advanced Filters</span>
                          <button onClick={clearFilters} className="text-[9px] text-zinc-500 hover:text-white uppercase tracking-wider flex items-center gap-1">
                              <X size={10} /> Clear
                          </button>
                      </div>

                      <div className="max-h-[60vh] overflow-y-auto p-4 space-y-5">
                          {/* Condition Filter */}
                          <div>
                              <div className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-2">Min. Condition</div>
                              <div className="grid grid-cols-4 gap-2">
                                  {[
                                      { label: 'All', score: 0 },
                                      { label: 'Fair+', score: 4 },
                                      { label: 'Good+', score: 7 },
                                      { label: 'Mint', score: 9 }
                                  ].map((opt) => (
                                      <button 
                                          key={opt.score}
                                          onClick={() => setConditionFilter(opt.score)}
                                          className={`py-1.5 text-[9px] uppercase font-bold border rounded-sm transition-colors ${filters.minCondition === opt.score ? 'bg-white text-black border-white' : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600'}`}
                                      >
                                          {opt.label}
                                      </button>
                                  ))}
                              </div>
                          </div>

                          {/* Era Filter */}
                          {availableEras.length > 0 && (
                              <div>
                                  <div className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mb-2">Historical Era</div>
                                  <div className="flex flex-wrap gap-2">
                                      {availableEras.map(era => (
                                          <button
                                              key={era}
                                              onClick={() => toggleFilter('eras', era)}
                                              className={`px-2 py-1 text-[9px] border rounded-sm transition-all flex items-center gap-1 ${filters.eras.includes(era) ? 'bg-amber-900/30 border-amber-500 text-amber-100' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}
                                          >
                                              {era} {filters.eras.includes(era) && <Check size={8} />}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          )}

                          {/* Origin Filter */}
                          {availableOrigins.length > 0 && (
                              <div>
                                  <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mb-2">Origin / Maker</div>
                                  <div className="flex flex-wrap gap-2">
                                      {availableOrigins.map(origin => (
                                          <button
                                              key={origin}
                                              onClick={() => toggleFilter('origins', origin)}
                                              className={`px-2 py-1 text-[9px] border rounded-sm transition-all flex items-center gap-1 ${filters.origins.includes(origin) ? 'bg-emerald-900/30 border-emerald-500 text-emerald-100' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}
                                          >
                                              {origin} {filters.origins.includes(origin) && <Check size={8} />}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              )}
          </div>

          {/* Sort Button */}
          <div className="relative">
              <button 
                  onClick={() => { setShowSortMenu(!showSortMenu); setShowFilterMenu(false); soundManager.playClick(); }}
                  className={`h-full px-3 border border-zinc-800 flex items-center gap-2 transition-colors rounded-sm ${showSortMenu ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
              >
                  <SlidersHorizontal size={16} />
              </button>
              
              {/* Sort Dropdown */}
              {showSortMenu && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 shadow-xl z-50 rounded-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-3 py-2 text-[9px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800">Sort Assets By</div>
                      <button onClick={() => handleSortChange('RECENT')} className={`w-full text-left px-4 py-3 text-xs flex items-center gap-2 hover:bg-zinc-800 ${sortBy === 'RECENT' ? 'text-blue-400' : 'text-zinc-300'}`}>
                          <Clock size={14} /> Recent
                      </button>
                      <button onClick={() => handleSortChange('VALUE_HIGH')} className={`w-full text-left px-4 py-3 text-xs flex items-center gap-2 hover:bg-zinc-800 ${sortBy === 'VALUE_HIGH' ? 'text-blue-400' : 'text-zinc-300'}`}>
                          <ArrowDownWideNarrow size={14} /> Value (High)
                      </button>
                      <button onClick={() => handleSortChange('VALUE_LOW')} className={`w-full text-left px-4 py-3 text-xs flex items-center gap-2 hover:bg-zinc-800 ${sortBy === 'VALUE_LOW' ? 'text-blue-400' : 'text-zinc-300'}`}>
                          <ArrowUpNarrowWide size={14} /> Value (Low)
                      </button>
                      <button onClick={() => handleSortChange('ALPHA')} className={`w-full text-left px-4 py-3 text-xs flex items-center gap-2 hover:bg-zinc-800 ${sortBy === 'ALPHA' ? 'text-blue-400' : 'text-zinc-300'}`}>
                          <ALargeSmall size={14} /> Name (A-Z)
                      </button>
                  </div>
              )}
          </div>

          {/* View Toggle */}
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden">
              <button 
                onClick={() => { setViewMode('list'); soundManager.playClick(); }}
                className={`p-3 transition-colors ${viewMode === 'list' ? 'bg-white text-black' : 'text-zinc-600 hover:text-white'}`}
              >
                  <List size={18} />
              </button>
              <div className="w-px bg-zinc-800"></div>
              <button 
                onClick={() => { setViewMode('grid'); soundManager.playClick(); }}
                className={`p-3 transition-colors ${viewMode === 'grid' ? 'bg-white text-black' : 'text-zinc-600 hover:text-white'}`}
              >
                  <Grip size={18} />
              </button>
          </div>
        </div>
        
        {/* Active Sort Label */}
        <div className="mt-4 flex items-center gap-2">
            <div className="h-px bg-zinc-800 flex-1"></div>
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Sorted By: {getSortLabel()}</span>
            <div className="h-px bg-zinc-800 flex-1"></div>
        </div>
      </div>

      {/* 2. Asset Grid/List */}
      <div className="flex-1 min-h-0 overflow-auto p-4 bg-black relative">
        {/* Grid Background */}
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(59,130,246,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        
        {filteredAndSortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-800 text-center">
            <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6">
                 <ShieldCheck size={32} className="opacity-20 text-white" />
            </div>
            <h3 className="font-display text-lg text-white mb-2">VAULT EMPTY</h3>
            <p className="font-mono text-xs text-zinc-600 max-w-xs mb-6 uppercase">No encrypted assets found in local storage. Initiate scan sequence to populate database.</p>
            {activeFilterCount > 0 ? (
                <button onClick={clearFilters} className="px-6 py-2 bg-zinc-800 text-white text-xs uppercase font-bold rounded hover:bg-zinc-700">Clear Filters</button>
            ) : (
                <div className="flex items-center gap-2 text-blue-500 text-xs font-bold animate-pulse">
                    <ScanLine size={14} /> <span>READY TO SCAN</span>
                </div>
            )}
          </div>
        ) : (
          <div className={`${viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'} relative z-10 pb-20`}>
            {filteredAndSortedItems.map((item) => {
              const Badge = getTrustBadge(item.provenance.trustTier);
              return (
              <div 
                key={item.id} 
                onClick={() => { soundManager.playClick(); onSelect(item); }}
                className={`group bg-zinc-950 border border-zinc-800 hover:border-blue-500/50 cursor-pointer transition-all duration-300 overflow-hidden relative shadow-lg
                    ${viewMode === 'list' ? 'flex h-32 rounded-sm' : 'flex flex-col rounded-sm'}
                `}
              >
                {/* Image Section */}
                <div className={`${viewMode === 'list' ? 'w-32 h-full' : 'h-40 w-full'} relative bg-zinc-900 shrink-0 overflow-hidden`}>
                  <img src={item.imageUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 grayscale group-hover:grayscale-0 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent opacity-60"></div>
                  
                  {/* Item Count Badge */}
                  {(item.images?.length || 0) > 1 && (
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 backdrop-blur border border-white/10 text-[8px] font-bold text-white flex items-center gap-1 rounded-sm">
                          <Database size={8} /> {item.images?.length}
                      </div>
                  )}

                  {/* Category Tag */}
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-blue-600/20 backdrop-blur border border-blue-500/30 text-[8px] font-bold text-blue-200 uppercase tracking-wider rounded-sm">
                      {item.classification}
                  </div>
                </div>

                {/* Data Section */}
                <div className="p-4 flex-1 flex flex-col justify-between relative overflow-hidden">
                   
                   <div>
                       <div className="flex justify-between items-start">
                           <h3 className={`font-display text-white leading-tight mb-1 group-hover:text-blue-400 transition-colors ${viewMode === 'list' ? 'text-lg' : 'text-sm line-clamp-2'}`}>
                               {item.itemName}
                           </h3>
                       </div>
                       <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wide truncate mb-2">
                           {item.era} // {item.origin}
                       </p>
                       
                       {/* Trust Tier Indicator (Enhanced) */}
                       <div className="flex items-center gap-1.5 mt-1">
                           <div className={`p-1 rounded-full ${Badge.bg}`}>
                               <Badge.icon size={10} className={Badge.color} />
                           </div>
                           <span className={`text-[8px] uppercase tracking-widest font-bold ${Badge.color}`}>{item.provenance.trustTier.split(' ')[0]} {item.provenance.trustTier.split(' ')[1]}</span>
                       </div>
                   </div>
                   
                   <div className="flex items-end justify-between mt-3">
                       <div>
                           <span className="text-[8px] text-zinc-600 uppercase block">Est. Market Value</span>
                           <p className="font-display text-emerald-500 text-lg shadow-emerald-500/20 drop-shadow-sm">${item.valuation.mid.toLocaleString()}</p>
                       </div>
                       
                       <div className="flex gap-2 relative z-10">
                           <button 
                             onClick={(e) => { e.stopPropagation(); onDelete(item.id); soundManager.playClick(); }} 
                             className="p-2 rounded-sm hover:bg-red-950/50 text-zinc-600 hover:text-red-500 border border-transparent hover:border-red-900 transition-all"
                           >
                               <Trash2 size={14} />
                           </button>
                           <button className="p-2 rounded-sm bg-zinc-800 hover:bg-white text-zinc-400 hover:text-black transition-colors">
                               <ArrowRight size={14} />
                           </button>
                       </div>
                   </div>
                </div>
              </div>
            );})}
          </div>
        )}
      </div>
    </div>
  );
};
