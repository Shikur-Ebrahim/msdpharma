"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import {
    Home,
    Wallet,
    Ship,
    Users,
    Bell,
    TrendingUp,
    Loader2,
    Shield,
    Package,
    ChevronLeft,
    Star,
    Sparkles,
    Zap,
    Clock,
    ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { translations, Language } from "@/lib/translations";

export default function UserProductsPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Product State
    const [products, setProducts] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState("ALL");
    const [fetchingProducts, setFetchingProducts] = useState(true);
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

        // Fetch Products - Smaller price at the top
        const qProducts = query(collection(db, "Products"), orderBy("price", "asc"));
        const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
            const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProducts(productsData);
            setFetchingProducts(false);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeProducts();
        };
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-12 h-12 animate-spin text-green-600" />
            </div>
        );
    }

    const filteredProducts = products.filter(p => {
        if (activeCategory === "ALL") return true;

        const normalize = (c: string) => {
            if (!c) return "A";
            const val = c.toLowerCase().replace("level ", "").trim().toUpperCase();
            if (val === "1") return "A";
            if (val === "2") return "B";
            if (val === "3") return "C";
            return val;
        };

        return normalize(p.category) === normalize(activeCategory);
    });

    return (
        <div className="min-h-screen bg-white text-[#1A1A1A] pb-44 overflow-x-hidden">
            {/* Medical Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-50/50 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-50/30 blur-[100px] rounded-full"></div>
            </div>

            {/* Premium Top Bar */}
            <header className="fixed top-0 left-0 right-0 h-24 bg-white/95 backdrop-blur-3xl z-40 px-6 flex items-center justify-between border-b border-blue-50 mx-auto max-w-lg">
                <div className="flex items-center gap-5">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => router.push("/users/welcome")}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-blue-100 text-blue-900/70 hover:text-blue-900 transition-all shadow-sm"
                    >
                        <ChevronLeft size={22} strokeWidth={2.5} />
                    </motion.button>
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold tracking-tight leading-tight text-blue-900">{t.pharmacyFull}</h1>
                        <span className="text-[10px] font-black text-blue-900/40 tracking-wider uppercase">{t.msdInventory}</span>
                    </div>
                </div>
                <motion.div
                    initial={{ rotate: -10 }}
                    animate={{ rotate: 0 }}
                    className="w-12 h-12 relative p-1 bg-white rounded-2xl border border-blue-100 shadow-sm"
                >
                    <img src="/msd-logo.png" alt="MSD Logo" className="w-full h-full object-contain" />
                </motion.div>
            </header>

            <main className="pt-32 px-6 max-w-lg mx-auto relative z-10">
                <div className="space-y-10">

                    {/* Elite Category Navigation */}
                    <div className="bg-blue-50/50 p-1.5 rounded-[2rem] border border-blue-100 flex gap-1 justify-between items-center max-w-full overflow-x-auto no-scrollbar">
                        {[
                            { id: "ALL", label: "ALL" },
                            { id: "Level A", label: "LEVEL A" },
                            { id: "Level B", label: "LEVEL B" },
                            { id: "Level C", label: "LEVEL C" },
                            { id: "VIP", label: "VIP" }
                        ].map((cat, idx) => (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`flex-1 py-3 px-6 rounded-2xl text-[10px] font-black tracking-widest transition-all whitespace-nowrap ${activeCategory === cat.id
                                    ? "bg-blue-900 text-white shadow-lg shadow-blue-900/10 scale-[1.02]"
                                    : "text-blue-900/40 hover:text-blue-900/60"
                                    }`}
                            >
                                {cat.label}
                            </motion.button>
                        ))}
                    </div>

                    {/* Boutique Grid */}
                    <div className="pb-20">
                        {fetchingProducts ? (
                            <div className="py-32 flex flex-col items-center justify-center space-y-6">
                                <Loader2 className="w-12 h-12 animate-spin text-green-600" />
                                <p className="text-[10px] font-black text-blue-900/30 tracking-widest uppercase">{t.consulting}</p>
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="py-24 flex flex-col items-center justify-center bg-blue-50/30 rounded-[3rem] border border-blue-50 text-blue-900/20"
                            >
                                <Package size={48} className="mb-6 opacity-10" />
                                <p className="text-[10px] font-black tracking-widest uppercase">{t.noProducts}</p>
                            </motion.div>
                        ) : (
                            <div className="grid grid-cols-1 gap-8">
                                <AnimatePresence mode="popLayout">
                                    {filteredProducts.map((product, idx) => (
                                        <motion.div
                                            key={product.id}
                                            layout
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: idx * 0.1, type: "spring", stiffness: 100 }}
                                            onClick={() => router.push(`/users/product/${product.id}`)}
                                            className="group relative bg-white rounded-[2.5rem] p-7 border border-blue-50 active:scale-[0.98] transition-all cursor-pointer overflow-hidden shadow-xl shadow-blue-900/5 hover:shadow-2xl hover:border-green-100">
                                            {/* Luxury Medical Glow */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                            {/* Tracking Bar - Enhanced Vibrant Colors */}
                                            {product.showTracking && (
                                                <div className="absolute top-0 left-0 right-0 z-20 p-4">
                                                    <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-green-100 shadow-xl shadow-green-900/5">
                                                        <div className="flex justify-between items-end mb-2">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="relative flex h-2 w-2">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-600"></span>
                                                                </div>
                                                                <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">{t.inStock}</span>
                                                            </div>
                                                            <span className="text-[10px] font-black text-blue-900">
                                                                <span className="text-green-600">{Math.min(100, Math.round(((product.trackingCurrent || 0) / (product.trackingTarget || 100)) * 100))}%</span>
                                                                <span className="text-blue-900/40 ml-1">{t.claimed}</span>
                                                            </span>
                                                        </div>
                                                        <div className="h-2 w-full bg-blue-50 rounded-full overflow-hidden shadow-inner">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${Math.min(100, ((product.trackingCurrent || 0) / (product.trackingTarget || 100)) * 100)}%` }}
                                                                transition={{ duration: 1.5, ease: "easeOut" }}
                                                                className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full shadow-[0_0_15px_rgba(22,163,74,0.3)]"
                                                            ></motion.div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Product Image Stage */}
                                            <div className="aspect-[16/10] w-full rounded-[2rem] overflow-hidden bg-blue-50/30 relative shadow-inner border border-blue-50 group-hover:border-green-200 transition-all duration-500">
                                                {product.imageUrl ? (
                                                    <motion.img
                                                        whileHover={{ scale: 1.1 }}
                                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                                        src={product.imageUrl}
                                                        alt={product.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-blue-100">
                                                        <Package size={52} strokeWidth={1} />
                                                    </div>
                                                )}

                                                {/* Category Badge Floating */}
                                                <div className="absolute top-5 right-5 px-4 py-1.5 bg-white/95 backdrop-blur-xl border border-blue-100 rounded-full shadow-sm">
                                                    <span className="text-[10px] font-black text-blue-900 tracking-[0.1em]">{(product.category || "LEVEL A").toUpperCase()}</span>
                                                </div>
                                            </div>

                                            <div className="mt-8 space-y-8">
                                                {/* Header Info */}
                                                <div className="flex justify-between items-start">
                                                    <div className="space-y-1">
                                                        <h3 className="text-2xl font-black text-blue-900 tracking-tight leading-none">{product.name}</h3>
                                                        <p className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest mt-1">Medical Supply</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[10px] font-black text-blue-900/20 uppercase tracking-widest block mb-1">Price</span>
                                                        <span className="text-2xl font-black text-green-600">
                                                            {product.price?.toLocaleString()}
                                                            <span className="text-[10px] ml-1.5 text-green-600/60 font-black tracking-tight">ETB</span>
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* ROI Stats Grid */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-50 flex flex-col gap-2 group-hover:bg-blue-50 transition-colors">
                                                        <span className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest">{t.dailyYield}</span>
                                                        <p className="text-xl font-black text-blue-900 leading-none">
                                                            {product.dailyIncome?.toLocaleString()}
                                                            <span className="text-[10px] ml-1.5 font-bold text-blue-900/30 uppercase">ETB</span>
                                                        </p>
                                                    </div>
                                                    <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-50 flex flex-col gap-2 group-hover:bg-blue-50 transition-colors">
                                                        <span className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest">{t.cycle}</span>
                                                        <p className="text-xl font-black text-blue-900 leading-none">
                                                            {product.contractPeriod}
                                                            <span className="text-[10px] ml-1.5 font-bold text-blue-900/30 uppercase">{t.days}</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* CTA Button */}
                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    className="w-full h-16 bg-orange-500 rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all border border-orange-400/20"
                                                >
                                                    <span className="text-[12px] font-black text-white tracking-[0.25em] uppercase">{t.buy}</span>
                                                </motion.button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>
            </main>

        </div>
    );
}
