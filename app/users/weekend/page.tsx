"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import {
    ChevronLeft,
    Loader2,
    Package,
    Clock,
    TrendingUp,
    PartyPopper,
    Zap,
    Sparkles,
    CalendarDays,
    Info,
    AlertCircle,
    BellRing
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { translations, Language } from "@/lib/translations";

function CountdownTimer({ targetDate }: { targetDate: Date }) {
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

    return <span>{timeLeft}</span>;
}

export default function WeekendUserPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
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

    // Product State
    const [products, setProducts] = useState<any[]>([]);
    const [fetchingProducts, setFetchingProducts] = useState(true);

    // Modal State
    const [showUpcomingModal, setShowUpcomingModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);

    // State to trigger re-renders for time updates
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setTick(t => t + 1);
        }, 1000);

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push("/");
                return;
            }
            setUser(currentUser);

            try {
                const docRef = doc(db, "users", currentUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setUserData(docSnap.data());
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setLoading(false);
            }
        });

        // Fetch Weekend Products
        const qProducts = query(collection(db, "WeekendProducts"), orderBy("createdAt", "desc"));
        const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
            const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProducts(productsData);
            setFetchingProducts(false);
        });

        return () => {
            clearInterval(timer);
            unsubscribeAuth();
            unsubscribeProducts();
        };
    }, [router]);

    // Helper to format 24h string "HH:mm" to Ethiopian "H:mm"
    const formatToEthiopianTime = (timeStr: string) => {
        if (!timeStr) return "";
        const [h, m] = timeStr.split(':').map(Number);
        let ethHour = (h + 6) % 12;
        if (ethHour === 0) ethHour = 12;
        return `${ethHour}:${String(m).padStart(2, '0')}`;
    };

    const getProductTimeStatus = (product: any) => {
        const now = new Date();
        const utcTimestamp = now.getTime() + (now.getTimezoneOffset() * 60000);
        const ethiopianOffset = 3 * 60 * 60 * 1000;
        const ethiopianTime = new Date(utcTimestamp + ethiopianOffset);

        const year = ethiopianTime.getUTCFullYear();
        const month = ethiopianTime.getUTCMonth();
        const day = ethiopianTime.getUTCDate();

        const [startH, startM] = (product.startTime || "00:00").split(":").map(Number);
        const [endH, endM] = (product.endTime || "23:59").split(":").map(Number);
        const fmt = (n: number) => String(n).padStart(2, '0');
        const dateStr = `${year}-${fmt(month + 1)}-${fmt(day)}`;

        const startIso = `${dateStr}T${fmt(startH)}:${fmt(startM)}:00+03:00`;
        const endIso = `${dateStr}T${fmt(endH)}:${fmt(endM)}:00+03:00`;

        const startDate = new Date(startIso);
        const endDate = new Date(endIso);
        const nowTimestamp = now.getTime(); // Absolute comparisons

        if (nowTimestamp < startDate.getTime()) {
            return { status: "UPCOMING", targetDate: startDate };
        } else if (nowTimestamp >= startDate.getTime() && nowTimestamp <= endDate.getTime()) {
            return { status: "ACTIVE", targetDate: endDate };
        } else {
            return { status: "ENDED", targetDate: endDate };
        }
    };

    const handleProductClick = (product: any, status: string) => {
        if (status === "ACTIVE") {
            router.push(`/users/weekend/${product.id}`);
        } else if (status === "UPCOMING") {
            setSelectedProduct(product);
            setShowUpcomingModal(true);
        }
        // Do nothing for ENDED
    };

    const handleRefresh = () => {
        setShowUpcomingModal(false);
        setSelectedProduct(null);
        // Force refresh logic or just let the Interval handle it, 
        // but explicit refresh can be nice for UX feel
        router.refresh();
    };

    const filteredProducts = products
        .filter(product => {
            // If activeDays is set, strict check
            const now = new Date();
            const utcTimestamp = now.getTime() + (now.getTimezoneOffset() * 60000);
            const ethiopianTime = new Date(utcTimestamp + (3 * 60 * 60 * 1000));
            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const currentDay = days[ethiopianTime.getUTCDay()];

            if (product.activeDays && product.activeDays.length > 0) {
                return product.activeDays.includes(currentDay);
            }
            return true;
        })
        .sort((a, b) => {
            const statusA = getProductTimeStatus(a).status;
            const statusB = getProductTimeStatus(b).status;

            const score = { "ACTIVE": 1, "UPCOMING": 2, "ENDED": 3 };
            return (score[statusA as keyof typeof score] || 3) - (score[statusB as keyof typeof score] || 3);
        });

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-[#1A1A1A] pb-44 overflow-x-hidden">
            {/* Ambient Festive Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-50/50 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-50/30 blur-[100px] rounded-full"></div>
            </div>

            {/* Top Bar */}
            <header className="fixed top-0 left-0 right-0 h-24 bg-white/95 backdrop-blur-3xl z-40 px-6 flex items-center justify-between border-b border-orange-50 mx-auto max-w-lg">
                <div className="flex items-center gap-5">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => router.push("/users/welcome")}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-orange-100 text-orange-600 hover:text-orange-700 transition-all shadow-sm"
                    >
                        <ChevronLeft size={22} strokeWidth={2.5} />
                    </motion.button>
                    <div className="flex flex-col">
                        <h1 className="text-xl font-black tracking-tight leading-tight text-slate-900">{t.weekendLab}</h1>
                        <span className="text-[10px] font-black text-orange-500 tracking-[0.2em] uppercase">{t.msdExclusive}</span>
                    </div>
                </div>
                <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 5 }}
                    className="w-12 h-12 relative p-1 bg-white rounded-2xl border border-orange-100 shadow-sm flex items-center justify-center"
                >
                    <PartyPopper size={24} className="text-orange-500" />
                </motion.div>
            </header>

            <main className="pt-32 px-6 max-w-lg mx-auto relative z-10">
                <div className="space-y-12">

                    {/* Products Grid */}
                    <div className="pb-20">
                        {fetchingProducts ? (
                            <div className="py-32 flex flex-col items-center justify-center space-y-6">
                                <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
                                <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{t.openingVault}</p>
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="py-24 flex flex-col items-center justify-center bg-orange-50/20 rounded-[3rem] border-2 border-dashed border-orange-100 text-orange-900/40"
                            >
                                <CalendarDays size={48} className="mb-6 opacity-20" />
                                <p className="text-[10px] font-black tracking-widest uppercase">{t.noProductsActive}</p>
                                <p className="text-[10px] mt-2 font-bold text-slate-400">{t.checkBackWeekend}</p>
                            </motion.div>
                        ) : (
                            <div className="grid grid-cols-1 gap-10">
                                <AnimatePresence mode="popLayout">
                                    {filteredProducts.map((product, idx) => {
                                        const { status, targetDate } = getProductTimeStatus(product);
                                        const isUpcoming = status === "UPCOMING";
                                        const isActive = status === "ACTIVE";
                                        const isEnded = status === "ENDED";

                                        return (
                                            <motion.div
                                                key={product.id}
                                                layout
                                                initial={{ opacity: 0, y: 30 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                transition={{ delay: idx * 0.1, type: "spring", stiffness: 100 }}
                                                // Make card clickable based on status or general intention
                                                onClick={() => handleProductClick(product, status)}
                                                className="group relative bg-white rounded-[3rem] p-7 border border-slate-50 active:scale-[0.98] transition-all cursor-pointer overflow-hidden shadow-2xl shadow-slate-900/5 hover:shadow-orange-500/10 hover:border-orange-100"
                                            >
                                                {/* Product Image Stage */}
                                                <div className="aspect-[16/10] w-full rounded-[2.5rem] overflow-hidden bg-slate-50 relative shadow-inner border border-slate-100 group-hover:border-orange-200 transition-all duration-500">
                                                    {product.imageUrl ? (
                                                        <motion.img
                                                            whileHover={{ scale: 1.1 }}
                                                            transition={{ duration: 1.5, ease: "easeOut" }}
                                                            src={product.imageUrl}
                                                            alt={product.name}
                                                            className={`w-full h-full object-cover ${!isActive ? 'grayscale opacity-70' : ''}`}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-200">
                                                            <Package size={52} strokeWidth={1} />
                                                        </div>
                                                    )}

                                                    {/* Category Badge Floating */}
                                                    <div className="absolute bottom-5 right-5 px-4 py-1.5 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-full shadow-sm">
                                                        <span className="text-[10px] font-black text-orange-600 tracking-[0.1em]">{product.category.toUpperCase()}</span>
                                                    </div>

                                                    {/* Status Overlay */}
                                                    {!isActive && (
                                                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-10">
                                                            <div className="bg-white px-5 py-2 rounded-xl shadow-lg rotate-[-3deg]">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                                                                    {isUpcoming ? t.startsAt.replace("{time}", formatToEthiopianTime(product.startTime)) : t.closed}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}

                                                </div>

                                                <div className="mt-8 space-y-6">
                                                    {/* Header Info */}
                                                    <div className="flex justify-between items-start px-2">
                                                        <div className="space-y-1">
                                                            <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{product.name}</h3>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{t.specialOffer}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">{t.price}</span>
                                                            <span className="text-2xl font-black text-slate-900">
                                                                {product.price?.toLocaleString()}
                                                                <span className="text-[10px] ml-1.5 text-slate-400 font-black tracking-tight">ETB</span>
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Enhanced ROI & Timer Grid */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {/* Row 1 */}
                                                        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col gap-2 group-hover:bg-orange-50/50 transition-colors">
                                                            <span className="text-[10px] font-bold text-slate-500">{t.dailyIncome}</span>
                                                            <p className="text-xl font-black text-slate-900 leading-none">
                                                                {product.dailyIncome?.toLocaleString()}
                                                                <span className="text-[10px] ml-1.5 font-bold text-slate-400 uppercase">ETB</span>
                                                            </p>
                                                        </div>
                                                        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col gap-2 group-hover:bg-orange-50/50 transition-colors">
                                                            <span className="text-[10px] font-bold text-slate-500">{t.cyclePeriod}</span>
                                                            <p className="text-xl font-black text-slate-900 leading-none">
                                                                {product.contractPeriod}
                                                                <span className="text-[10px] ml-1.5 font-bold text-slate-400 uppercase">{t.days}</span>
                                                            </p>
                                                        </div>

                                                        {/* Row 2 (Highlight) */}
                                                        <div className="bg-orange-500 rounded-2xl p-5 flex flex-col gap-2 shadow-lg shadow-orange-500/20 group-hover:bg-orange-600 transition-colors">
                                                            <div className="flex items-center gap-2">
                                                                <TrendingUp size={12} className="text-white/60" />
                                                                <span className="text-[9px] font-bold text-white/80">{t.totalProfit}</span>
                                                            </div>
                                                            <p className="text-xl font-black text-white leading-none">
                                                                {product.totalProfit?.toLocaleString() || (product.dailyIncome * product.contractPeriod).toLocaleString()}
                                                                <span className="text-[10px] ml-1.5 font-black text-white/60 uppercase">ETB</span>
                                                            </p>
                                                        </div>

                                                        {/* Timer Card */}
                                                        <div className={`rounded-2xl p-5 flex flex-col gap-2 shadow-lg transition-all duration-300 ${isUpcoming ? 'bg-blue-600 shadow-blue-500/20' :
                                                            isActive ? 'bg-gradient-to-br from-emerald-600 to-teal-500 shadow-teal-500/20' :
                                                                'bg-slate-100 text-slate-400'
                                                            }`}>
                                                            <div className="flex items-center gap-2">
                                                                <Clock size={12} className={isEnded ? "text-slate-400" : "text-white/60"} />
                                                                <span className={`text-[9px] font-bold ${isEnded ? "text-slate-400" : "text-white/80"}`}>
                                                                    {isUpcoming ? t.startsIn.toUpperCase() : isActive ? t.timeRemaining.toUpperCase() : t.status.toUpperCase()}
                                                                </span>
                                                            </div>
                                                            <div className={`text-xl font-black leading-none ${isEnded ? "text-slate-500" : "text-white"}`}>
                                                                {isEnded ? t.timeout.toUpperCase() : <CountdownTimer targetDate={targetDate} />}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Sales Tracking Progress */}
                                                    <div className="px-2 space-y-3">
                                                        {(() => {
                                                            const targetPercent = product.salesTracker || 80;
                                                            const currentPercent = isActive ? targetPercent : isEnded ? 100 : 0;

                                                            return (
                                                                <>
                                                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                                                        <span className="text-slate-400">{t.salesStatus}</span>
                                                                        <span className="text-orange-600">{t.soldLabel.replace("{percent}", String(currentPercent))}</span>
                                                                    </div>
                                                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                                                        <motion.div
                                                                            initial={{ width: 0 }}
                                                                            animate={{ width: `${currentPercent}%` }}
                                                                            className={`h-full rounded-full ${!isActive ? 'bg-slate-400' : 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]'}`}
                                                                        />
                                                                    </div>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>

                                                    <button
                                                        // Allow click if Upcoming (for modal) or Active (for buy)
                                                        disabled={isEnded}
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // prevent card click
                                                            handleProductClick(product, status);
                                                        }}
                                                        className={`w-full h-16 rounded-[1.5rem] flex items-center justify-center text-[11px] font-black tracking-[0.3em] uppercase transition-all active:scale-95 group-hover:translate-y-[-2px] ${isActive
                                                            ? "bg-slate-900 text-white hover:bg-orange-600 shadow-xl shadow-slate-900/10"
                                                            : isUpcoming
                                                                ? "bg-blue-50 text-blue-900 hover:bg-blue-100 cursor-pointer"
                                                                : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                            }`}
                                                    >
                                                        {isUpcoming ? (
                                                            <span className="flex items-center gap-2">
                                                                <BellRing size={16} />
                                                                {t.waitForTime.replace("{time}", formatToEthiopianTime(product.startTime))}
                                                            </span>
                                                        ) : isEnded ? t.timeout : t.buy}
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )
                                    })}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>

                {/* Upcoming Notification Modal */}
                <AnimatePresence>
                    {showUpcomingModal && selectedProduct && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-indigo-500 to-blue-600"></div>

                                <div className="flex flex-col items-center text-center space-y-6">
                                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-2 animate-pulse">
                                        <Clock size={40} className="text-blue-500" />
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.activeAt.replace("{time}", formatToEthiopianTime(selectedProduct.startTime))}</h3>
                                        <p className="text-sm font-medium text-slate-500 leading-relaxed px-2">
                                            {t.eventNotStarted} <br />
                                            {t.pleaseWaitUntil.replace("{time}", formatToEthiopianTime(selectedProduct.startTime))}
                                        </p>
                                    </div>

                                    {/* Timer Preview */}
                                    <div className="bg-slate-50 px-6 py-3 rounded-xl border border-slate-100">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{t.timeRemaining}</p>
                                        <p className="text-xl font-black text-slate-900 font-mono">
                                            <CountdownTimer targetDate={getProductTimeStatus(selectedProduct).targetDate} />
                                        </p>
                                    </div>

                                    <div className="w-full pt-4">
                                        <button
                                            onClick={handleRefresh}
                                            className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black tracking-widest uppercase text-xs hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-900/20"
                                        >
                                            {t.ok}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

            </main>
        </div>
    );
}
