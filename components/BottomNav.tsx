"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Home, Ship, Users, Shield, PartyPopper, History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, Suspense } from "react";
import { syncDailyIncome } from "@/lib/sync";
import { syncWeekendDailyIncome } from "@/lib/weekendSync";
import { auth } from "@/lib/firebase";
import { translations, Language } from "@/lib/translations";

function BottomNavContent() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("home");
    const [mounted, setMounted] = useState(false);
    const [lang, setLang] = useState<Language>("EN");
    const t = translations[lang];
    const isChat = pathname === "/users/chat";

    const [userId, setUserId] = useState<string | null>(null);

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
        // Clean up any potential auth listeners
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                setUserId(user.uid);
                // Trigger sync when we have a user
                syncDailyIncome(user.uid);
                syncWeekendDailyIncome(user.uid);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!mounted) return;
        const tab = searchParams.get("tab");
        if (pathname === "/users/welcome") {
            setActiveTab(tab || "home");
        } else if (pathname === "/users/weekend") {
            setActiveTab("weekend");
        } else if (pathname === "/users/weekend-record") {
            setActiveTab("w-page");
        } else if (pathname === "/users/profile") {
            setActiveTab("me");
        } else if (pathname.includes("/users/team")) {
            setActiveTab("team");
        }
    }, [pathname, searchParams, mounted]);

    const hideNav = pathname === "/users/chat" || pathname === "/users/tasks" || pathname.startsWith("/users/withdraw") || pathname === "/users/change-withdrawal-password" || (pathname.includes("-record") && pathname !== "/users/weekend-record") || pathname === "/users/funding-details" || (pathname.startsWith("/users/product/") && pathname !== "/users/product") || (pathname.startsWith("/users/weekend/") && pathname !== "/users/weekend");

    if (!mounted || hideNav) return null;

    const navItems = [
        { id: "home", icon: Home, label: t.clinic, path: "/users/welcome?tab=home" },
        { id: "weekend", icon: PartyPopper, label: t.navWeekend, path: "/users/weekend" },
        { id: "w-page", icon: History, label: t.wPage, path: "/users/weekend-record" },
        { id: "team", icon: Users, label: t.assisted, path: "/users/team" },
        { id: "me", icon: Shield, label: t.finance, path: "/users/profile" },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] px-6 pb-8 bg-gradient-to-t from-white via-white/80 to-transparent pt-12 pointer-events-none mx-auto max-w-lg">
            <div className="flex items-center justify-between gap-4 pointer-events-auto">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => router.push(item.path)}
                        className="flex flex-col items-center gap-1.5 group relative"
                    >
                        <div
                            className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-500 ${activeTab === item.id
                                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20 rotate-[-5deg]"
                                : "text-blue-900/40 hover:bg-blue-50 hover:text-blue-900 active:scale-95"
                                }`}
                        >
                            <item.icon size={activeTab === item.id ? 22 : 20} strokeWidth={activeTab === item.id ? 2.5 : 2} className="relative z-10" />
                        </div>
                        <span
                            className={`text-[9px] font-black uppercase tracking-widest transition-colors duration-500 ${activeTab === item.id ? "text-blue-900" : "text-blue-900/30"
                                }`}
                        >
                            {item.label}
                        </span>
                        {activeTab === item.id && (
                            <motion.div layoutId="nav-glow" className="absolute -bottom-1 w-1 h-1 bg-orange-500 rounded-full" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function BottomNav() {
    return (
        <Suspense fallback={null}>
            <BottomNavContent />
        </Suspense>
    );
}
