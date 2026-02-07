"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
    ChevronLeft,
    Loader2,
    Calendar,
    CheckCircle2,
    Clock,
    TrendingDown,
    Building2,
    ShieldCheck,
    History,
    AlertCircle,
    Copy,
    Check,
    Banknote,
    TrendingUp,
    XCircle,
    ArrowUpRight,
    Search,
    ShieldAlert,
    Wallet,
    Lock
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { translations, Language } from "@/lib/translations";

export default function WithdrawalRecordPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [withdrawals, setWithdrawals] = useState<any[]>([]);
    const [weekendWithdrawals, setWeekendWithdrawals] = useState<any[]>([]);
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
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                router.push("/");
                return;
            }

            const q1 = query(
                collection(db, "Withdrawals"),
                where("userId", "==", currentUser.uid)
            );

            const q2 = query(
                collection(db, "WeekendWithdrawals"),
                where("userId", "==", currentUser.uid)
            );

            const unsubscribe1 = onSnapshot(q1, (snapshot) => {
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    type: "regular",
                    ...doc.data()
                })) as any[];
                setWithdrawals(data);
                setLoading(false);
            });

            const unsubscribe2 = onSnapshot(q2, (snapshot) => {
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    type: "weekend",
                    ...doc.data()
                })) as any[];
                setWeekendWithdrawals(data);
                setLoading(false);
            });

            return () => {
                unsubscribe1();
                unsubscribe2();
            };
        });

        return () => unsubscribeAuth();
    }, [router]);

    const records = useMemo(() => {
        const combined = [...withdrawals, ...weekendWithdrawals];
        return combined.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
        });
    }, [withdrawals, weekendWithdrawals]);

    const { pending, history, stats } = useMemo(() => {
        const p = records.filter(r => r.status === 'pending');
        const h = records.filter(r => r.status !== 'pending');

        return {
            pending: p,
            history: h,
            stats: {
                totalSettled: records
                    .filter(r => r.status === 'verified' || r.status === 'approved' || r.status === 'success')
                    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0),
                inPipeline: records
                    .filter(r => r.status === 'pending')
                    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
            }
        };
    }, [records]);

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
                <Loader2 className="w-12 h-12 animate-spin text-orange-600" />
                <p className="mt-8 text-xs font-bold text-slate-400">{t.loadingLabel}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-blue-900 font-sans selection:bg-blue-500/30 pb-32 overflow-hidden">
            {/* Medical Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-50/50 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-green-50/30 blur-[100px] rounded-full"></div>
            </div>

            {/* Premium Header */}
            <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-xl z-50 px-5 py-6 flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="w-14 h-14 flex items-center justify-center rounded-[1.5rem] bg-white text-slate-900 active:scale-95 transition-all shadow-xl shadow-slate-200/50 border border-slate-50"
                >
                    <ChevronLeft size={24} strokeWidth={2.5} />
                </button>
                <div className="flex-1 text-center">
                    <h1 className="text-[22px] font-bold text-[#0f172a] tracking-tight">{t.withdrawalHistory}</h1>
                </div>
                <div className="w-14 h-14 flex items-center justify-center rounded-[1.5rem] bg-orange-50 text-orange-600 active:scale-95 transition-all shadow-xl shadow-orange-100/30 border border-orange-100/50">
                    <History size={24} strokeWidth={2.5} />
                </div>
            </header>

            <main className="pt-32 px-5 space-y-10 max-w-lg mx-auto relative z-10 w-full">
                <section className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-6 duration-1000">
                    <div className="bg-white p-7 rounded-[2rem] shadow-xl shadow-slate-900/5 border border-slate-50 flex flex-col justify-center h-32 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-full blur-2xl -mr-10 -mt-10 opacity-60"></div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-bold text-slate-400 mb-2">{t.totalPaid}</p>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-bold text-slate-900 tracking-tighter tabular-nums">{stats.totalSettled.toLocaleString()}</span>
                                <span className="text-[9px] font-bold text-slate-400">ETB</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-7 rounded-[2rem] shadow-xl shadow-orange-900/5 border border-orange-50 flex flex-col justify-center h-32 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-orange-50 rounded-full blur-2xl -mr-10 -mt-10 opacity-60"></div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-bold text-orange-400 mb-2">{t.pending}</p>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-bold text-slate-900 tracking-tighter tabular-nums">{stats.inPipeline.toLocaleString()}</span>
                                <span className="text-[9px] font-bold text-slate-400">ETB</span>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="space-y-16">
                    {/* Pending Transactions */}
                    {pending.length > 0 && (
                        <div className="space-y-8">
                            <div className="flex items-center gap-5 px-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                <h3 className="text-[10px] font-bold text-orange-600 leading-none">{t.pending} ({pending.length})</h3>
                                <div className="flex-1 h-[1px] bg-orange-100"></div>
                            </div>
                            <div className="space-y-10">
                                {pending.map(item => (
                                    <WithdrawalCard key={item.id} item={item} status="pending" t={t} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Historical Records */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-5 px-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                            <h3 className="text-[10px] font-bold text-slate-400 leading-none">{t.transactionHistory}</h3>
                            <div className="flex-1 h-[1px] bg-slate-100"></div>
                        </div>
                        {history.length > 0 ? (
                            <div className="space-y-12">
                                {history.map(item => (
                                    <WithdrawalCard key={item.id} item={item} status={item.status} t={t} />
                                ))}
                            </div>
                        ) : pending.length === 0 ? (
                            <div className="py-24 text-center space-y-8 bg-slate-50/50 rounded-[4rem] border-2 border-dashed border-slate-100">
                                <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center mx-auto border border-slate-100">
                                    <Banknote size={40} className="text-slate-200" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm font-bold text-slate-400">{t.noRecordsFound}</p>
                                    <p className="text-[10px] text-slate-300 font-medium">{t.noWithdrawalsYet}</p>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </main>
        </div>
    );
}

function WithdrawalCard({ item, status, t }: any) {
    const isPending = status === 'pending';
    const isSuccess = status === 'verified' || status === 'approved' || status === 'success';
    const isFailed = status === 'rejected' || status === 'failed';

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative rounded-[3.5rem] bg-white border border-blue-50 shadow-xl shadow-blue-900/5 overflow-hidden group/card
                ${isPending ? 'border-orange-100 shadow-orange-900/5' :
                    isSuccess ? 'border-green-100 shadow-green-900/5' :
                        'border-red-100 shadow-red-900/5'}
            `}
        >
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 transition-all duration-500 ${isPending ? 'bg-orange-50' : isSuccess ? 'bg-green-50' : 'bg-red-50'}`}></div>

            {/* Content Section */}
            <div className="relative p-8 space-y-8 z-10">
                <div className="flex justify-between items-start">
                    <div className="space-y-4 flex-1">
                        <div className={`w-fit px-4 py-1.5 rounded-full border text-[9px] font-bold flex items-center gap-2
                                ${isPending ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                isSuccess ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                    'bg-rose-50 text-rose-600 border-rose-100'}`}>
                            {isPending ? <Clock size={12} className="animate-pulse" /> : isSuccess ? <CheckCircle2 size={12} /> : <ShieldAlert size={12} />}
                            <span>{status === 'pending' ? t.pending : isSuccess ? t.success : t.rejected}</span>
                            {item.type === 'weekend' && (
                                <span className="ml-1 px-1.5 py-0.5 bg-orange-500 text-white rounded text-[9px] font-bold">{t.weekend}</span>
                            )}
                        </div>
                        <div className="flex items-baseline gap-2 mt-4">
                            <span className={`text-4xl font-bold tracking-tighter tabular-nums ${isPending ? 'text-slate-900' : isSuccess ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {Number(item.actualReceipt).toLocaleString()}
                            </span>
                            <span className="text-[10px] font-bold text-slate-300">{t.withdrawAmountLabel}</span>
                        </div>
                    </div>

                    <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center p-2 border border-slate-50">
                        {item.bankDetails?.bankLogoUrl ? (
                            <img src={item.bankDetails.bankLogoUrl} alt="Bank" className="w-full h-full object-contain" />
                        ) : (
                            <Building2 className="text-slate-100" size={28} />
                        )}
                    </div>
                </div>

                {/* Processing Fee Section */}
                <div className="bg-slate-50/40 rounded-[2rem] p-7 flex justify-between items-center border border-slate-50">
                    <span className="text-[11px] font-bold text-slate-400">{t.withdrawalFee}</span>
                    <span className="text-sm font-bold text-rose-500">-{Number(item.fee).toLocaleString()} ETB</span>
                </div>

                {/* Destination Section */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                            <span className="text-[10px] font-bold text-slate-400">{t.bank}</span>
                        </div>
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-lg border border-orange-100">{item.bankDetails?.bankName}</span>
                    </div>

                    <div className="bg-slate-50/40 rounded-[2.5rem] p-9 space-y-5 border border-slate-50">
                        <div className="flex justify-between items-center gap-4">
                            <span className="text-[10px] font-bold text-slate-400">{t.accountNumberLabel}</span>
                            <span className="text-sm font-bold text-slate-900 tracking-widest font-mono">
                                {item.bankDetails?.accountNumber}
                            </span>
                        </div>

                        <div className="flex justify-between items-center gap-4 border-t border-slate-100 pt-4">
                            <span className="text-[10px] font-bold text-slate-400">{t.accountNameLabel}</span>
                            <p className="text-xs font-bold text-slate-800 truncate text-right">
                                {item.bankDetails?.holderName}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Section */}
                <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2 bg-slate-50/60 px-4 py-2 rounded-xl text-[10px] font-bold text-slate-400">
                        <Calendar size={12} />
                        {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(item.createdAt).toLocaleDateString()}
                    </div>

                    <div className="flex items-center gap-2 text-orange-600 font-bold text-[10px] tracking-tight">
                        {isSuccess ? (
                            <div className="flex items-center gap-1.5 text-emerald-600">
                                <CheckCircle2 size={14} strokeWidth={3} />
                                <span>{t.paid}</span>
                            </div>
                        ) : isPending ? (
                            <div className="flex items-center gap-1.5 text-orange-500">
                                <Clock size={14} strokeWidth={3} className="animate-pulse" />
                                <span>{t.pending}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-rose-500">
                                <XCircle size={14} strokeWidth={3} />
                                <span>{t.rejected}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
