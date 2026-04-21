
import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { FileText, Search, DollarSign, Fingerprint, Languages, Volume2, VolumeX, Image as ImageIcon, Shield, Camera, Zap, Target, X, ChevronRight, Layers, Scan } from 'lucide-react';
import { analyzeItem, analyzeLiveFrame } from '../services/geminiService';
import { AppraisalResult, LiveAnalysisUpdate, LensMode } from '../types';
import { soundManager } from '../services/soundService';
import { toast } from './Toast';

interface ScannerProps {
  onSave: (result: AppraisalResult, imageData: string) => void;
}

export interface ScannerRef {
  capture: () => void;
}

const LENSES: { id: LensMode; label: string; icon: any; }[] = [
  { id: 'IDENTITY', label: 'Identity', icon: Search },
  { id: 'MARKET', label: 'Valuation', icon: DollarSign },
  { id: 'FORENSICS', label: 'Forensics', icon: Fingerprint },
  { id: 'RESTORE', label: 'Restore', icon: Layers },
  { id: 'DECIPHER', label: 'Text', icon: Languages },
];

const PASSPORT_STEPS = [
    { label: "PRIMARY ANGLE", instruction: "Align item within the frame." },
    { label: "MAKER'S MARK", instruction: "Capture signature or base markings." },
    { label: "FINE DETAILS", instruction: "Focus on texture or unique wear." }
];

type ScanMode = 'MANUAL' | 'LIVE' | 'PASSPORT';

export const Scanner = forwardRef<ScannerRef, ScannerProps>(({ onSave }, ref) => {
  const [scanMode, setScanMode] = useState<ScanMode>('MANUAL');
  const [activeLens, setActiveLens] = useState<LensMode>('IDENTITY');
  const [passportStep, setPassportStep] = useState(0);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [userDescription, setUserDescription] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [liveData, setLiveData] = useState<LiveAnalysisUpdate | null>(null);
  
  const [loupePosition, setLoupePosition] = useState({ x: 50, y: 50 }); 
  const [soundEnabled, setSoundEnabled] = useState(!soundManager.getMutedState());
  const [flashTriggered, setFlashTriggered] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPinching, setIsPinching] = useState(false);
  const lastPinchDistance = useRef<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProcessingLiveFrame = useRef(false);

  const triggerHaptic = useCallback((pattern: 'success' | 'click' | 'transition' | 'alert' | 'hotspot') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        switch (pattern) {
            case 'success': navigator.vibrate([150, 50, 150]); break;
            case 'click': navigator.vibrate(20); break;
            case 'transition': navigator.vibrate([30, 50, 30]); break;
            case 'alert': navigator.vibrate([200, 50, 200, 50, 200]); break;
            case 'hotspot': navigator.vibrate([50, 30, 50, 30, 50]); break;
        }
    }
  }, []);

  useEffect(() => {
    const unsub = soundManager.subscribe((isMuted) => {
        setSoundEnabled(!isMuted);
    });
    return () => { unsub(); };
  }, []);

  const toggleSound = () => {
    const isNowMuted = soundManager.toggleMute();
    soundManager.playClick();
    triggerHaptic('click');
    toast.info(isNowMuted ? "Audio Systems Offline" : "Audio Systems Active");
  };

  const getDistance = (t1: React.Touch, t2: React.Touch) => {
    return Math.sqrt(Math.pow(t2.clientX - t1.clientX, 2) + Math.pow(t2.clientY - t1.clientY, 2));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setIsPinching(true);
      lastPinchDistance.current = getDistance(e.touches[0], e.touches[1]);
    }
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!containerRef.current) return;

    // Handle Pinch to Zoom
    if ('touches' in e && e.touches.length === 2) {
      const distance = getDistance(e.touches[0], e.touches[1]);
      if (lastPinchDistance.current !== null) {
        const delta = (distance - lastPinchDistance.current) / 100;
        setZoomLevel(prev => Math.max(1, Math.min(5, prev + delta)));
        lastPinchDistance.current = distance;
      }
      return;
    }

    if (isPinching) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setLoupePosition({ x: Math.max(10, Math.min(90, x)), y: Math.max(10, Math.min(90, y)) });
  };

  const handleTouchEnd = () => {
    setIsPinching(false);
    lastPinchDistance.current = null;
  };

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    
    const startCamera = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false 
        });
        activeStream = s;
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (err) { 
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({ 
              video: { width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false 
            });
            activeStream = fallbackStream;
            setStream(fallbackStream);
            if (videoRef.current) videoRef.current.srcObject = fallbackStream;
          } catch (fallbackErr) {
            console.error("Camera Error:", fallbackErr);
            toast.error("Camera Access Denied or Unavailable");
          }
      }
    };
    
    startCamera();
    
    return () => {
        if (activeStream) {
            activeStream.getTracks().forEach(t => t.stop());
        }
    };
  }, []);

  useEffect(() => {
    if (!stream || scanMode !== 'LIVE') {
        isProcessingLiveFrame.current = false;
        return;
    }
    
    const interval = setInterval(async () => {
      if (videoRef.current && !isAnalyzing && !isProcessingLiveFrame.current) {
        isProcessingLiveFrame.current = true;
        
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth / 3; 
        canvas.height = videoRef.current.videoHeight / 3;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            isProcessingLiveFrame.current = false;
            return;
        }

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
          
          if (scanMode === 'LIVE') {
              if (res.status !== 'SEARCHING' || liveData?.status === 'SEARCHING') {
                  setLiveData(res);
                  
                  // Trigger hotspot haptic if just detected
                  if (res.hotspotDetected && !liveData?.hotspotDetected) {
                      triggerHaptic('hotspot');
                  }

                  if (res.status === 'LOCKED' && (!liveData || liveData.shortTitle !== res.shortTitle)) {
                      soundManager.playLock('standard');
                      triggerHaptic('success');
                  }
              }
          }
        } catch(e) { 
            console.error("Live frame analysis failed", e);
        } finally {
            setTimeout(() => {
                isProcessingLiveFrame.current = false;
            }, 1000);
        }
      }
    }, 500); 
    
    return () => clearInterval(interval);
  }, [stream, activeLens, loupePosition, isAnalyzing, liveData, scanMode]);

  const handleCapture = async () => {
    if (!videoRef.current) return;
    soundManager.playShutter();
    triggerHaptic('transition');
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
            triggerHaptic('click');
        } else {
            setPassportStep(0);
            runAnalysis(newImages);
        }
    } else {
        setCapturedImages([data]);
        runAnalysis([data]);
    }
  };

  useImperativeHandle(ref, () => ({
    capture: handleCapture
  }));

  const handleClearBatch = () => {
      if (capturedImages.length > 0) {
          soundManager.playClick();
          triggerHaptic('alert');
          setCapturedImages([]);
          setPassportStep(0);
          toast.info("Scan Batch Cleared");
      }
  };

  const runAnalysis = async (images: string[]) => {
      setIsAnalyzing(true);
      try {
          const result = await analyzeItem(images, userDescription);
          onSave(result, images[0]);
          setIsAnalyzing(false);
          setCapturedImages([]);
          setUserDescription("");
          setShowForm(false);
      } catch (e) {
          triggerHaptic('alert');
          toast.error("Analysis Network Lost. Retrying...");
          setIsAnalyzing(false);
          setCapturedImages([]);
      }
  };

  const handleGallerySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        soundManager.playClick();
        triggerHaptic('click');
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
    console.log("[ScanTerminal] Mode switch triggered:", mode);
    setScanMode(mode);
    setCapturedImages([]);
    setPassportStep(0);
    setLiveData(null);
    soundManager.playClick();
    triggerHaptic('click');
  };

  return (
    <div 
        ref={containerRef} 
        className="relative h-full bg-black overflow-hidden select-none font-sans touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseMove={handleTouchMove} 
    >
      <div className={`relative w-full h-full overflow-hidden transition-all duration-300 ${zoomLevel > 1 ? 'scale-[1.02]' : ''}`}>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${activeLens === 'RESTORE' ? 'sepia hue-rotate-[180deg] brightness-[0.7] contrast-[1.4] saturate-[1.5] opacity-90' : 'opacity-80'}`} 
            style={{ transform: `scale(${zoomLevel})` }}
          />

          {/* Blueprint Grid Overlay for RESTORE */}
          {activeLens === 'RESTORE' && (
              <div className="absolute inset-0 pointer-events-none mix-blend-screen opacity-50 z-10 transition-opacity duration-500">
                  <div className="w-full h-full bg-[linear-gradient(rgba(59,130,246,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.3)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 via-transparent to-blue-900/40"></div>
              </div>
          )}
      </div>
      
      {/* Cinematic Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]"></div>
      
      {flashTriggered && <div className="absolute inset-0 bg-white z-[60] animate-flash pointer-events-none"></div>}

      {/* === MANUAL MODE RETICLE === */}
      {scanMode === 'MANUAL' && !isAnalyzing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 mix-blend-screen">
              <div className="w-[65%] max-w-sm aspect-square relative flex items-center justify-center">
                  
                  {/* Subtle Tactical Brackets */}
                  <div className="absolute inset-0 border border-white/5 bg-white/[0.01] backdrop-blur-[1px] rounded-2xl"></div>
                  
                  {/* Corner Brackets */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-white/20 rounded-tl-2xl"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-white/20 rounded-tr-2xl"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-white/20 rounded-bl-2xl"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-white/20 rounded-br-2xl"></div>
                  
                  {/* Center Dot */}
                  <div className="w-1 h-1 bg-white rounded-full shadow-[0_0_10px_white]"></div>

                  {/* Minimalist Readouts */}
                  <div className="absolute bottom-4 left-6 flex items-center gap-2">
                      <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
                      <span className="text-[8px] font-mono text-white/40 tracking-[0.3em] uppercase">Optics_Rdy</span>
                  </div>

                  {/* Minimalist Grid Guides */}
                  <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-[0.5px] bg-white/10"></div>
                      <div className="h-12 w-[0.5px] bg-white/10 absolute"></div>
                  </div>

                  {/* Rule of Thirds Grid (Very Subtle) */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
                      <div className="border-r-[0.5px] border-b-[0.5px] border-white/30"></div>
                      <div className="border-r-[0.5px] border-b-[0.5px] border-white/30"></div>
                      <div className="border-b-[0.5px] border-white/30"></div>
                      <div className="border-r-[0.5px] border-b-[0.5px] border-white/30"></div>
                      <div className="border-r-[0.5px] border-b-[0.5px] border-white/30"></div>
                      <div className="border-b-[0.5px] border-white/30"></div>
                      <div className="border-r-[0.5px] border-white/30"></div>
                      <div className="border-r-[0.5px] border-white/30"></div>
                      <div></div>
                  </div>
              </div>
          </div>
      )}

      {/* === PASSPORT OVERLAY === */}
      {scanMode === 'PASSPORT' && !isAnalyzing && (
          <>
              <div className="absolute top-[15%] left-0 right-0 z-30 flex justify-center pointer-events-none px-6">
                   <div className="relative bg-black/80 border border-orange-500/20 px-8 py-5 text-center animate-in slide-in-from-top-4 shadow-[0_10px_50px_rgba(0,0,0,0.8)] flex items-center gap-6 rounded-[2.5rem] backdrop-blur-3xl transition-all duration-500 group overflow-hidden">
                       
                       {/* Animated Scanning Border Effect */}
                       <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-orange-500/40 to-transparent animate-scan"></div>
                       <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-orange-500/40 to-transparent animate-scan delay-1000"></div>

                       {/* Enhanced Step Indicator */}
                       <div key={passportStep} className="relative w-14 h-14 shrink-0">
                           <div className="absolute inset-0 bg-orange-500/20 rounded-2xl animate-pulse"></div>
                           <div className="absolute inset-0 border border-orange-500/40 rounded-2xl flex items-center justify-center shadow-[inset_0_0_20px_rgba(249,115,22,0.15)] animate-in zoom-in spin-in-12 duration-700">
                               <span className="text-orange-400 font-display font-bold text-2xl tracking-tighter shadow-orange-500/40 drop-shadow-md">{passportStep + 1}</span>
                           </div>
                           {/* Orbiting Ring */}
                           <div className="absolute -inset-1 border border-orange-500/10 rounded-2xl animate-[spin_4s_linear_infinite]"></div>
                       </div>
                       
                       <div className="text-left py-1">
                           <div className="flex items-center gap-2 mb-1">
                               <h3 className="text-white font-display text-lg italic tracking-tight animate-in slide-in-from-left-4 duration-500" key={`label-${passportStep}`}>
                                   {PASSPORT_STEPS[passportStep].label}
                               </h3>
                               <div className="w-1 h-1 rounded-full bg-orange-500/60 animate-pulse"></div>
                           </div>
                           <p className="text-zinc-400 text-[10px] uppercase font-mono tracking-[0.2em] animate-in slide-in-from-left-4 duration-700" key={`inst-${passportStep}`}>
                               {PASSPORT_STEPS[passportStep].instruction}
                           </p>
                       </div>

                       {/* Enhanced Progress Indicators */}
                       <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                           {PASSPORT_STEPS.map((_, idx) => (
                               <div 
                                 key={idx} 
                                 className={`h-1.5 rounded-full transition-all duration-1000 ease-[cubic-bezier(0.87,0,0.13,1)] ${idx === passportStep ? 'w-12 bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,1)]' : idx < passportStep ? 'w-4 bg-orange-500/30' : 'w-4 bg-white/5'}`} 
                               />
                           ))}
                       </div>
                   </div>
              </div>

              {/* Dynamic Passport Framing Cues */}
              <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center mix-blend-screen">
                    {passportStep === 0 && (
                        <div className="w-[80%] h-[60%] border-2 border-white/20 rounded-[40px] relative animate-in zoom-in duration-500">
                             <div className="absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-orange-500/80 rounded-tl-[40px]"></div>
                             <div className="absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-orange-500/80 rounded-tr-[40px]"></div>
                             <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-orange-500/80 rounded-bl-[40px]"></div>
                             <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-orange-500/80 rounded-br-[40px]"></div>
                             <div className="absolute inset-0 flex items-center justify-center opacity-30">
                                  <div className="h-full w-[1px] bg-white/20"></div>
                                  <div className="w-full h-[1px] bg-white/20 absolute"></div>
                             </div>
                        </div>
                    )}
                    
                    {passportStep === 1 && (
                        <div className="w-64 h-64 border-[1px] border-white/30 rounded-full animate-in zoom-in duration-500">
                             <div className="absolute inset-0 border-[1px] border-orange-500/50 border-dashed rounded-full animate-[spin_10s_linear_infinite]"></div>
                             <div className="absolute right-[-40px] top-1/2 -translate-y-1/2 text-[9px] font-mono text-orange-500 uppercase tracking-widest w-24">Macro Focus</div>
                             <div className="absolute inset-0 flex items-center justify-center">
                                 <div className="w-32 h-32 border-[2px] border-orange-500/80 relative text-center flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.2)]">
                                     <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white"></div>
                                     <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white"></div>
                                     <div className="w-1 h-1 bg-orange-500 rounded-full animate-pulse"></div>
                                 </div>
                             </div>
                        </div>
                    )}

                    {passportStep === 2 && (
                        <div className="w-[70%] h-[50%] grid grid-cols-4 grid-rows-4 gap-2 animate-in fade-in duration-500">
                             {Array.from({length: 16}).map((_, i) => {
                                 const isCenter = [5, 6, 9, 10].includes(i);
                                 return (
                                     <div key={i} className={`border-[1px] ${isCenter ? 'border-orange-500/50 bg-orange-500/5 shadow-[inset_0_0_15px_rgba(249,115,22,0.2)]' : 'border-white/5'} rounded-xl transition-all duration-1000 flex items-center justify-center`}>
                                         {isCenter && <div className="w-[2px] h-[2px] bg-orange-500/50 rounded-full"></div>}
                                     </div>
                                 );
                             })}
                        </div>
                    )}
              </div>
          </>
      )}

      {/* === LOADING STATE === */}
      {isAnalyzing && (
          <div className="absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
              
              {/* Premium Processing Visual */}
              <div className="relative w-48 h-48 mb-16">
                  {/* Rotating Structural Rings */}
                  <div className="absolute inset-0 border-[0.5px] border-orange-500/10 rounded-full"></div>
                  <div className="absolute inset-4 border-[0.5px] border-red-500/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
                  <div className="absolute inset-8 border-[0.5px] border-orange-500/30 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
                  
                  {/* Pulse Field */}
                  <div className="absolute inset-12 bg-orange-500/5 rounded-full animate-pulse"></div>

                  <div className="absolute inset-0 flex items-center justify-center">
                       {/* Hexagon Fragmenter */}
                       <div className="w-24 h-24 bg-orange-500/10 border border-orange-500/40 shadow-[0_0_60px_rgba(249,115,22,0.2)] flex flex-col items-center justify-center overflow-hidden" 
                            style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                            
                            {/* Scanning Line inside Hexagon */}
                            <div className="absolute inset-x-0 h-1 bg-orange-500/40 animate-[scanline_2s_ease-in-out_infinite]"></div>
                            
                            {/* Decrypting Numbers */}
                            <div className="flex flex-col items-center gap-0.5 opacity-40">
                                <span className="text-[7px] font-mono text-white animate-pulse">0x8F2A</span>
                                <span className="text-[7px] font-mono text-white animate-pulse delay-75">39.012</span>
                                <span className="text-[7px] font-mono text-white animate-pulse delay-150">SYNC_77</span>
                            </div>
                       </div>
                  </div>
                  
                  {/* Orbital Trackers (Fitted with glowing particles) */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-gradient-to-t from-orange-500 to-transparent animate-[spin_4s_linear_infinite]" style={{ transformOrigin: '50% 96px' }}>
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-orange-500 rounded-full shadow-[0_0_15px_rgba(249,115,22,1)]"></div>
                  </div>
                  
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-gradient-to-t from-red-500 to-transparent animate-[spin_2.5s_linear_infinite_reverse]" style={{ transformOrigin: '50% 88px' }}>
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,1)]"></div>
                  </div>
              </div>
              
              {/* Typography & Decryption Feedback */}
              <div className="text-center relative">
                  <div className="flex items-baseline justify-center gap-4 mb-4">
                      <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-orange-500/40"></div>
                      <h3 className="font-display text-4xl text-white tracking-[0.5em] drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] uppercase italic">Synthesis</h3>
                      <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-orange-500/40"></div>
                  </div>
                  
                  <div className="relative flex flex-col items-center">
                      <div className="flex items-center gap-3 px-6 py-2 bg-zinc-950 border border-white/5 rounded-full backdrop-blur-xl">
                          <Zap size={12} className="text-orange-500 animate-pulse" />
                          <div className="text-orange-500 font-mono text-[10px] uppercase tracking-[0.4em] font-bold">
                              {/* Decryption Text Animation */}
                              <span className="inline-block animate-[text_decrypt_3s_infinite] overflow-hidden whitespace-nowrap">
                                  Processing Visual Vectors...
                              </span>
                          </div>
                      </div>
                      
                      <div className="mt-8 grid grid-cols-5 gap-1.5 opacity-20">
                          {[...Array(5)].map((_, i) => (
                              <div key={i} className={`h-1 w-8 rounded-full bg-orange-500 animate-pulse`} style={{ animationDelay: `${i * 150}ms` }} />
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {!isAnalyzing && (
        <>
            {/* Live Mode HUD */}
            {scanMode === 'LIVE' && (
                <>
                    {/* Dynamic Reticle based on Lens */}
                    <div 
                        className={`absolute w-64 h-64 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none z-30 flex items-center justify-center mix-blend-screen
                        ${activeLens === 'FORENSICS' ? 'scale-110' : 'scale-100'}
                        `}
                        style={{ left: `${loupePosition.x}%`, top: `${loupePosition.y}%`, transform: 'translate(-50%, -50%)' }}
                    >
                         {/* Unified Thin Pulsing Ring Reticle */}
                         <div className={`absolute inset-0 rounded-full border-[2px] transition-all duration-700 ease-out flex items-center justify-center
                             ${activeLens === 'IDENTITY' ? 'border-blue-500 text-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.5)]' : 
                               activeLens === 'MARKET' ? 'border-emerald-500 text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.5)]' : 
                               activeLens === 'FORENSICS' ? 
                                 (liveData?.hotspotDetected || (liveData?.confidence ?? 0) > 80 ? 'border-red-600 text-red-600 shadow-[0_0_40px_rgba(220,38,38,0.7)]' : 'border-amber-500 text-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.6)]') : 
                               activeLens === 'RESTORE' ? 'border-orange-500 text-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.5)] bg-orange-500/10 border-dashed' :
                               'border-purple-500 text-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.5)]'}
                             ${liveData?.status === 'LOCKED' ? 'scale-[2.5] opacity-0 border-[6px]' : 'scale-100 opacity-100 animate-pulse'}
                         `}></div>
                         
                         {/* Subtle Blue Glow Effect for IDENTITY Lens */}
                         <div className={`absolute inset-0 rounded-full transition-all duration-1000 ${activeLens === 'IDENTITY' && liveData?.status !== 'LOCKED' ? 'bg-blue-500/10 shadow-[inset_0_0_40px_rgba(59,130,246,0.4)] scale-110 opacity-100' : 'opacity-0 scale-90'}`}></div>
                         
                         {/* RESTORE Blueprint Crosshairs */}
                         {activeLens === 'RESTORE' && (
                             <div className="absolute inset-[-20%] pointer-events-none">
                                 <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-orange-500/50 -translate-y-1/2 before:content-[''] before:absolute before:left-1/2 before:-translate-x-1/2 before:-top-1 before:w-1 before:h-2 before:bg-orange-500/80"></div>
                                 <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-orange-500/50 -translate-x-1/2 before:content-[''] before:absolute before:top-1/2 before:-translate-y-1/2 before:-left-1 before:h-1 before:w-2 before:bg-orange-500/80"></div>
                             </div>
                         )}

                         {/* Inner Tracking Ring */}
                         <div className={`absolute inset-[15%] rounded-full border-[1px] border-dashed transition-all duration-1000 ease-out
                             ${activeLens === 'IDENTITY' ? 'border-blue-400/50' : 
                               activeLens === 'MARKET' ? 'border-emerald-400/50' : 
                               activeLens === 'FORENSICS' ? 'border-amber-400/50' : 
                               activeLens === 'RESTORE' ? 'border-orange-400/80 border-dotted' :
                               'border-purple-400/50'}
                             ${liveData?.status === 'LOCKED' ? 'scale-[1.8] opacity-0 animate-[spin_1s_ease-out_reverse]' : 'scale-100 opacity-80 animate-[spin_8s_linear_infinite]'}
                         `}></div>

                         {/* Center Core */}
                         <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 bg-current shadow-[0_0_8px_currentcolor]
                             ${activeLens === 'IDENTITY' ? 'text-blue-500' : 
                               activeLens === 'MARKET' ? 'text-emerald-500' : 
                               activeLens === 'FORENSICS' ? 'text-amber-500' : 
                               activeLens === 'RESTORE' ? 'text-orange-500 rounded-none w-2 h-2' :
                               'text-purple-500'}
                             ${liveData?.status === 'LOCKED' ? 'scale-0' : 'scale-100'}
                         `}></div>

                         {/* Lens-specific HUD Additions */}
                         {activeLens === 'FORENSICS' && liveData?.hotspotDetected && (
                             <>
                                 <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(245,158,11,0.2)_360deg)] rounded-full animate-[spin_2s_linear_infinite]"></div>
                                 <div className="absolute top-4 right-4 flex items-center gap-2 animate-pulse bg-black/60 px-2 py-1 rounded border border-amber-500/30">
                                     <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                     <span className="text-[8px] font-mono font-bold text-amber-500 tracking-widest uppercase">Hotspot_Det</span>
                                 </div>
                             </>
                         )}

                         {activeLens === 'MARKET' && (
                             <div className={`absolute bottom-2 right-2 flex gap-1 transition-opacity duration-300 ${liveData?.status === 'LOCKED' ? 'opacity-0' : 'opacity-100'}`}>
                                 <div className="w-1 h-2 bg-emerald-500/60 animate-[pulse_1.5s_infinite]"></div>
                                 <div className="w-1 h-3 bg-emerald-500/80 animate-[pulse_1.5s_infinite_200ms]"></div>
                                 <div className="w-1 h-1.5 bg-emerald-500/40 animate-[pulse_1.5s_infinite_400ms]"></div>
                             </div>
                         )}

                         {activeLens === 'DECIPHER' && (
                             <div className={`absolute inset-x-4 top-1/2 h-[1px] bg-purple-500/50 shadow-[0_0_10px_purple] animate-[scanline_2s_ease-in-out_infinite] transition-opacity duration-300 ${liveData?.status === 'LOCKED' ? 'opacity-0' : 'opacity-100'}`}></div>
                         )}

                         {/* Confidence Badge (Live) */}
                         {liveData && liveData.status !== 'SEARCHING' && (
                             <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
                                 <div className={`px-3 py-1 bg-black/90 border-[1px] text-[10px] font-mono font-bold uppercase tracking-widest shadow-lg ${liveData.status === 'LOCKED' ? 'border-orange-500 text-orange-500 shadow-orange-500/20' : 'border-amber-500/50 text-amber-500'}`}>
                                     {liveData.status === 'LOCKED' ? 'TARGET LOCKED' : 'ANALYZING...'}
                                 </div>
                                 {liveData.shortTitle && (
                                     <div className="mt-1.5 text-[11px] font-bold text-white bg-black/80 border-[1px] border-white/10 px-3 py-1 uppercase tracking-wider">
                                         {liveData.shortTitle}
                                     </div>
                                 )}
                             </div>
                         )}
                    </div>
                </>
            )}

            {/* Top Controls: Mode Switcher & Sound */}
            <div className="absolute top-0 left-0 right-0 p-6 pt-[calc(20px+env(safe-area-inset-top))] flex justify-between items-center z-40 bg-gradient-to-b from-black/90 to-transparent pointer-events-none">
                <div className="pointer-events-auto flex gap-4">
                    {(['MANUAL', 'LIVE', 'PASSPORT'] as ScanMode[]).map(m => (
                        <button 
                            key={m}
                            onClick={() => switchMode(m)}
                            className={`text-[10px] font-bold transition-colors z-10 tracking-widest uppercase ${scanMode === m ? 'text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]' : 'text-white/40 hover:text-white/70'}`}
                        >
                            {m}
                        </button>
                    ))}
                </div>
                
                <button onClick={toggleSound} className="pointer-events-auto w-10 h-10 flex items-center justify-center text-white/40 hover:text-white transition-colors">
                    {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
            </div>

            {/* === DOSSIER FORM === */}
            <div className="absolute left-6 bottom-32 z-50 pointer-events-none group">
                <button 
                onClick={() => { soundManager.playClick(); triggerHaptic('transition'); setShowForm(!showForm); }}
                className={`pointer-events-auto h-12 px-5 flex items-center gap-3 rounded-full border transition-all duration-300 ${showForm || userDescription ? 'bg-white text-black border-white shadow-[0_10px_30px_rgba(255,255,255,0.2)]' : 'bg-black/60 backdrop-blur-3xl text-zinc-400 border-white/5 hover:bg-zinc-800'}`}
                >
                <FileText size={18} />
                <span className="text-[9px] font-bold uppercase tracking-[0.2em]">{userDescription ? 'Dossier_Attached' : 'Add_Context'}</span>
                </button>
 
                {showForm && (
                    <div className="absolute bottom-16 left-0 w-72 bg-zinc-950/90 backdrop-blur-3xl border border-white/5 p-6 rounded-3xl pointer-events-auto animate-in slide-in-from-bottom-4 duration-500 shadow-2xl">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.3em]">Evidence Log</h3>
                            <button onClick={() => setShowForm(false)} className="text-zinc-600 hover:text-white transition-colors">
                                <X size={14} />
                            </button>
                        </div>
                        <textarea 
                        value={userDescription}
                        onChange={(e) => setUserDescription(e.target.value)}
                        placeholder="Contextual forensic notes..."
                        className="w-full h-32 bg-zinc-900/50 border border-white/5 rounded-2xl p-4 text-xs text-white placeholder:text-zinc-700 focus:outline-none focus:border-white/10 transition-colors resize-none font-sans"
                        />
                        <div className="mt-4 flex items-center justify-between text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
                            <span>Status: {userDescription.length > 0 ? 'Linked' : 'Ready'}</span>
                            <span>{userDescription.length} chars</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 z-50 pointer-events-none h-64 group/zoom">
                <span className="text-[8px] font-mono text-orange-500/60 uppercase tracking-widest [writing-mode:vertical-lr] rotate-180">Mag_Level</span>
                <div className="relative flex-1 w-8 flex justify-center py-2 pointer-events-auto">
                    {/* Slider Track */}
                    <input 
                        type="range"
                        min="1"
                        max="5"
                        step="0.1"
                        value={zoomLevel}
                        onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                        className="appearance-none bg-white/10 w-4 h-full rounded-full border border-white/5 cursor-pointer accent-orange-500 hover:bg-white/20 transition-all [writing-mode:bt-lr] -rotate-180"
                        style={{ WebkitAppearance: 'slider-vertical' }}
                    />
                </div>
                <div className="bg-black/80 backdrop-blur-md border border-orange-500/30 px-2 py-1 rounded shadow-lg pointer-events-auto">
                    <span className="text-[10px] font-mono text-orange-500 font-bold">{zoomLevel.toFixed(1)}x</span>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-32 left-0 right-0 z-40 flex flex-col items-center gap-8">
                
                {/* Lenses (Live Mode) */}
                {scanMode === 'LIVE' && (
                    <div className="flex gap-8 overflow-x-auto px-12 py-4 scrollbar-hide max-w-full mask-linear-fade items-center">
                        {LENSES.map((lens) => (
                            <button 
                                key={lens.id}
                                onClick={() => { setActiveLens(lens.id); soundManager.playClick(); triggerHaptic('click'); }}
                                className={`flex flex-col items-center gap-3 transition-all duration-500 ${activeLens === lens.id ? 'opacity-100 scale-110' : 'opacity-30 hover:opacity-50'}`}
                            >
                                <div className={`w-14 h-14 flex items-center justify-center border transition-all duration-500 rounded-2xl ${activeLens === lens.id ? 'bg-white text-black border-white shadow-[0_20px_40px_rgba(255,255,255,0.15)] ring-4 ring-white/10' : 'bg-zinc-900/40 text-white border-white/5'}`}>
                                    <lens.icon size={20} className={activeLens === lens.id ? 'scale-110' : ''} />
                                </div>
                                <span className="text-[8px] font-bold tracking-[0.3em] uppercase text-white shadow-black drop-shadow-md">{lens.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </>
      )}
      <input type="file" id="gallery-upload-input" multiple accept="image/*" ref={fileInputRef} className="hidden" onChange={handleGallerySelect} />
    </div>
  );
});

