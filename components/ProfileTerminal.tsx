import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, LogOut, Shield, Mail, Calendar, Hash, ShieldCheck } from 'lucide-react';

export const ProfileTerminal: React.FC = () => {
    const { user, userData, logout } = useAuth();

    if (!user) return null;

    return (
        <div className="h-full flex flex-col bg-black font-sans relative overflow-auto p-8">
            <div className="max-w-xl mx-auto w-full pt-12 pb-24">
                <div className="flex items-center gap-2 mb-2 opacity-40">
                    <Shield size={10} className="text-emerald-500" />
                    <span className="text-[9px] font-mono text-white uppercase tracking-[0.3em]">Identity_Matrix</span>
                </div>
                <h1 className="text-4xl font-display text-white tracking-widest uppercase mb-12">Account</h1>

                <div className="space-y-6">
                    {/* Identity Card */}
                    <div className="bg-zinc-950/40 backdrop-blur-3xl border border-white/5 p-8 rounded-[40px] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
                            <ShieldCheck size={80} className="text-emerald-500" />
                        </div>
                        
                        <div className="flex items-center gap-6 relative z-10">
                            <div className="w-24 h-24 rounded-3xl bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden">
                                {user.photoURL ? (
                                    <img src={user.photoURL} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                    <User size={40} className="text-zinc-700" />
                                )}
                            </div>
                            <div>
                                <h2 className="text-2xl font-display text-white tracking-wide mb-1">{userData?.displayName || 'Unknown_Node'}</h2>
                                <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">{user.email}</p>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-2 gap-6">
                            <div>
                                <div className="flex items-center gap-2 mb-1 text-zinc-600">
                                    <Hash size={10} />
                                    <span className="text-[9px] font-bold uppercase tracking-widest">Node_ID</span>
                                </div>
                                <p className="text-[10px] font-mono text-zinc-400 truncate">{user.uid}</p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1 text-zinc-600">
                                    <Calendar size={10} />
                                    <span className="text-[9px] font-bold uppercase tracking-widest">Initialization</span>
                                </div>
                                <p className="text-[10px] font-mono text-zinc-400">{userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'Unknown'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Stats/Settings */}
                    <div className="grid grid-cols-1 gap-4">
                         <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-3xl flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
                                    <ShieldCheck size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Security Clearance</p>
                                    <p className="text-xs text-white">Full Database Access</p>
                                </div>
                            </div>
                            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-500 text-[8px] font-bold uppercase tracking-widest rounded-full">Active</span>
                         </div>

                         <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-3xl flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                                    <Mail size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Sync Status</p>
                                    <p className="text-xs text-white">Cloud Integration Active</p>
                                </div>
                            </div>
                            <span className="px-3 py-1 bg-blue-500/20 text-blue-500 text-[8px] font-bold uppercase tracking-widest rounded-full">Encrypted</span>
                         </div>
                    </div>

                    <button 
                        onClick={logout}
                        className="w-full py-4 bg-zinc-900/50 hover:bg-red-500/10 border border-white/5 hover:border-red-500/50 text-zinc-500 hover:text-red-500 text-[10px] font-black uppercase tracking-[0.4em] rounded-[24px] transition-all duration-300 flex items-center justify-center gap-3 group"
                    >
                        <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Log_Out_of_Node
                    </button>
                </div>
            </div>
        </div>
    );
};
