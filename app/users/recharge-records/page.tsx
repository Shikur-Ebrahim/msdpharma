"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import {
    ChevronLeft,
    Loader2,
    CheckCircle2,
    Clock,
    CreditCard,
    Calendar,
    Hash,
    Building2,
    User as UserIcon,
    DollarSign,
    FileText,
    TrendingUp,
    Activity,
    Zap,
    Shield
} from "lucide-react";
import { translations, Language } from "@/lib/translations";

interface RechargeRecord {
    id: string;
    FTcode: string;
    accountHolderName: string;
    accountNumber: string;
    amount: number;
    bankName: string;
    paymentMethod: string;
    phoneNumber: string;
    status: string;
    timestamp: any;
    userId: string;
    verifiedAt?: any;
}

export default function RechargeRecordsPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [records, setRecords] = useState<RechargeRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "verified" | "under review">("all");
    const [paymentMethodLogos, setPaymentMethodLogos] = useState<Record<string, string>>({});
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
            await fetchRechargeRecords(currentUser.uid);
            await fetchPaymentMethodLogos();
        });

        return () => unsubscribe();
    }, [router]);

    const fetchPaymentMethodLogos = async () => {
        try {
            const methodsQuery = query(collection(db, "paymentMethods"));
            const querySnapshot = await getDocs(methodsQuery);
            const logos: Record<string, string> = {};

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.methodName && data.logoUrl) {
                    logos[data.methodName.toLowerCase()] = data.logoUrl;
                }
            });

            setPaymentMethodLogos(logos);
        } catch (error) {
            console.error("Error fetching payment method logos:", error);
        }
    };

    const fetchRechargeRecords = async (userId: string) => {
        try {
            const q = query(
                collection(db, "RechargeReview"),
                where("userId", "==", userId)
            );

            const querySnapshot = await getDocs(q);
            const fetchedRecords: RechargeRecord[] = [];

            querySnapshot.forEach((doc) => {
                fetchedRecords.push({
                    id: doc.id,
                    ...doc.data()
                } as RechargeRecord);
            });

            // Sort by timestamp descending (newest first) on client side
            fetchedRecords.sort((a, b) => {
                const timeA = a.timestamp?.toMillis?.() || 0;
                const timeB = b.timestamp?.toMillis?.() || 0;
                return timeB - timeA;
            });

            setRecords(fetchedRecords);
        } catch (error) {
            console.error("Error fetching recharge records:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "N/A";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const getStatusConfig = (status: string) => {
        switch (status.toLowerCase()) {
            case "verified":
                return {
                    icon: CheckCircle2,
                    label: t.verified,
                    bgColor: "bg-green-50",
                    textColor: "text-green-600",
                    borderColor: "border-green-100",
                    lightBg: "bg-green-50/50"
                };
            default:
                return {
                    icon: Clock,
                    label: t.pending,
                    bgColor: "bg-orange-50",
                    textColor: "text-orange-600",
                    borderColor: "border-orange-100",
                    lightBg: "bg-orange-50/50"
                };
        }
    };

    const filteredRecords = records.filter(record => {
        if (filter === "all") return true;
        if (filter === "under review") {
            const status = record.status.toLowerCase();
            return status === "under review" || status === "underreview" || status === "review";
        }
        return record.status.toLowerCase() === filter;
    });

    const stats = {
        total: records.length,
        verified: records.filter(r => r.status.toLowerCase() === "verified").length,
        underReview: records.filter(r => {
            const status = r.status.toLowerCase();
            return status === "under review" || status === "underreview" || status === "review";
        }).length,
        totalAmount: records
            .filter(r => r.status.toLowerCase() === "verified")
            .reduce((sum, r) => sum + r.amount, 0)
    };

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
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-50/50 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-50/30 blur-[100px] rounded-full"></div>
            </div>

            <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-2xl z-50 px-6 py-6 flex items-center justify-between border-b border-blue-50">
                <button
                    onClick={() => router.back()}
                    className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-blue-100 text-blue-900 active:scale-90 transition-all shadow-sm"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-xl font-bold text-blue-900 leading-none">
                    {t.rechargeHistoryHeader}
                </h1>
                <div className="w-12" />
            </header>

            <main className="pt-32 px-6 max-w-lg mx-auto w-full relative z-10 space-y-10">
                {/* Stats Overview */}
                <div className="grid grid-cols-2 gap-5">
                    <div className="bg-white rounded-[3rem] p-8 border border-blue-50 shadow-xl shadow-blue-900/5 relative overflow-hidden flex flex-col justify-center h-40">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-full blur-2xl -mr-12 -mt-12"></div>
                        <p className="text-xs font-bold text-blue-900/40 mb-4">{t.totalRecharge}</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-blue-900 tracking-tight tabular-nums">{stats.totalAmount.toLocaleString()}</span>
                            <span className="text-[10px] font-bold text-blue-900/40">ETB</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-white rounded-[2rem] p-6 border border-green-100 shadow-xl shadow-green-900/5 flex items-center justify-between h-[calc(50%-8px)]">
                            <div>
                                <p className="text-[10px] font-bold text-green-600/40">{t.success}</p>
                                <p className="text-lg font-bold text-blue-900">{stats.verified}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 border border-green-100">
                                <CheckCircle2 size={20} />
                            </div>
                        </div>
                        <div className="bg-white rounded-[2rem] p-6 border border-orange-100 shadow-xl shadow-orange-900/5 flex items-center justify-between h-[calc(50%-8px)]">
                            <div>
                                <p className="text-[10px] font-bold text-orange-600/40">{t.pending}</p>
                                <p className="text-lg font-bold text-blue-900">{stats.underReview}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100">
                                <Clock size={20} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex p-2 bg-white rounded-[2rem] shadow-xl shadow-blue-900/5 border border-blue-50">
                    {[
                        { key: "all", label: t.all },
                        { key: "verified", label: t.verified },
                        { key: "under review", label: t.pending }
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setFilter(tab.key as any)}
                            className={`flex-1 py-4 rounded-[1.5rem] text-xs font-bold transition-all duration-500 ${filter === tab.key
                                ? "bg-blue-900 text-white shadow-xl shadow-blue-900/20"
                                : "text-blue-900/40 hover:text-blue-900"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Records List */}
                <div className="space-y-6 pb-20">
                    {filteredRecords.length === 0 ? (
                        <div className="py-24 text-center space-y-6 bg-blue-50/50 rounded-[3.5rem] border-2 border-dashed border-blue-100">
                            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto border border-blue-100">
                                <FileText className="w-10 h-10 text-blue-900/20" />
                            </div>
                            <p className="text-blue-900/40 font-bold text-sm">{t.recordsNotFound}</p>
                        </div>
                    ) : (
                        filteredRecords.map((record) => {
                            const statusConfig = getStatusConfig(record.status);
                            const StatusIcon = statusConfig.icon;

                            return (
                                <div
                                    key={record.id}
                                    className="bg-white rounded-[3rem] p-8 border border-blue-50 shadow-xl shadow-blue-900/5 relative overflow-hidden group hover:border-blue-200 transition-all"
                                >
                                    <div className="flex items-start justify-between mb-8">
                                        <div className="flex items-center gap-5">
                                            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center p-3 border border-blue-100 shadow-inner group-hover:scale-105 transition-all">
                                                {paymentMethodLogos[record.paymentMethod.toLowerCase()] ? (
                                                    <img
                                                        src={paymentMethodLogos[record.paymentMethod.toLowerCase()]}
                                                        alt={record.paymentMethod}
                                                        className="w-full h-full object-contain filter drop-shadow-[0_2px_5px_rgba(30,58,138,0.1)]"
                                                    />
                                                ) : (
                                                    <CreditCard className="text-blue-900/40" size={28} />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-blue-900 tracking-tight leading-none mb-2">{record.paymentMethod}</h3>
                                                <p className="text-[11px] font-medium text-blue-900/40">{formatDate(record.timestamp)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-blue-900 tracking-tight tabular-nums leading-none mb-2">{record.amount.toLocaleString()}</p>
                                            <span className={`text-[10px] font-bold px-3 py-1 rounded-lg ${record.status.toLowerCase() === 'verified'
                                                ? 'bg-green-500 text-white'
                                                : 'bg-orange-500 text-white'
                                                }`}>
                                                {t.rechargeLabel}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="h-px bg-blue-50 w-full mb-8"></div>

                                    <div className="grid grid-cols-2 gap-6 items-end">
                                        <div className="space-y-5">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-blue-900/20 mb-1">{t.bankNameLabel}</span>
                                                <span className="text-sm font-bold text-blue-900 truncate">{record.bankName}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-blue-900/20 mb-1">{t.accountNameLabel}</span>
                                                <span className="text-sm font-bold text-blue-900 truncate">{record.accountHolderName}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-3">
                                            <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all ${record.status.toLowerCase() === 'verified'
                                                ? 'bg-green-50 border-green-100 text-green-600 shadow-lg shadow-green-500/5'
                                                : 'bg-orange-50 border-orange-100 text-orange-600 shadow-lg shadow-orange-500/5'
                                                }`}>
                                                <StatusIcon size={16} strokeWidth={2} />
                                                <span className="text-[10px] font-bold leading-none">{statusConfig.label}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>
        </div>
    );
}
