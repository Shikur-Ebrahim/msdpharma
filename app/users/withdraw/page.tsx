"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot, collection, query, where, getDocs, limit } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
    ChevronLeft,
    Wallet,
    CreditCard,
    AlertCircle,
    ChevronRight,
    Loader2,
    Lock,
    XCircle,
    CheckCircle2,
    Clock,
    Info,
    ArrowRight
} from "lucide-react";
import { translations, Language } from "@/lib/translations";


const DAYS_MAP: Record<number, string> = {
    1: "Mon",
    2: "Tue",
    3: "Wed",
    4: "Thu",
    5: "Fri",
    6: "Sat",
    0: "Sun"
};

export default function WithdrawalPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [amount, setAmount] = useState("");
    const [linkedBank, setLinkedBank] = useState<any>(null);
    const [withdrawalSettings, setWithdrawalSettings] = useState<any>({
        minAmount: 300,
        maxAmount: 40000,
        activeDays: [1, 2, 3, 4, 5, 6],
        startTime: "09:00",
        endTime: "17:00",
        frequency: 1,
    });
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


    // Error Modal State
    const [errorModal, setErrorModal] = useState<{ show: boolean, message: string } | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push("/");
                return;
            }
            setUser(currentUser);

            // Fetch User Data for Balance
            const userRef = doc(db, "users", currentUser.uid);
            const unsubscribeUser = onSnapshot(userRef, (doc) => {
                if (doc.exists()) {
                    setUserData(doc.data());
                }
            });

            // Fetch Linked Bank
            const bankRef = doc(db, "Bank", currentUser.uid);
            const unsubscribeBank = onSnapshot(bankRef, (doc) => {
                setLinkedBank(doc.exists() ? doc.data() : null);
            });

            // Fetch Global Withdrawal Settings
            const settingsRef = doc(db, "GlobalSettings", "withdrawal");
            const unsubscribeSettings = onSnapshot(settingsRef, (doc) => {
                if (doc.exists()) {
                    setWithdrawalSettings(doc.data());
                }
                setLoading(false);
            });

            // Fetch Withdrawal Rules for this user
            const qRules = query(
                collection(db, "withdrawal_rules"),
                where("active", "==", true)
            );
            const unsubscribeRules = onSnapshot(qRules, (snapshot) => {
                if (!snapshot.empty) {
                    // Check if any rule targets this user or is a global rule
                    const applicableRule = snapshot.docs.find(doc => {
                        const data = doc.data();
                        return data.targetAll === true || (data.targetUsers && data.targetUsers.includes(currentUser.uid));
                    });

                    if (applicableRule) {
                        const ruleData = applicableRule.data();
                        setErrorModal({
                            show: true,
                            message: ruleData.message || t.pleaseWaitUntil.replace("{time}", "")
                        });

                    }
                }
            });

            return () => {
                unsubscribeUser();
                unsubscribeBank();
                unsubscribeRules();
                unsubscribeSettings();
            };
        });

        return () => unsubscribeAuth();
    }, [router]);

    const formatEthTime = (timeStr: string) => {
        if (!timeStr) return "";
        const [h, m] = timeStr.split(":").map(Number);
        // Ethiopian time = (Server Time - 6) mod 12 (roughly, for 12hr display, but user wants HH:mm)
        // User explicitly asked for 08:00 -> 2:00 and 17:00 -> 11:00
        let ethH = h - 6;
        if (ethH <= 0) ethH += 12; // Simple shift for this range
        return `${String(ethH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const handleWithdrawClick = () => {
        const numAmount = Number(amount);
        const balance = userData?.balance || 0;

        if (!linkedBank) {
            setErrorModal({ show: true, message: t.noBankAccount });
            return;
        }


        if (!amount || isNaN(numAmount)) {
            setErrorModal({ show: true, message: t.enterAmount });
            return;
        }


        if (numAmount < withdrawalSettings.minAmount) {
            setErrorModal({ show: true, message: t.minDepositError.replace("{min}", String(withdrawalSettings.minAmount)) });
            return;
        }


        if (numAmount > withdrawalSettings.maxAmount) {
            setErrorModal({ show: true, message: t.limitMsg.replace("{limit}", withdrawalSettings.maxAmount.toLocaleString()) });
            return;
        }


        // Check Schedule
        const now = new Date();
        const currentDay = now.getDay();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const [startH, startM] = (withdrawalSettings.startTime || "09:00").split(":").map(Number);
        const [endH, endM] = (withdrawalSettings.endTime || "17:00").split(":").map(Number);
        const startTotal = startH * 60 + startM;
        const endTotal = endH * 60 + endM;

        if (!withdrawalSettings.activeDays.includes(currentDay)) {
            setErrorModal({ show: true, message: t.noProductsActive });
            return;
        }


        if (currentTime < startTotal || currentTime > endTotal) {
            setErrorModal({ show: true, message: t.pleaseWaitUntil.replace("{time}", formatEthTime(withdrawalSettings.startTime)) });
            return;
        }


        if (numAmount > balance) {
            setErrorModal({ show: true, message: t.insufficientBalance });
            return;
        }


        // Redirect to Security Page with amount as query param
        router.push(`/users/withdraw/security?amount=${amount}`);
    };

    const feePercent = 0.05; // 5% fee
    const withdrawAmount = Number(amount) || 0;
    const fee = withdrawAmount * feePercent;
    const actualReceipt = withdrawAmount - fee;

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-blue-900 font-sans pb-32 relative selection:bg-blue-500/30 overflow-hidden">
            {/* Medical Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-50/50 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-green-50/30 blur-[100px] rounded-full"></div>
            </div>

            {/* Advanced Error Modal */}
            {errorModal?.show && (
                <div className="fixed inset-0 z-[100] bg-blue-900/60 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in duration-500">
                    <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full blur-3xl -mr-16 -mt-16"></div>

                        <div className="relative z-10 flex flex-col items-center text-center gap-10">
                            <div className="w-24 h-24 rounded-[2.5rem] bg-red-50 flex items-center justify-center border border-red-100 shadow-sm">
                                <XCircle size={48} strokeWidth={1.5} className="text-red-500" />
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-2xl font-bold text-blue-900 tracking-tight">{t.withdrawalAlert}</h3>
                                <p className="text-sm font-medium text-slate-400 leading-relaxed px-2">
                                    {errorModal.message}
                                </p>
                            </div>


                            <button
                                onClick={() => setErrorModal(null)}
                                className="w-full py-6 bg-red-500 text-white rounded-[1.8rem] text-sm font-bold shadow-xl shadow-red-500/20 active:scale-95 transition-all"
                            >
                                {t.ok}
                            </button>

                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-2xl z-50 px-6 py-6 flex items-center justify-between border-b border-blue-50">
                <button
                    onClick={() => router.back()}
                    className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-blue-100 text-blue-900 active:scale-90 transition-all shadow-sm"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-xl font-bold text-blue-900 text-center flex-1">
                    {t.withdraw}
                </h1>

                <div className="w-12" /> {/* Spacer */}
            </header>

            <main className="pt-32 p-6 space-y-10 max-w-lg mx-auto relative z-10">
                {/* Withdrawal Schedule Status */}
                <div className="animate-in fade-in slide-in-from-top-4 duration-700">
                    {(() => {
                        const now = new Date();
                        const currentDay = now.getDay();
                        const currentTime = now.getHours() * 60 + now.getMinutes();
                        const [startH, startM] = (withdrawalSettings.startTime || "09:00").split(":").map(Number);
                        const [endH, endM] = (withdrawalSettings.endTime || "17:00").split(":").map(Number);
                        const startTotal = startH * 60 + startM;
                        const endTotal = endH * 60 + endM;

                        const isOpenToday = withdrawalSettings.activeDays.includes(currentDay);
                        const isWithinHours = currentTime >= startTotal && currentTime <= endTotal;

                        if (!isOpenToday || !isWithinHours) {
                            return (
                                <div className="bg-white border border-red-100 rounded-[3rem] p-8 flex items-center gap-6 shadow-xl shadow-red-900/5">
                                    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 border border-red-100">
                                        <Clock size={32} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-red-500 mb-1">{t.closed}</p>
                                        <p className="text-base font-bold text-blue-900">
                                            {t.opensAtTomorrow.replace("{time}", formatEthTime(withdrawalSettings.startTime))}
                                        </p>
                                    </div>

                                </div>
                            );
                        }
                        return (
                            <div className="bg-white border border-green-100 rounded-[3rem] p-8 flex items-center gap-6 shadow-xl shadow-green-900/5">
                                <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 border border-green-100">
                                    <CheckCircle2 size={32} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-green-600 mb-1">{t.active}</p>
                                    <p className="text-base font-bold text-blue-900">
                                        {t.availableUntil.replace("{time}", formatEthTime(withdrawalSettings.endTime))}
                                    </p>
                                </div>

                                <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.5)]"></div>
                            </div>
                        );
                    })()}
                </div>

                {/* Amount Input Card */}
                <section className="relative group animate-in fade-in slide-in-from-top-6 duration-700 delay-100">
                    <div className="bg-white rounded-[3rem] p-12 border border-blue-50 shadow-xl shadow-blue-900/5 relative overflow-hidden h-64 flex flex-col justify-center">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-50 rounded-full blur-3xl -mr-20 -mt-20"></div>

                        <p className="text-slate-400 text-sm font-medium mb-4">{t.withdrawAmountLabel}</p>

                        <div className="flex items-baseline gap-4 relative z-10">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                className="w-full bg-transparent text-6xl font-black text-blue-900 placeholder:text-blue-900/10 outline-none border-none p-0 tabular-nums leading-none"
                            />
                            <span className="text-blue-900/40 font-black uppercase tracking-widest text-base shrink-0">ETB</span>
                        </div>

                        <div className="mt-10 flex gap-2">
                            {[...Array(10)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${amount && i < amount.length ? "bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.3)]" : "bg-blue-50"
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                </section>

                {/* Info Card */}
                <section className="bg-white rounded-[3.5rem] p-10 border border-blue-50 space-y-8 shadow-xl shadow-blue-900/5 relative overflow-hidden group/info">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                    <div className="flex justify-between items-center p-6 rounded-[2rem] bg-blue-50/50 border border-blue-100">
                        <span className="text-sm font-bold text-slate-800">{t.balance}</span>

                        <span className="text-xl font-bold text-blue-900 tabular-nums">
                            {Number(userData?.balance || 0).toLocaleString()} <span className="text-xs text-slate-400">ETB</span>
                        </span>
                    </div>

                    <div className="space-y-4 px-2">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-slate-800">{t.withdrawalFee}</span>
                                <div className="px-3 py-1 rounded-lg bg-green-500 text-white text-[10px] font-bold leading-none">5%</div>
                            </div>

                            <span className="text-sm font-bold text-red-500 tabular-nums">-{fee.toLocaleString()} ETB</span>
                        </div>
                        <div className="h-[1px] bg-blue-50"></div>
                        <div className="flex justify-between items-end pt-2">
                            <span className="text-sm font-bold text-slate-400 mb-1">{t.youWillReceive}</span>

                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-green-600 tabular-nums tracking-tighter">
                                    {actualReceipt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </span>
                                <span className="text-green-600/40 font-bold text-sm uppercase tracking-widest">ETB</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Bank Selection */}
                <section className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">{t.selectAccountLabel}</h2>
                    </div>


                    {linkedBank ? (
                        <div className="bg-white rounded-[2.5rem] border-2 border-indigo-50 shadow-xl shadow-indigo-100/20 overflow-hidden group/bank hover:border-indigo-200 transition-all cursor-pointer">
                            <div className="p-8 space-y-8">
                                {/* Top Section */}
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 rounded-[1.5rem] bg-white border border-slate-100 flex items-center justify-center p-3 shadow-sm group-hover/bank:scale-105 transition-transform duration-500">
                                        {linkedBank.bankLogoUrl ? (
                                            <img src={linkedBank.bankLogoUrl} alt={linkedBank.bankName} className="w-full h-full object-contain" />
                                        ) : (
                                            <Wallet className="text-slate-300" size={32} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-2xl font-black text-slate-800 truncate tracking-tight uppercase leading-none">
                                            {linkedBank.accountNumber.slice(0, 10)}... <span className="text-slate-200">{t.account}</span>
                                        </h4>

                                        <p className="text-sm font-bold text-slate-400 mt-2 tracking-wide uppercase">{linkedBank.holderName}</p>
                                    </div>
                                    <div className="text-indigo-100 group-hover/bank:text-indigo-400 transition-colors">
                                        <ChevronRight size={24} />
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="border-t-2 border-dashed border-slate-50"></div>

                                {/* Details Section */}
                                <div className="space-y-4 px-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{t.bank}</span>
                                        <span className="text-sm font-bold text-slate-600">{linkedBank.bankName}</span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{t.holder}</span>
                                        <span className="text-sm font-bold text-slate-600">{linkedBank.holderName}</span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{t.number}</span>
                                        <span className="text-sm font-bold text-slate-800 font-mono tracking-tighter">{linkedBank.accountNumber}</span>
                                    </div>

                                </div>
                            </div>
                        </div>
                    ) : (
                        <div
                            onClick={() => router.push('/users/bank')}
                            className="bg-white rounded-[3.5rem] p-12 text-center border-2 border-dashed border-blue-100 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group/add shadow-xl shadow-blue-900/5"
                        >
                            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6 group-hover/add:scale-110 transition-all text-blue-600 border border-blue-100">
                                <CreditCard size={36} />
                            </div>
                            <p className="text-sm font-bold text-slate-800 mb-2">{t.noBankAccount}</p>
                            <p className="text-sm text-slate-400">{t.tapToConnectBank}</p>

                        </div>
                    )}
                </section>

                {/* Usage Tips */}
                <section className="bg-white rounded-[3rem] p-10 border border-blue-50 space-y-10 shadow-xl shadow-blue-900/5 relative overflow-hidden group/rules z-10">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-900 border border-blue-100">
                            <Info size={22} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800">{t.guidelines}</h3>
                    </div>


                    <ul className="space-y-8">
                        {[
                            `${t.hospitalHours}: ${formatEthTime(withdrawalSettings.startTime)} - ${formatEthTime(withdrawalSettings.endTime)} (${withdrawalSettings.activeDays.map((d: number) => DAYS_MAP[d]).join(", ")})`,
                            `${t.dosageLimits}: ${withdrawalSettings.minAmount} - ${withdrawalSettings.maxAmount.toLocaleString()} ETB per request`,
                            `${t.oneRefundPer.replace("{days}", String(withdrawalSettings.frequency))}`,
                            t.processingTimeDesc
                        ].map((rule, i) => {
                            const [label, ...val] = rule.split(": ");
                            return (
                                <li key={i} className="flex gap-4 items-start group/tip">
                                    <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 mt-0.5 group-hover/tip:bg-blue-900 group-hover/tip:text-white transition-all">
                                        <span className="text-xs font-bold transition-colors">{i + 1}</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-slate-400 leading-relaxed group-hover/tip:text-blue-900 transition-all tracking-tight">
                                            <span className="text-slate-200 mr-1">{label}:</span> {val.join(": ")}
                                        </p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            </main>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl p-8 pb-12 border-t border-blue-50 shadow-[0_-20px_50px_rgba(0,0,0,0.05)] relative z-[60]">
                <button
                    onClick={handleWithdrawClick}
                    className="w-full bg-orange-500 text-white py-7 rounded-[2.5rem] font-bold text-lg shadow-xl shadow-orange-500/20 hover:shadow-2xl hover:bg-orange-600 transition-all duration-500 flex items-center justify-center gap-4 group"
                >
                    <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                    <span>{t.withdraw}</span>
                </button>

            </div>
        </div>
    );
}
