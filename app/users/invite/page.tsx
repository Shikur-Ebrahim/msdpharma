"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ChevronLeft, Copy, CheckCircle2, Share2, Sparkles, Gift, Users, Wallet, Coins, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { translations, Language } from "@/lib/translations";

export default function InvitePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [referralLink, setReferralLink] = useState("");
    const [copied, setCopied] = useState(false);
    const [stats, setStats] = useState({ earned: 0, invited: 0 });
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
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push("/");
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    const baseUrl = window.location.origin;
                    setReferralLink(`${baseUrl}?ref=${user.uid}`);

                    setStats({
                        earned: data.teamIncome || 0,
                        invited: data.teamSize || 0
                    });
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [router]);

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        toast.success(t.linkCopiedToast);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: t.referralTitle,
                    text: t.joinMeDesc,
                    url: referralLink,
                });
            } catch (error) {
                console.log('Error sharing:', error);
            }
        } else {
            handleCopy();
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-green-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-blue-900 flex flex-col relative overflow-hidden font-sans">
            {/* Ambient Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-50/50 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-50/30 blur-[100px] rounded-full"></div>
            </div>

            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-blue-50">
                <div className="max-w-lg mx-auto px-6 h-20 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-blue-100 text-blue-900 transition-all active:scale-95 shadow-sm"
                    >
                        <ChevronLeft size={22} />
                    </button>
                    <div className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full">
                        <Sparkles size={14} className="text-blue-600" />
                        <span className="text-xs font-bold text-blue-900/60">{t.invite}</span>
                    </div>
                    <div className="w-10"></div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full max-w-lg mx-auto px-6 flex flex-col items-center relative z-10 pt-2 pb-32">

                {/* Hero Section */}
                <div className="flex flex-col items-center text-center space-y-4 mb-10 mt-6">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl font-bold text-blue-900 tracking-tight leading-tight uppercase"
                    >
                        {t.inviteFriends}<br />
                        <span className="text-green-600">{t.earnRewards}</span>
                    </motion.h1>
                    <p className="text-sm font-medium text-slate-400 max-w-[280px] leading-relaxed">
                        {t.inviteDesc}
                    </p>
                </div>

                {/* Central 3D Illustration - Horizontal for the new banner */}
                <div className="relative w-full max-w-[400px] aspect-[16/10] flex items-center justify-center mb-10 group">
                    <div className="absolute inset-0 bg-blue-500/5 rounded-[2.5rem] blur-[60px] group-hover:bg-blue-500/10 transition-colors duration-1000"></div>

                    <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-[2.5rem] border border-blue-50 bg-white shadow-xl shadow-blue-900/5">
                        <img
                            src="/invite_banner.png"
                            alt="Advanced Invitation"
                            className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-105"
                        />

                        {/* Floating elements mock style */}
                        <div className="absolute top-6 right-6 px-4 py-2 bg-white/95 backdrop-blur-xl rounded-2xl border border-blue-100 flex items-center gap-2 shadow-lg animate-bounce-slow">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-xs font-bold text-blue-900">{t.bonusLabel.replace("{percent}", "20")}</span>
                        </div>
                    </div>
                </div>

                {/* Stats Section - Medical Cards */}
                <div className="grid grid-cols-2 gap-4 w-full mb-10">
                    <div className="bg-white rounded-[2rem] p-6 border border-blue-50 shadow-xl shadow-blue-900/5 flex flex-col items-center text-center group hover:bg-blue-50/30 transition-all duration-300">
                        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-600 group-hover:scale-110 transition-transform border border-blue-100">
                            <Users size={24} />
                        </div>
                        <span className="text-xs font-bold text-slate-300 mb-1.5">{t.teamSize}</span>
                        <span className="text-2xl font-bold text-blue-900">{stats.invited}</span>
                    </div>

                    <div className="bg-white rounded-[2rem] p-6 border border-blue-50 shadow-xl shadow-blue-900/5 flex flex-col items-center text-center group hover:bg-blue-50/30 transition-all duration-300">
                        <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-4 text-green-600 group-hover:scale-110 transition-transform border border-green-100">
                            <Coins size={24} />
                        </div>
                        <span className="text-xs font-bold text-slate-300 mb-1.5">{t.totalEarned}</span>
                        <span className="text-2xl font-bold text-green-600">{stats.earned.toLocaleString()}</span>
                    </div>
                </div>

                {/* Link Sharing Card */}
                <div className="w-full bg-white rounded-[2.5rem] p-8 border border-blue-50 relative shadow-2xl shadow-blue-900/5 mb-10">
                    <div className="flex flex-col space-y-6">
                        <div className="space-y-3 px-1">
                            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider ml-1">{t.yourInviteLinkLabel}</label>
                            <div className="relative group/link" onClick={handleCopy}>
                                <div className="w-full bg-blue-50 border border-blue-100 rounded-[1.5rem] px-6 py-5 text-sm font-bold text-blue-900 truncate focus:outline-none transition-all group-hover/link:bg-blue-100 cursor-pointer">
                                    {referralLink}
                                </div>
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-blue-900/20 group-hover/link:text-blue-600 transition-colors">
                                    <Copy size={18} />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={handleCopy}
                                className={`flex-[2] h-16 rounded-[1.5rem] font-bold text-sm transition-all duration-500 flex items-center justify-center gap-3 active:scale-95 ${copied
                                    ? "bg-green-600 text-white shadow-lg shadow-green-600/20"
                                    : "bg-blue-900 text-white shadow-xl shadow-blue-900/10 hover:bg-blue-950"
                                    }`}
                            >
                                {copied ? <CheckCircle2 size={18} strokeWidth={3} /> : <Copy size={18} strokeWidth={2.5} />}
                                {copied ? t.copiedLabel : t.copyLinkLabel}
                            </button>
                            <button
                                onClick={handleShare}
                                className="w-16 h-16 rounded-[1.5rem] bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 transition-all active:scale-95 shadow-lg shadow-orange-500/20"
                            >
                                <Share2 size={24} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Protocol Steps */}
                <div className="w-full grid grid-cols-3 gap-4 px-2 text-center mb-10">
                    <div className="space-y-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center mx-auto border border-blue-100">01</div>
                        <p className="text-[10px] font-bold text-slate-400 leading-tight uppercase">{t.shareLinkLabel}</p>
                    </div>
                    <div className="space-y-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center mx-auto border border-blue-100">02</div>
                        <p className="text-[10px] font-bold text-slate-400 leading-tight uppercase">{t.friendsJoinLabel}</p>
                    </div>
                    <div className="space-y-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center mx-auto border border-blue-100">03</div>
                        <p className="text-[10px] font-bold text-slate-400 leading-tight uppercase">{t.earnMoneyLabel}</p>
                    </div>
                </div>

            </main>
        </div>
    );
}
