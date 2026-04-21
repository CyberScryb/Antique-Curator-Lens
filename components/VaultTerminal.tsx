
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
    categories: string[];
    sellers: string[];
    minValue: string;
    maxValue: string;
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
      origins: [],
      categories: [],
      sellers: [],
      minValue: '',
      maxValue: ''
  });

  const totalValue = items.reduce((sum, item) => sum + item.valuation.mid, 0);

  // Derived Options for Filters
  const availableEras = useMemo(() => Array.from(new Set(items.map(i => i.era))).filter(Boolean).sort(), [items]);
  const availableOrigins = useMemo(() => Array.from(new Set(items.map(i => i.origin))).filter(Boolean).sort(), [items]);
  const availableCategories = useMemo(() => Array.from(new Set(items.map(i => i.category || i.classification))).filter(Boolean).sort(), [items]);
  const availableSellers = useMemo(() => Array.from(new Set(items.map(i => i.seller))).filter(Boolean).sort(), [items]);

  const activeFilterCount = (filters.minCondition > 0 ? 1 : 0) + 
                            filters.eras.length + 
                            filters.origins.length + 
                            filters.categories.length + 
                            filters.sellers.length + 
                            (filters.minValue !== '' ? 1 : 0) + 
                            (filters.maxValue !== '' ? 1 : 0);

  // Sorting & Filtering Logic
  const filteredAndSortedItems = useMemo(() => {
      let res = items.filter(i => {
          // 1. Search Term
          const searchLower = searchTerm.toLowerCase();
          const matchesSearch = !searchTerm || 
                                i.itemName.toLowerCase().includes(searchLower) || 
                                i.classification.toLowerCase().includes(searchLower) ||
                                (i.category && i.category.toLowerCase().includes(searchLower)) ||
                                (i.era && i.era.toLowerCase().includes(searchLower)) ||
                                (i.materials && i.materials.toLowerCase().includes(searchLower)) ||
                                (i.seller && i.seller.toLowerCase().includes(searchLower)) ||
                                i.valuation.mid.toString().includes(searchLower);
          
          // 2. Condition Filter
          const matchesCondition = i.conditionScore >= filters.minCondition;

          // 3. Era Filter
          const matchesEra = filters.eras.length === 0 || filters.eras.includes(i.era);

          // 4. Origin Filter
          const matchesOrigin = filters.origins.length === 0 || filters.origins.includes(i.origin);

          // 5. Category Filter
          const itemCat = i.category || i.classification;
          const matchesCategory = filters.categories.length === 0 || filters.categories.includes(itemCat);

          // 6. Seller Filter
          const matchesSeller = filters.sellers.length === 0 || (i.seller && filters.sellers.includes(i.seller));

          // 7. Value Filter
          const minV = filters.minValue === '' ? 0 : parseFloat(filters.minValue);
          const maxV = filters.maxValue === '' ? Infinity : parseFloat(filters.maxValue);
          const matchesValue = i.valuation.mid >= minV && i.valuation.mid <= maxV;

          return matchesSearch && matchesCondition && matchesEra && matchesOrigin && matchesCategory && matchesSeller && matchesValue;
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

  const toggleFilter = (type: 'eras' | 'origins' | 'categories' | 'sellers', value: string) => {
      soundManager.playClick();
      setFilters(prev => {
          const list = prev[type];
          return {
              ...prev,
              [type]: list.includes(value) ? list.filter(v => v !== value) : [...list, value]
          };
      });
  };

  const handleValueFilterChange = (field: 'minValue' | 'maxValue', value: string) => {
      setFilters(prev => ({ ...prev, [field]: value }));
  };

  const setConditionFilter = (score: number) => {
      soundManager.playClick();
      setFilters(prev => ({ ...prev, minCondition: prev.minCondition === score ? 0 : score }));
  };

  const clearFilters = () => {
      soundManager.playClick();
      setFilters({ minCondition: 0, eras: [], origins: [], categories: [], sellers: [], minValue: '', maxValue: '' });
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
      <div className="bg-black/95 backdrop-blur-3xl p-6 pt-[calc(20px+env(safe-area-inset-top))] border-b border-white/5 sticky top-0 z-20">
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2 opacity-40">
                <Lock size={10} className="text-emerald-500" />
                <span className="text-[9px] font-mono text-white uppercase tracking-[0.3em]">Vault_Active</span>
            </div>
            <h1 className="text-4xl font-display text-white tracking-widest uppercase">Vault</h1>
          </div>
          
          <div className="text-right flex flex-col items-end gap-3">
               <button 
                  onClick={onAddItem}
                  className="px-5 py-2.5 bg-white text-black text-[10px] font-bold uppercase tracking-[0.2em] rounded-full hover:bg-zinc-200 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.1)] active:scale-95"
               >
                   + Add Item
               </button>
               <div className="flex flex-col items-end">
                 <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 mb-1">Portfolio_Value</span>
                 <span className="font-display text-2xl text-emerald-400 tracking-tight leading-none">${totalValue.toLocaleString()}</span>
               </div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex flex-col gap-4 mt-2">
          {/* Top Row: Search & View Toggle */}
          <div className="flex gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-white transition-colors" size={13} />
              <input 
                type="text" 
                placeholder="Search collection..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-zinc-900/40 border border-white/5 text-xs text-white focus:border-white/20 focus:bg-zinc-900/60 outline-none placeholder:text-zinc-700 transition-all font-sans rounded-2xl"
              />
            </div>
            
            <div className="flex bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden p-1">
                <button 
                  onClick={() => { setViewMode('list'); soundManager.playClick(); }}
                  className={`w-10 h-full flex items-center justify-center transition-all rounded-xl ${viewMode === 'list' ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-zinc-600 hover:text-white'}`}
                >
                    <List size={14} />
                </button>
                <button 
                  onClick={() => { setViewMode('grid'); soundManager.playClick(); }}
                  className={`w-10 h-full flex items-center justify-center transition-all rounded-xl ${viewMode === 'grid' ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-zinc-600 hover:text-white'}`}
                >
                    <Grip size={14} />
                </button>
            </div>
          </div>

          {/* Bottom Row: Sort Chips & Filter Toggle */}
          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {/* Sort Controls */}
              <div className="flex items-center bg-zinc-900/60 border border-white/5 rounded-full p-1 shrink-0">
                 <button onClick={() => handleSortChange('RECENT')} className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${sortBy === 'RECENT' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}>Date</button>
                 <button onClick={() => handleSortChange('ALPHA')} className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${sortBy === 'ALPHA' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}>Name</button>
                 <button onClick={() => handleSortChange('VALUE_HIGH')} className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${sortBy === 'VALUE_HIGH' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}>Value</button>
              </div>

              <div className="w-px h-6 bg-white/10 shrink-0 mx-1"></div>

              {/* Advanced Filter Toggle */}
              <button 
                  onClick={() => { setShowFilterMenu(!showFilterMenu); soundManager.playClick(); }}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all shrink-0 ${showFilterMenu || activeFilterCount > 0 ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-transparent border-white/10 text-zinc-400 hover:border-white/30 hover:text-white'}`}
              >
                  <Filter size={12} />
                  Filters {activeFilterCount > 0 && <span className="bg-emerald-500 text-black px-1.5 py-0.5 rounded-full text-[8px] leading-none">{activeFilterCount}</span>}
              </button>

              {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="text-[9px] text-zinc-500 hover:text-red-400 uppercase tracking-widest font-bold whitespace-nowrap px-2">
                       Clear
                  </button>
              )}
          </div>

          {/* Expanded Inline Filter Drawer */}
          {showFilterMenu && (
             <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Advanced Filtering</span>
                    <button onClick={() => setShowFilterMenu(false)} className="text-zinc-500 hover:text-white"><X size={14}/></button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[50vh] overflow-y-auto pr-2">
                    
                    {/* Condition Level */}
                    <div>
                        <div className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-3">Minimum Condition (1-10)</div>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { label: 'All', score: 0 },
                                { label: 'Fair (4+)', score: 4 },
                                { label: 'Good (7+)', score: 7 },
                                { label: 'Mint (9+)', score: 9 }
                            ].map((opt) => (
                                <button 
                                    key={opt.score}
                                    onClick={() => setConditionFilter(opt.score)}
                                    className={`py-2 text-[9px] uppercase font-bold border rounded-lg transition-colors ${filters.minCondition === opt.score ? 'bg-blue-500 text-black border-blue-500' : 'bg-black/50 text-zinc-400 border-white/10 hover:border-white/30 hover:text-white'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Era Filter */}
                    {availableEras.length > 0 && (
                        <div>
                            <div className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mb-3">Historical Era</div>
                            <div className="flex flex-wrap gap-2">
                                {availableEras.map(era => (
                                    <button
                                        key={era}
                                        onClick={() => toggleFilter('eras', era)}
                                        className={`px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold border rounded-full transition-all flex items-center gap-1.5 ${filters.eras.includes(era) ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-black/50 border-white/10 text-zinc-400 hover:border-white/30'}`}
                                    >
                                        {era} {filters.eras.includes(era) && <Check size={10} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Origin Filter */}
                    {availableOrigins.length > 0 && (
                        <div>
                            <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mb-3">Origin / Maker</div>
                            <div className="flex flex-wrap gap-2">
                                {availableOrigins.map(origin => (
                                    <button
                                        key={origin}
                                        onClick={() => toggleFilter('origins', origin)}
                                        className={`px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold border rounded-full transition-all flex items-center gap-1.5 ${filters.origins.includes(origin) ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-black/50 border-white/10 text-zinc-400 hover:border-white/30'}`}
                                    >
                                        {origin} {filters.origins.includes(origin) && <Check size={10} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Valuation Filter */}
                    <div>
                        <div className="text-[9px] font-bold text-purple-500 uppercase tracking-widest mb-3">Valuation Range ($)</div>
                        <div className="flex items-center gap-3">
                            <input 
                                type="number" 
                                placeholder="Min" 
                                value={filters.minValue}
                                onChange={(e) => handleValueFilterChange('minValue', e.target.value)}
                                className="w-full bg-black border border-white/10 text-white text-xs px-3 py-2 rounded-lg focus:border-purple-500 outline-none placeholder:text-zinc-700"
                            />
                            <span className="text-zinc-600">-</span>
                            <input 
                                type="number" 
                                placeholder="Max" 
                                value={filters.maxValue}
                                onChange={(e) => handleValueFilterChange('maxValue', e.target.value)}
                                className="w-full bg-black border border-white/10 text-white text-xs px-3 py-2 rounded-lg focus:border-purple-500 outline-none placeholder:text-zinc-700"
                            />
                        </div>
                    </div>

                </div>
             </div>
          )}
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
                className={`group bg-zinc-950/40 border border-white/5 hover:border-white/20 cursor-pointer transition-all duration-500 overflow-hidden relative
                    ${viewMode === 'list' ? 'flex h-28 rounded-3xl' : 'flex flex-col rounded-3xl'}
                `}
              >
                {/* Image Section with hover zoom */}
                <div className={`${viewMode === 'list' ? 'w-28 h-full' : 'h-44 w-full'} relative shrink-0 overflow-hidden`}>
                  <img src={item.imageUrl} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                  
                  {/* Category Tag - Minimal */}
                  <div className="absolute top-3 left-3 px-2 py-0.5 bg-black/40 backdrop-blur-md border border-white/10 text-[7px] font-bold text-zinc-300 uppercase tracking-[0.2em] rounded-full">
                      {item.classification}
                  </div>
                </div>
 
                {/* Data Section */}
                <div className="p-4 flex-1 flex flex-col justify-between relative">
                   <div>
                       <h3 className={`font-sans font-medium text-white leading-tight mb-1 group-hover:text-emerald-400 transition-colors ${viewMode === 'list' ? 'text-lg' : 'text-sm line-clamp-1'}`}>
                           {item.itemName}
                       </h3>
                       <p className="text-[9px] text-zinc-600 font-mono uppercase tracking-[0.15em]">
                           {item.era} // {item.origin}
                       </p>
                   </div>
                   
                   <div className="flex items-end justify-between">
                       <div>
                           <p className="font-display text-emerald-500 text-lg">${item.valuation.mid.toLocaleString()}</p>
                       </div>
                       
                       <div className="flex gap-1.5 translate-y-1 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                           <button 
                             onClick={(e) => { e.stopPropagation(); onDelete(item.id); soundManager.playClick(); }} 
                             className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                           >
                               <Trash2 size={12} />
                           </button>
                           <button className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 text-zinc-300 hover:bg-white hover:text-black transition-all">
                               <ArrowRight size={12} />
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
