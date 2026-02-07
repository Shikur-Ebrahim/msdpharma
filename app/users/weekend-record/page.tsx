"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
    ChevronLeft,
    Loader2,
    Package,
    TrendingUp,
    Calendar,
    Clock,
    CheckCircle2,
    PartyPopper,
    Wallet,
    AlertTriangle,
    X,
    ArrowDownCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { translations, Language } from "@/lib/translations";

export default function WeekendRecordPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<any[]>([]);
    const [userId, setUserId] = useState<string | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [totalWeekendBalance, setTotalWeekendBalance] = useState(0);
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

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [modalData, setModalData] = useState<{ daysLeft: number; amount: number } | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push("/");
                return;
            }
            setUserId(user.uid);

            // Fetch User Data for fixed balance
            const userRef = doc(db, "users", user.uid);
            const unsubscribeUser = onSnapshot(userRef, (doc) => {
                if (doc.exists()) {
                    setUserData(doc.data());
                }
            });

            // Fetch Weekend Orders
            const q = query(
                collection(db, "WeekendUserOrders"),
                where("userId", "==", user.uid),
            );

            const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
                const ordersData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }))
                    .sort((a: any, b: any) => b.purchaseDate?.seconds - a.purchaseDate?.seconds);

                // Calculate total weekend balance
                const orderTotal = ordersData.reduce((sum, order: any) => {
                    return sum + (order.weekendBalance || 0);
                }, 0);

                // Note: totalWeekendBalance will be set in a separate effect or based on userData + orderTotal
                // Let's combine them here since we have ordersData
                // But we need userData.fixedWeekendBalance which might not be loaded yet
                // The JSX will handle the sum safely
                setTotalWeekendBalance(orderTotal);

                setOrders(ordersData);
                setLoading(false);
            }, (error) => {
                console.error("Error fetching weekend orders:", error);
                setLoading(false);
            });

            return () => {
                unsubscribeSnapshot();
                unsubscribeUser();
            };
        });

        return () => unsubscribeAuth();
    }, [router]);

    // One-time locking logic (similar to profile page)
    useEffect(() => {
        if (!userId || !userData) return;
        if (userData.fixedWeekendBalance !== undefined) return;

        const fetchAndLock = async () => {
            try {
                const globalRef = doc(db, "GlobalSettings", "weekend");
                const globalSnap = await getDoc(globalRef);

                if (globalSnap.exists()) {
                    const globalData = globalSnap.data();
                    const defaultBalance = Number(globalData.defaultBalance || 0);

                    if (defaultBalance > 0) {
                        const userRef = doc(db, "users", userId);
                        await updateDoc(userRef, {
                            fixedWeekendBalance: defaultBalance
                        });
                    }
                }
            } catch (error) {
                console.error("Error in global balance locking:", error);
            }
        };

        fetchAndLock();
    }, [userId, userData]);

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "N/A";
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    const calculateDaysPassed = (purchaseDate: any) => {
        if (!purchaseDate?.seconds) return 0;
        const purchaseMs = purchaseDate.seconds * 1000;
        const now = Date.now();
        const diffMs = now - purchaseMs;
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    };

    const handleWithdrawClick = async (order: any) => {
        const daysPassed = calculateDaysPassed(order.purchaseDate);
        const withdrawalDays = order.withdrawalDays || 30; // Default to 30 if not set
        const daysLeft = withdrawalDays - daysPassed;

        if (daysLeft > 0) {
            // Not eligible yet, show notification modal
            setModalData({ daysLeft, amount: order.weekendBalance || 0 });
            setShowModal(true);
        } else {
            // Eligible for withdrawal, redirect to weekend withdrawal page
            router.push('/users/weekend-withdrawal');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-[#1A1A1A] pb-32 overflow-x-hidden relative font-sans">
            {/* Ambient Festive Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-50/50 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-50/30 blur-[100px] rounded-full"></div>
            </div>

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 h-24 bg-white/95 backdrop-blur-3xl z-40 px-6 flex items-center justify-between border-b border-orange-50 mx-auto max-w-lg">
                <div className="flex items-center gap-5">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => router.back()}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-orange-100 text-orange-600 hover:text-orange-700 transition-all shadow-sm"
                    >
                        <ChevronLeft size={22} strokeWidth={2.5} />
                    </motion.button>
                    <div className="flex flex-col">
                        <h1 className="text-xl font-black tracking-tight leading-tight text-slate-900">{t.myCollection}</h1>
                        <span className="text-[10px] font-black text-orange-500 tracking-[0.2em] uppercase">{t.weekendAssets}</span>
                    </div>
                </div>
                <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 5 }}
                    className="w-12 h-12 relative p-1 bg-white rounded-2xl border border-orange-100 shadow-sm flex items-center justify-center"
                >
                    <Wallet size={24} className="text-orange-500" />
                </motion.div>
            </header>

            <main className="pt-32 px-6 max-w-lg mx-auto relative z-10 space-y-6">

                {/* Total Weekend Balance Card */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[2rem] p-6 shadow-lg shadow-slate-900/5 border border-orange-100 relative overflow-hidden"
                >
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500 rounded-full blur-3xl"></div>
                    </div>

                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                                <Wallet size={24} className="text-orange-500" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{t.weekendBalance}</span>
                                <span className="text-lg font-black text-slate-900">{t.weekendBalance}</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-end">
                            <span className="text-3xl font-black text-green-600 tabular-nums">
                                {Math.floor(totalWeekendBalance + (userData?.fixedWeekendBalance || 0)).toLocaleString()}
                            </span>
                            <span className="text-xs font-black text-green-500 uppercase tracking-wider">ETB</span>
                        </div>
                    </div>
                </motion.div>

                {orders.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="py-20 flex flex-col items-center justify-center text-center space-y-6 opacity-60"
                    >
                        <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mb-2">
                            <Package size={40} className="text-orange-300" />
                        </div>
                        <p className="text-sm font-bold text-slate-400">{t.noWeekendPurchases}</p>
                        <button
                            onClick={() => router.push('/users/weekend')}
                            className="px-8 py-3 bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-500/20"
                        >
                            {t.exploreWeekend}
                        </button>
                    </motion.div>
                ) : (
                    <div className="grid gap-6">
                        {orders.map((order, idx) => {
                            const daysPassed = calculateDaysPassed(order.purchaseDate);
                            const withdrawalDays = order.withdrawalDays || 30;
                            const daysLeft = Math.max(0, withdrawalDays - daysPassed);
                            const canWithdraw = daysLeft === 0 && !order.withdrawn;
                            const isWithdrawn = order.withdrawn;

                            return (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-slate-900/5 border border-slate-50 relative overflow-hidden group hover:border-orange-200 transition-colors"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full translate-x-1/3 -translate-y-1/3 blur-3xl group-hover:bg-orange-100 transition-colors"></div>

                                    {/* Top Row */}
                                    <div className="flex justify-between items-start mb-6 relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500">
                                                <PartyPopper size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-black text-slate-900 leading-tight">{order.productName}</h3>
                                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                    <Calendar size={10} />
                                                    {formatDate(order.purchaseDate)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider bg-slate-50 border-slate-100 text-slate-500 flex items-center gap-1">
                                            <Clock size={10} />
                                            {order.contractPeriod} {t.days}
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-3 relative z-10">
                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t.invested}</span>
                                            <span className="text-sm font-black text-slate-900">{order.price?.toLocaleString()} ETB</span>
                                        </div>
                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t.dailyIncome}</span>
                                            <span className="text-sm font-black text-slate-900">{order.dailyIncome?.toLocaleString()} ETB</span>
                                        </div>
                                    </div>

                                    {/* Balance Section */}
                                    <div className="mt-4 bg-orange-50 rounded-2xl p-4 border border-orange-100 flex items-center justify-between relative z-10">
                                        <span className="text-[10px] font-black text-orange-400 uppercase tracking-wider">{t.balance}</span>
                                        <span className="text-xl font-black text-orange-600">{order.weekendBalance?.toLocaleString()} ETB</span>
                                    </div>

                                    {/* Withdrawal Button */}
                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => !isWithdrawn && handleWithdrawClick(order)}
                                        disabled={isWithdrawn}
                                        className={`mt-4 w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all relative z-10 ${isWithdrawn
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            : canWithdraw
                                                ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                                                : 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                            }`}
                                    >
                                        {isWithdrawn ? (
                                            <>
                                                <CheckCircle2 size={18} />
                                                {t.withdrawn}
                                            </>
                                        ) : canWithdraw ? (
                                            <>
                                                <ArrowDownCircle size={18} />
                                                {t.withdrawNow}
                                            </>
                                        ) : (
                                            <>
                                                <Clock size={18} />
                                                {t.withdrawDaysLeft.replace("{days}", String(daysLeft))}
                                            </>
                                        )}
                                    </motion.button>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

            </main>

            {/* Notification Modal */}
            <AnimatePresence>
                {showModal && modalData && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl relative"
                        >
                            <button
                                onClick={() => setShowModal(false)}
                                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
                            >
                                <X size={16} />
                            </button>

                            <div className="text-center">
                                <div className="w-20 h-20 mx-auto mb-6 bg-amber-50 rounded-full flex items-center justify-center">
                                    <AlertTriangle size={40} className="text-amber-500" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-2">{t.withdrawalNotAvailable}</h3>
                                <p className="text-sm text-slate-500 mb-6">
                                    {t.withdrawalEligibilityMsg.replace("{amount}", modalData.amount.toLocaleString())}
                                </p>
                                <div className="bg-orange-50 rounded-2xl p-6 border border-orange-100">
                                    <span className="text-4xl font-black text-orange-600">{modalData.daysLeft}</span>
                                    <span className="text-sm font-bold text-orange-400 block mt-1">{t.daysRemaining}</span>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="mt-6 w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-wider"
                                >
                                    {t.ok}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
