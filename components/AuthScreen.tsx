import React, { useState } from 'react';
import { auth } from '../services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { Lock, Mail, User, ShieldCheck, ArrowRight } from 'lucide-react';
import { toast } from './Toast';

export const AuthScreen: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                toast.success("Authentication successful");
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
                toast.success("Account created successfully");
            }
        } catch (error: any) {
            toast.error(error.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            toast.success("Google sign-in successful");
        } catch (error: any) {
            toast.error(error.message || "Google sign-in failed");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-6 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(59,130,246,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-500/10 blur-[160px] rounded-full mix-blend-screen animate-pulse"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-500/10 blur-[160px] rounded-full mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }}></div>

            <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-500">
                <div className="bg-zinc-950/40 backdrop-blur-3xl border border-white/5 rounded-[40px] p-8 shadow-2xl overflow-hidden relative">
                    {/* Top Accent */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-purple-500 opacity-30"></div>
                    
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-white/5 border border-white/10 mb-6 group hover:border-white/20 transition-all duration-500">
                            <Lock size={24} className="text-white opacity-80 group-hover:scale-110 transition-transform" />
                        </div>
                        <h1 className="text-3xl font-display text-white tracking-widest uppercase mb-2">Protocol_Access</h1>
                        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em]">CyberScryb Wealth & Heritage Engine</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest ml-4">Credentials</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" size={16} />
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="NODE_EMAIL" 
                                    className="w-full pl-12 pr-4 py-4 bg-zinc-900/50 border border-white/5 rounded-2xl text-xs text-white placeholder:text-zinc-800 focus:outline-none focus:border-white/10 transition-all font-mono"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" size={16} />
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="ACCESS_KEY" 
                                    className="w-full pl-12 pr-4 py-4 bg-zinc-900/50 border border-white/5 rounded-2xl text-xs text-white placeholder:text-zinc-800 focus:outline-none focus:border-white/10 transition-all font-mono"
                                    required
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className={`w-full py-4 bg-white text-black text-[11px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-zinc-200 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.1)] active:scale-95 flex items-center justify-center gap-2 ${loading ? 'opacity-50' : ''}`}
                        >
                            {loading ? 'Processing...' : isLogin ? 'Initialize' : 'Create_Identity'}
                            <ArrowRight size={14} />
                        </button>
                    </form>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/5"></div>
                        </div>
                        <div className="relative flex justify-center text-[8px] uppercase font-bold tracking-widest">
                            <span className="bg-zinc-950/0 px-4 text-zinc-700">Secondary_Uplink</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <button 
                            onClick={handleGoogleSignIn}
                            className="flex items-center justify-center gap-3 py-3 rounded-2xl border border-white/5 bg-zinc-900/40 text-zinc-400 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-900/60 hover:text-white transition-all"
                        >
                            <User size={14} /> Google_Auth
                        </button>
                    </div>

                    <div className="mt-8 text-center">
                        <button 
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest hover:text-white transition-colors"
                        >
                            {isLogin ? "No identity found? Register_New" : "Existing node? Return_to_Protocol"}
                        </button>
                    </div>
                </div>
                
                <div className="mt-6 flex items-center justify-center gap-2 opacity-30 select-none">
                    <ShieldCheck size={12} className="text-emerald-500" />
                    <span className="text-[8px] font-mono text-white uppercase tracking-[0.4em]">Secure_Handshake_Active</span>
                </div>
            </div>
        </div>
    );
};
