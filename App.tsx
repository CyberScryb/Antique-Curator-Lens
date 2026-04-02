
import React, { useState, useEffect } from 'react';
import { AppTab, CollectionItem, AppraisalResult } from './types';
import { Scanner } from './components/ScanTerminal';
import { CollectionManager } from './components/VaultTerminal';
import { MarketTrends } from './components/DataTerminal';
import { ItemResult } from './components/ItemResult';
import { ScanLine, Box, BarChart3, Hexagon, Loader2, Cpu, Fingerprint, Globe } from 'lucide-react';
import { soundManager } from './services/soundService';
import { ToastContainer, ToastMessage, toast } from './components/Toast';

const App: React.FC = () => {
  const [isBooting, setIsBooting] = useState(true);
  const [bootStep, setBootStep] = useState(0);

  const [activeTab, setActiveTab] = useState<AppTab>('SCAN');
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);

  // Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    // Toast Listener
    const handleToast = (t: ToastMessage) => setToasts(prev => [...prev, t]);
    toast.listeners.add(handleToast);

    // Load Data
    const saved = localStorage.getItem('curator_collection');
    if (saved) setCollection(JSON.parse(saved));

    // Boot Sequence Simulation
    const timer1 = setTimeout(() => setBootStep(1), 500); // Modules
    const timer2 = setTimeout(() => setBootStep(2), 1200); // Network
    const timer3 = setTimeout(() => setBootStep(3), 1800); // Auth
    const timer4 = setTimeout(() => setIsBooting(false), 2400); // Complete

    return () => {
        toast.listeners.delete(handleToast);
        clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); clearTimeout(timer4);
    };
  }, []);

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const saveToCollection = (result: AppraisalResult, primaryImage: string) => {
    const existingIndex = collection.findIndex(
        item => item.itemName === result.itemName && 
                item.era === result.era && 
                item.classification === result.classification
    );

    let updatedCollection = [...collection];
    let savedItem: CollectionItem;

    if (existingIndex > -1) {
        const existingItem = updatedCollection[existingIndex];
        const newImages = result.images || [primaryImage];
        const existingImages = existingItem.images || [existingItem.imageUrl];
        const combinedImages = Array.from(new Set([...existingImages, ...newImages]));

        let newTier = existingItem.provenance.trustTier;
        if (combinedImages.length >= 3) newTier = 'Level 3 (Verified)';
        else if (combinedImages.length === 2) newTier = 'Level 2 (Visual)';

        const mergedItem: CollectionItem = {
            ...existingItem,
            valuation: result.valuation, 
            forecast: result.forecast,
            condition: result.condition,
            conditionScore: result.conditionScore,
            historicalContext: result.historicalContext.length > existingItem.historicalContext.length ? result.historicalContext : existingItem.historicalContext,
            images: combinedImages,
            imageUrl: combinedImages[0],
            provenance: {
                ...existingItem.provenance,
                trustTier: newTier as any
            },
            dateScanned: new Date().toISOString()
        };

        updatedCollection[existingIndex] = mergedItem;
        updatedCollection.splice(existingIndex, 1);
        updatedCollection.unshift(mergedItem);
        savedItem = mergedItem;
        soundManager.playLock('high');
        toast.success("Asset Merged & Updated");

    } else {
        const newItem: CollectionItem = {
            ...result,
            id: crypto.randomUUID(),
            dateScanned: new Date().toISOString(),
            imageUrl: primaryImage,
            images: result.images || [primaryImage]
        };
        updatedCollection = [newItem, ...updatedCollection];
        savedItem = newItem;
        soundManager.playLock('standard');
        toast.success("New Asset Securely Vaulted");
    }

    setCollection(updatedCollection);
    localStorage.setItem('curator_collection', JSON.stringify(updatedCollection));
    
    setSelectedItem(savedItem);
    setActiveTab('COLLECTION');
  };

  const updateCollectionItem = (result: AppraisalResult) => {
      if (!selectedItem) return;

      const updatedItems = collection.map(item => {
          if (item.id === selectedItem.id) {
              return { 
                  ...item, 
                  ...result, 
                  images: result.images || item.images,
                  id: item.id 
              };
          }
          return item;
      });
      setCollection(updatedItems);
      localStorage.setItem('curator_collection', JSON.stringify(updatedItems));
      
      const updatedSelected = updatedItems.find(i => i.id === selectedItem.id);
      if (updatedSelected) setSelectedItem(updatedSelected);
      toast.success("Database Record Updated");
  };

  const deleteItem = (id: string) => {
    const updated = collection.filter(i => i.id !== id);
    setCollection(updated);
    localStorage.setItem('curator_collection', JSON.stringify(updated));
    if (selectedItem?.id === id) setSelectedItem(null);
    toast.info("Asset Purged from Vault");
  };

  const renderContent = () => {
    if (activeTab === 'COLLECTION' && selectedItem) {
        return (
            <ItemResult 
                result={selectedItem} 
                imageData={selectedItem.imageUrl} 
                onBack={() => { setSelectedItem(null); setActiveTab('COLLECTION'); }}
                onSave={updateCollectionItem} 
            />
        );
    }

    switch (activeTab) {
      case 'SCAN': return <Scanner onSave={saveToCollection} />;
      case 'COLLECTION': return (
        <CollectionManager 
            items={collection} 
            onDelete={deleteItem} 
            onSelect={setSelectedItem} 
            onAddItem={() => { setActiveTab('SCAN'); soundManager.playClick(); }}
        />
      );
      case 'MARKET': return <MarketTrends items={collection} />;
      default: return <Scanner onSave={saveToCollection} />;
    }
  };

  if (isBooting) {
      return (
          <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[999] text-emerald-500 font-mono">
              <div className="w-64 relative">
                  <div className="flex justify-between items-end mb-2">
                      <h1 className="text-xl font-display text-white tracking-widest">CURATOR<span className="text-emerald-500">_OS</span></h1>
                      <span className="text-xs">v4.1.0</span>
                  </div>
                  <div className="h-1 bg-zinc-800 w-full mb-4 overflow-hidden">
                      <div className="h-full bg-emerald-500 animate-[loading_2.4s_ease-in-out_forwards]"></div>
                  </div>
                  <div className="space-y-1">
                      <div className={`flex items-center gap-2 text-xs transition-opacity duration-300 ${bootStep >= 0 ? 'opacity-100' : 'opacity-0'}`}>
                          <Cpu size={12} /> <span>INITIALIZING CORE...</span> <span className="text-white ml-auto">OK</span>
                      </div>
                      <div className={`flex items-center gap-2 text-xs transition-opacity duration-300 ${bootStep >= 1 ? 'opacity-100' : 'opacity-0'}`}>
                          <Globe size={12} /> <span>GEMINI VISION LINK...</span> <span className="text-white ml-auto">SECURE</span>
                      </div>
                      <div className={`flex items-center gap-2 text-xs transition-opacity duration-300 ${bootStep >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                          <Fingerprint size={12} /> <span>BIOMETRIC KEYS...</span> <span className="text-white ml-auto">VERIFIED</span>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-black text-zinc-100 font-sans selection:bg-white/20">
      
      {/* Toast Overlay */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Global Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[120px] rounded-full mix-blend-screen"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-900/10 blur-[120px] rounded-full mix-blend-screen"></div>
      </div>

      <main className="flex-1 relative overflow-hidden flex flex-col z-10 animate-in fade-in duration-1000">
        {renderContent()}
      </main>

      {/* Floating Island Navigation */}
      {!(activeTab === 'COLLECTION' && selectedItem) && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 duration-500">
             <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-full px-2 py-2 flex items-center gap-1 shadow-[0_20px_40px_rgba(0,0,0,0.6)] ring-1 ring-white/5">
                
                <button 
                  onClick={() => { setActiveTab('COLLECTION'); soundManager.playClick(); }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 relative group ${activeTab === 'COLLECTION' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                >
                  <Box size={20} strokeWidth={activeTab === 'COLLECTION' ? 2 : 1.5} />
                  {activeTab === 'COLLECTION' && <div className="absolute -bottom-1 w-1 h-1 bg-white rounded-full"></div>}
                </button>

                <button 
                  onClick={() => { setActiveTab('SCAN'); soundManager.playClick(); }}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 mx-2 shadow-lg relative ${activeTab === 'SCAN' ? 'bg-white text-black scale-110 shadow-white/10' : 'bg-zinc-900 text-zinc-400 border border-white/10'}`}
                >
                  <ScanLine size={24} strokeWidth={2} />
                  {activeTab === 'SCAN' && <div className="absolute inset-0 rounded-full border border-black/10"></div>}
                </button>

                <button 
                  onClick={() => { setActiveTab('MARKET'); soundManager.playClick(); }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 relative group ${activeTab === 'MARKET' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                >
                  <BarChart3 size={20} strokeWidth={activeTab === 'MARKET' ? 2 : 1.5} />
                  {activeTab === 'MARKET' && <div className="absolute -bottom-1 w-1 h-1 bg-white rounded-full"></div>}
                </button>

             </div>
          </div>
      )}
    </div>
  );
};

export default App;
