"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
    ChevronLeft,
    Building2,
    Loader2,
    ChevronRight,
    Activity,
    ShieldCheck,
    Stethoscope,
    Wallet,
    Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { translations, Language } from "@/lib/translations";

function BankDetailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const amount = searchParams.get("amount") || "0";
    const methodId = searchParams.get("methodId");

    const [loading, setLoading] = useState(true);
    const [method, setMethod] = useState<any>(null);
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
        const fetchMethod = async () => {
            if (!methodId) return;
            try {
                const docRef = doc(db, "paymentMethods", methodId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setMethod(docSnap.data());
                }
            } catch (error) {
                console.error("Error fetching method:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMethod();
    }, [methodId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-blue-900 pb-32 font-sans selection:bg-blue-100 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-50/50 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-50/30 blur-[100px] rounded-full"></div>
            </div>

            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-blue-50">
                <div className="max-w-lg mx-auto px-6 h-20 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-blue-100 text-blue-900 active:scale-90 transition-all shadow-sm"
                    >
                        <ChevronLeft size={22} />
                    </button>
                    <h1 className="text-lg font-bold tracking-tight text-blue-900 leading-none">{t.depositDetails}</h1>
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                        <Building2 size={18} />
                    </div>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-6 pt-12 relative z-10 space-y-12">
                {/* Amount Highlight */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-4"
                >
                    <div className="inline-flex items-center gap-2 px-6 py-2 bg-blue-50 rounded-full border border-blue-100 shadow-sm">
                        <Wallet size={14} className="text-blue-600" />
                        <span className="text-[10px] font-bold text-blue-900/60 uppercase tracking-widest">{t.amountToDeposit}</span>
                    </div>
                    <div className="flex items-center justify-center gap-4">
                        <span className="text-7xl font-black text-blue-900 tracking-tighter italic">
                            {Number(amount).toLocaleString()}
                        </span>
                        <div className="flex flex-col items-start">
                            <span className="text-2xl font-black text-blue-900/20 leading-none">ETB</span>
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none mt-1">{t.confirmed}</span>
                        </div>
                    </div>
                </motion.div>

                {/* Summary Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-blue-600 rounded-[3rem] p-10 flex items-center justify-between shadow-2xl shadow-blue-600/20 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-16 -mt-16"></div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{t.totalSettlement}</p>
                        <p className="text-2xl font-black text-white italic">ETB {Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <ShieldCheck size={40} className="text-white/20" strokeWidth={1.5} />
                </motion.div>

                {/* Gateway Selection */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest leading-none">{t.selectPaymentMethod}</h2>
                        <Info size={14} className="text-blue-900/20" />
                    </div>

                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        onClick={() => {
                            if (methodId) {
                                const theme = method?.bankDetailType || "regular";
                                const validThemes = ["regular", "express"];
                                const targetTheme = validThemes.includes(theme.toLowerCase()) ? theme.toLowerCase() : "regular";
                                router.push(`/users/bank-detail/${targetTheme}?amount=${amount}&methodId=${methodId}`);
                            }
                        }}
                        className="w-full bg-white border border-blue-50 rounded-[2.5rem] p-8 shadow-xl shadow-blue-900/5 hover:border-blue-200 transition-all flex items-center justify-between group active:scale-[0.98] relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/0 via-blue-50/50 to-blue-50/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

                        <div className="flex items-center gap-6 relative z-10">
                            <div className="w-20 h-20 rounded-[1.8rem] border border-blue-100 overflow-hidden flex items-center justify-center bg-blue-50 shadow-inner transition-transform group-hover:scale-105 duration-500 p-3">
                                {method?.bankLogoUrl ? (
                                    <img src={method.bankLogoUrl} className="w-full h-full object-contain filter drop-shadow-[0_2px_5px_rgba(30,58,138,0.1)]" alt="Bank Logo" />
                                ) : (
                                    <Building2 size={32} className="text-blue-900/10" />
                                )}
                            </div>
                            <div className="flex flex-col items-start gap-1">
                                <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">{t.recommendedChannel}</span>
                                <span className="text-lg font-bold text-blue-900 text-left leading-tight">
                                    {method?.bankName || t.selectBank}
                                </span>
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 text-blue-900 transition-all group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 relative z-10">
                            <ChevronRight size={24} />
                        </div>
                    </motion.button>
                </div>

                {/* Secure Footer Notification */}
                <div className="bg-orange-50 border border-orange-100 rounded-[2rem] p-6 flex gap-4 items-start relative z-10">
                    <Info className="text-orange-500 shrink-0 mt-0.5" size={18} />
                    <p className="text-[10px] font-bold text-orange-700 uppercase tracking-widest leading-relaxed">
                        {t.depositMatchNotice}
                    </p>
                </div>
            </main>

            {/* Stealth Logistics */}
            <div className="fixed bottom-10 left-0 right-0 flex justify-center pointer-events-none opacity-10 z-0">
                <span className="text-[9px] font-bold uppercase tracking-[1em] text-blue-900">{t.securePaymentGateway}</span>
            </div>
        </div>
    );
}

export default function BankDetailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            </div>
        }>
            <BankDetailContent />
        </Suspense>
    );
}
