
import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} onDismiss={() => removeToast(t.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<ToastMessage & { onDismiss: () => void }> = ({ type, message, onDismiss, duration = 3000 }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onDismiss, 300); // Wait for exit animation
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const styles = {
    success: 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400',
    error: 'bg-red-500/10 border-red-500/50 text-red-400',
    info: 'bg-blue-500/10 border-blue-500/50 text-blue-400'
  };

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info
  };

  const Icon = icons[type];

  return (
    <div 
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-300 ${styles[type]} ${isExiting ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0 animate-in slide-in-from-top-4'}`}
    >
      <Icon size={18} />
      <span className="text-xs font-bold tracking-wide uppercase flex-1 shadow-black drop-shadow-sm">{message}</span>
      <button onClick={() => { setIsExiting(true); setTimeout(onDismiss, 300); }} className="opacity-50 hover:opacity-100 transition-opacity">
        <X size={14} />
      </button>
    </div>
  );
};

// Global Event Bus for Toasts (Simpler than Context for this scale)
export const toast = {
  listeners: new Set<(t: ToastMessage) => void>(),
  show(message: string, type: ToastType = 'info') {
    const t = { id: Math.random().toString(36), message, type, duration: 4000 };
    this.listeners.forEach(l => l(t));
  },
  success(msg: string) { this.show(msg, 'success'); },
  error(msg: string) { this.show(msg, 'error'); },
  info(msg: string) { this.show(msg, 'info'); }
};
