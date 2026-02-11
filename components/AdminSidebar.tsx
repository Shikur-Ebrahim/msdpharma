"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import {
    LayoutDashboard,
    Home,
    Image as ImageIcon,
    Banknote,
    Building2,
    ShieldCheck,
    Bell,
    Percent,
    Send,
    MessageSquare,
    BookOpen,
    Settings,
    LogOut,
    UserX,
    Users,
    DollarSign,
    Package,
    Gamepad2,
    Crown,
    PartyPopper,
    BarChart3,
    TrendingUp,
    Gift
} from "lucide-react";

interface AdminSidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export default function AdminSidebar({ isOpen, setIsOpen }: AdminSidebarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [pendingRechargeCount, setPendingRechargeCount] = useState(0);
    const [pendingWithdrawalCount, setPendingWithdrawalCount] = useState(0);
    const [pendingWeekendWithdrawalCount, setPendingWeekendWithdrawalCount] = useState(0);
    const [vipUpgradeCount, setVipUpgradeCount] = useState(0);
    const [todaySalesCount, setTodaySalesCount] = useState(0);

    useEffect(() => {
        // Recharge Listener
        const qRecharge = query(
            collection(db, "RechargeReview"),
            where("status", "==", "Under Review")
        );
        const unsubscribeRecharge = onSnapshot(qRecharge, (snapshot) => {
            setPendingRechargeCount(snapshot.size);
        });

        // Withdrawal Listener
        const qWithdrawal = query(
            collection(db, "Withdrawals"),
            where("status", "==", "pending")
        );
        const unsubscribeWithdrawal = onSnapshot(qWithdrawal, (snapshot) => {
            setPendingWithdrawalCount(snapshot.size);
        });

        // VIP Upgrade Listener
        const qVip = query(
            collection(db, "users"),
            where("isVipEligible", "==", true)
        );
        const unsubscribeVip = onSnapshot(qVip, (snapshot) => {
            setVipUpgradeCount(snapshot.size);
        });

        // Weekend Withdrawal Listener
        const qWeekendWithdrawal = query(
            collection(db, "WeekendWithdrawals"),
            where("status", "==", "pending")
        );
        const unsubscribeWeekendWithdrawal = onSnapshot(qWeekendWithdrawal, (snapshot) => {
            setPendingWeekendWithdrawalCount(snapshot.size);
        });

        // Today's Sales Listener
        const qSales = query(
            collection(db, "UserOrders")
        );
        const unsubscribeSales = onSnapshot(qSales, (snapshot) => {
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);

            const todayCount = snapshot.docs.filter(doc => {
                const data = doc.data();
                const purchaseDate = data.purchaseDate?.toDate ? data.purchaseDate.toDate() : new Date(data.purchaseDate);
                return purchaseDate >= startOfToday;
            }).length;
            setTodaySalesCount(todayCount);
        });

        return () => {
            unsubscribeRecharge();
            unsubscribeWithdrawal();
            unsubscribeVip();
            unsubscribeWeekendWithdrawal();
            unsubscribeSales();
        };
    }, []);

    const navigation = [
        { id: "recharge", label: "Recharge Wallet", icon: ShieldCheck, path: "/admin/recharge-verification" },
        { id: "recharge-tracking", label: "Recharge Users", icon: TrendingUp, path: "/admin/recharge-tracking" },
        { id: "sales-tracking", label: "Sales Tracking", icon: BarChart3, path: "/admin/sales-tracking" },
        { id: "withdrawal-wallet", label: "Withdrawal Wallet", icon: Banknote, path: "/admin/withdrawal-wallet" },
        { id: "weekend-withdrawal", label: "Weekend Withdrawal", icon: Banknote, path: "/admin/weekend-withdrawal" },
        { id: "financials", label: "Financial Stats", icon: BarChart3, path: "/admin/financials" },
        { id: "vip-upgrade", label: "VIP Upgrade", icon: ShieldCheck, path: "/admin/vip-upgrade" },
        { id: "home", label: "Dashboard", icon: Home, path: "/admin/dashboard" },
        { id: "banners", label: "Banner Ads", icon: ImageIcon, path: "/admin/dashboard?tab=banners" },
        { id: "payment-methods", label: "Payment Methods", icon: Banknote, path: "/admin/payment-methods" },
        { id: "currency-rates", label: "Currency Rates", icon: DollarSign, path: "/admin/currency-rates" },
        { id: "withdrawal-banks", label: "Withdrawal Banks", icon: Building2, path: "/admin/withdrawal-banks" },
        { id: "unlink-account", label: "Unlink Account", icon: UserX, path: "/admin/unlink-account" },
        { id: "notifications", label: "Withdrawal Alerts", icon: Bell, path: "/admin/notifications" },
        { id: "products", label: "Products", icon: Package, path: "/admin/product" },
        { id: "weekend-product", label: "Weekend", icon: PartyPopper, path: "/admin/weekend-product" },
        { id: "weekend-notification", label: "Weekend Alert", icon: Bell, path: "/admin/weekend-notification" },
        { id: "referral", label: "Referral Rule", icon: Percent, path: "/admin/referral-settings" },
        { id: "vip-rules", label: "VIP Rules", icon: Crown, path: "/admin/vip-rules" },
        { id: "vip-notifications", label: "VIP Celebration", icon: PartyPopper, path: "/admin/vip-notifications" },
        { id: "telegram", label: "Telegram Staff", icon: Send, path: "/admin/telegram" },
        { id: "platform-notifications", label: "Platform Alerts", icon: Bell, path: "/admin/platform-notifications" },
        { id: "team-search", label: "Team Search", icon: Users, path: "/admin/team-search" },
        { id: "users", label: "Users", icon: Users, path: "/admin/users" },
        { id: "settings", label: "Settings", icon: Settings, path: "/admin/settings" },
    ];

    const handleLogout = async () => {
        localStorage.removeItem("admin_session");
        await signOut(auth);
        router.replace("/");
    };

    // Helper to determine active state
    // For dashboard with tabs, we might need special logic or just match the base path
    // For other pages, exact match or startsWith
    const isActive = (path: string) => {
        if (path.includes("?tab=")) {
            // For query params/tabs, simplistic check if we are on dashboard. 
            // Ideally we check params but for now let's just highlight if the main path matches.
            // Actually, if we are on dashboard, active tab state is managed by the page itself usually?
            // But the user wants the sidebar to handle it.
            // Let's assume dashboard handles its own tabs internally, so sidebar linking to ?tab=banners is just a navigation trigger.
            // Highlights will largely depend on pathname.
            return pathname === "/admin/dashboard" && path.includes(pathname);
        }
        return pathname === path || pathname.startsWith(path + "/");
    };

    // Better Active Logic:
    // If we are on /admin/dashboard, Home is active unless we navigated via a specific tab link?
    // Actually, simply matching pathname is safer for separate pages.
    // For "Banner Ads" which is technically Dashboard + Tab, we might need to handle it.
    // However, the `dashboard` page separates `activeTab` state.
    // To make this fully functional, the sidebar navigation should probably just navigate to the URL.
    // If the URL has a query param, the dashboard page should read it on mount.

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed md:sticky top-0 left-0 h-screen w-72 bg-white border-r border-gray-100 z-50 transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
                <div className="p-8 h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-12">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                            <LayoutDashboard size={20} />
                        </div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight">MSD</h1>
                    </div>

                    <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                        {navigation.map((item) => {
                            // Custom active check
                            let active = false;
                            if (item.path.includes("?")) {
                                // It's a query param route (Dashboard tabs)
                                if (pathname === "/admin/dashboard" && item.id === "home") active = true;
                            } else {
                                active = pathname === item.path || pathname.startsWith(item.path);
                            }

                            return (
                                <Link
                                    key={item.id}
                                    href={item.path}
                                    onClick={() => setIsOpen(false)}
                                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${active
                                        ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/30"
                                        : "text-gray-500 hover:bg-gray-50 hover:text-indigo-600"
                                        }`}
                                >
                                    <item.icon size={22} />
                                    <span>{item.label}</span>
                                    {item.id === "recharge" && pendingRechargeCount > 0 && (
                                        <span className="ml-auto bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-bounce shadow-lg shadow-red-500/40">
                                            {pendingRechargeCount}
                                        </span>
                                    )}
                                    {item.id === "withdrawal-wallet" && pendingWithdrawalCount > 0 && (
                                        <span className="ml-auto bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-bounce shadow-lg shadow-red-500/40">
                                            {pendingWithdrawalCount}
                                        </span>
                                    )}
                                    {item.id === "weekend-withdrawal" && pendingWeekendWithdrawalCount > 0 && (
                                        <span className="ml-auto bg-orange-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-bounce shadow-lg shadow-orange-500/40">
                                            {pendingWeekendWithdrawalCount}
                                        </span>
                                    )}
                                    {item.id === "vip-upgrade" && vipUpgradeCount > 0 && (
                                        <span className="ml-auto bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-bounce shadow-lg shadow-emerald-500/40">
                                            {vipUpgradeCount}
                                        </span>
                                    )}
                                    {item.id === "sales-tracking" && todaySalesCount > 0 && (
                                        <span className="ml-auto bg-blue-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-pulse shadow-lg shadow-blue-500/40">
                                            {todaySalesCount}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    <button
                        onClick={handleLogout}
                        className="mt-6 flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
                    >
                        <LogOut size={22} />
                        Logout
                    </button>
                </div>
            </aside>
        </>
    );
}
