"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, onSnapshot, increment } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import {
    ArrowLeftRight,
    Coins,
    Banknote,
    Loader2,
    ChevronLeft,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    RefreshCw,
    Activity,
    ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { translations, Language } from "@/lib/translations";

export default function ExchangePage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [exchangeRate, setExchangeRate] = useState(0);
    const [coinAmount, setCoinAmount] = useState("");
    const [etbPreview, setEtbPreview] = useState(0);
    const [exchanging, setExchanging] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [exchangedCoins, setExchangedCoins] = useState(0);
    const [exchangedETB, setExchangedETB] = useState(0);
    const [error, setError] = useState("");
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
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push("/");
                return;
            }
            setUser(currentUser);

            const userRef = doc(db, "users", currentUser.uid);
            const unsubscribeUser = onSnapshot(userRef, (doc) => {
                if (doc.exists()) {
                    setUserData(doc.data());
                }
                setLoading(false);
            });

            const ratesRef = doc(db, "Settings", "currency");
            const unsubscribeRates = onSnapshot(ratesRef, (doc) => {
                if (doc.exists()) {
                    const rateData = doc.data();
                    setExchangeRate(rateData.coinRate || 0);
                }
            });

            return () => {
                unsubscribeUser();
                unsubscribeRates();
            };
        });

        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        const amount = parseFloat(coinAmount) || 0;
        setEtbPreview(amount * exchangeRate);
        setError("");
    }, [coinAmount, exchangeRate]);

    const handleExchange = async () => {
        if (!user || !userData) return;
        const amount = parseFloat(coinAmount);

        if (amount < 100) {
            setError(t.minExchangeError);
            return;
        }

        if (amount > (userData.teamIncome || 0)) {
            setError(t.insufficientPointsError);
            return;
        }

        setExchanging(true);
        setError("");

        try {
            const userRef = doc(db, "users", user.uid);
            const etbAmount = amount * exchangeRate;

            await updateDoc(userRef, {
                teamIncome: increment(-amount),
                balance: increment(etbAmount),
                totalIncome: increment(etbAmount)
            });

            setExchangedCoins(amount);
            setExchangedETB(etbAmount);
            setShowSuccess(true);
            setCoinAmount("");

        } catch (error) {
            console.error("Error exchanging coins:", error);
            setError(t.exchangeFailedError);
        } finally {
            setExchanging(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
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
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-3xl px-6 h-20 flex items-center justify-between border-b border-blue-50 max-w-lg mx-auto w-full">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="w-11 h-11 rounded-2xl bg-white border border-blue-100 flex items-center justify-center text-blue-900 shadow-sm active:scale-95 transition-all"
                    >
                        <ChevronLeft size={22} />
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-lg font-bold text-blue-900 leading-none">{t.exchangePoints}</h1>
                        <span className="text-[10px] text-blue-900/60 mt-1">{t.convertPointsDesc}</span>
                    </div>
                </div>
            </header>

            <main className="px-6 py-10 max-w-lg mx-auto space-y-8 relative z-10 pb-32">
                <div className="bg-white rounded-3xl p-6 shadow-xl shadow-blue-900/5 border border-blue-50 flex items-center justify-between group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-orange-100/50 transition-colors"></div>
                    <div className="relative z-10">
                        <span className="text-sm font-medium text-blue-900/60 block mb-1">{t.availablePoints}</span>
                        <div className="flex items-center gap-3">
                            <Activity size={24} className="text-orange-500" />
                            <span className="text-3xl font-bold text-blue-900 tabular-nums">{Number(userData?.teamIncome || 0).toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 border border-orange-100 shadow-inner group-hover:scale-105 transition-transform duration-500">
                        <Coins size={28} />
                    </div>
                </div>

                <div className="bg-blue-900 rounded-3xl p-6 shadow-2xl shadow-blue-900/20 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -mr-24 -mt-24 group-hover:bg-white/10 transition-colors duration-700"></div>
                    <div className="relative z-10 flex justify-between items-center">
                        <div className="space-y-3">
                            <span className="text-sm font-medium text-white/60 block">{t.currentRate}</span>
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col">
                                    <span className="text-2xl font-bold">{t.onePoint}</span>
                                </div>
                                <ArrowLeftRight size={18} className="text-white/30" />
                                <div className="flex flex-col">
                                    <span className="text-2xl font-bold text-green-400">{exchangeRate.toFixed(2)} ETB</span>
                                </div>
                            </div>
                        </div>
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/10 shadow-inner group-hover:rotate-12 transition-transform duration-700">
                            <TrendingUp size={24} className="text-white" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-blue-900/5 border border-blue-50 space-y-8">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-sm font-medium text-blue-900/60">{t.amountToExchange}</label>
                                <span className="text-[11px] text-blue-900/40">{t.min100Points}</span>
                            </div>
                            <div className="relative group/input">
                                <input
                                    type="number"
                                    value={coinAmount}
                                    onChange={(e) => setCoinAmount(e.target.value)}
                                    className="w-full bg-blue-50 border border-blue-100 rounded-2xl px-6 py-4 text-2xl font-bold text-blue-900 focus:outline-none focus:border-blue-300 focus:bg-white transition-all shadow-inner placeholder:text-blue-900/10"
                                    placeholder="0"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-blue-900/60 bg-white border border-blue-50 px-3 py-1.5 rounded-lg shadow-sm">
                                    {t.points}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center -my-3 relative z-10">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border-4 border-blue-50 shadow-md text-blue-900">
                                <RefreshCw size={18} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-blue-900/60 px-1">{t.youWillReceive}</label>
                            <div className="w-full bg-blue-50 border border-blue-100 rounded-2xl px-6 py-4 flex justify-between items-center shadow-inner">
                                <span className="text-2xl font-bold text-green-600 tabular-nums">{etbPreview.toLocaleString()}</span>
                                <span className="text-xs font-semibold text-blue-900/60 bg-white border border-blue-50 px-3 py-1.5 rounded-lg shadow-sm">ETB</span>
                            </div>
                        </div>
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm"
                            >
                                <AlertCircle size={18} />
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        onClick={handleExchange}
                        disabled={exchanging || !coinAmount}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-2xl h-14 font-bold text-base shadow-xl shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                        {exchanging ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <ShieldCheck size={20} />
                        )}
                        {t.confirmExchange}
                    </button>
                </div>
            </main>

            {/* Success Modal */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 bg-white/95 backdrop-blur-2xl flex items-center justify-center z-[100] px-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-3xl text-center border border-blue-50 relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-green-500"></div>

                            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                <CheckCircle2 size={40} className="text-green-600" />
                            </div>

                            <div className="space-y-3 mb-8">
                                <h3 className="text-2xl font-bold text-blue-900">{t.exchangeSuccessTitle}</h3>
                                <p className="text-sm text-blue-900/60 leading-relaxed">
                                    {t.exchangeSuccessMsg
                                        .replace("{coins}", exchangedCoins.toString())
                                        .replace("{etb}", exchangedETB.toLocaleString())}
                                </p>
                            </div>

                            <button
                                onClick={() => setShowSuccess(false)}
                                className="w-full h-14 bg-blue-900 hover:bg-blue-950 text-white rounded-2xl font-bold text-sm transition-all shadow-xl shadow-blue-900/10"
                            >
                                {t.close}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// In index.css, ensure animate-spin-slow is defined:
// @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
// .animate-spin-slow { animation: spin-slow 8s linear infinite; }
