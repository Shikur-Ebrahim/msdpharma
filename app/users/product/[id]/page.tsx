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
    setDoc,
    query,
    where,
    getDocs,
    Timestamp
} from "firebase/firestore";
import {
    ChevronLeft,
    Clock,
    TrendingUp,
    ShieldCheck,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Zap,
    Anchor,
    Award,
    X,
    Sparkles,
    ArrowRight,
    Wallet,
    Info,
    History,
    Star
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { translations, Language } from "@/lib/translations";

export default function UserProductDetailPage() {
    const router = useRouter();
    const { id } = useParams();

    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [isBuying, setIsBuying] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showLimitModal, setShowLimitModal] = useState(false);
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
                const docRef = doc(db, "Products", id as string);
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
                // 1. Get User Data
                const userRef = doc(db, "users", userId);
                const userSnap = await transaction.get(userRef);
                if (!userSnap.exists()) throw new Error("User profile error");

                const userData = userSnap.data();
                const rechargeBalance = Number(userData.Recharge || 0);

                // 2. Validate Funds
                if (rechargeBalance < product.price) {
                    throw new Error("INSUFFICIENT_FUNDS");
                }

                // 3. Purchase Limit Check
                const ordersRef = collection(db, "UserOrders");
                const q = query(ordersRef, where("userId", "==", userId), where("productId", "==", product.id));
                const existingOrdersSnap = await getDocs(q);
                if (existingOrdersSnap.size >= (product.purchaseLimit || 1)) {
                    throw new Error("PURCHASE_LIMIT_REACHED");
                }

                // 4. Record Investment
                const orderRef = doc(collection(db, "UserOrders"));
                transaction.set(orderRef, {
                    userId,
                    productId: product.id,
                    productName: product.name,
                    price: product.price,
                    dailyIncome: product.dailyIncome,
                    contractPeriod: product.contractPeriod,
                    remainingDays: product.contractPeriod,
                    totalProfit: product.totalProfit,
                    principalIncome: product.principalIncome,
                    status: "active",
                    purchaseDate: serverTimestamp(),
                    lastSync: serverTimestamp()
                });

                // 5. Deduct Balance from "Recharge" field and Update Daily Income Rate
                transaction.update(userRef, {
                    Recharge: rechargeBalance - product.price,
                    dailyIncome: increment(product.dailyIncome)
                });
            });

            // setStatusMsg({ type: "success", text: "SUCCESS_PARTNER" });
            setShowConfirmModal(true);
        } catch (error: any) {
            if (!["INSUFFICIENT_FUNDS", "PURCHASE_LIMIT_REACHED", "User profile error"].includes(error.message)) {
                console.error("System Purchase error:", error);
            }
            if (error.message === "INSUFFICIENT_FUNDS") {
                setStatusMsg({ type: "error", text: "INSUFFICIENT_FUNDS_SPECIAL" });

                try {
                    const rechargeReviewRef = collection(db, "RechargeReview");
                    const q = query(
                        rechargeReviewRef,
                        where("userId", "==", userId),
                        where("status", "==", "Under Review")
                    );
                    const snap = await getDocs(q);
                    const targetPath = !snap.empty ? "/users/transaction-pending" : "/users/recharge";
                    setTimeout(() => router.push(targetPath), 3000);
                } catch (queryError) {
                    console.error("Redirection query failed:", queryError);
                    setTimeout(() => router.push("/users/recharge"), 3000);
                }
                return;
            }

            let msg = "Transaction Failed";
            if (error.message === "PURCHASE_LIMIT_REACHED") {
                setShowLimitModal(true);
                return;
            }
            // if (error.message === "PURCHASE_LIMIT_REACHED") msg = `Limit reached: ${product.purchaseLimit} items max.`;
            setStatusMsg({ type: "error", text: msg });
        } finally {
            setIsBuying(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
                <Loader2 className="w-12 h-12 animate-spin text-green-600" />
                <p className="mt-8 text-blue-900/40 font-black tracking-widest text-[9px] uppercase">{t.consulting}</p>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
                <div className="w-24 h-24 bg-blue-50 rounded-[2.5rem] flex items-center justify-center mb-8 border border-blue-100 shadow-sm">
                    <AlertCircle size={48} className="text-blue-900/20" />
                </div>
                <h1 className="text-2xl font-black tracking-tight mb-4 text-blue-900">{t.noProducts}</h1>
                <p className="text-blue-900/40 max-w-xs mb-10 text-[10px] font-black tracking-widest uppercase leading-relaxed">{t.consulting}</p>
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
                    <span className="text-[10px] font-black text-blue-900/40 tracking-widest uppercase mt-1">{t.pharmacyFull}</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-white border border-blue-100 flex items-center justify-center shadow-sm">
                    <img src="/msd-logo.png" alt="MSD" className="w-6 h-6 object-contain" />
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
                                {product.category || "General"}
                            </span>
                        </div>
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
                        <h2 className="text-[10px] font-black text-blue-900/30 uppercase tracking-[0.3em]">{t.medicalWallets}</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-blue-50 last:border-0 last:pb-0">
                            <span className="text-[10px] font-black text-blue-900/30 uppercase tracking-widest">{t.scientificTier}</span>
                            <span className="text-sm font-black text-blue-900">{product.category || "Level 1"}</span>
                        </div>
                        <div className="flex items-center justify-between pb-4 border-b border-blue-50 last:border-0 last:pb-0">
                            <span className="text-[10px] font-black text-blue-900/30 uppercase tracking-widest">{t.productSku}</span>
                            <span className="text-sm font-black text-blue-900">{product.name}</span>
                        </div>
                        <div className="flex items-center justify-between pb-4 border-b border-blue-50 last:border-0 last:pb-0">
                            <span className="text-[10px] font-black text-blue-900/30 uppercase tracking-widest">{t.entryPrice}</span>
                            <span className="text-sm font-black text-green-600">{product.price?.toLocaleString()} ETB</span>
                        </div>
                        <div className="flex items-center justify-between pb-4 border-b border-blue-50 last:border-0 last:pb-0">
                            <span className="text-[10px] font-black text-blue-900/30 uppercase tracking-widest">{t.dailyYield}</span>
                            <span className="text-sm font-black text-blue-900">{product.dailyIncome?.toLocaleString()} ETB</span>
                        </div>
                        <div className="flex items-center justify-between pb-4 border-b border-blue-50 last:border-0 last:pb-0">
                            <span className="text-[10px] font-black text-blue-900/30 uppercase tracking-widest">{t.cyclePeriod}</span>
                            <span className="text-sm font-black text-blue-900">{product.contractPeriod} {t.days}</span>
                        </div>
                        <div className="flex items-center justify-between pb-4 border-b border-blue-50 last:border-0 last:pb-0">
                            <span className="text-[10px] font-black text-blue-900/30 uppercase tracking-widest">{t.totalOutcome}</span>
                            <span className="text-sm font-black text-green-600">{product.totalProfit?.toLocaleString()} ETB</span>
                        </div>
                        <div className="flex items-center justify-between pb-4 border-b border-blue-50 last:border-0 last:pb-0">
                            <span className="text-[10px] font-black text-blue-900/30 uppercase tracking-widest">{t.unitLimit}</span>
                            <span className="text-sm font-black text-blue-900">{product.purchaseLimit || 1} {t.unit}</span>
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
                <button
                    onClick={handlePurchase}
                    disabled={isBuying || (statusMsg?.type === 'success')}
                    className={`w-full h-16 rounded-2xl font-black text-xs tracking-[0.2em] uppercase transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] flex items-center justify-center gap-2 ${isBuying ? "bg-blue-50 text-blue-900/20" : "bg-orange-500 text-white hover:bg-orange-600"
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
            </div>

            {/* Success Modal */}
            <AnimatePresence>
                {showConfirmModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600"></div>

                            <div className="flex flex-col items-center text-center space-y-6">
                                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-2 animate-bounce">
                                    <CheckCircle2 size={40} className="text-green-500" />
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.congratulations}</h3>
                                    <p className="text-sm font-medium text-slate-500 leading-relaxed px-2">
                                        {t.purchaseSuccess}
                                    </p>
                                </div>

                                <div className="w-full pt-4">
                                    <button
                                        onClick={() => router.push("/users/funding-details")}
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
                                        {t.limitMsg.replace("{limit}", (product?.purchaseLimit || 1).toString())}
                                    </p>
                                </div>

                                <div className="w-full pt-4">
                                    <button
                                        onClick={() => router.push("/users/welcome")}
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
        </div>
    );
}

// Add local animation for progress bar
const style = `
@keyframes progress-shrink {
    0% { transform: scaleX(1); }
    100% { transform: scaleX(0); }
}
.animate-progress-shrink {
    animation: progress-shrink 3s linear forwards;
}
`;




