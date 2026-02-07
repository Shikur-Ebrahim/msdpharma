"use client";

// Optimized build fix for service grid types

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    orderBy,
    limit,
    where,
    updateDoc
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { translations, Language } from "@/lib/translations";
import {
    ChevronLeft,
    TrendingUp,
    ArrowUpRight,
    ArrowDownLeft,
    Users,
    Wallet,
    Loader2,
    Shield,
    Home,
    Ship,
    Award,
    DownloadCloud,
    FileText,
    Key,
    History,
    ChevronRight as ChevronRightIcon,
    LogOut,
    Lock,
    Zap,
    Coins,
    ArrowUp,
    TrendingDown,
    Activity,
    CreditCard,
    Building2,
    Headphones,
    PartyPopper
} from "lucide-react";

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [hasRuleUpdates, setHasRuleUpdates] = useState(false);
    const [totalWeekendBalance, setTotalWeekendBalance] = useState(0);
    const [globalWeekendSettings, setGlobalWeekendSettings] = useState<any>(null);
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

            // Real-time subscription to user data
            const userRef = doc(db, "users", currentUser.uid);
            const unsubscribeData = onSnapshot(userRef, (doc) => {
                if (doc.exists()) {
                    setUserData(doc.data());
                }
                setLoading(false);
            });

            return () => unsubscribeData();
        });

        return () => unsubscribeAuth();
    }, [router]);

    // Fetch Weekend Orders for total weekend balance
    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, "WeekendUserOrders"),
            where("userId", "==", user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const orders = snapshot.docs.map(doc => doc.data());
            const total = orders.reduce((sum, order: any) => sum + (order.weekendBalance || 0), 0);
            setTotalWeekendBalance(total);
        }, (error) => {
            console.error("Error fetching weekend orders:", error);
        });

        return () => unsubscribe();
    }, [user]);

    // Fetch Global Weekend Settings and Lock for User
    useEffect(() => {
        if (!user || !userData) return;

        // Skip if already locked for this user
        if (userData.fixedWeekendBalance !== undefined) return;

        const fetchAndLock = async () => {
            try {
                const globalRef = doc(db, "GlobalSettings", "weekend");
                const globalSnap = await getDoc(globalRef);

                if (globalSnap.exists()) {
                    const globalData = globalSnap.data();
                    const defaultBalance = Number(globalData.defaultBalance || 0);

                    if (defaultBalance > 0) {
                        // Lock it for this user one-time
                        const userRef = doc(db, "users", user.uid);
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
    }, [user, userData]);

    useEffect(() => {
        if (!userData) return;

        const q = query(collection(db, "rules"), orderBy("updatedAt", "desc"), limit(1));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const latestRule = snapshot.docs[0].data();
                const lastUpdate = latestRule.updatedAt?.toMillis() || 0;

                // Track per-category updates if needed, but for profile badge, any update counts
                const lastViewedAt = userData.lastRulesViewedAt?.toMillis() || 0;

                if (lastUpdate > lastViewedAt) {
                    setHasRuleUpdates(true);
                } else {
                    setHasRuleUpdates(false);
                }
            }
        }, (error) => {
            console.error("Error listening to rules updates:", error);
        });

        return () => unsubscribe();
    }, [userData]);


    // Format phone number: 251***44444
    const formatPhone = (phone: string) => {
        if (!phone) return "N/A";
        if (phone.length < 7) return phone;
        return `${phone.substring(0, 3)}***${phone.substring(phone.length - 5)}`;
    };

    const stats = [
        { label: t.deposits, value: Math.floor(userData?.totalRecharge || 0).toLocaleString(), icon: CreditCard, color: "blue", category: "wallet" },
        { label: t.teamIncome, value: Math.floor(userData?.teamIncome || 0).toLocaleString(), icon: Users, color: "green", category: "team" },
        { label: t.totalEarnings, value: Math.floor(userData?.totalIncome || 0).toLocaleString(), icon: TrendingUp, color: "blue", category: "earnings" },
        { label: t.withdrawals, value: Math.floor(userData?.totalWithdrawal || 0).toLocaleString(), icon: ArrowUpRight, color: "orange", category: "wallet" },
        { label: t.teamSize, value: userData?.teamSize || "0", icon: Users, color: "blue", category: "team" },
        { label: t.dailyIncome, value: Math.floor(userData?.dailyIncome || 0).toLocaleString(), icon: Zap, color: "green", category: "earnings" },
    ];

    return (
        <div className="min-h-screen bg-white text-blue-900 pb-32 relative overflow-hidden font-sans">
            {/* Medical Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-50/50 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-50/30 blur-[100px] rounded-full"></div>
            </div>

            <main className="relative z-10 pt-12 max-w-lg mx-auto p-6 pb-48">
                {/* Advanced Profile Header & Identity Card */}
                <div className="relative mb-10 group">
                    <div className="relative flex items-center gap-6 p-2">
                        {/* Premium Avatar with Double-Ring Glow */}
                        <div className="relative shrink-0">
                            <div className="absolute inset-0 bg-blue-50 rounded-full blur-xl opacity-40"></div>
                            <div className="relative w-24 h-24 rounded-[2rem] p-1 bg-white shadow-xl shadow-blue-900/5 border border-blue-100 group-hover:scale-105 transition-transform duration-500">
                                <div className="w-full h-full rounded-[1.8rem] bg-blue-50 p-1">
                                    <div className="w-full h-full rounded-[1.5rem] overflow-hidden relative border border-white">
                                        <img
                                            src="/avator profile.jpg"
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                        {/* Online Pulse Indicator */}
                                        <div className="absolute bottom-1.5 right-1.5 w-4 h-4 bg-green-500 border-4 border-white rounded-full shadow-lg"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Identity Details */}
                        <div className="flex-1 space-y-1.5 overflow-hidden">
                            <div className="space-y-0">
                                <h2 className="text-2xl font-bold text-blue-900 leading-tight">{t.customer}</h2>
                                <div className="flex items-center gap-2">
                                    <div className="px-3 py-1 bg-blue-50 rounded-lg border border-blue-100/50">
                                        <span className="text-[10px] font-bold text-blue-900/60 tracking-wider">ID: {userData?.uid?.substring(0, 6).toUpperCase() || user?.uid?.substring(0, 6).toUpperCase() || "..."}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Status Badges - Glassmorphic Style */}
                        <div className="flex flex-col items-end gap-3">
                            <div className="flex items-center gap-2 bg-blue-50/50 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-blue-100">
                                <img src="/Ethiopia.png" alt="Ethiopia" className="w-5 h-3.5 object-cover rounded-sm" />
                                <span className="text-[10px] font-bold text-blue-900">Eth</span>
                            </div>
                            <div className="flex items-center gap-2 bg-orange-500 px-4 py-2 rounded-full shadow-lg shadow-orange-500/10 border border-orange-400">
                                <Shield size={12} className="text-white fill-current" />
                                <span className="text-[11px] font-bold text-white leading-none">Vip {userData?.vip || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Elite Balance Card - Medical Wallet */}
                <div className="mb-10">
                    <div className="bg-white rounded-[2.5rem] border border-blue-50 shadow-xl shadow-blue-900/5 overflow-hidden p-8">
                        {/* Balance Section */}
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-3xl bg-green-50 flex items-center justify-center text-green-600 border border-green-100">
                                    <Wallet size={28} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-blue-900/40 mb-1">{t.accountFinance}</span>
                                    <span className="text-sm font-bold text-blue-900">{t.accountBalance}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-lg font-bold text-green-600 tracking-tight">
                                    {Math.floor(userData?.balance || 0).toLocaleString()}
                                </span>
                                <span className="text-[10px] font-bold text-green-600/60">ETB</span>
                            </div>
                        </div>

                        {/* Weekend Balance Section */}
                        <div className="flex items-center justify-between mb-10 pb-10 border-b border-orange-50">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-3xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100">
                                    <PartyPopper size={28} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-orange-900/40 mb-1">{t.weekendFinance}</span>
                                    <span className="text-sm font-bold text-orange-900">{t.weekendBalance}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-lg font-bold text-orange-600 tracking-tight">
                                    {Math.floor(totalWeekendBalance + (userData?.fixedWeekendBalance || 0)).toLocaleString()}
                                </span>
                                <span className="text-[10px] font-bold text-orange-600/60">ETB</span>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-8">
                            {stats.map((stat, i) => (
                                <div key={i} className="flex flex-col gap-2 group active:scale-95 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-1.5 h-1.5 rounded-full ${stat.color === 'blue' ? 'bg-blue-600' : stat.color === 'green' ? 'bg-green-600' : 'bg-orange-500'}`}></div>
                                        <span className="text-[10px] font-bold text-blue-900/30 truncate">{stat.label}</span>
                                    </div>
                                    <p className="text-sm font-bold text-blue-900 tracking-tight pl-4 flex items-baseline gap-1.5">
                                        {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                                        <span className="text-[9px] font-bold text-blue-900/30">ETB</span>
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>


                {/* Advanced Core Services - Medical Interaction */}
                <div className="grid grid-cols-4 gap-4 mb-12">
                    {[
                        { label: t.recharge, image: null, color: "blue", iconColor: "text-blue-600", path: "/users/funding-details", dark: false, icon: Wallet },
                        { label: t.app, image: "/msd-logo.png", color: "blue", iconColor: "text-white", path: "/users/download", dark: false, icon: null },
                        { label: t.bank, image: null, color: "green", iconColor: "text-green-600", path: "/users/bank", dark: false, icon: Building2 },
                        { label: t.help, image: null, color: "orange", iconColor: "text-orange-600", path: "/users/service", dark: false, icon: Headphones },
                    ].map((item: any, i) => (
                        <button
                            key={i}
                            onClick={() => item.path && router.push(item.path)}
                            className="flex flex-col items-center gap-3 group"
                        >
                            <div className={`w-16 h-16 rounded-[1.8rem] bg-white shadow-xl shadow-blue-900/5 border border-blue-50 flex items-center justify-center relative overflow-hidden group-hover:scale-110 group-active:scale-95 transition-all duration-300`}>
                                <div className={`absolute inset-0 bg-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                                <div className={`w-full h-full flex items-center justify-center relative z-10 ${item.image ? "" : `w-11 h-11 rounded-2xl bg-blue-50`}`}>
                                    {item.image ? (
                                        <img src={item.image} alt={item.label} className="w-full h-full object-contain p-2 scale-110 group-hover:scale-125 transition-transform duration-500" />
                                    ) : item.icon ? (
                                        <item.icon size={22} className={item.iconColor} />
                                    ) : null}
                                </div>
                            </div>
                            <span className="text-[10px] font-bold text-blue-900/40 text-center leading-none">{item.label}</span>
                        </button>
                    ))}
                </div>



                {/* Advanced System Actions - Navigtion Tiles */}
                <div className="space-y-6 pb-12">
                    <div className="flex items-center gap-3 mb-8 px-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-900"></div>
                        <h3 className="text-sm font-bold text-blue-900/40">{t.accountSettings}</h3>
                    </div>

                    {[
                        { title: t.withdrawals, sub: t.transactionHistory, icon: ArrowUpRight, color: "green", bgColor: "bg-green-50", path: "/users/withdrawal-record" },
                        { title: t.changePassword, sub: t.updateSecurity, icon: Key, color: "blue", bgColor: "bg-blue-50", path: "/users/change-password" },
                        { title: t.withdrawalPin, sub: t.updatePaymentPin, icon: Lock, color: "blue", bgColor: "bg-blue-50", path: "/users/change-withdrawal-password" },
                        { title: t.rechargeHistory, sub: t.fundHistory, icon: History, color: "blue", bgColor: "bg-blue-50", path: "/users/recharge-records" },
                    ].map((item, i) => (
                        <button
                            key={i}
                            onClick={() => item.path && router.push(item.path)}
                            className="w-full relative group active:scale-[0.98] transition-all"
                        >
                            <div className="relative flex items-center justify-between p-6 bg-white rounded-[2.5rem] border border-blue-50 shadow-xl shadow-blue-900/5 hover:shadow-2xl hover:border-blue-100 transition-all duration-500">
                                <div className="flex items-center gap-6">
                                    <div className={`w-14 h-14 rounded-2xl ${item.bgColor} flex items-center justify-center text-blue-900 shadow-sm relative overflow-hidden border border-blue-100/50`}>
                                        <item.icon size={26} className="relative z-10" />
                                    </div>
                                    <div className="text-left space-y-0.5">
                                        <h3 className="text-base font-bold text-blue-900 tracking-tight">{item.title}</h3>
                                        <p className="text-[10px] font-bold text-blue-900/40">{item.sub}</p>
                                    </div>
                                </div>
                                <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center shadow-sm border border-blue-100 group-hover:bg-blue-900 transition-all duration-500 group-hover:translate-x-1">
                                    <ChevronRightIcon size={20} className="text-blue-900 group-hover:text-white transition-colors" />
                                </div>
                            </div>
                        </button>
                    ))}

                    {/* Premium Security Exit Button */}
                    <div className="pt-8">
                        <button
                            onClick={async () => {
                                await auth.signOut();
                                router.push("/");
                            }}
                            className="w-full relative group overflow-hidden rounded-[2rem] p-6 active:scale-95 transition-all shadow-xl shadow-orange-500/20 bg-orange-500"
                        >
                            <div className="absolute inset-0 bg-orange-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative z-10 flex items-center justify-center gap-6">
                                <div className="w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center">
                                    <LogOut size={22} className="text-white ml-1" />
                                </div>
                                <span className="text-xl font-bold text-white tracking-wide">{t.logout}</span>
                            </div>
                        </button>
                    </div>
                </div>
            </main>

        </div >
    );
}
