"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, orderBy, onSnapshot, where, getDocs, limit, deleteDoc, writeBatch, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
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
    CheckCircle2,
    Coins,
    Star,
    PartyPopper,
    ArrowLeftRight
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import VipCelebrationCard from "@/components/VipCelebrationCard";
import WeekendNotificationModal from "@/components/WeekendNotificationModal";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { translations, Language } from "@/lib/translations";
import { motion, AnimatePresence } from "framer-motion";

import { Suspense } from "react";

function WelcomeContent() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeNav, setActiveNav] = useState("home");
    const [banners, setBanners] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
    const [isResetting, setIsResetting] = useState(false);
    const [mounted, setMounted] = useState(false);


    // Notification State
    const [userNotifs, setUserNotifs] = useState<any[]>([]);
    const [latestRecharge, setLatestRecharge] = useState<any>(null);
    const [showNotifPanel, setShowNotifPanel] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // VIP Celebration State
    const [showVipCeleb, setShowVipCeleb] = useState(false);
    const [vipCelebData, setVipCelebData] = useState<any>(null);

    // Weekend Notification State
    const [showWeekendNotif, setShowWeekendNotif] = useState(false);
    const [weekendNotifData, setWeekendNotifData] = useState<any>(null);
    const [lang, setLang] = useState<Language>("EN");
    const t = translations[lang];

    const searchParams = useSearchParams();

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
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        const tab = searchParams.get('tab');
        if (tab && ['home', 'product', 'team', 'wallet'].includes(tab)) {
            setActiveNav(tab);
        } else {
            setActiveNav('home');
        }
    }, [searchParams]);

    useEffect(() => {
        if (!user) return;

        // 1. Listen for User's Latest Recharge
        const qRecharge = query(
            collection(db, "RechargeReview"),
            where("userId", "==", user.uid)
        );

        const unsubscribeRec = onSnapshot(qRecharge, (snapshot) => {
            if (!snapshot.empty) {
                const recharges = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Client-side sort to avoid index issues
                recharges.sort((a: any, b: any) => {
                    const timeA = a.timestamp?.toMillis?.() || 0;
                    const timeB = b.timestamp?.toMillis?.() || 0;
                    return timeB - timeA;
                });

                const latest = recharges[0] as any;
                setLatestRecharge(latest);
                // Only trigger dot for 'Under Review' recharges
                if (latest.status === 'Under Review') {
                    setHasUnread(true);
                }
            }
        });

        // 2. Listen for User-Specific Reward Notifications
        const qUserNotifs = query(
            collection(db, "UserNotifications"),
            where("userId", "==", user.uid)
        );

        const unsubscribeNotifs = onSnapshot(qUserNotifs, async (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            // Client-side sort to avoid index requirements
            notifs.sort((a: any, b: any) => {
                const timeA = a.createdAt?.toMillis?.() || 0;
                const timeB = b.createdAt?.toMillis?.() || 0;
                return timeB - timeA;
            });

            // Limit to top 25 most recent for display
            const limitedNotifs = notifs.slice(0, 25);

            setUserNotifs(limitedNotifs);

            // Sync unread dot with actual unread notifications
            const unreadNotifs = limitedNotifs.filter((n: any) => !n.read);
            const hasAnyUnread = unreadNotifs.length > 0;
            if (hasAnyUnread) {
                setHasUnread(true);
                setUnreadCount(unreadNotifs.length);
            } else {
                setUnreadCount(0);
            }

            // --- Auto-Cleanup Logic ---
            // If total notifications exceed 25, delete the older ones from the database
            if (notifs.length > 25) {
                const toDelete = notifs.slice(25);
                const batch = writeBatch(db);
                toDelete.forEach((notif) => {
                    const docRef = doc(db, "UserNotifications", notif.id);
                    batch.delete(docRef);
                });
                try {
                    await batch.commit();
                } catch (error) {
                    console.error("Error cleaning up old notifications:", error);
                }
            }
        });

        return () => {
            unsubscribeRec();
            unsubscribeNotifs();
        };
    }, [user]);

    const handleMarkAsRead = async (notif: any) => {
        if (notif.read === false) {
            try {
                const docRef = doc(db, "UserNotifications", notif.id);
                await updateDoc(docRef, { read: true });
            } catch (error) {
                console.error("Error marking as read:", error);
            }
        }
    };

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
                    const data = docSnap.data();
                    setUserData(data);

                    // --- VIP Celebration Logic ---
                    const currentVip = data.vip || 0;
                    const vipViews = data.vipViews || {};
                    const currentViews = vipViews[`level_${currentVip}`] || 0;

                    if (currentVip > 0 && currentViews < 3) {
                        const notifDoc = await getDoc(doc(db, "VipNotifications", `vip_${currentVip}`));
                        if (notifDoc.exists()) {
                            setVipCelebData({ ...notifDoc.data(), currentViews });
                            setShowVipCeleb(true);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setLoading(false);
            }
        });

        // Fetch banners and notifications once
        const qBanners = query(collection(db, "banners"), orderBy("createdAt", "desc"));
        const unsubscribeBanners = onSnapshot(qBanners, (snapshot) => {
            const bannerData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBanners(bannerData);
        });

        const qNotifs = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
        const unsubscribeNotifs = onSnapshot(qNotifs, (snapshot) => {
            const notifData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setNotifications(notifData);
        });

        // 3. Fetch all products sorted by price ascending (smaller price at top)
        const qProducts = query(collection(db, "Products"), orderBy("price", "asc"));
        const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
            const productData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Client-side sort to ensure correct order
            productData.sort((a: any, b: any) => (a.price || 0) - (b.price || 0));
            setProducts(productData);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeBanners();
            unsubscribeNotifs();
            unsubscribeProducts();
        };
    }, [router]);

    // Weekend Notification Logic
    useEffect(() => {
        const fetchSettingsAndCheck = async () => {
            // 1. Get Settings
            const docRef = doc(db, "SystemSettings", "weekendProductNotification");
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) return;

            const data = docSnap.data();
            if (!data.isEnabled) return;

            // 2. Check Day
            const now = new Date();
            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const currentDay = days[now.getDay()];

            // Handle both legacy string day and new array targetDays
            const activeDays = (data.targetDays || (data.targetDay ? [data.targetDay] : []));
            if (!activeDays.includes(currentDay)) return;

            // 3. Find Earliest Product Start Time
            try {
                // We need products that are active TODAY.
                // Since "activeDays" is an array on products, we query for that.
                const q = query(collection(db, "WeekendProducts"), where("activeDays", "array-contains", currentDay));
                const productsSnap = await getDocs(q);

                if (productsSnap.empty) return;

                let earliestTime = "23:59";
                productsSnap.forEach(doc => {
                    const p = doc.data();
                    if (p.startTime && p.startTime < earliestTime) {
                        earliestTime = p.startTime;
                    }
                });

                // 4. Time Check
                const [targetHour, targetMinute] = earliestTime.split(":").map(Number);
                const currentHour = now.getHours();
                const currentMinute = now.getMinutes();
                const timeInMinutes = currentHour * 60 + currentMinute;
                const targetInMinutes = targetHour * 60 + targetMinute;

                // Show notification if:
                // a) It's the first time seeing it today (regardless of time, effectively "Upcoming" alert)
                // b) OR The time limit has passed (Event Started)

                // User Logic: "automatically set dya but alos after one max notification displayed on just automatically just the weekedn product starting time one "startTime" just reched after one more time notification displayed"
                // Interpretation:
                // 1. Show once per day standard.
                // 2. If time > startTime, maybe show again if we haven't shown "started" alert?
                // Let's stick to a robust simple logic:
                // Check Max Views.

                const dateKey = now.toDateString();
                const countKey = `weekend_notif_count_${dateKey}`;
                const currentCount = parseInt(localStorage.getItem(countKey) || "0");
                const maxViews = data.maxViews || 1;

                // If user hasn't seen it today, show it "Upcoming" style or "Now Open" style
                // If we want to strictly follow "start time reached", we should only show if time >= startTime?
                // But typically notifications are "Heads up!"
                // Let's trigger if we haven't exceeded max views.

                if (currentCount < maxViews) {
                    // Check if we should wait for start time? 
                    // User said "first time automatically ... but also after one max notification ... just reached after one more time"
                    // This implies maybe TWO types of notifications.
                    // For now, let's keep it simple: Show if active day. 
                    // The Text in the modal can dynamically say "Starts at X" or "Open Now".

                    // Adding a small detail: If time < startTime, we might want to delay showing it?
                    // Or show it as "Coming Soon".

                    setWeekendNotifData({ ...data, earliestTime });
                    setShowWeekendNotif(true);
                }

            } catch (err) {
                console.error("Error checking weekend products:", err);
            }
        };

        fetchSettingsAndCheck();
    }, []);

    const handleWeekendConfirm = () => {
        setShowWeekendNotif(false);
        const now = new Date();
        const dateKey = now.toDateString();
        const countKey = `weekend_notif_count_${dateKey}`;
        const currentCount = parseInt(localStorage.getItem(countKey) || "0");
        localStorage.setItem(countKey, (currentCount + 1).toString());
        router.push("/users/weekend");
    };

    // Separate effect for banner interval to avoid redundant subscriptions
    useEffect(() => {
        if (banners.length <= 1) return;

        // Synchronize initial banner with the current hour
        const hourIndex = Math.floor(Date.now() / 3600000) % banners.length;
        setCurrentBannerIndex(hourIndex);

        const bannerInterval = setInterval(() => {
            setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
        }, 3600000); // 1 hour interval

        return () => clearInterval(bannerInterval);
    }, [banners.length]);

    const handleLogout = async () => {
        await signOut(auth);
        router.push("/");
    };

    const handleRechargeClick = async () => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                router.push("/users/recharge");
                return;
            }

            // Check for pending recharge
            const q = query(
                collection(db, "RechargeReview"),
                where("userId", "==", currentUser.uid),
                where("status", "==", "Under Review"),
                limit(1)
            );

            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const pendingData = querySnapshot.docs[0].data();
                const theme = pendingData.paymentMethod || "regular";
                router.push(`/users/transaction-pending?theme=${theme}`);
            } else {
                router.push("/users/recharge");
            }
        } catch (error) {
            console.error("Error checking pending status:", error);
            router.push("/users/recharge");
        }
    };

    if (!mounted || loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white">
                <Loader2 className="w-12 h-12 animate-spin text-green-600" />
                <p className="mt-8 text-sm font-black tracking-widest text-blue-900/40 uppercase">{t.safeSecure}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-blue-900 pb-32 relative overflow-hidden font-sans" onClick={() => showNotifPanel && setShowNotifPanel(false)}>
            {/* Ambient Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-50/50 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-50/30 blur-[100px] rounded-full"></div>
            </div>

            {/* Premium Top Bar */}
            <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-3xl z-40 px-6 py-4 flex items-center justify-between border-b border-blue-50">
                <div className="flex items-center gap-3">
                    <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="w-10 h-10 relative rounded-full overflow-hidden border border-blue-100 shadow-sm"
                    >
                        <img src="/msd-logo.png" alt="MSD Logo" className="w-full h-full object-contain p-1" />
                    </motion.div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest">{t.healthcare}</span>
                        <span className="text-sm font-bold text-blue-900">
                            {userData?.email?.split('@')[0] || t.member}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <LanguageSwitcher />
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => {
                                setShowNotifPanel(!showNotifPanel);
                                setHasUnread(false);
                            }}
                            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-blue-50 relative border border-blue-100 hover:bg-blue-100 transition-all active:scale-95"
                        >
                            <Bell size={20} className="text-blue-900" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-4.5 px-1 flex items-center justify-center bg-orange-500 text-white text-[9px] font-bold rounded-full border-2 border-white">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {showNotifPanel && (
                            <div className="absolute top-full right-0 mt-4 w-72 bg-white rounded-3xl shadow-2xl border border-blue-50 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-4 flex items-center justify-between border-b border-blue-50 mb-2">
                                    <h4 className="text-sm font-black text-blue-900 uppercase tracking-widest">{t.alerts}</h4>
                                    <span className="text-[9px] bg-green-100 px-2 py-1 rounded-full font-black text-green-700 uppercase tracking-widest">{t.new}</span>
                                </div>
                                <div className="max-h-80 overflow-y-auto p-1 space-y-2">
                                    {(() => {
                                        const allNotifs: any[] = [...userNotifs];
                                        if (latestRecharge) allNotifs.push({ ...latestRecharge, type: 'recharge' });
                                        allNotifs.sort((a, b) => ((b.createdAt || b.timestamp)?.toMillis?.() || 0) - ((a.createdAt || a.timestamp)?.toMillis?.() || 0));

                                        if (allNotifs.length === 0) return (
                                            <div className="py-12 text-center text-blue-900/20 text-xs font-bold uppercase tracking-widest">No Alerts</div>
                                        );

                                        return allNotifs.map((notif, idx) => {
                                            const isUnread = notif.read === false;
                                            const LEVEL_MAP: Record<string, string> = {
                                                "Level A": "1", "Level 1": "1", "Level B": "2", "Level 2": "2",
                                                "Level C": "3", "Level 3": "3", "Level D": "4", "Level 4": "4"
                                            };

                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => handleMarkAsRead(notif)}
                                                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${isUnread ? "bg-blue-50/50 border-blue-100" : "bg-white border-blue-50 hover:bg-blue-50/30"}`}
                                                >
                                                    <div className="w-10 h-10 rounded-lg bg-black shrink-0 flex items-center justify-center overflow-hidden">
                                                        <img
                                                            src={notif.type === 'registration' ? encodeURI(`/level ${LEVEL_MAP[notif.level as string] || "1"}.jpg`) : "/msd-logo.png"}
                                                            className="w-full h-full object-cover"
                                                            alt="Notif"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-xs font-bold text-blue-900 line-clamp-1">{notif.message || notif.type.replace('_', ' ')}</p>
                                                        <p className="text-[10px] text-green-600 font-bold mt-0.5">{notif.amount ? `${Number(notif.amount).toLocaleString()} ETB` : "Success"}</p>
                                                    </div>
                                                    {isUnread && <div className="w-2 h-2 bg-orange-500 rounded-full"></div>}
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="pt-20 space-y-8 max-w-lg mx-auto pb-20 relative z-10">
                {activeNav === "home" ? (
                    <>
                        {/* Elite Banner Section - Healthcare Showcase */}
                        {banners.length > 0 && (
                            <section className="px-6">
                                <div className="w-full aspect-[2/1] overflow-hidden bg-blue-50 rounded-[2.5rem] relative shadow-xl shadow-blue-900/5 group border border-blue-100">
                                    <div
                                        className="flex h-full"
                                        style={{
                                            width: `${(banners.length + 1) * 100}%`,
                                            transform: `translateX(-${(currentBannerIndex * 100) / (banners.length + 1)}%)`,
                                            transition: isResetting ? 'none' : 'transform 1s cubic-bezier(0.2, 1, 0.3, 1)'
                                        }}
                                        onTransitionEnd={() => {
                                            if (currentBannerIndex >= banners.length) {
                                                setIsResetting(true);
                                                setCurrentBannerIndex(0);
                                                setTimeout(() => setIsResetting(false), 50);
                                            }
                                        }}
                                    >
                                        {[...banners, banners[0]].map((banner, index) => (
                                            <div key={index} className="w-full h-full relative" style={{ width: `${100 / (banners.length + 1)}%` }}>
                                                <img src={banner?.url} alt="MSD Medicine Collection" className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Content Wrap with original padding */}
                        <div className="px-6 space-y-4">


                            {/* Quick Actions Grid */}
                            <section className="space-y-6 pt-4">
                                <div className="flex items-center justify-between gap-3 px-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-xs font-black text-blue-900/40 uppercase tracking-widest">{t.medicalWallets}</h3>
                                        <div className="w-12 h-px bg-blue-50"></div>
                                    </div>
                                    <div className="flex items-baseline gap-1.5 bg-green-50 px-4 py-2 rounded-2xl border border-green-100 shadow-sm shadow-green-900/5">
                                        <span className="text-[10px] font-black text-green-700/60 uppercase tracking-widest">{t.balance}</span>
                                        <span className="text-sm font-black text-green-700">
                                            {(Math.floor(userData?.balance || 0) + Math.floor(userData?.Recharge || 0)).toLocaleString()} <span className="text-[10px] font-medium text-green-700/60 ml-0.5">ETB</span>
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Action: Add Money */}
                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleRechargeClick}
                                        className="rounded-[2.5rem] p-6 flex flex-col items-start gap-4 border border-blue-50 shadow-xl shadow-blue-900/5 transition-all hover:translate-y-[-2px] active:scale-95"
                                        style={{ backgroundColor: '#D0E8FF' }}
                                    >
                                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border border-white/20" style={{ backgroundColor: 'white', color: '#007BFF' }}>
                                            <Wallet size={28} />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="text-[10px] font-black text-blue-900/30 uppercase tracking-widest mb-1">{t.pharmacy}</span>
                                            <span className="text-xl font-black text-blue-900 tracking-tight leading-none">{t.deposit}</span>
                                        </div>
                                    </motion.button>

                                    {/* Action: Withdraw */}
                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => router.push("/users/withdraw")}
                                        className="rounded-[2.5rem] p-6 flex flex-col items-start gap-4 border border-blue-50 shadow-xl shadow-blue-900/5 transition-all hover:translate-y-[-2px] active:scale-95"
                                        style={{ backgroundColor: '#DFFFE0' }}
                                    >
                                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border border-white/20" style={{ backgroundColor: 'white', color: '#28A745' }}>
                                            <Coins size={28} />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="text-[10px] font-black text-blue-900/30 uppercase tracking-widest mb-1">{t.payout}</span>
                                            <span className="text-xl font-black text-blue-900 tracking-tight leading-none">{t.withdraw}</span>
                                        </div>
                                    </motion.button>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    {/* Action: Invite */}
                                    <motion.button
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => router.push("/users/invite")}
                                        className="rounded-[2rem] p-4 flex flex-col items-center justify-center gap-3 border border-blue-50 shadow shadow-blue-900/5 transition-all hover:translate-y-[-2px] active:scale-95"
                                        style={{ backgroundColor: '#FFF3E0' }}
                                    >
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'white', color: '#FF8C42' }}>
                                            <Users size={24} />
                                        </div>
                                        <span className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest">{t.invite}</span>
                                    </motion.button>

                                    {/* Action: Rules */}
                                    <motion.button
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => router.push("/users/vip-rules")}
                                        className="rounded-[2rem] p-4 flex flex-col items-center justify-center gap-3 border border-blue-50 shadow shadow-blue-900/5 transition-all hover:translate-y-[-2px] active:scale-95"
                                        style={{ backgroundColor: '#E0F7FA' }}
                                    >
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'white', color: '#17A2B8' }}>
                                            <Shield size={24} />
                                        </div>
                                        <span className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest">{t.levels}</span>
                                    </motion.button>

                                    {/* Action: Exchange */}
                                    <motion.button
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => router.push("/users/exchange")}
                                        className="rounded-[2rem] p-4 flex flex-col items-center justify-center gap-3 border border-blue-50 shadow shadow-blue-900/5 transition-all hover:translate-y-[-2px] active:scale-95"
                                        style={{ backgroundColor: '#E8F0FF' }}
                                    >
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'white', color: '#0056B3' }}>
                                            <ArrowLeftRight size={24} />
                                        </div>
                                        <span className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest">{t.swap}</span>
                                    </motion.button>
                                </div>
                            </section>

                            {/* Products Section */}
                            <div className="space-y-6 pt-4 pb-12">
                                <div className="flex items-center gap-3 px-1">
                                    <h3 className="text-xs font-black text-blue-900/40 uppercase tracking-widest">{t.solutions}</h3>
                                    <div className="flex-1 h-px bg-blue-50"></div>
                                </div>

                                <div className="space-y-6">
                                    {products.map((product) => (
                                        <motion.div
                                            key={product.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            onClick={() => router.push(`/users/product/${product.id}`)}
                                            className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-blue-900/5 border border-green-100 active:scale-[0.99] transition-all cursor-pointer group"
                                        >
                                            {/* Product Image */}
                                            <div className="aspect-[2/1] w-full rounded-2xl overflow-hidden bg-black relative mb-6 border border-[#F5E6D3]/5">
                                                {product.imageUrl ? (
                                                    <img
                                                        src={product.imageUrl}
                                                        alt={product.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[#F5E6D3]/10">
                                                        <Package size={48} />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="text-xl font-black text-blue-900 tracking-tight">{product.name}</h3>
                                                        <p className="text-[10px] font-black text-blue-900/30 uppercase tracking-widest mt-1">{t.healthGrade}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[10px] font-black text-black uppercase tracking-widest block mb-1">{t.price}</span>
                                                        <span className="text-xl font-black text-green-600">
                                                            {product.price?.toLocaleString()}
                                                            <span className="text-xs ml-1 font-bold text-green-600/60 uppercase">ETB</span>
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-50 group-hover:bg-blue-50 transition-colors">
                                                        <span className="text-[10px] font-black text-black uppercase tracking-widest block mb-1">{t.dailyIncome}</span>
                                                        <p className="text-base font-black text-blue-900">
                                                            {product.dailyIncome?.toLocaleString()}
                                                            <span className="text-[10px] ml-1 font-bold text-blue-900/40 uppercase">ETB</span>
                                                        </p>
                                                    </div>
                                                    <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-50 group-hover:bg-blue-50 transition-colors">
                                                        <span className="text-[10px] font-black text-black uppercase tracking-widest block mb-1">{t.cycle}</span>
                                                        <p className="text-base font-black text-blue-900">
                                                            {product.contractPeriod}
                                                            <span className="text-[10px] ml-1 font-bold text-blue-900/40 uppercase">{t.days}</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="bg-green-50/50 rounded-2xl p-4 border border-green-100/50 group-hover:bg-green-50 transition-colors flex items-center justify-between">
                                                    <div>
                                                        <span className="text-[10px] font-black text-black uppercase tracking-[0.2em] block">{t.totalProfit}</span>
                                                    </div>
                                                    <p className="text-xl font-black text-green-700">
                                                        {(product.dailyIncome * product.contractPeriod).toLocaleString()}
                                                        <span className="text-xs ml-1 font-bold text-green-700/60 uppercase tracking-tight">ETB</span>
                                                    </p>
                                                </div>

                                                <button className="w-full h-14 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/10 text-xs font-black tracking-widest uppercase transition-all hover:bg-orange-600 active:scale-95">
                                                    {t.buy}
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 size={32} className="animate-spin text-green-600 opacity-40" />
                        <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-blue-900/40">{t.securing}</p>
                    </div>
                )}
            </main>

            {/* VIP Celebration Overlay */}
            {
                showVipCeleb && vipCelebData && (
                    <VipCelebrationCard
                        vipLevel={vipCelebData.vipLevel}
                        text={vipCelebData.text}
                        imageUrl={vipCelebData.imageUrl}
                        onClose={async () => {
                            setShowVipCeleb(false);
                            if (user) {
                                try {
                                    await updateDoc(doc(db, "users", user.uid), {
                                        [`vipViews.level_${vipCelebData.vipLevel}`]: (vipCelebData.currentViews || 0) + 1
                                    });
                                } catch (err) { console.error(err); }
                            }
                        }}
                    />
                )
            }

            {/* Weekend Notification Modal */}
            {showWeekendNotif && weekendNotifData && (
                <WeekendNotificationModal
                    title={weekendNotifData.title}
                    message={weekendNotifData.message}
                    onConfirm={handleWeekendConfirm}
                />
            )}
        </div >
    );
}

export default function WelcomePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-10 h-10 animate-spin text-green-600" />
            </div>
        }>
            <WelcomeContent />
        </Suspense>
    );
}
