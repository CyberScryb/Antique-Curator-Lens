
import React from 'react';
import { AppraisalResult } from '../types';
import { ScanSearch, AlertTriangle, Fingerprint } from 'lucide-react';

interface CuratorsInsightProps {
  result: AppraisalResult;
}

export const CuratorsInsight: React.FC<CuratorsInsightProps> = ({ result }) => {
  // === LOGIC GATE ===
  // 1. Classification Check: Must be 'Antique' or 'Vintage'
  // 2. Confidence Check: Must be > 0.85
  const isEligible = (result.classification === 'Antique' || result.classification === 'Vintage') && result.confidence > 0.85;

  if (!isEligible) {
    return null;
  }

  // Fallback if the AI didn't generate the specific field despite being eligible
  if (!result.forensicInsight) return null;

  const isInsufficient = result.forensicInsight.includes("Insufficient visual data");

  return (
    <div className="mb-4 animate-in slide-in-from-bottom duration-500">
      <div className={`
        relative overflow-hidden rounded-xl border p-5
        ${isInsufficient 
          ? 'bg-zinc-900/50 border-zinc-700' 
          : 'bg-gradient-to-br from-amber-950/20 to-black border-amber-500/30'
        }
      `}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-3 relative z-10">
          <div className={`p-2 rounded-lg ${isInsufficient ? 'bg-zinc-800 text-zinc-400' : 'bg-amber-500/10 text-amber-400'}`}>
             {isInsufficient ? <AlertTriangle size={18} /> : <ScanSearch size={18} />}
          </div>
          <div>
            <h3 className={`text-xs font-bold uppercase tracking-[0.2em] ${isInsufficient ? 'text-zinc-400' : 'text-amber-200'}`}>
              Curator's Insight
            </h3>
            {!isInsufficient && (
              <p className="text-[9px] text-amber-500/60 uppercase font-mono mt-0.5">Senior Forensic Appraiser</p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10">
          <p className={`font-serif text-sm leading-relaxed italic ${isInsufficient ? 'text-zinc-500' : 'text-amber-50'}`}>
            "{result.forensicInsight}"
          </p>
        </div>

        {/* Footer decoration */}
        {!isInsufficient && (
          <div className="mt-4 flex items-center justify-between border-t border-amber-500/20 pt-2 opacity-60">
             <span className="text-[8px] font-mono text-amber-400 uppercase">Analysis: Physical Tells</span>
             <span className="text-[8px] font-mono text-amber-400 uppercase">Confidence: {(result.confidence * 100).toFixed(0)}%</span>
          </div>
        )}
      </div>
    </div>
  );
};
