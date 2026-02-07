"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import {
    ChevronLeft,
    Crown,
    Users,
    Wallet,
    TrendingUp,
    Star,
    ShieldCheck,
    Loader2,
    Medal,
    Stethoscope,
    Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { translations, Language } from "@/lib/translations";

export default function UserVipRulesPage() {
    const router = useRouter();
    const [vipRules, setVipRules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [lang, setLang] = useState<Language>("EN");
    const t = translations[lang];

    // Language Hydration
    useEffect(() => {
        const handleLangChange = () => {
            const saved = localStorage.getItem("app_lang") as Language;
            if (saved) setLang(saved);
        };
        handleLangChange();
        window.addEventListener("languageChange", handleLangChange);
        return () => window.removeEventListener("languageChange", handleLangChange);
    }, []);

    useEffect(() => {
        const q = query(collection(db, "VipRules"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const rules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            rules.sort((a: any, b: any) => {
                const numA = parseInt(a.level?.replace(/\D/g, '') || "0");
                const numB = parseInt(b.level?.replace(/\D/g, '') || "0");
                return numA - numB;
            });

            setVipRules(rules);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-green-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-blue-900 font-sans relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-50/50 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-50/30 blur-[100px] rounded-full"></div>
            </div>

            {/* Header */}
            <header className="sticky top-0 bg-white/95 backdrop-blur-3xl border-b border-blue-50 px-6 h-16 flex items-center justify-between z-50 max-w-lg mx-auto">
                <button
                    onClick={() => router.back()}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-blue-100 text-blue-900 transition-all active:scale-95 shadow-sm"
                >
                    <ChevronLeft size={20} />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-base font-bold text-blue-900 tracking-tight leading-none">{t.vipLevels}</h1>
                    <span className="text-[10px] font-bold text-slate-300 tracking-wider mt-1">{t.ranks}</span>
                </div>
                <div className="w-9"></div>
            </header>

            <main className="px-6 py-10 space-y-12 relative z-10 pb-32 max-w-lg mx-auto">
                {/* Hero Section */}
                <div className="text-center space-y-3 px-2">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-lg shadow-blue-900/5"
                    >
                        <Medal size={32} className="text-blue-600" strokeWidth={2.5} />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-blue-900 tracking-tight leading-tight">{t.levelUpTitle}</h2>
                    <p className="text-sm font-medium text-slate-400 leading-relaxed max-w-[260px] mx-auto">
                        {t.levelUpDesc}
                    </p>
                </div>

                {/* Rules List */}
                <div className="space-y-8">
                    {vipRules.length > 0 ? (
                        vipRules.map((rule, idx) => (
                            <motion.div
                                key={rule.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="group relative bg-white rounded-[3rem] p-8 border border-blue-50 shadow-xl shadow-blue-900/5 hover:border-blue-100 transition-all duration-500"
                            >
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-6 items-center">
                                        {/* Tier Badge/Image */}
                                        <div className="w-28 h-28 shrink-0 flex items-center justify-center bg-blue-50/50 rounded-[2rem] border border-blue-50 group-hover:scale-105 transition-transform duration-700 p-2 overflow-hidden shadow-inner">
                                            <img
                                                src={rule.imageUrl}
                                                alt="tier"
                                                className="w-full h-full object-contain filter drop-shadow-[0_8px_12px_rgba(30,58,138,0.1)]"
                                            />
                                        </div>

                                        {/* Stats Grid */}
                                        <div className="flex-1 w-full grid grid-cols-2 gap-3">
                                            <div className="bg-blue-50/30 rounded-2xl p-4 border border-blue-50">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <Users size={12} className="text-blue-600" />
                                                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">{t.teamLabel}</span>
                                                </div>
                                                <p className="text-lg font-bold text-blue-900 leading-none">
                                                    {rule.investedTeamSize}
                                                </p>
                                            </div>

                                            <div className="bg-blue-50/30 rounded-2xl p-4 border border-blue-50">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <Activity size={12} className="text-green-600" />
                                                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">{t.assetsLabel}</span>
                                                </div>
                                                <p className="text-base font-bold text-blue-900 leading-none truncate">
                                                    {Number(rule.totalTeamAssets).toLocaleString()}
                                                    <span className="text-[9px] ml-1 text-slate-300">ETB</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rewards Tier Card */}
                                    <div className="bg-blue-900 rounded-[2rem] p-6 shadow-xl shadow-blue-900/20 space-y-5 relative overflow-hidden group/reward">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover/reward:bg-white/10 transition-colors"></div>

                                        <div className="flex justify-between items-center gap-4 border-b border-white/5 pb-5">
                                            <div>
                                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1 block">{t.monthlySalary}</span>
                                                <p className="text-xl font-bold text-white tracking-tight">
                                                    {Number(rule.monthlySalary).toLocaleString()}<span className="text-[10px] ml-1 text-white/40">{t.perMonth}</span>
                                                </p>
                                            </div>
                                            <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/5">
                                                <span className="text-white text-[10px] font-bold tracking-wider">{t.levels}</span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <div>
                                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1 block">{t.grant}</span>
                                                <p className="text-base font-bold text-white/80 tracking-tight">
                                                    {Number(rule.yearlySalary5Year).toLocaleString()}<span className="text-[9px] ml-1 text-white/20">ETB</span>
                                                </p>
                                            </div>
                                            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 group-hover/reward:scale-110 transition-transform">
                                                <Star size={18} fill="white" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="text-center py-20 text-slate-300 font-bold tracking-widest text-xs">
                            {t.noLevelsFound}
                        </div>
                    )}
                </div>

                {/* Regional Manager Highlight */}
                <div className="bg-orange-500 rounded-[2.5rem] p-8 text-center space-y-6 relative overflow-hidden shadow-2xl shadow-orange-500/20 group">
                    <div className="absolute inset-0 bg-orange-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10 space-y-5">
                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto backdrop-blur-md border border-white/30">
                            <Stethoscope size={28} className="text-white" />
                        </div>
                        <p className="text-sm font-bold text-white leading-relaxed tracking-wide">
                            {t.regionalManagerPromo.replace("{level}", t.vipLevelTarget)}
                        </p>
                        <p className="text-4xl font-bold text-white tracking-tight drop-shadow-lg">
                            10,000,000 <span className="text-lg font-bold opacity-60">ETB</span>
                        </p>
                    </div>
                </div>

                {/* Footer Logistics */}
                <div className="pt-6 flex flex-col items-center gap-6">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-100"></div>
                </div>
            </main>
        </div>
    );
}
