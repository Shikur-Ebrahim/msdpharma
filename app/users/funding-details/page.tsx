"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
    ChevronLeft,
    Loader2,
    Package,
    Calendar,
    Timer,
    Zap,
    Coins,
    TrendingUp,
    LayoutGrid,
    Clock,
    CheckCircle2,
    Activity,
    ShieldCheck,
    Stethoscope
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { translations, Language } from "@/lib/translations";

export default function FundingDetailsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<any[]>([]);
    const [products, setProducts] = useState<Record<string, any>>({});
    const [userId, setUserId] = useState<string | null>(null);
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
            setUserId(currentUser.uid);

            const qOrders = query(
                collection(db, "UserOrders"),
                where("userId", "==", currentUser.uid)
            );

            const unsubscribeDocs = onSnapshot(qOrders, async (snapshot) => {
                const ordersData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as any[];

                const productIds = Array.from(new Set(ordersData.map(o => o.productId)));
                const productMap: Record<string, any> = { ...products };

                for (const pid of productIds) {
                    if (!productMap[pid]) {
                        const pDoc = await getDoc(doc(db, "Products", pid));
                        if (pDoc.exists()) {
                            productMap[pid] = pDoc.data();
                        }
                    }
                }

                setProducts(productMap);
                setOrders(ordersData);
                setLoading(false);
            });

            return () => unsubscribeDocs();
        });

        return () => unsubscribeAuth();
    }, [router]);

    const formatDate = (dateValue: any) => {
        if (!dateValue) return "N/A";
        const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
        if (isNaN(date.getTime())) return "N/A";

        return new Intl.DateTimeFormat('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }).format(date);
    };

    const calculateRemainingDays = (order: any) => {
        if (order.remainingDays !== undefined) return order.remainingDays;
        const dateValue = order.purchaseDate || order.createdAt;
        const purchaseDate = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);
        if (isNaN(purchaseDate.getTime())) return 0;

        const now = new Date();
        const diffDays = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
        const remaining = (order.contractPeriod || 0) - diffDays;
        return remaining > 0 ? remaining : 0;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
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
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-blue-50 relative">
                <div className="max-w-lg mx-auto px-6 h-20 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-blue-100 text-blue-900 transition-all active:scale-95 shadow-sm"
                    >
                        <ChevronLeft size={22} />
                    </button>
                    <h1 className="text-lg font-bold text-blue-900 leading-none">{t.myOrders}</h1>
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                        <Activity size={18} />
                    </div>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-6 py-10 relative z-10">
                <AnimatePresence>
                    {orders.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center py-24 text-center space-y-8"
                        >
                            <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center border border-blue-100 shadow-inner">
                                <Package size={40} className="text-blue-900/20" />
                            </div>
                            <div className="space-y-2 text-center">
                                <h3 className="text-2xl font-bold text-blue-900">{t.noOrdersYet}</h3>
                                <p className="text-sm text-blue-900/40 leading-relaxed px-6">
                                    {t.noOrdersMsg}
                                </p>
                            </div>
                            <button
                                onClick={() => router.push('/users/product')}
                                className="px-10 py-5 bg-blue-900 text-white rounded-2xl text-base font-bold shadow-xl shadow-blue-900/20 active:scale-95 transition-all"
                            >
                                {t.viewProducts}
                            </button>
                        </motion.div>
                    ) : (
                        <div className="space-y-8">
                            {orders.map((order, idx) => {
                                const product = products[order.productId] || {};
                                const remaining = calculateRemainingDays(order);
                                const progress = ((order.contractPeriod - remaining) / order.contractPeriod) * 100;
                                const totalProfit = (order.dailyIncome || 0) * (order.contractPeriod - remaining);

                                return (
                                    <motion.div
                                        key={order.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-blue-900/5 border border-blue-50 flex flex-col gap-8 relative overflow-hidden group"
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50 group-hover:opacity-100 transition-opacity"></div>

                                        {/* Top Section */}
                                        <div className="flex gap-6 relative z-10">
                                            <div className="w-20 h-20 rounded-[1.8rem] bg-blue-50 border border-blue-100 overflow-hidden shrink-0 p-1">
                                                {product.imageUrl ? (
                                                    <img src={product.imageUrl} alt={order.productName} className="w-full h-full object-cover rounded-[1.5rem]" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Stethoscope size={28} className="text-blue-900/10" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="text-lg font-bold text-blue-900 truncate pr-4 leading-none">{order.productName}</h3>
                                                    <span className="px-2.5 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-full border border-green-100 shadow-sm">
                                                        {t.active}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-blue-900/40 text-[11px] font-medium">
                                                    <Clock size={12} className="shrink-0" />
                                                    <span>{t.boughtLabel} {formatDate(order.purchaseDate || order.createdAt)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-2 gap-4 relative z-10">
                                            {[
                                                { label: t.price, val: Number(order.price).toLocaleString(), unit: "ETB", icon: <ShieldCheck size={14} />, color: "text-blue-900" },
                                                { label: t.dailyIncome, val: Number(order.dailyIncome).toLocaleString(), unit: "ETB", icon: <TrendingUp size={14} />, color: "text-blue-900" },
                                                { label: t.totalProfit, val: `+${totalProfit.toLocaleString()}`, unit: "ETB", icon: <Coins size={14} />, color: "text-green-600" },
                                                { label: t.remaining, val: remaining, unit: t.days, icon: <Timer size={14} />, color: "text-blue-600" }
                                            ].map((stat, i) => (
                                                <div key={i} className="bg-blue-50/30 p-5 rounded-2xl border border-blue-50/50">
                                                    <span className="text-[11px] font-bold text-blue-900/30 flex items-center gap-2 mb-2">
                                                        {stat.icon} {stat.label}
                                                    </span>
                                                    <p className={`text-base font-bold ${stat.color} leading-none`}>
                                                        {stat.val} <span className="text-[11px] text-blue-900/20 font-bold ml-1">{stat.unit}</span>
                                                    </p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Progress Section */}
                                        <div className="space-y-4 relative z-10 pt-4 border-t border-blue-50">
                                            <div className="flex justify-between items-center px-1">
                                                <span className="text-[11px] font-bold text-blue-900/30 flex items-center gap-2">
                                                    <Zap size={14} className="text-orange-500" /> {t.progressLabel}
                                                </span>
                                                <span className="text-xs font-bold text-blue-900">{Math.round(progress)}%</span>
                                            </div>
                                            <div className="h-3 w-full bg-blue-50 rounded-full overflow-hidden border border-blue-100 p-0.5 shadow-inner">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(100, progress)}%` }}
                                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                                    className="h-full bg-blue-900 rounded-full shadow-[0_0_10px_rgba(30,58,138,0.3)] relative overflow-hidden"
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite]"></div>
                                                </motion.div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </AnimatePresence>
            </main>

            {/* Stealth Logistics */}
            <div className="fixed bottom-10 left-0 right-0 flex justify-center pointer-events-none opacity-10 z-0">
                <span className="text-[10px] font-semibold text-blue-900">{t.investmentDetailsFoot}</span>
            </div>
        </div>
    );
}
