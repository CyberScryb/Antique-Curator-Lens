
import React, { useRef, useState, useEffect } from 'react';
import { Search, DollarSign, Fingerprint, Languages, Volume2, VolumeX, Image as ImageIcon, Shield, Camera, Zap, Target, X, ChevronRight, Layers, Scan } from 'lucide-react';
import { analyzeItem, analyzeLiveFrame } from '../services/geminiService';
import { AppraisalResult, LiveAnalysisUpdate, LensMode } from '../types';
import { soundManager } from '../services/soundService';
import { toast } from './Toast';

interface ScannerProps {
  onSave: (result: AppraisalResult, imageData: string) => void;
}

const LENSES: { id: LensMode; label: string; icon: any; }[] = [
  { id: 'IDENTITY', label: 'Identity', icon: Search },
  { id: 'MARKET', label: 'Valuation', icon: DollarSign },
  { id: 'FORENSICS', label: 'Forensics', icon: Fingerprint },
  { id: 'DECIPHER', label: 'Text', icon: Languages },
];

const PASSPORT_STEPS = [
    { label: "PRIMARY ANGLE", instruction: "Align item within the frame." },
    { label: "MAKER'S MARK", instruction: "Capture signature or base markings." },
    { label: "FINE DETAILS", instruction: "Focus on texture or unique wear." }
];

type ScanMode = 'MANUAL' | 'LIVE' | 'PASSPORT';

export const Scanner: React.FC<ScannerProps> = ({ onSave }) => {
  const [scanMode, setScanMode] = useState<ScanMode>('MANUAL');
  const [activeLens, setActiveLens] = useState<LensMode>('IDENTITY');
  const [passportStep, setPassportStep] = useState(0);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [liveData, setLiveData] = useState<LiveAnalysisUpdate | null>(null);
  
  const [loupePosition, setLoupePosition] = useState({ x: 50, y: 50 }); 
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [flashTriggered, setFlashTriggered] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSound = () => {
    const muted = soundManager.toggleMute();
    setSoundEnabled(!muted);
    soundManager.playClick();
    toast.info(muted ? "Audio Systems Muted" : "Audio Systems Active");
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!containerRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setLoupePosition({ x: Math.max(10, Math.min(90, x)), y: Math.max(10, Math.min(90, y)) });
  };

  useEffect(() => {
    const startCamera = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false 
        });
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (err) { 
          console.error("Camera Error:", err);
          toast.error("Camera Access Denied or Unavailable");
      }
    };
    startCamera();
    return () => stream?.getTracks().forEach(t => t.stop());
  }, []);

  useEffect(() => {
    if (!stream || scanMode !== 'LIVE') return;
    const interval = setInterval(async () => {
      const now = Date.now();
      if (videoRef.current && !isAnalyzing && (now - lastScanTime > 1500)) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth / 3; 
        canvas.height = videoRef.current.videoHeight / 3;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (activeLens === 'FORENSICS') {
            const w = canvas.width;
            const h = canvas.height;
            const cx = (loupePosition.x / 100) * w;
            const cy = (loupePosition.y / 100) * h;
            const cropSize = w * 0.4; 
            ctx.drawImage(videoRef.current, (cx - cropSize/2) * 3, (cy - cropSize/2) * 3, cropSize * 3, cropSize * 3, 0, 0, w, h);
        } else {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        }

        const data = canvas.toDataURL('image/jpeg', 0.5);
        try {
          if (!isAnalyzing) soundManager.playScanHum(); 
          const res = await analyzeLiveFrame(data, activeLens, liveData?.shortTitle);
          if (res.status !== 'SEARCHING' || liveData?.status === 'SEARCHING') {
              setLiveData(res);
              if (res.status === 'LOCKED' && (!liveData || liveData.shortTitle !== res.shortTitle)) {
                  soundManager.playLock('standard');
                  if (navigator.vibrate) navigator.vibrate(50);
              }
          }
          setLastScanTime(Date.now());
        } catch(e) { }
      }
    }, 1000); 
    return () => clearInterval(interval);
  }, [stream, activeLens, loupePosition, isAnalyzing, liveData, lastScanTime, scanMode]);

  const handleCapture = async () => {
    if (!videoRef.current) return;
    soundManager.playShutter();
    if (navigator.vibrate) navigator.vibrate([20, 50, 20]);
    setFlashTriggered(true);
    setTimeout(() => setFlashTriggered(false), 300);
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const data = canvas.toDataURL('image/jpeg', 0.95);
    
    if (scanMode === 'PASSPORT') {
        const newImages = [...capturedImages, data];
        setCapturedImages(newImages);
        if (passportStep < PASSPORT_STEPS.length - 1) {
            setPassportStep(prev => prev + 1);
            soundManager.playClick();
        } else {
            setPassportStep(0);
            runAnalysis(newImages);
        }
    } else {
        setCapturedImages([data]);
        runAnalysis([data]);
    }
  };

  const handleClearBatch = () => {
      if (capturedImages.length > 0) {
          soundManager.playClick();
          setCapturedImages([]);
          setPassportStep(0);
          toast.info("Scan Batch Cleared");
      }
  };

  const runAnalysis = async (images: string[]) => {
      setIsAnalyzing(true);
      try {
          const result = await analyzeItem(images);
          onSave(result, images[0]);
          setIsAnalyzing(false);
          setCapturedImages([]);
      } catch (e) {
          toast.error("Analysis Network Lost. Retrying...");
          setIsAnalyzing(false);
          setCapturedImages([]);
      }
  };

  const handleGallerySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        soundManager.playClick();
        const files = Array.from(e.target.files);
        const imagePromises = files.map(file => new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file as Blob);
        }));
        try {
            const images = await Promise.all(imagePromises);
            setCapturedImages(images);
            runAnalysis(images);
        } catch (err) { setIsAnalyzing(false); } 
        finally { if (fileInputRef.current) fileInputRef.current.value = ''; }
    }
  };

  const switchMode = (mode: ScanMode) => {
    setScanMode(mode);
    setCapturedImages([]);
    setPassportStep(0);
    soundManager.playClick();
  };

  return (
    <div 
        ref={containerRef} 
        className="relative h-full bg-black overflow-hidden select-none font-sans touch-none"
        onTouchMove={handleTouchMove}
        onMouseMove={handleTouchMove} 
    >
      <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover opacity-80" />
      
      {/* Cinematic Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]"></div>
      
      {flashTriggered && <div className="absolute inset-0 bg-white z-[60] animate-flash pointer-events-none"></div>}

      {/* === MANUAL MODE RETICLE === */}
      {scanMode === 'MANUAL' && !isAnalyzing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="w-72 h-72 relative flex items-center justify-center">
                  
                  {/* Outer Technical Brackets (SVG) */}
                  <svg className="absolute inset-0 w-full h-full text-white/40 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
                      {/* Top Left */}
                      <path d="M 10 30 L 10 10 L 30 10" />
                      {/* Top Right */}
                      <path d="M 70 10 L 90 10 L 90 30" />
                      {/* Bottom Right */}
                      <path d="M 90 70 L 90 90 L 70 90" />
                      {/* Bottom Left */}
                      <path d="M 30 90 L 10 90 L 10 70" />
                      
                      {/* Decorative notches */}
                      <rect x="48" y="2" width="4" height="2" fill="currentColor" opacity="0.8" />
                      <rect x="48" y="96" width="4" height="2" fill="currentColor" opacity="0.8" />
                      <rect x="2" y="48" width="2" height="4" fill="currentColor" opacity="0.8" />
                      <rect x="96" y="48" width="2" height="4" fill="currentColor" opacity="0.8" />
                  </svg>
                  
                  {/* Inner Rotating Ring */}
                  <div className="absolute inset-4 border border-dashed border-white/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
                  
                  {/* Center Crosshair */}
                  <div className="absolute w-4 h-4">
                      <div className="absolute top-1/2 left-0 w-full h-px bg-white/50"></div>
                      <div className="absolute left-1/2 top-0 h-full w-px bg-white/50"></div>
                  </div>

                  {/* Searching Scan Line */}
                  <div className="absolute top-10 bottom-10 left-10 right-10 overflow-hidden opacity-30">
                      <div className="w-full h-0.5 bg-blue-400 shadow-[0_0_15px_rgba(59,130,246,1)] animate-[scanline_2s_ease-in-out_infinite]"></div>
                  </div>
              </div>
          </div>
      )}

      {/* === PASSPORT OVERLAY === */}
      {scanMode === 'PASSPORT' && !isAnalyzing && (
          <div className="absolute top-[20%] left-0 right-0 z-30 flex justify-center pointer-events-none">
               <div className="bg-black/60 backdrop-blur-xl border border-white/10 px-8 py-4 rounded-full text-center animate-in slide-in-from-top-4 shadow-2xl flex items-center gap-4">
                   <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500">
                       <span className="text-blue-400 font-mono font-bold text-xs">{passportStep + 1}</span>
                   </div>
                   <div className="text-left">
                       <h3 className="text-white font-bold text-xs tracking-[0.2em] uppercase">{PASSPORT_STEPS[passportStep].label}</h3>
                       <p className="text-zinc-400 text-[10px] uppercase font-mono mt-0.5">{PASSPORT_STEPS[passportStep].instruction}</p>
                   </div>
               </div>
          </div>
      )}

      {/* === LOADING STATE === */}
      {isAnalyzing && (
          <div className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
              <div className="relative w-24 h-24 mb-8">
                  <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500 animate-spin"></div>
                  <div className="absolute inset-2 rounded-full border-r-2 border-blue-500 animate-[spin_1.5s_linear_infinite_reverse]"></div>
                  <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-white animate-pulse">AI</div>
              </div>
              <h3 className="font-display text-2xl text-white tracking-[0.2em] mb-2">PROCESSING</h3>
              <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">Decrypting Visual Vectors...</p>
          </div>
      )}

      {!isAnalyzing && (
        <>
            {/* Live Mode HUD */}
            {scanMode === 'LIVE' && (
                <>
                    {/* Dynamic Reticle based on Lens */}
                    <div 
                        className={`absolute w-64 h-64 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none z-30 flex items-center justify-center
                        ${activeLens === 'FORENSICS' ? 'scale-110' : 'scale-100'}
                        `}
                        style={{ left: `${loupePosition.x}%`, top: `${loupePosition.y}%`, transform: 'translate(-50%, -50%)' }}
                    >
                         {/* LENS: IDENTITY (Precision) */}
                         {activeLens === 'IDENTITY' && (
                             <>
                                <div className={`absolute inset-0 border-2 rounded-xl transition-colors duration-300 ${liveData?.status === 'LOCKED' ? 'border-emerald-500 bg-emerald-500/5' : 'border-blue-400/50'}`}></div>
                                <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-blue-400"></div>
                                <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-blue-400"></div>
                                <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-blue-400"></div>
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-blue-400"></div>
                                {/* Center Ring */}
                                <div className={`w-12 h-12 rounded-full border border-dashed transition-all duration-500 ${liveData?.status === 'LOCKED' ? 'border-emerald-400 scale-125' : 'border-white/50 animate-[spin_8s_linear_infinite]'}`}></div>
                             </>
                         )}

                         {/* LENS: MARKET (Data) */}
                         {activeLens === 'MARKET' && (
                             <>
                                <div className="absolute inset-0 border border-green-500/30 rounded-sm"></div>
                                <div className="absolute top-0 left-0 right-0 h-1 bg-green-500/50"></div>
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500/50"></div>
                                <div className="absolute left-2 top-2 text-[8px] font-mono text-green-400">VALUATION_MATRIX</div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-full h-px bg-green-500/20"></div>
                                    <div className="h-full w-px bg-green-500/20"></div>
                                </div>
                             </>
                         )}

                         {/* LENS: FORENSICS (Heat/Radar) */}
                         {activeLens === 'FORENSICS' && (
                             <>
                                <div className="absolute inset-0 rounded-full border border-amber-500/30"></div>
                                <div className="absolute inset-2 rounded-full border border-dashed border-amber-500/50 animate-[spin_4s_linear_infinite]"></div>
                                {/* Radar Sweep */}
                                <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(245,158,11,0.2)_360deg)] animate-[spin_2s_linear_infinite]"></div>
                                <div className="absolute w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_red] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
                             </>
                         )}

                         {/* LENS: DECIPHER (Text) */}
                         {activeLens === 'DECIPHER' && (
                             <>
                                <div className="absolute inset-x-0 top-0 h-8 border-b border-purple-500/50 bg-purple-500/10"></div>
                                <div className="absolute inset-x-0 bottom-0 h-8 border-t border-purple-500/50 bg-purple-500/10"></div>
                                <div className="absolute inset-0 flex flex-col justify-center gap-2 opacity-30">
                                    <div className="w-full h-1 bg-purple-400"></div>
                                    <div className="w-3/4 h-1 bg-purple-400"></div>
                                    <div className="w-5/6 h-1 bg-purple-400"></div>
                                </div>
                             </>
                         )}

                         {/* Confidence Badge (Live) */}
                         {liveData && liveData.status !== 'SEARCHING' && (
                             <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center">
                                 <div className={`px-2 py-1 rounded bg-black/80 backdrop-blur border text-[9px] font-mono font-bold uppercase tracking-widest ${liveData.status === 'LOCKED' ? 'border-emerald-500 text-emerald-400' : 'border-white/20 text-white'}`}>
                                     {liveData.status === 'LOCKED' ? 'TARGET LOCKED' : 'ANALYZING...'}
                                 </div>
                                 {liveData.shortTitle && (
                                     <div className="mt-1 text-[10px] font-bold text-white bg-black/50 px-2 py-0.5 rounded">
                                         {liveData.shortTitle}
                                     </div>
                                 )}
                             </div>
                         )}
                    </div>
                </>
            )}

            {/* Top Controls: Mode Switcher & Sound */}
            <div className="absolute top-0 left-0 right-0 p-6 pt-[calc(20px+env(safe-area-inset-top))] flex justify-between items-center z-40 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                <div className="pointer-events-auto bg-black/50 backdrop-blur-md rounded-full border border-white/10 p-0.5 flex relative">
                    {/* Active Pill Background */}
                    <div 
                        className="absolute top-0.5 bottom-0.5 rounded-full bg-white transition-all duration-300 shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                        style={{
                            left: scanMode === 'MANUAL' ? '2px' : scanMode === 'LIVE' ? '33%' : '66%',
                            width: '32%',
                            transform: scanMode === 'MANUAL' ? 'translateX(0)' : scanMode === 'LIVE' ? 'translateX(0)' : 'translateX(-2px)'
                        }}
                    ></div>
                    
                    {(['MANUAL', 'LIVE', 'PASSPORT'] as ScanMode[]).map(m => (
                        <button 
                            key={m}
                            onClick={() => switchMode(m)}
                            className={`relative px-4 py-2 text-[10px] font-bold rounded-full transition-colors z-10 w-20 text-center tracking-wide ${scanMode === m ? 'text-black' : 'text-zinc-400 hover:text-white'}`}
                        >
                            {m}
                        </button>
                    ))}
                </div>
                
                <button onClick={toggleSound} className="pointer-events-auto w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                    {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-24 left-0 right-0 z-40 flex flex-col items-center gap-8">
                
                {/* Lenses (Live Mode) */}
                {scanMode === 'LIVE' && (
                    <div className="flex gap-4 overflow-x-auto px-6 py-2 pb-4 scrollbar-hide max-w-full mask-linear-fade">
                        {LENSES.map((lens) => (
                            <button 
                                key={lens.id}
                                onClick={() => { setActiveLens(lens.id); soundManager.playClick(); }}
                                className={`flex flex-col items-center gap-2 transition-all ${activeLens === lens.id ? 'opacity-100 scale-110' : 'opacity-40 hover:opacity-70'}`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${activeLens === lens.id ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-black/50 text-white border-white/30'}`}>
                                    <lens.icon size={16} />
                                </div>
                                <span className="text-[9px] font-bold tracking-widest uppercase text-white shadow-black drop-shadow-md">{lens.label}</span>
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-8 w-full justify-center px-10">
                    
                    {/* Gallery Import */}
                    <button 
                        onClick={() => { soundManager.playClick(); fileInputRef.current?.click(); }}
                        className="w-14 h-14 rounded-full bg-zinc-900/80 backdrop-blur border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all active:scale-95"
                    >
                        <ImageIcon size={20} />
                    </button>

                    {/* Shutter Button */}
                    <button 
                        onClick={handleCapture}
                        className="relative w-24 h-24 flex items-center justify-center group"
                    >
                        <div className="absolute inset-0 rounded-full border border-white/20 scale-100 group-hover:scale-110 transition-transform duration-500"></div>
                        <div className="absolute inset-1 rounded-full border border-white/10"></div>
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 shadow-[0_0_30px_rgba(255,255,255,0.1)] ${scanMode === 'PASSPORT' ? 'bg-blue-600 shadow-blue-900/50' : scanMode === 'LIVE' ? 'bg-amber-500 shadow-amber-900/50' : 'bg-white'}`}>
                            {scanMode === 'PASSPORT' && (
                                <div className="text-white text-[10px] font-bold">{passportStep + 1}/3</div>
                            )}
                        </div>
                    </button>

                    {/* Passport Stack Manager */}
                    <button 
                        onClick={handleClearBatch}
                        disabled={capturedImages.length === 0}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all border
                            ${capturedImages.length > 0 
                                ? 'bg-zinc-900 text-white border-white/30 hover:border-red-500 hover:text-red-500' 
                                : 'bg-zinc-900/50 text-zinc-700 border-white/5 cursor-default'
                            }`}
                    >
                        {capturedImages.length > 0 ? (
                            <div className="relative w-full h-full flex items-center justify-center group">
                                <div className="absolute inset-0.5 rounded-full overflow-hidden opacity-50 group-hover:opacity-20 transition-opacity">
                                    <img src={capturedImages[capturedImages.length-1]} className="w-full h-full object-cover" />
                                </div>
                                <div className="relative z-10 flex flex-col items-center">
                                     <Layers size={16} />
                                     <span className="text-[9px] font-bold mt-0.5">{capturedImages.length}</span>
                                </div>
                            </div>
                        ) : (
                            <Layers size={20} />
                        )}
                    </button>
                </div>
            </div>
        </>
      )}
      <input type="file" multiple accept="image/*" ref={fileInputRef} className="hidden" onChange={handleGallerySelect} />
    </div>
  );
};
