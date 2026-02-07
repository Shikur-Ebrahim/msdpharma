"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import {
    ChevronLeft,
    ShieldCheck,
    Loader2,
    Home,
    Activity,
    Cpu,
    Lock,
    Stethoscope,
    Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { translations, Language } from "@/lib/translations";

function PendingContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [currentLog, setCurrentLog] = useState(0);
    const [lang, setLang] = useState<Language>("EN");
    const t = translations[lang];

    const LOG_MESSAGES = [
        t.logStarting,
        t.logConnecting,
        t.logValidating,
        t.logUpdating,
        t.logChecking,
        t.logVerifying,
        t.logFinalizing,
        t.logAlmostDone
    ];

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
        setMounted(true);
    }, []);

    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        if (!mounted) return;
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribeAuth();
    }, [mounted]);

    useEffect(() => {
        if (!mounted || !user) return;

        const type = searchParams.get("type");
        const collectionName = type === "withdrawal" ? "Withdrawals" : "RechargeReview";

        const q = query(
            collection(db, collectionName),
            where("userId", "==", user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
                docs.sort((a, b) => {
                    const timeA = (a.timestamp || a.createdAt)?.toMillis?.() || 0;
                    const timeB = (b.timestamp || b.createdAt)?.toMillis?.() || 0;
                    return timeB - timeA;
                });

                const latestTx = docs[0];
                if (latestTx?.status === 'verified' || latestTx?.status === 'approved' || latestTx?.status === 'success') {
                    if (type === "withdrawal") {
                        router.push("/users/profile");
                    } else {
                        router.push("/users/welcome?tab=product");
                    }
                }
            }
        });

        return () => unsubscribe();
    }, [user, router, searchParams, mounted]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentLog(prev => (prev < LOG_MESSAGES.length - 1 ? prev + 1 : prev));
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    if (!mounted) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
                <Loader2 className="animate-spin text-green-600 w-12 h-12" strokeWidth={2.5} />
                <span className="text-blue-900/40 font-bold text-sm animate-pulse">{t.startingLabel}</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-blue-900 font-sans relative overflow-hidden flex flex-col">
            {/* Ambient Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-50/50 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-50/30 blur-[100px] rounded-full"></div>
            </div>

            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-3xl px-6 h-20 flex items-center justify-between border-b border-blue-50 max-w-lg mx-auto w-full">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push("/users/welcome")}
                        className="w-11 h-11 rounded-2xl bg-white border border-blue-100 flex items-center justify-center text-blue-900 shadow-sm active:scale-95 transition-all"
                    >
                        <ChevronLeft size={22} />
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-lg font-bold text-blue-900 leading-none">{t.processing}</h1>
                        <span className="text-[10px] text-blue-900/40 mt-1">{t.verificationInProgress}</span>
                    </div>
                </div>
                <div className="px-5 py-2.5 rounded-2xl bg-blue-900 text-[11px] font-bold text-white shadow-xl flex items-center gap-3">
                    <Activity size={14} className="animate-pulse text-green-400" />
                    ID: {searchParams.get('type') === 'withdrawal' ? 'W-72' : 'R-10'}
                </div>
            </header>

            <main className="flex-1 px-6 flex flex-col items-center justify-center relative z-10 max-w-lg mx-auto w-full pb-40">
                {/* Scanner UI */}
                <div className="relative mb-20 group">
                    <div className="absolute inset-[-40px] border border-blue-500/5 rounded-full animate-[ping_4s_ease-in-out_infinite]"></div>
                    <div className="absolute inset-[-20px] border-2 border-blue-100 rounded-full animate-[spin_15s_linear_infinite] border-dashed opacity-50"></div>

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center"
                    >
                        {/* Glow Core */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500/10 via-transparent to-green-500/10 animate-spin"></div>

                        {/* Glass Container */}
                        <div className="absolute inset-6 rounded-full bg-white border border-blue-50 shadow-3xl flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05),transparent_70%)]"></div>

                            <div className="relative flex flex-col items-center gap-6">
                                <div className="p-8 rounded-[2.5rem] bg-blue-50 border border-blue-100 shadow-inner">
                                    <ShieldCheck size={72} className="text-blue-600 animate-pulse" strokeWidth={1} />
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="flex items-center gap-3">
                                        <Loader2 size={16} className="animate-spin text-blue-600" strokeWidth={3} />
                                        <span className="text-[11px] font-bold text-blue-900">{t.processing}</span>
                                    </div>
                                    <span className="text-[10px] font-mono font-medium text-blue-900/20">{t.sessionLabel}: {Math.random().toString(36).substring(7).toUpperCase()}</span>
                                </div>
                            </div>

                            {/* Scanning Pulse */}
                            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-blue-500/10 to-transparent animate-[scan_3s_ease-in-out_infinite] opacity-30"></div>
                        </div>
                    </motion.div>
                </div>

                {/* Content Section */}
                <div className="text-center space-y-10 w-full px-4">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-4 px-5 py-2.5 rounded-2xl bg-blue-50 border border-blue-100 shadow-sm">
                            <div className="flex gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce"></span>
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce delay-100"></span>
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce delay-200"></span>
                            </div>
                            <span className="text-[11px] font-bold text-blue-900">
                                {searchParams.get('type') === 'withdrawal' ? t.pendingApproval : t.underReview}
                            </span>
                        </div>

                        <h1 className="text-4xl font-bold text-blue-900 tracking-tight leading-none">
                            {t.requestProcessing.split(' ')[0]} <br />
                            <span className="text-orange-500">{t.requestProcessing.split(' ')[1]}</span>
                        </h1>

                        <p className="text-[13px] font-medium text-blue-900/40 max-w-[280px] mx-auto leading-relaxed">
                            {t.processingWaitMsg}
                            <br />
                            {t.estimatedTime}: <span className="text-blue-900 underline underline-offset-4 decoration-2">5-15 mins</span>
                        </p>
                    </div>

                    {/* Security Logs */}
                    <div className="w-full bg-blue-50/50 rounded-[3rem] p-10 text-left border border-blue-50 shadow-inner relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Stethoscope size={56} className="text-blue-900" />
                        </div>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 rounded-2xl bg-blue-100 border border-blue-200 text-blue-600 shadow-sm">
                                <Cpu size={22} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-[11px] font-bold text-blue-900/60">{t.systemDiagnostics}</h3>
                        </div>

                        <div className="space-y-5 font-mono">
                            {LOG_MESSAGES.slice(0, currentLog + 1).map((msg, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`flex items-start gap-4 text-[11px] font-bold ${idx === currentLog ? 'text-blue-900' : 'text-blue-900/20'}`}
                                >
                                    <span className="text-green-600">{`>>`}</span>
                                    <span>
                                        {msg}
                                        {idx === currentLog && <span className="inline-block w-1.5 h-3 bg-blue-600 animate-pulse ml-3"></span>}
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            {/* Sticky Action Footer */}
            <div className="fixed bottom-0 left-0 right-0 p-8 pb-12 bg-gradient-to-t from-white via-white to-transparent z-40 max-w-lg mx-auto w-full">
                <button
                    onClick={() => router.push("/users/welcome")}
                    className="w-full h-18 bg-blue-900 hover:bg-blue-950 text-white rounded-[2rem] font-bold text-sm transition-all shadow-2xl flex items-center justify-center gap-4 group"
                >
                    <Home size={18} className="group-hover:-translate-y-1 transition-transform" />
                    <span>{t.home}</span>
                </button>
            </div>

            <style jsx global>{`
                @keyframes scan {
                    0% { transform: translateY(-100%); opacity: 0; }
                    50% { opacity: 0.5; }
                    100% { transform: translateY(150%); opacity: 0; }
                }
            `}</style>
        </div>
    );
}

export default function TransactionPendingPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
                <Loader2 className="animate-spin text-blue-600 w-12 h-12" strokeWidth={2.5} />
                <span className="text-blue-900/40 font-bold text-sm animate-pulse">{translations.EN.loadingLabel}</span>
            </div>
        }>
            <PendingContent />
        </Suspense>
    );
}
