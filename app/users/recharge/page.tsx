"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import {
    ChevronLeft,
    AlertCircle,
    CheckCircle2,
    CreditCard,
    Info,
    ArrowRight,
    Loader2
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { translations, Language } from "@/lib/translations";

// Default fallback in case Firestore fetch fails
const DEFAULT_PRESETS = [
    1200, 4500, 12550, 35500, 65550, 135550,
    250500, 450500, 850500, 1500000, 3550050
];

function RechargeContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [amount, setAmount] = useState<string>("0");
    const [customAmount, setCustomAmount] = useState<string>("");
    const [minDeposit, setMinDeposit] = useState<number>(4500);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [presetAmounts, setPresetAmounts] = useState<number[]>(DEFAULT_PRESETS);
    const [fetchingPresets, setFetchingPresets] = useState(true);
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
        const fetchProductPrices = async () => {
            try {
                const [productsSnap, weekendSnap] = await Promise.all([
                    getDocs(collection(db, "Products")),
                    getDocs(collection(db, "WeekendProducts"))
                ]);

                const prices: number[] = [];

                productsSnap.forEach((doc) => {
                    const data = doc.data();
                    if (data.price) prices.push(Number(data.price));
                });

                weekendSnap.forEach((doc) => {
                    const data = doc.data();
                    if (data.price) prices.push(Number(data.price));
                });

                // Filter unique values and sort ascending
                const uniquePrices = Array.from(new Set(prices)).sort((a, b) => a - b);

                if (uniquePrices.length > 0) {
                    setPresetAmounts(uniquePrices);
                    if (!searchParams.get("amount")) {
                        setAmount(uniquePrices[0].toString());
                    }
                }
            } catch (error) {
                console.error("Error fetching product prices:", error);
            } finally {
                setFetchingPresets(false);
            }
        };

        const fetchSettings = async () => {
            try {
                const docRef = doc(db, "GlobalSettings", "recharge");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const settings = docSnap.data();
                    if (settings.minAmount) {
                        const min = Number(settings.minAmount);
                        setMinDeposit(min);
                        // If no amount in searchParams, use min
                        if (searchParams.get("amount")) {
                            setAmount(searchParams.get("amount")!);
                        }
                    }
                } else {
                    // Fallback to initial amount if no doc
                    setAmount(searchParams.get("amount") || "4500");
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
                setAmount(searchParams.get("amount") || "4500");
            }
        };

        fetchProductPrices();
        fetchSettings();
    }, [searchParams]);

    const handleAmountSelect = (val: number) => {
        setAmount(val.toString());
        setCustomAmount("");
    };

    const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (/^\d*$/.test(val)) {
            setCustomAmount(val);
            if (val) setAmount(val);
        }
    };

    const handleNext = () => {
        const numAmount = parseInt(amount);
        if (isNaN(numAmount) || numAmount < minDeposit) {
            setErrorMsg(t.minDepositError.replace("{min}", minDeposit.toLocaleString()));
            setShowErrorModal(true);
            return;
        }
        router.push(`/users/payment-method?amount=${amount}`);
    };

    return (
        <div className="min-h-screen bg-white text-blue-900 pb-40 relative selection:bg-blue-500/30 overflow-hidden font-sans">
            {/* Medical Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-50/50 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-50/30 blur-[100px] rounded-full"></div>
            </div>

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-2xl z-50 px-6 py-6 flex items-center justify-between border-b border-blue-50">
                <button
                    onClick={() => router.back()}
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-white border border-blue-100 text-blue-900 active:scale-90 transition-all shadow-sm"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-xl font-bold text-blue-900">
                    {t.deposit}
                </h1>
                <div className="w-12" /> {/* Spacer */}
            </header>

            <main className="pt-32 px-6 space-y-10 max-w-lg mx-auto relative z-10">
                {/* Amount Display Card */}
                <section className="relative group animate-in fade-in slide-in-from-top-6 duration-700">
                    <div className="bg-white rounded-[3rem] p-10 shadow-xl shadow-blue-900/5 border border-blue-50 relative overflow-hidden h-64 flex flex-col justify-center">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-16 -mt-16"></div>

                        <p className="text-slate-400 text-sm font-medium mb-4">{t.depositAmount}</p>
                        <div className="flex items-baseline gap-4">
                            <span className="text-blue-900 text-6xl font-black tracking-tighter tabular-nums leading-none">
                                {Number(amount).toLocaleString()}
                            </span>
                            <span className="text-blue-900/40 font-bold uppercase tracking-widest text-base">ETB</span>
                        </div>

                        <div className="mt-10 flex gap-2">
                            {[...Array(6)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${i < 3 ? "bg-green-600 shadow-[0_0_10px_rgba(22,163,74,0.3)]" : "bg-blue-50"
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                </section>

                {/* Preset Grid */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-sm font-bold text-slate-800">{t.selectAmount}</h2>
                        {fetchingPresets && <Loader2 size={16} className="animate-spin text-blue-900/20" />}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {presetAmounts.map((val) => {
                            const isSelected = amount === val.toString() && !customAmount;
                            return (
                                <button
                                    key={val}
                                    onClick={() => handleAmountSelect(val)}
                                    className={`relative py-7 rounded-[2rem] font-bold text-lg transition-all active:scale-95 group overflow-hidden ${isSelected
                                        ? "bg-orange-500 text-white shadow-xl shadow-orange-500/20 scale-[1.02]"
                                        : "bg-blue-50/50 text-blue-900/60 border border-blue-100 hover:border-blue-400 shadow-none"
                                        }`}
                                >
                                    {val.toLocaleString()}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Custom Amount */}
                <section className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
                    <div className="flex items-center gap-2 px-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-900"></div>
                        <h2 className="text-sm font-bold text-slate-800">{t.customAmountLabel.replace("{min}", minDeposit.toLocaleString())}</h2>
                    </div>

                    <div className="relative group">
                        <div className="absolute left-7 top-1/2 -translate-y-1/2 text-blue-900/20 group-focus-within:text-blue-900 transition-all duration-300">
                            <CreditCard size={24} />
                        </div>
                        <input
                            type="text"
                            placeholder={t.enterAmount}
                            value={customAmount}
                            onChange={handleCustomAmountChange}
                            className="w-full bg-white border-2 border-blue-50 rounded-[2.2rem] py-8 pl-18 pr-8 text-2xl font-bold text-blue-900 placeholder:text-blue-900/10 focus:outline-none focus:border-blue-900/20 transition-all shadow-xl shadow-blue-900/5 px-16"
                        />
                    </div>
                </section>

                {/* Tips Section */}
                <section className="bg-white rounded-[3rem] p-8 border border-blue-50 space-y-8 shadow-xl shadow-blue-900/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-100 transition-all duration-500"></div>

                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100">
                            <Info size={22} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800">{t.guidelines}</h3>
                    </div>

                    <ul className="space-y-6">
                        {[
                            t.guideline1,
                            t.guideline2,
                            t.guideline3
                        ].map((tip, i) => (
                            <li key={i} className="flex gap-4 items-start group/tip">
                                <div className="w-6 h-6 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 mt-0.5 group-hover/tip:bg-blue-900 group-hover/tip:text-white transition-all">
                                    <span className="text-xs font-bold transition-colors">{i + 1}</span>
                                </div>
                                <p className="text-sm text-slate-400 leading-relaxed group-hover/tip:text-blue-900 transition-all">{tip}</p>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Action Button */}
                <div className="pt-8">
                    <button
                        onClick={handleNext}
                        className="w-full bg-orange-500 text-white py-7 rounded-[2.2rem] font-bold text-lg shadow-xl shadow-orange-500/20 hover:shadow-2xl hover:bg-orange-600 transition-all duration-500 flex items-center justify-center gap-4 group"
                    >
                        <span>{t.nextStep}</span>
                        <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform duration-300" />
                    </button>
                </div>
            </main>

            {/* Premium Error Modal */}
            {showErrorModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-blue-900/60 backdrop-blur-3xl animate-in fade-in duration-500">
                    <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full blur-3xl -mr-16 -mt-16"></div>

                        <div className="flex flex-col items-center text-center gap-10 relative z-10">
                            <div className="w-24 h-24 bg-red-50 rounded-[2.5rem] flex items-center justify-center text-red-500 shadow-sm border border-red-100">
                                <AlertCircle size={48} strokeWidth={1.5} />
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-2xl font-bold text-blue-900">{t.alertHeader}</h2>
                                <p className="text-sm text-slate-400 leading-relaxed px-2">
                                    {errorMsg}
                                </p>
                            </div>

                            <button
                                onClick={() => setShowErrorModal(false)}
                                className="w-full bg-red-500 text-white py-6 rounded-[1.8rem] font-bold text-lg shadow-xl shadow-red-500/20 active:scale-95 transition-all"
                            >
                                {t.ok}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function RechargePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
            </div>
        }>
            <RechargeContent />
        </Suspense>
    );
}
