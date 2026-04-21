
import React, { useState, useEffect, useRef } from 'react';
import { AppTab, CollectionItem, AppraisalResult } from './types';
import { Scanner, ScannerRef } from './components/ScanTerminal';
import { CollectionManager } from './components/VaultTerminal';
import { MarketTrends } from './components/DataTerminal';
import { ItemResult } from './components/ItemResult';
import { AuthScreen } from './components/AuthScreen';
import { ProfileTerminal } from './components/ProfileTerminal';
import { ArchiveTerminal } from './components/ArchiveTerminal';
import { ScanLine, Box, BarChart3, Database, Loader2, Cpu, Fingerprint, Globe, User as UserIcon, Image as ImageIcon } from 'lucide-react';
import { soundManager } from './services/soundService';
import { ToastContainer, ToastMessage, toast } from './components/Toast';
import { useAuth } from './contexts/AuthContext';
import { db } from './services/firebase';
import { collection as fsCollection, query, where, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { compressImage } from './lib/imageUtils';

const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [isBooting, setIsBooting] = useState(true);
  const [bootStep, setBootStep] = useState(0);

  const [activeTab, setActiveTab] = useState<AppTab>('SCAN');
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);

  const scannerRef = useRef<ScannerRef>(null);

  // Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    // Toast Listener
    const handleToast = (t: ToastMessage) => setToasts(prev => [...prev, t]);
    toast.listeners.add(handleToast);

    // Sync Collection with Firestore (Real-time)
    let unsubscribe: () => void = () => {};
    if (user) {
        const q = query(fsCollection(db, 'items'), where('userId', '==', user.uid));
        unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any as CollectionItem));
            // Sort by dateScanned desc
            items.sort((a, b) => new Date(b.dateScanned).getTime() - new Date(a.dateScanned).getTime());
            setCollection(items);
        }, (error) => {
            console.error("Firestore sync error:", error);
            toast.error("Cloud synchronization failure");
        });
    }

    // Boot Sequence Simulation
    const timer1 = setTimeout(() => setBootStep(1), 500); // Modules
    const timer2 = setTimeout(() => setBootStep(2), 1200); // Network
    const timer3 = setTimeout(() => setBootStep(3), 1800); // Auth
    const timer4 = setTimeout(() => setIsBooting(false), 2400); // Complete

    return () => {
        toast.listeners.delete(handleToast);
        unsubscribe();
        clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); clearTimeout(timer4);
    };
  }, [user]);

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const saveToCollection = async (result: AppraisalResult, primaryImage: string) => {
    if (!user) return;

    const existingIndex = collection.findIndex(
        item => item.itemName === result.itemName && 
                item.era === result.era && 
                item.classification === result.classification
    );

    try {
        if (existingIndex > -1) {
            const existingItem = collection[existingIndex];
            const newImagesRaw = result.images || [primaryImage];
            const existingImages = existingItem.images || [existingItem.imageUrl];
            
            // Compress new images before merging
            const compressedNewImages = await Promise.all(newImagesRaw.map(img => compressImage(img, 600, 0.4)));
            const combinedImages = Array.from(new Set([...existingImages, ...compressedNewImages]));

            let newTier = existingItem.provenance.trustTier;
            if (combinedImages.length >= 3) newTier = 'Level 3 (Verified)';
            else if (combinedImages.length === 2) newTier = 'Level 2 (Visual)';

            const itemRef = doc(db, 'items', existingItem.id);
            await updateDoc(itemRef, {
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
            } as any);

            soundManager.playLock('high');
            toast.success("Asset Merged & Updated in Cloud");

        } else {
            const itemId = crypto.randomUUID();
            
            // Compress images for new item
            const rawImages = result.images || [primaryImage];
            const compressedImages = await Promise.all(rawImages.map(img => compressImage(img, 600, 0.4)));

            const newItem: CollectionItem = {
                ...result,
                id: itemId,
                userId: user.uid,
                dateScanned: new Date().toISOString(),
                imageUrl: compressedImages[0],
                images: compressedImages
            };
            
            await setDoc(doc(db, 'items', itemId), newItem);
            
            soundManager.playLock('standard');
            toast.success("New Asset Securely Vaulted to Cloud");
        }

        setActiveTab('COLLECTION');
    } catch (error) {
        console.error("Save error:", error);
        toast.error("Vault injection failed: See console");
    }
  };

  const updateCollectionItem = async (result: AppraisalResult) => {
      if (!selectedItem || !user) {
          console.error("Missing selectedItem or user context for update");
          return;
      }

      try {
          const itemRef = doc(db, 'items', selectedItem.id);
          
          // Ensure mandatory fields for rules are present even if result might be partial
          const updatePayload = {
              ...result,
              id: selectedItem.id,
              userId: user.uid,
              updatedAt: new Date().toISOString()
          };

          // Compress images only if they were newly added/changed
          // (Simple check: if they are data URLs)
          if (updatePayload.images) {
              updatePayload.images = await Promise.all(
                  updatePayload.images.map(img => 
                      img.startsWith('data:') ? compressImage(img, 600, 0.4) : img
                  )
              );
          }

          await updateDoc(itemRef, updatePayload as any);
          
          toast.success("Vault Sync Complete");
          setSelectedItem(prev => prev ? { ...prev, ...result, images: updatePayload.images } : null);
      } catch (error: any) {
          console.error("Update error detail:", error);
          if (error.code === 'permission-denied') {
              toast.error("Access Revoked: Security violation detected");
          } else {
              toast.error("Transmission Error: " + (error.message || "Unknown Failure"));
          }
      }
  };

  const deleteItem = async (id: string) => {
    try {
        await deleteDoc(doc(db, 'items', id));
        if (selectedItem?.id === id) setSelectedItem(null);
        toast.info("Asset Purged from Cloud Vault");
    } catch (error) {
        toast.error("Purge sequence failed");
    }
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
      case 'SCAN': return <Scanner ref={scannerRef} onSave={saveToCollection} />;
      case 'COLLECTION': return (
        <CollectionManager 
            items={collection} 
            onDelete={deleteItem} 
            onSelect={setSelectedItem} 
            onAddItem={() => { setActiveTab('SCAN'); soundManager.playClick(); }}
        />
      );
      case 'FINANCIAL': return <MarketTrends items={collection} />;
      case 'ARCHIVE': return <ArchiveTerminal />;
      case 'ACCOUNT': return <ProfileTerminal />;
      default: return <Scanner ref={scannerRef} onSave={saveToCollection} />;
    }
  };

  if (authLoading || isBooting) {
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
                      <div className={`flex items-center gap-2 text-xs transition-opacity duration-300 ${bootStep >= 0 || authLoading ? 'opacity-100' : 'opacity-0'}`}>
                          <Cpu size={12} /> <span>INITIALIZING CORE...</span> <span className="text-white ml-auto">OK</span>
                      </div>
                      <div className={`flex items-center gap-2 text-xs transition-opacity duration-300 ${bootStep >= 1 || authLoading ? 'opacity-100' : 'opacity-0'}`}>
                          <Globe size={12} /> <span>GEMINI VISION LINK...</span> <span className="text-white ml-auto">SECURE</span>
                      </div>
                      <div className={`flex items-center gap-2 text-xs transition-opacity duration-300 ${bootStep >= 2 || (authLoading && !isBooting) ? 'opacity-100' : 'opacity-0'}`}>
                          <Fingerprint size={12} /> <span>{authLoading ? 'AUTH_HANDSHAKE...' : 'BIOMETRIC KEYS...'}</span> <span className="text-white ml-auto">{authLoading ? '...' : 'VERIFIED'}</span>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  if (!user) {
      return (
          <>
            <ToastContainer toasts={toasts} removeToast={removeToast} />
            <AuthScreen />
          </>
      );
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-black text-zinc-100 font-sans selection:bg-white/20">
      
      {/* Toast Overlay */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Global Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-500/5 blur-[160px] rounded-full mix-blend-screen animate-pulse"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-500/5 blur-[160px] rounded-full mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <main className="flex-1 relative overflow-hidden flex flex-col z-10 animate-in fade-in duration-1000">
        {renderContent()}
      </main>

      {/* Floating Island Navigation */}
      {!(activeTab === 'COLLECTION' && selectedItem) && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 duration-700">
             <div className="bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-full p-2 flex items-center gap-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                
                <button 
                  onClick={() => { setActiveTab('COLLECTION'); soundManager.playClick(); }}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 relative group ${activeTab === 'COLLECTION' ? 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <Box size={18} strokeWidth={activeTab === 'COLLECTION' ? 2 : 1} />
                </button>
 
                <button 
                  onClick={() => { 
                      if (activeTab === 'SCAN' && scannerRef.current) {
                          // Try to trigger internal file input using a standard query selector to avoid passing refs down heavily if we can simply find it
                          const fileInput = document.getElementById('gallery-upload-input');
                          if (fileInput) fileInput.click();
                      }
                  }}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 relative group text-zinc-500 hover:text-zinc-300 ${activeTab !== 'SCAN' ? 'hidden md:flex opacity-50' : 'flex'}`}
                  title="Upload from Device"
                >
                  <ImageIcon size={18} strokeWidth={1.5} className="group-hover:-translate-y-0.5 transition-transform" />
                </button>

                <button 
                  onClick={() => { 
                      if (activeTab === 'SCAN') {
                          scannerRef.current?.capture();
                      } else {
                          setActiveTab('SCAN'); 
                          soundManager.playClick(); 
                      }
                  }}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl relative group ${activeTab === 'SCAN' ? 'bg-white text-black scale-110 shadow-[0_0_30px_rgba(255,255,255,0.3)]' : 'bg-zinc-800/80 text-zinc-400 border border-white/5 hover:bg-zinc-700'}`}
                >
                  <ScanLine size={20} className={activeTab === 'SCAN' ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'} />
                </button>
 
                <button 
                  onClick={() => { setActiveTab('FINANCIAL'); soundManager.playClick(); }}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 relative group ${activeTab === 'FINANCIAL' ? 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <BarChart3 size={18} strokeWidth={activeTab === 'FINANCIAL' ? 2 : 1} />
                </button>

                <button 
                  onClick={() => { setActiveTab('ARCHIVE'); soundManager.playClick(); }}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 relative group ${activeTab === 'ARCHIVE' ? 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <Database size={18} strokeWidth={activeTab === 'ARCHIVE' ? 2 : 1} />
                </button>

                <button 
                  onClick={() => { setActiveTab('ACCOUNT'); soundManager.playClick(); }}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 relative group ${activeTab === 'ACCOUNT' ? 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <UserIcon size={18} strokeWidth={activeTab === 'ACCOUNT' ? 2 : 1} />
                </button>
 
             </div>
          </div>
      )}
    </div>
  );
};

export default App;
