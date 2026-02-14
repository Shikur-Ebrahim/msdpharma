"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
    doc,
    getDoc,
    runTransaction,
    collection,
    serverTimestamp,
    increment,
    query,
    where,
    getDocs
} from "firebase/firestore";
import {
    ChevronLeft,
    Clock,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Award,
    X,
    ArrowRight,
    PartyPopper,
    Wallet
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { translations, Language } from "@/lib/translations";

function CountdownTimer({ targetDate, label }: { targetDate: Date, label: string }) {
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const diff = targetDate.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft("00:00:00");
                return;
            }

            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
        };

        updateTimer();
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    return (
        <span className="flex items-center gap-1.5 font-mono">
            <span className="text-orange-500">{label}</span>
            <span>{timeLeft}</span>
        </span>
    );
}

export default function WeekendProductClient() {
    const router = useRouter();
    const { id } = useParams();

    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [isBuying, setIsBuying] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [showInsufficientModal, setShowInsufficientModal] = useState(false);
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

    // Time State
    const [timeStatus, setTimeStatus] = useState<"UPCOMING" | "ACTIVE" | "ENDED">("ACTIVE");
    const [targetDate, setTargetDate] = useState<Date>(new Date());

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) setUserId(user.uid);
            else setUserId(null);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchProduct = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, "WeekendProducts", id as string);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setProduct({ id: docSnap.id, ...docSnap.data() });
                }
            } catch (error) {
                console.error("Error fetching product:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    // Update Time Status with Strict Ethiopian Time (UTC+3)
    useEffect(() => {
        if (!product) return;

        const checkTime = () => {
            const now = new Date();

            // Use Intl to get Ethiopian date parts reliably
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Africa/Addis_Ababa',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            });

            const parts = formatter.formatToParts(now);
            const getPart = (type: string) => parts.find(p => p.type === type)?.value;
            const year = getPart('year');
            const month = getPart('month');
            const day = getPart('day');

            const [startH, startM] = (product.startTime || "00:00").split(":").map(Number);
            const [endH, endM] = (product.endTime || "23:59").split(":").map(Number);

            const fmt = (n: number) => String(n).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            // Explicitly ISO with +03:00 offset for Ethiopia
            const startIso = `${dateStr}T${fmt(startH)}:${fmt(startM)}:00+03:00`;
            const endIso = `${dateStr}T${fmt(endH)}:${fmt(endM)}:00+03:00`;

            const startDate = new Date(startIso);
            const endDate = new Date(endIso);

            const nowTimestamp = now.getTime();

            if (nowTimestamp < startDate.getTime()) {
                setTimeStatus("UPCOMING");
                setTargetDate(startDate);
            } else if (nowTimestamp >= startDate.getTime() && nowTimestamp <= endDate.getTime()) {
                setTimeStatus("ACTIVE");
                setTargetDate(endDate);
            } else {
                setTimeStatus("ENDED");
                setTargetDate(endDate);
            }
        };

        checkTime();
        const interval = setInterval(checkTime, 1000);
        return () => clearInterval(interval);
    }, [product]);

    // Helper to format 24h string "HH:mm" to Ethiopian "H:mm"
    const formatToEthiopianTime = (timeStr: string) => {
        if (!timeStr) return "";
        const [h, m] = timeStr.split(':').map(Number);
        let ethHour = (h + 6) % 12;
        if (ethHour === 0) ethHour = 12;
        return `${ethHour}:${String(m).padStart(2, '0')}`;
    };

    const handlePurchase = async () => {
        if (!userId) {
            router.push("/");
            return;
        }

        if (isBuying) return;
        setIsBuying(true);
        setStatusMsg(null);

        try {
            await runTransaction(db, async (transaction) => {
                const userRef = doc(db, "users", userId);
                const userSnap = await transaction.get(userRef);
                if (!userSnap.exists()) throw new Error("User profile error");

                const userData = userSnap.data();
                const rechargeBalance = Number(userData.Recharge || 0);

                if (rechargeBalance < product.price) {
                    throw new Error("INSUFFICIENT_FUNDS");
                }

                const collectionName = "WeekendUserOrders";
                const ordersRef = collection(db, collectionName);
                const q = query(ordersRef, where("userId", "==", userId), where("productId", "==", product.id));
                const existingOrdersSnap = await getDocs(q);
                if (existingOrdersSnap.size >= (product.purchaseLimit || 1)) {
                    throw new Error("PURCHASE_LIMIT_REACHED");
                }

                const orderRef = doc(collection(db, collectionName));

                let weekendReward = 0;
                let rewardRate = 0;

                if (product.rewardAmount !== undefined) {
                    weekendReward = Number(product.rewardAmount);
                    rewardRate = product.price > 0 ? (weekendReward / product.price) * 100 : 0;
                } else {
                    rewardRate = Number(product.rewardPercent || 0);
                    weekendReward = product.price * (rewardRate / 100);
                }

                const orderData: any = {
                    userId,
                    productId: product.id,
                    productName: product.name,
                    price: product.price,
                    dailyIncome: product.dailyIncome,
                    contractPeriod: product.contractPeriod,
                    remainingDays: product.contractPeriod,
                    totalProfit: product.totalProfit || (product.dailyIncome * product.contractPeriod),
                    status: "active",
                    purchaseDate: serverTimestamp(),
                    lastSync: serverTimestamp(),
                    type: "weekend"
                };

                orderData.withdrawalDays = product.withdrawalDays || 30;
                orderData.weekendBalance = weekendReward + product.dailyIncome;
                orderData.rewardPercent = rewardRate;

                transaction.set(orderRef, orderData);

                const userUpdate: any = {
                    Recharge: rechargeBalance - product.price,
                    WeekendBalance: increment(weekendReward)
                };

                transaction.update(userRef, userUpdate);
            });

            setShowSuccessModal(true);
        } catch (error: any) {
            if (!["INSUFFICIENT_FUNDS", "PURCHASE_LIMIT_REACHED", "User profile error"].includes(error.message)) {
                console.error("System Purchase error:", error);
            }
            if (error.message === "INSUFFICIENT_FUNDS") {
                setShowInsufficientModal(true);
                return;
            }

            if (error.message === "PURCHASE_LIMIT_REACHED") {
                setShowLimitModal(true);
                return;
            }
            setStatusMsg({ type: "error", text: "Transaction Failed" });
        } finally {
            setIsBuying(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
                <Loader2 className="w-12 h-12 animate-spin text-green-600" />
                <p className="mt-8 text-blue-900/40 font-black tracking-widest text-[9px] uppercase">{t.reviewingMedication}</p>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
                <div className="w-24 h-24 bg-blue-50 rounded-[2.5rem] flex items-center justify-center mb-8 border border-blue-100 shadow-sm">
                    <AlertCircle size={48} className="text-blue-900/20" />
                </div>
                <h1 className="text-2xl font-black tracking-tight mb-4 text-blue-900">{t.productNotFound}</h1>
                <p className="text-blue-900/40 max-w-xs mb-10 text-[10px] font-black tracking-widest uppercase leading-relaxed">{t.productNotFoundMsg}</p>
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.back()}
                    className="px-12 py-5 bg-orange-500 text-white rounded-2xl font-black tracking-widest text-[10px] shadow-lg shadow-orange-500/20"
                >
                    {t.backToCatalog}
                </motion.button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-blue-900 pb-32 overflow-hidden relative font-sans">
            {/* Minimal Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md px-6 h-20 flex items-center justify-between border-b border-blue-50 max-w-lg mx-auto">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-full bg-white border border-blue-100 flex items-center justify-center text-blue-900 shadow-sm active:scale-95 transition-transform"
                >
                    <ChevronLeft size={24} />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-lg font-black text-blue-900 leading-none">{t.details}</h1>
                    <span className="text-[10px] font-black text-blue-900/40 tracking-widest uppercase mt-1">
                        {timeStatus === "UPCOMING" ? (
                            <CountdownTimer targetDate={targetDate} label={t.startsIn.toUpperCase()} />
                        ) : timeStatus === "ACTIVE" ? (
                            <CountdownTimer targetDate={targetDate} label={t.endsIn.toUpperCase()} />
                        ) : (
                            <span className="text-rose-500">{t.eventEnded.toUpperCase()}</span>
                        )}
                    </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-white border border-blue-100 flex items-center justify-center shadow-sm">
                    <PartyPopper size={20} className="text-orange-500" />
                </div>
            </header>

            <main className="pt-28 px-6 max-w-lg mx-auto space-y-8 relative z-10">
                {/* Product Image */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative"
                >
                    <div className="aspect-[1.3/1] rounded-[2.5rem] overflow-hidden bg-white shadow-xl shadow-blue-900/5 border border-blue-50 relative">
                        {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-blue-50 gap-4">
                                <Award size={64} strokeWidth={1.5} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-900/20">{t.medicalSupply}</span>
                            </div>
                        )}

                        <div className="absolute top-6 left-6">
                            <span className="px-4 py-1.5 bg-white/95 backdrop-blur-md text-blue-900 text-[10px] font-black uppercase tracking-wider rounded-full border border-blue-100 shadow-sm">
                                {product.category || t.levelOne}
                            </span>
                        </div>

                        {/* Status Overlay for Image */}
                        {timeStatus !== "ACTIVE" && (
                            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center">
                                <div className="bg-white px-6 py-3 rounded-2xl shadow-xl transform rotate-[-4deg]">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-900">
                                        {timeStatus === "UPCOMING" ? `${t.opensAt.replace(/{time}/, formatToEthiopianTime(product.startTime))}` : t.eventEnded.toUpperCase()}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Info Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-blue-900/5 border border-blue-50"
                >
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-900"></div>
                        <h2 className="text-[10px] font-black text-blue-900/30 uppercase tracking-[0.3em]">{t.medicationData}</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-blue-50 last:border-0 last:pb-0">
                            <span className="text-[10px] font-black text-blue-900/30 uppercase tracking-widest">{t.scientificTier}</span>
                            <span className="text-sm font-black text-blue-900">{product.category || t.levelOne}</span>
                        </div>
                        <div className="flex items-center justify-between pb-4 border-b border-blue-50 last:border-0 last:pb-0">
                            <span className="text-[10px] font-black text-blue-900/30 uppercase tracking-widest">{t.productNameLabel}</span>
                            <span className="text-sm font-black text-blue-900">{product.name}</span>
                        </div>

                        <div className="flex items-center justify-between pb-4 border-b border-blue-50 last:border-0 last:pb-0">
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{t.bonusReward}</span>
                            <span className="text-sm font-black text-emerald-600">
                                +{(product.rewardAmount || (product.price * (product.rewardPercent || 0) / 100)).toLocaleString()} ETB
                            </span>
                        </div>

                        <div className="flex items-center justify-between pb-4 border-b border-blue-50 last:border-0 last:pb-0">
                            <span className="text-[10px] font-black text-blue-900/30 uppercase tracking-widest">{t.price}</span>
                            <span className="text-sm font-black text-green-600">{product.price?.toLocaleString()} ETB</span>
                        </div>
                        <div className="flex items-center justify-between pb-4 border-b border-blue-50 last:border-0 last:pb-0">
                            <span className="text-[10px] font-black text-blue-900/30 uppercase tracking-widest">{t.dailyIncome}</span>
                            <span className="text-sm font-black text-blue-900">{product.dailyIncome?.toLocaleString()} ETB</span>
                        </div>
                        <div className="flex items-center justify-between pb-4 border-b border-blue-50 last:border-0 last:pb-0">
                            <span className="text-[10px] font-black text-blue-900/30 uppercase tracking-widest">{t.duration}</span>
                            <span className="text-sm font-black text-blue-900">{product.contractPeriod} {t.days}</span>
                        </div>
                        <div className="flex items-center justify-between pb-4 border-b border-blue-50 last:border-0 last:pb-0">
                            <span className="text-[10px] font-black text-blue-900/30 uppercase tracking-widest">{t.totalProfit}</span>
                            <span className="text-sm font-black text-green-600">{(product.totalProfit || (product.dailyIncome * product.contractPeriod))?.toLocaleString()} ETB</span>
                        </div>
                        <div className="flex items-center justify-between pb-4 border-b border-blue-50 last:border-0 last:pb-0">
                            <span className="text-[10px] font-black text-blue-900/30 uppercase tracking-widest">{t.unitLimit}</span>
                            <span className="text-sm font-black text-blue-900">{product.purchaseLimit || 1} {t.unit}</span>
                        </div>
                        <div className="flex items-center justify-between pb-4 border-b border-blue-50 last:border-0 last:pb-0">
                            <span className="text-[10px] font-black text-blue-900/30 uppercase tracking-widest">{t.withdrawalDelay}</span>
                            <span className="text-sm font-black text-orange-600">{product.withdrawalDays || 30} {t.days}</span>
                        </div>
                    </div>
                </motion.div>

                {/* Status Message Display (Inline) */}
                <AnimatePresence>
                    {statusMsg && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className={`p-4 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-center ${statusMsg.type === 'success'
                                ? 'bg-green-50 text-green-600 border border-green-100'
                                : 'bg-red-50 text-red-600 border border-red-100'
                                }`}
                        >
                            {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                            {statusMsg.text === "INSUFFICIENT_FUNDS_SPECIAL" ? t.insufficientBalance : statusMsg.text}
                        </motion.div>
                    )}
                </AnimatePresence>

            </main>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/95 backdrop-blur-md border-t border-blue-50 z-50 flex flex-col gap-4 max-w-lg mx-auto pb-10">
                {timeStatus === "UPCOMING" ? (
                    <button
                        disabled
                        className="w-full h-16 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs tracking-[0.2em] uppercase cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        <Clock size={16} />
                        {t.opensAt.replace(/{time}/, formatToEthiopianTime(product.startTime))}
                    </button>
                ) : timeStatus === "ENDED" ? (
                    <button
                        disabled
                        className="w-full h-16 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs tracking-[0.2em] uppercase cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        <X size={16} />
                        {t.timeout.toUpperCase()}
                    </button>
                ) : (
                    <button
                        onClick={handlePurchase}
                        disabled={isBuying || (statusMsg?.type === 'success')}
                        className={`w-full h-16 rounded-2xl font-black text-xs tracking-[0.2em] uppercase transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 ${isBuying
                            ? "bg-slate-100 text-slate-400 shadow-none cursor-not-allowed"
                            : "bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/20"
                            }`}
                    >
                        {isBuying ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                {t.buy}
                                <ArrowRight size={18} strokeWidth={3} />
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Success Modal */}
            <AnimatePresence>
                {showSuccessModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600"></div>

                            <div className="flex flex-col items-center text-center space-y-6">
                                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-2 animate-bounce">
                                    <CheckCircle2 size={40} className="text-green-500" />
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.congratulations}</h3>
                                    <p className="text-sm font-medium text-slate-500 leading-relaxed px-2">
                                        {t.choiceSuccessMsg}
                                    </p>
                                </div>

                                <div className="w-full pt-4">
                                    <button
                                        onClick={() => router.push("/users/weekend-record")}
                                        className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black tracking-widest uppercase text-xs hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-900/20"
                                    >
                                        OK
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Limit Reached Modal */}
            <AnimatePresence>
                {showLimitModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-400 via-orange-500 to-red-600"></div>

                            <div className="flex flex-col items-center text-center space-y-6">
                                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-2 animate-bounce">
                                    <AlertCircle size={40} className="text-red-500" />
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.limitReached}</h3>
                                    <p className="text-sm font-medium text-slate-500 leading-relaxed px-2">
                                        {t.limitMsg.replace("{limit}", String(product?.purchaseLimit || 1))}
                                    </p>
                                </div>

                                <div className="w-full pt-4">
                                    <button
                                        onClick={() => router.push("/users/weekend")}
                                        className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black tracking-widest uppercase text-xs hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-900/20"
                                    >
                                        OK
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Insufficient Funds Modal */}
            <AnimatePresence>
                {showInsufficientModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-red-600 to-red-700"></div>

                            <div className="flex flex-col items-center text-center space-y-6">
                                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-2">
                                    <AlertCircle size={40} className="text-red-500" />
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.insufficientFundsTitle}</h3>
                                    <p className="text-sm font-medium text-slate-500 leading-relaxed px-2">
                                        {t.insufficientFundsMsg}
                                    </p>
                                </div>

                                <div className="w-full pt-4 space-y-3">
                                    <button
                                        onClick={() => router.push("/users/recharge")}
                                        className="w-full h-14 bg-red-600 text-white rounded-2xl font-black tracking-widest uppercase text-xs hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                                    >
                                        <Wallet size={18} />
                                        {t.rechargeNow}
                                    </button>
                                    <button
                                        onClick={() => setShowInsufficientModal(false)}
                                        className="w-full h-14 bg-slate-100 text-slate-600 rounded-2xl font-black tracking-widest uppercase text-xs hover:bg-slate-200 active:scale-95 transition-all"
                                    >
                                        {t.cancel}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
