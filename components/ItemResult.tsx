
import React, { useState, useEffect, useRef } from 'react';
import { AppraisalResult, VisualHotspot } from '../types';
import { askCurator, generateDynamicPrompts, executeItemTool } from '../services/geminiService';
import { ArrowLeft, X, Send, Sparkles, Box, Zap, Info, Layers, Crosshair, FileText, Wrench, ShieldCheck, ShieldAlert, Shield, Users, TrendingUp, RefreshCw, MessageSquare, Terminal, Tag, Scroll, Globe, Triangle, Rocket, Share2, Printer, Copy, CheckCircle } from 'lucide-react';
import { Button } from './Button';
import { soundManager } from '../services/soundService';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { toast } from './Toast';
import { CuratorsInsight } from './CuratorsInsight';

interface ItemResultProps {
  result: AppraisalResult;
  imageData: string;
  onBack: () => void;
  onSave: (result: AppraisalResult) => void;
}

const TypewriterText: React.FC<{ text: string; delay?: number }> = ({ text, delay = 0 }) => {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    let i = 0;
    const startTimeout = setTimeout(() => {
        const interval = setInterval(() => {
            setDisplayed(text.substring(0, i));
            i++;
            if (i > text.length) clearInterval(interval);
        }, 10); 
        return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(startTimeout);
  }, [text, delay]);
  return <span>{displayed}<span className="cursor-blink text-blue-500">_</span></span>;
};

type ViewMode = 'EXPLORE' | 'DETAILS';
type ExportMode = 'NONE' | 'DOSSIER' | 'MARKETPLACE';

export const ItemResult: React.FC<ItemResultProps> = ({ result, imageData, onBack, onSave }) => {
  const [currentResult, setCurrentResult] = useState(result);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{role:string, text:string}[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const [activeHotspot, setActiveHotspot] = useState<VisualHotspot | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('EXPLORE');
  const [exportMode, setExportMode] = useState<ExportMode>('NONE');
  
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [toolOutput, setToolOutput] = useState<string | null>(null);
  const [isToolLoading, setIsToolLoading] = useState(false);

  // Listing Generation State
  const [generatedListing, setGeneratedListing] = useState<{title: string, body: string} | null>(null);

  const displayImage = currentResult.images && currentResult.images.length > 0 ? currentResult.images[0] : imageData;
  const [activeEvidenceImage, setActiveEvidenceImage] = useState(displayImage);
  const [prompts, setPrompts] = useState<string[]>(result.insightfulPrompts || []);
  const [isCyclingPrompts, setIsCyclingPrompts] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setCurrentResult(result); }, [result]);
  useEffect(() => { soundManager.playLock(currentResult.rarityScore > 7 ? 'high' : 'standard'); }, []);

  const handleChat = async (text?: string) => {
    const q = text || chatInput;
    if (!q) return;
    setChatInput("");
    if (!showChat) setShowChat(true);
    soundManager.playClick();
    setChatHistory(prev => [...prev, { role: 'user', text: q }]);
    setIsChatLoading(true);
    try {
        const ans = await askCurator(currentResult, q);
        setChatHistory(prev => [...prev, { role: 'model', text: ans }]);
    } catch {
        setChatHistory(prev => [...prev, { role: 'model', text: "Signal Lost." }]);
    }
    setIsChatLoading(false);
    soundManager.playLock();
  };

  const executeTool = async (toolId: string) => {
      setActiveTool(toolId);
      setToolOutput(null);
      setIsToolLoading(true);
      soundManager.playClick();
      try {
          const output = await executeItemTool(currentResult, toolId);
          setToolOutput(output);
          soundManager.playLock();
      } catch (e) {
          setToolOutput("Module Offline.");
      } finally { setIsToolLoading(false); }
  };

  const cyclePrompts = async () => {
      soundManager.playClick();
      setIsCyclingPrompts(true);
      try {
          const newPrompts = await generateDynamicPrompts(currentResult);
          setPrompts(newPrompts);
      } catch (e) { setPrompts(["Market Analysis", "Authentication Protocol", "Maintenance"]); }
      setIsCyclingPrompts(false);
  };

  const generateListing = async () => {
      if (generatedListing) return;
      setIsToolLoading(true);
      try {
          const title = await executeItemTool(currentResult, 'LISTING_TITLE_ONLY');
          const body = await executeItemTool(currentResult, 'LISTING_DESCRIPTION_ONLY');
          setGeneratedListing({ title, body });
      } catch(e) { toast.error("Generation Failed"); }
      setIsToolLoading(false);
  };

  const handlePrint = () => {
      soundManager.playClick();
      const content = printRef.current;
      if (content) {
          const printWindow = window.open('', '', 'height=900,width=800');
          if (printWindow) {
              printWindow.document.write('<html><head><title>Asset Dossier</title>');
              printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>'); 
              printWindow.document.write('</head><body class="bg-white text-black p-8 font-serif">');
              printWindow.document.write(content.innerHTML);
              printWindow.document.write('</body></html>');
              printWindow.document.close();
              printWindow.print();
          }
      }
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      soundManager.playLock();
      toast.success("Copied to Clipboard");
  };

  const getTrustBadge = (tier: string) => {
      if (tier.includes('Level 3')) return { icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
      if (tier.includes('Level 2')) return { icon: Shield, color: 'text-blue-500', bg: 'bg-blue-500/10' };
      return { icon: ShieldAlert, color: 'text-amber-500', bg: 'bg-amber-500/10' };
  };

  const TrustBadge = getTrustBadge(currentResult.provenance.trustTier);

  // Valuation Visuals
  const confidencePercent = Math.round(currentResult.confidence * 100);
  const confColor = confidencePercent >= 90 ? 'text-emerald-400' : confidencePercent >= 75 ? 'text-blue-400' : 'text-amber-400';
  const confBg = confidencePercent >= 90 ? 'bg-emerald-400' : confidencePercent >= 75 ? 'bg-blue-400' : 'bg-amber-400';
  
  const valRange = currentResult.valuation.high - currentResult.valuation.low;
  const midPercent = valRange > 0 
    ? Math.max(10, Math.min(90, ((currentResult.valuation.mid - currentResult.valuation.low) / valRange) * 100))
    : 50;

  return (
    <div className="h-full bg-black text-white font-sans overflow-hidden relative flex flex-col">
      
      {/* 1. TOP NAV */}
      <div className="absolute top-0 left-0 right-0 z-50 flex justify-between items-start p-4 pt-[calc(20px+env(safe-area-inset-top))] pointer-events-none">
        <button onClick={() => { soundManager.playClick(); onBack(); }} className="pointer-events-auto p-3 rounded-full bg-black/20 backdrop-blur-md border border-white/10 hover:bg-white hover:text-black transition-colors">
            <ArrowLeft size={18} />
        </button>
        
        <div className="flex gap-1 pointer-events-auto bg-black/40 backdrop-blur-md p-1 border border-white/10 rounded-full shadow-lg">
             <button onClick={() => { soundManager.playClick(); setViewMode('EXPLORE'); }} className={`px-4 py-2 text-[10px] font-bold tracking-widest uppercase rounded-full transition-all ${viewMode === 'EXPLORE' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}>
                 Visual
             </button>
             <button onClick={() => { soundManager.playClick(); setViewMode('DETAILS'); }} className={`px-4 py-2 text-[10px] font-bold tracking-widest uppercase rounded-full transition-all ${viewMode === 'DETAILS' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}>
                 Data
             </button>
        </div>

        <button onClick={() => { soundManager.playClick(); setShowChat(true); }} className="pointer-events-auto p-3 rounded-full bg-blue-500/10 border border-blue-500/50 text-blue-400 hover:bg-blue-500 hover:text-white transition-all backdrop-blur-md">
             <Zap size={18} />
        </button>
      </div>

      {/* 2. VISUAL LAYER */}
      <div className={`relative w-full transition-all duration-700 ease-[cubic-bezier(0.87,0,0.13,1)] ${viewMode === 'DETAILS' ? 'h-[35vh] opacity-40 grayscale' : 'h-full opacity-100'}`}>
          <img src={viewMode === 'EXPLORE' ? activeEvidenceImage : displayImage} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
          
          {/* Evidence Thumbnails */}
          {viewMode === 'EXPLORE' && currentResult.images && currentResult.images.length > 1 && (
             <div className="absolute bottom-32 left-0 right-0 flex justify-center gap-3 z-40 pointer-events-auto px-6 overflow-x-auto pb-4">
                 {currentResult.images.map((img, idx) => (
                     <button key={idx} onClick={(e) => { e.stopPropagation(); setActiveEvidenceImage(img); }} className={`w-12 h-12 rounded-lg overflow-hidden transition-all border-2 ${activeEvidenceImage === img ? 'border-white scale-110 shadow-lg' : 'border-white/20 opacity-60'}`}>
                         <img src={img} className="w-full h-full object-cover" />
                     </button>
                 ))}
             </div>
          )}

          {/* Hotspots */}
          {viewMode === 'EXPLORE' && currentResult.visualHotspots?.map((spot, idx) => (
             <button key={idx} className="absolute w-12 h-12 flex items-center justify-center z-30" style={{ top: `${spot.y}%`, left: `${spot.x}%`, transform: 'translate(-50%, -50%)' }} onClick={(e) => { e.stopPropagation(); setActiveHotspot(activeHotspot === spot ? null : spot); }}>
                 <div className={`w-4 h-4 rounded-full border-2 transition-all duration-500 ${activeHotspot === spot ? 'bg-white border-white scale-125' : 'bg-black/30 border-white/80 hover:scale-110'}`}></div>
                 {activeHotspot === spot && <div className="absolute top-6 w-px h-8 bg-white/50"></div>}
             </button>
          ))}

          {/* Feature Card */}
          {activeHotspot && viewMode === 'EXPLORE' && (
              <div className="absolute top-[25%] left-1/2 -translate-x-1/2 w-64 bg-black/60 backdrop-blur-xl border border-white/20 p-5 rounded-2xl text-center animate-in zoom-in-95 duration-300">
                  <h3 className="font-display text-lg text-white mb-1">{activeHotspot.label}</h3>
                  <p className="text-xs text-zinc-300">{activeHotspot.description}</p>
              </div>
          )}

          {/* Hero Title */}
          <div className={`absolute bottom-0 left-0 right-0 p-8 transition-all duration-500 ${viewMode === 'DETAILS' ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'}`}>
              <div className="flex justify-between items-end mb-3">
                   <div className="inline-block px-2 py-1 bg-white/10 backdrop-blur border border-white/20 rounded-md text-[9px] font-bold uppercase tracking-widest">
                      {currentResult.classification}
                   </div>
                   {/* Trust Tier Badge (Visual Mode) */}
                   <div className="flex items-center gap-2 bg-black/40 backdrop-blur px-3 py-1.5 rounded-full border border-white/10">
                       <TrustBadge.icon size={14} className={TrustBadge.color} />
                       <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-300">{currentResult.provenance.trustTier.split('(')[1].replace(')','')}</span>
                   </div>
              </div>
              
              <h1 className="font-display text-4xl md:text-5xl text-white leading-none mb-2">{currentResult.itemName}</h1>
              <div className="flex gap-3 text-xs font-mono text-zinc-400">
                  <span>{currentResult.era}</span>
                  <span className="text-zinc-600">|</span>
                  <span>{currentResult.origin}</span>
              </div>
          </div>
      </div>

      {/* 3. DATA LAYER (BENTO GRID) */}
      <div className={`flex-1 min-h-0 bg-black relative transition-all duration-700 border-t border-white/10 ${viewMode === 'DETAILS' ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="h-full overflow-y-auto p-6 pb-32">
              
              {/* Header */}
              <div className="flex justify-between items-end mb-6">
                  <div>
                      <h2 className="text-2xl font-display text-white">Asset Dossier</h2>
                      <div className="flex items-center gap-2 mt-1">
                          <TrustBadge.icon size={12} className={TrustBadge.color} />
                          <span className={`text-[9px] font-bold uppercase tracking-widest ${TrustBadge.color}`}>{currentResult.provenance.trustTier}</span>
                      </div>
                  </div>
                  
                  {/* Enhanced Valuation Display */}
                  <div className="text-right flex flex-col items-end">
                      <div className="text-[10px] uppercase text-zinc-500 tracking-widest mb-1">Est. Value (USD)</div>
                      
                      <div className="text-2xl font-mono text-white tracking-tight">
                          ${currentResult.valuation.mid.toLocaleString()}
                      </div>

                      {/* Range Visualization */}
                      <div className="w-36 mt-2 relative">
                          <div className="h-1 bg-zinc-800 rounded-full w-full overflow-hidden relative">
                              {/* Range Gradient */}
                              <div className="absolute inset-0 bg-gradient-to-r from-zinc-800 via-zinc-600 to-zinc-800 opacity-50"></div>
                              {/* Glowing Active Zone */}
                              <div className="absolute top-0 bottom-0 left-[20%] right-[20%] bg-emerald-500/20 blur-[2px]"></div>
                          </div>
                          
                          {/* Mid Marker */}
                          <div 
                             className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,1)] transition-all duration-1000"
                             style={{ left: `${midPercent}%` }}
                          ></div>

                          <div className="flex justify-between text-[8px] font-mono text-zinc-500 mt-1.5 w-full">
                              <span>${(currentResult.valuation.low / 1000).toFixed(0)}k</span>
                              <span>${(currentResult.valuation.high / 1000).toFixed(0)}k</span>
                          </div>
                      </div>

                      {/* Confidence Badge */}
                      <div className={`mt-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-900/80 border border-white/5 ${confColor}`}>
                          <div className={`w-1 h-1 rounded-full ${confBg} shadow-[0_0_5px_currentColor]`}></div>
                          <span className="text-[8px] font-bold tracking-wider">{confidencePercent}% CONFIDENCE</span>
                      </div>
                  </div>
              </div>

              {/* === FORENSIC INSIGHT (LOGIC GATE) === */}
              <CuratorsInsight result={currentResult} />

              <div className="grid grid-cols-2 gap-3 mb-3">
                  {/* Rarity Card */}
                  <div className="bg-zinc-900/40 border border-white/5 p-4 rounded-2xl">
                      <div className="flex items-center gap-2 text-amber-500 mb-2">
                          <Sparkles size={14} />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Rarity</span>
                      </div>
                      <div className="text-3xl font-display text-white">{currentResult.rarityScore}<span className="text-sm text-zinc-600">/10</span></div>
                  </div>
                  
                  {/* Condition Card */}
                  <div className="bg-zinc-900/40 border border-white/5 p-4 rounded-2xl">
                      <div className="flex items-center gap-2 text-blue-400 mb-2">
                          <Layers size={14} />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Grade</span>
                      </div>
                      <div className="text-3xl font-display text-white">{currentResult.conditionScore}<span className="text-sm text-zinc-600">/10</span></div>
                  </div>
              </div>

              {/* Context Block */}
              <div className="bg-zinc-900/20 border border-white/5 p-5 rounded-2xl mb-3">
                  <h3 className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest mb-2">Analysis</h3>
                  <p className="font-serif text-zinc-300 leading-relaxed text-sm">{currentResult.historicalContext}</p>
              </div>

              {/* Forecast Chart */}
              <div className="bg-zinc-900/20 border border-white/5 p-5 rounded-2xl mb-3 relative overflow-hidden">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">5-Year Projection</h3>
                      <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${currentResult.forecast.marketSentiment === 'Bullish' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                          {currentResult.forecast.marketSentiment}
                      </div>
                  </div>
                  <div className="h-32 -ml-2">
                      <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={currentResult.forecast.fiveYearProjection}>
                              <defs>
                                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                  </linearGradient>
                              </defs>
                              <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#colorVal)" />
                          </AreaChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              {/* Professional Syndicate Tools */}
              <div className="mt-6 mb-6">
                  <div className="flex items-center justify-between mb-3">
                     <h3 className="text-[10px] font-bold uppercase text-zinc-600 tracking-widest">Syndicate Engine</h3>
                     <span className="text-[9px] bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30 font-bold uppercase">Pro</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => { setExportMode('DOSSIER'); soundManager.playClick(); }}
                        className="p-4 bg-zinc-900/80 border border-white/10 hover:bg-zinc-800 rounded-xl flex flex-col items-center gap-2 group transition-all"
                      >
                          <div className="p-2 rounded-full bg-zinc-800 group-hover:bg-white group-hover:text-black transition-colors">
                            <FileText size={20} />
                          </div>
                          <span className="text-[10px] font-bold uppercase text-zinc-400 group-hover:text-white">Dealer Dossier</span>
                      </button>

                      <button 
                        onClick={() => { setExportMode('MARKETPLACE'); generateListing(); soundManager.playClick(); }}
                        className="p-4 bg-zinc-900/80 border border-white/10 hover:bg-zinc-800 rounded-xl flex flex-col items-center gap-2 group transition-all"
                      >
                          <div className="p-2 rounded-full bg-zinc-800 group-hover:bg-white group-hover:text-black transition-colors">
                            <Share2 size={20} />
                          </div>
                          <span className="text-[10px] font-bold uppercase text-zinc-400 group-hover:text-white">Listing Gen</span>
                      </button>
                  </div>
              </div>

              {/* Standard Tools Grid */}
              <h3 className="text-[10px] font-bold uppercase text-zinc-600 tracking-widest mb-3 mt-6">Deep Analysis</h3>
              <div className="grid grid-cols-2 gap-2 mb-6">
                  {[
                      { id: 'LISTING_BOOST', label: 'Listing Boost', icon: Rocket, color: 'text-pink-400' },
                      { id: 'CARE', label: 'Care Guide', icon: ShieldCheck, color: 'text-emerald-400' },
                      { id: 'BUYERS', label: 'Buyer Profile', icon: Users, color: 'text-violet-400' },
                      { id: 'HISTORY', label: 'History Lens', icon: Scroll, color: 'text-amber-400' }
                  ].map(tool => (
                      <button key={tool.id} onClick={() => executeTool(tool.id)} className={`p-3 bg-zinc-900/50 border border-white/5 rounded-xl text-left hover:bg-zinc-800 transition-colors ${activeTool === tool.id ? 'ring-1 ring-white/20 bg-zinc-800' : ''}`}>
                          <tool.icon size={16} className={`${tool.color} mb-2`} />
                          <div className="text-[10px] font-bold text-zinc-300 uppercase">{tool.label}</div>
                      </button>
                  ))}
              </div>
              
              {/* Output Terminal */}
              {toolOutput && (
                  <div className="bg-black border border-white/10 rounded-xl p-4 font-mono text-xs text-zinc-300 mb-6 animate-in slide-in-from-bottom-2">
                      <div className="flex items-center gap-2 mb-2 text-zinc-500 border-b border-white/5 pb-2">
                          <Terminal size={12} />
                          <span className="text-[9px] uppercase">OUTPUT_STREAM</span>
                      </div>
                      <TypewriterText text={toolOutput} />
                  </div>
              )}

              {/* Curator Chat */}
              <div className="bg-zinc-900/20 border border-white/5 rounded-2xl p-1 mb-6">
                   <div className="p-3 border-b border-white/5 flex justify-between items-center">
                       <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Curator AI</span>
                       <button onClick={cyclePrompts} disabled={isCyclingPrompts}><RefreshCw size={12} className={`text-zinc-500 ${isCyclingPrompts ? 'animate-spin' : ''}`} /></button>
                   </div>
                   <div className="p-2 space-y-1">
                       {prompts.map((p, i) => (
                           <button key={i} onClick={() => handleChat(p)} className="w-full text-left p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-zinc-300 transition-colors flex items-center gap-2">
                               <MessageSquare size={12} className="text-blue-500/50" /> {p}
                           </button>
                       ))}
                   </div>
              </div>

          </div>

          {/* Action Bar */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-xl border-t border-white/10 z-20">
              <Button onClick={() => { soundManager.playLock(); onSave(currentResult); }} className="w-full bg-white text-black hover:bg-zinc-200 h-12 rounded-xl uppercase tracking-widest text-xs font-bold">
                  Update Vault
              </Button>
          </div>
      </div>

      {/* === EXPORT MODALS === */}
      
      {/* 1. DEALER DOSSIER (PDF PREVIEW) */}
      {exportMode === 'DOSSIER' && (
          <div className="absolute inset-0 z-[150] bg-black/95 backdrop-blur-xl flex flex-col animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center justify-between p-4 border-b border-white/10 pt-[calc(20px+env(safe-area-inset-top))]">
                  <div className="flex items-center gap-2">
                      <FileText size={18} className="text-white" />
                      <span className="font-display text-lg text-white">Dealer Dossier</span>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={handlePrint} className="flex items-center gap-1 bg-white text-black px-3 py-1.5 rounded text-xs font-bold hover:bg-zinc-200">
                          <Printer size={14} /> Print / PDF
                      </button>
                      <button onClick={() => setExportMode('NONE')} className="p-2 text-zinc-500 hover:text-white"><X size={20}/></button>
                  </div>
              </div>
              
              {/* HIDDEN PRINT REF - This is what actually prints */}
              <div className="flex-1 overflow-y-auto p-8 bg-zinc-900/50 flex justify-center">
                  <div ref={printRef} className="bg-white text-black w-full max-w-2xl p-8 shadow-2xl min-h-[800px]">
                      {/* HEADER */}
                      <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
                          <div>
                              <h1 className="font-serif text-3xl font-bold tracking-tight mb-1">CONDITION REPORT</h1>
                              <p className="text-xs font-mono uppercase tracking-widest text-gray-500">Curator Prime Authenticated</p>
                          </div>
                          <div className="text-right">
                              <div className="text-4xl font-serif font-bold text-gray-900">${(currentResult.valuation.mid).toLocaleString()}</div>
                              <p className="text-[10px] uppercase font-bold text-gray-500">Est. Market Value</p>
                          </div>
                      </div>

                      {/* MAIN INFO */}
                      <div className="grid grid-cols-2 gap-8 mb-8">
                          <div>
                              <img src={displayImage} className="w-full h-64 object-cover grayscale contrast-125 border border-gray-200 mb-2" />
                              <div className="flex justify-between text-[9px] uppercase font-bold text-gray-400">
                                  <span>ID: {currentResult.provenance.digitalHash.substring(0,8)}</span>
                                  <span>{new Date().toLocaleDateString()}</span>
                              </div>
                          </div>
                          <div className="space-y-4">
                              <div>
                                  <label className="block text-[10px] font-bold uppercase text-gray-500">Asset Name</label>
                                  <div className="font-serif text-xl leading-tight">{currentResult.itemName}</div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-[10px] font-bold uppercase text-gray-500">Era / Origin</label>
                                      <div className="font-mono text-sm">{currentResult.era}, {currentResult.origin}</div>
                                  </div>
                                  <div>
                                      <label className="block text-[10px] font-bold uppercase text-gray-500">Grade</label>
                                      <div className="font-mono text-sm">{currentResult.conditionScore}/10 ({currentResult.condition})</div>
                                  </div>
                              </div>
                              <div>
                                  <label className="block text-[10px] font-bold uppercase text-gray-500">Provenance Status</label>
                                  <div className="flex items-center gap-2 mt-1">
                                      {currentResult.provenance.trustTier.includes('Level 3') ? <CheckCircle size={14} /> : <Shield size={14}/>}
                                      <span className="font-bold text-sm">{currentResult.provenance.trustTier}</span>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* ANALYSIS */}
                      <div className="mb-6">
                          <h3 className="text-sm font-bold uppercase border-b border-gray-200 pb-1 mb-2">Historical Context</h3>
                          <p className="font-serif text-sm leading-relaxed text-gray-700 text-justify">
                              {currentResult.historicalContext}
                          </p>
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                          <div>
                              <h3 className="text-sm font-bold uppercase border-b border-gray-200 pb-1 mb-2">Restoration Notes</h3>
                              <p className="font-mono text-xs leading-relaxed text-gray-600">
                                  {currentResult.restoration.restorationPotential}
                              </p>
                          </div>
                          <div>
                              <h3 className="text-sm font-bold uppercase border-b border-gray-200 pb-1 mb-2">Market Forecast</h3>
                              <p className="font-mono text-xs leading-relaxed text-gray-600">
                                  Sentiment: {currentResult.forecast.marketSentiment}<br/>
                                  Liquidity Score: {currentResult.forecast.liquidityScore}/100<br/>
                                  Investment Grade: {currentResult.forecast.investmentGrade}
                              </p>
                          </div>
                      </div>

                      {/* FOOTER */}
                      <div className="mt-12 pt-4 border-t border-gray-200 flex justify-between items-center">
                          <div className="text-[10px] text-gray-400 font-mono">
                              Generated by Curator Prime OS<br/>
                              Verify: secure.curator.ai/verify
                          </div>
                          <div className="w-16 h-16 border border-gray-300 flex items-center justify-center">
                              <div className="w-12 h-12 bg-black"></div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* 2. MARKETPLACE LISTING (COPY PASTE) */}
      {exportMode === 'MARKETPLACE' && (
          <div className="absolute inset-0 z-[150] bg-black/95 backdrop-blur-xl flex flex-col animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center justify-between p-4 border-b border-white/10 pt-[calc(20px+env(safe-area-inset-top))]">
                  <div className="flex items-center gap-2">
                      <Share2 size={18} className="text-white" />
                      <span className="font-display text-lg text-white">Marketplace Gen</span>
                  </div>
                  <button onClick={() => setExportMode('NONE')} className="p-2 text-zinc-500 hover:text-white"><X size={20}/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
                  {isToolLoading ? (
                      <div className="flex flex-col items-center justify-center h-64 text-zinc-500 gap-4">
                          <RefreshCw size={32} className="animate-spin text-blue-500" />
                          <p className="font-mono text-xs uppercase tracking-widest">Optimizing Search Vectors...</p>
                      </div>
                  ) : generatedListing ? (
                      <div className="space-y-6">
                          {/* TITLE BLOCK */}
                          <div className="bg-zinc-900 border border-white/10 p-4 rounded-xl">
                              <div className="flex justify-between items-center mb-2">
                                  <label className="text-[10px] font-bold uppercase text-zinc-500">Optimized Title (80 chars)</label>
                                  <button onClick={() => copyToClipboard(generatedListing.title)} className="text-blue-400 hover:text-white"><Copy size={14}/></button>
                              </div>
                              <div className="font-mono text-sm text-white break-words">{generatedListing.title.replace(/"/g, '')}</div>
                          </div>

                          {/* DESCRIPTION BLOCK */}
                          <div className="bg-zinc-900 border border-white/10 p-4 rounded-xl">
                              <div className="flex justify-between items-center mb-2">
                                  <label className="text-[10px] font-bold uppercase text-zinc-500">HTML Description</label>
                                  <button onClick={() => copyToClipboard(generatedListing.body)} className="text-blue-400 hover:text-white"><Copy size={14}/></button>
                              </div>
                              <div className="font-mono text-xs text-zinc-400 h-64 overflow-y-auto whitespace-pre-wrap border border-zinc-800 p-2 rounded bg-black">
                                  {generatedListing.body}
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                             <div className="bg-zinc-900/50 p-3 rounded-lg border border-white/5">
                                 <span className="text-[9px] uppercase text-zinc-500 block mb-1">Recommended Price</span>
                                 <span className="text-lg font-mono text-emerald-400">${Math.round(currentResult.valuation.mid * 1.15).toLocaleString()}</span>
                                 <span className="text-[9px] text-zinc-600 block">Buy It Now (15% Markup)</span>
                             </div>
                             <div className="bg-zinc-900/50 p-3 rounded-lg border border-white/5">
                                 <span className="text-[9px] uppercase text-zinc-500 block mb-1">Reserve Floor</span>
                                 <span className="text-lg font-mono text-amber-400">${Math.round(currentResult.valuation.low).toLocaleString()}</span>
                                 <span className="text-[9px] text-zinc-600 block">Minimum Bid</span>
                             </div>
                          </div>
                      </div>
                  ) : null}
              </div>
          </div>
      )}

      {/* Chat Modal (Simplified) */}
      {showChat && (
          <div className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center justify-between p-4 border-b border-white/10 pt-[calc(20px+env(safe-area-inset-top))]">
                  <span className="font-display text-lg">Curator AI</span>
                  <button onClick={() => setShowChat(false)} className="p-2 text-zinc-500 hover:text-white"><X size={20}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatHistory.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : ''}`}>
                          <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'}`}>
                              {m.text}
                          </div>
                      </div>
                  ))}
                  {isChatLoading && <div className="text-xs text-zinc-500 animate-pulse text-center">Processing...</div>}
              </div>
              <div className="p-4 bg-black border-t border-white/10 flex gap-2 pb-8">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} className="flex-1 bg-zinc-900 rounded-full px-4 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500" placeholder="Ask anything..." />
                  <button onClick={() => handleChat()} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black"><Send size={16}/></button>
              </div>
          </div>
      )}
    </div>
  );
};
