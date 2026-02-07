"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import {
    ChevronLeft,
    CheckCircle2,
    Building2,
    Loader2,
    ArrowRight,
    Wallet,
} from "lucide-react";
import { translations, Language } from "@/lib/translations";

function PaymentMethodContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const amount = searchParams.get("amount") || "0";

    const [loading, setLoading] = useState(true);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
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
        const q = query(
            collection(db, "paymentMethods"),
            where("status", "==", "active")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPaymentMethods(data);
            if (data.length > 0 && !selectedMethod) {
                setSelectedMethod(data[0].id);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [selectedMethod]);

    const handleRecharge = () => {
        if (!selectedMethod) {
            alert(t.selectMethodAlert);
            return;
        }

        const method = paymentMethods.find(m => m.id === selectedMethod);
        const theme = method?.bankDetailType || "regular";
        const validThemes = ["regular", "premium", "digital", "express", "smart", "secure"];
        const targetTheme = validThemes.includes(theme.toLowerCase()) ? theme.toLowerCase() : "regular";

        router.push(`/users/bank-detail/${targetTheme}?amount=${amount}&methodId=${selectedMethod}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-green-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-blue-900 pb-44 relative selection:bg-blue-500/30 overflow-x-hidden font-sans">
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
                <div className="flex flex-col items-center">
                    <h1 className="text-xl font-bold text-blue-900">
                        {t.paymentMethod}
                    </h1>
                </div>
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                    <Wallet size={22} />
                </div>
            </header>

            <main className="pt-40 px-6 max-w-lg mx-auto space-y-14 relative z-10">
                {/* Amount Display Card */}
                <section className="animate-in fade-in slide-in-from-top-8 duration-1000">
                    <div className="bg-white rounded-[3.5rem] p-12 border border-blue-50 shadow-xl shadow-blue-900/5 relative overflow-hidden text-center">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-16 -mt-16"></div>

                        <p className="text-sm font-medium text-slate-400 mb-4">{t.amountLabel}</p>
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-6xl font-black text-blue-900 tracking-tighter tabular-nums leading-none">
                                {Number(amount).toLocaleString()}
                            </span>
                            <span className="text-blue-900/40 font-bold uppercase tracking-widest text-base leading-none">ETB</span>
                        </div>
                    </div>
                </section>

                {/* Gateway Selection List */}
                <section className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-4">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-900"></div>
                            <h2 className="text-sm font-bold text-slate-800">{t.selectMethodLabel}</h2>
                        </div>
                        <div className="px-4 py-1.5 bg-green-500 rounded-full shadow-lg shadow-green-500/20">
                            <p className="text-[10px] font-bold text-white leading-none">{paymentMethods.length} {t.availableLabel}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {paymentMethods.map((method) => {
                            const isSelected = selectedMethod === method.id;
                            return (
                                <button
                                    key={method.id}
                                    onClick={() => setSelectedMethod(method.id)}
                                    className={`relative p-1 rounded-[2.5rem] transition-all duration-500 group ${isSelected
                                        ? "bg-orange-500 shadow-2xl shadow-orange-500/20 scale-[1.02]"
                                        : "bg-white border border-blue-50 hover:border-blue-200 shadow-xl shadow-blue-900/5 hover:bg-blue-50/10"
                                        }`}
                                >
                                    <div className={`h-full rounded-[2.3rem] p-8 flex items-center justify-between transition-all duration-500 relative overflow-hidden ${isSelected ? "bg-white" : "bg-transparent"}`}>
                                        <div className="flex items-center gap-6 relative z-10 text-left">
                                            <div className={`w-18 h-18 rounded-2xl flex items-center justify-center p-3 transition-all ${isSelected
                                                ? "bg-blue-50 border border-blue-100 shadow-inner scale-110"
                                                : "bg-blue-50/50 border border-blue-50"
                                                }`}>
                                                {method.logoUrl ? (
                                                    <img src={method.logoUrl} className="w-full h-full object-contain" alt={method.methodName} />
                                                ) : (
                                                    <Wallet className="text-blue-900/20" size={32} />
                                                )}
                                            </div>

                                            <div>
                                                <span className={`text-lg font-bold block leading-tight ${isSelected ? "text-blue-900" : "text-blue-900/60 group-hover:text-blue-900"}`}>
                                                    {method.methodName}
                                                </span>
                                                <p className="text-xs text-slate-400 mt-1">{t.payWithDesc.replace("{method}", method.methodName)}</p>
                                            </div>
                                        </div>

                                        {isSelected && (
                                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/30 relative z-10 border-2 border-white">
                                                <CheckCircle2 size={16} strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {paymentMethods.length === 0 && (
                        <div className="py-24 text-center space-y-8 bg-blue-50/50 rounded-[3.5rem] border-2 border-dashed border-blue-100">
                            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto border border-blue-100">
                                <Building2 size={36} className="text-blue-900/20" />
                            </div>
                            <p className="text-slate-400 text-sm">{t.noPaymentMethodsFound}</p>
                        </div>
                    )}
                </section>
            </main>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-8 pb-12 relative z-[60] bg-white/90 backdrop-blur-2xl border-t border-blue-50">
                <div className="max-w-lg mx-auto relative">
                    <button
                        onClick={handleRecharge}
                        disabled={!selectedMethod}
                        className="w-full bg-orange-500 text-white h-20 rounded-[2.5rem] font-bold text-lg shadow-2xl shadow-orange-500/20 hover:shadow-orange-600/30 active:scale-95 transition-all duration-500 flex items-center justify-center gap-6 disabled:opacity-30 disabled:grayscale"
                    >
                        <span>{t.nextStep}</span>
                        <ArrowRight size={22} className="group-hover:translate-x-2 transition-transform duration-300" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function UserPaymentMethodPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-12 h-12 animate-spin text-green-600" /></div>}>
            <PaymentMethodContent />
        </Suspense>
    );
}
