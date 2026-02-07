"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ChevronLeft, Users, Trophy, Wallet, UserCircle, Search, Layers, Star, Coins, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { translations, Language } from "@/lib/translations";

interface TeamMember {
    uid: string;
    phoneNumber: string;
    totalRecharge: number;
    rewardEarned: number;
    joinedAt: string;
    level: string;
}

interface TeamData {
    A: TeamMember[];
    B: TeamMember[];
    C: TeamMember[];
    D: TeamMember[];
}

export default function TeamPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'A' | 'B' | 'C' | 'D'>('A');
    const [teamData, setTeamData] = useState<TeamData>({ A: [], B: [], C: [], D: [] });
    const [stats, setStats] = useState({
        totalMembers: 0,
        totalCommission: 0,
        totalTeamRecharge: 0,
        todayJoined: 0,
        levelCounts: { A: 0, B: 0, C: 0, D: 0 },
        levelAssets: { A: 0, B: 0, C: 0, D: 0 }
    });
    const [rates, setRates] = useState({ levelA: 12, levelB: 7, levelC: 4, levelD: 2 });
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

    const tabs = [
        { id: 'A', label: t.levelOne, pct: `${rates.levelA}%` },
        { id: 'B', label: t.levelTwo, pct: `${rates.levelB}%` },
        { id: 'C', label: t.levelThree, pct: `${rates.levelC}%` },
        { id: 'D', label: t.levelFour, pct: `${rates.levelD}%` },
    ];

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push("/");
                return;
            }

            try {
                // 1. Fetch Dynamic Settings
                const settingsSnap = await getDoc(doc(db, "settings", "referral"));
                const fetchedRates = settingsSnap.exists() ? settingsSnap.data() : { levelA: 12, levelB: 7, levelC: 4, levelD: 2 };
                setRates(fetchedRates as any);

                // 2. Fetch all 4 levels in parallel using fetched rates
                const levels = [
                    { key: 'inviterA', pct: (fetchedRates.levelA || 12) / 100, label: 'A' },
                    { key: 'inviterB', pct: (fetchedRates.levelB || 7) / 100, label: 'B' },
                    { key: 'inviterC', pct: (fetchedRates.levelC || 4) / 100, label: 'C' },
                    { key: 'inviterD', pct: (fetchedRates.levelD || 2) / 100, label: 'D' }
                ];

                const promises = levels.map(async (level) => {
                    const q = query(collection(db, "users"), where(level.key, "==", user.uid));
                    const snapshot = await getDocs(q);
                    return {
                        label: level.label,
                        members: snapshot.docs.map(doc => {
                            const data = doc.data();
                            const totalRecharge = data.totalRecharge || 0;
                            return {
                                uid: doc.id,
                                phoneNumber: data.phoneNumber || "Unknown",
                                totalRecharge: totalRecharge,
                                rewardEarned: totalRecharge * level.pct,
                                joinedAt: data.createdAt,
                                level: level.label
                            };
                        })
                    };
                });

                const results = await Promise.all(promises);

                const newTeamData: any = {};
                let count = 0;
                let commission = 0;
                let teamRecharge = 0;
                let todayCount = 0;

                const levelCounts = { A: 0, B: 0, C: 0, D: 0 };
                const levelAssets = { A: 0, B: 0, C: 0, D: 0 };

                // Get today's date string
                const todayStr = new Date().toISOString().split('T')[0];

                results.forEach(res => {
                    newTeamData[res.label] = res.members;
                    count += res.members.length;
                    levelCounts[res.label as keyof typeof levelCounts] = res.members.length;

                    res.members.forEach(m => {
                        commission += m.rewardEarned;
                        teamRecharge += m.totalRecharge;
                        levelAssets[res.label as keyof typeof levelAssets] += m.totalRecharge;

                        if (m.joinedAt && typeof m.joinedAt === 'string' && m.joinedAt.includes(todayStr)) {
                            todayCount++;
                        }
                    });
                });

                setTeamData(newTeamData);
                setStats({
                    totalMembers: count,
                    totalCommission: commission,
                    totalTeamRecharge: teamRecharge,
                    todayJoined: todayCount,
                    levelCounts,
                    levelAssets
                });

            } catch (error) {
                console.error("Error fetching team:", error);
                toast.error("Failed to load team data");
                setLoading(false);
            } finally {
                setLoading(false);
            }
        });

        // Safety timeout to prevent permanent loading state
        const loadingTimeout = setTimeout(() => {
            setLoading(false);
        }, 5000);

        return () => {
            unsubscribe();
            clearTimeout(loadingTimeout);
        };
    }, [router, mounted]);

    const formatPhone = (phone: string) => {
        if (phone.length < 6) return phone;
        return phone.substring(0, 4) + "****" + phone.substring(phone.length - 2);
    };


    if (!mounted || loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-green-600" />
            </div>
        );
    }

    const currentMembers = activeTab === 'all'
        ? [...teamData.A, ...teamData.B, ...teamData.C, ...teamData.D]
        : teamData[activeTab];

    return (
        <div className="min-h-screen bg-white text-blue-900 pb-32 font-sans relative overflow-hidden">
            {/* Medical Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-50/50 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-50/30 blur-[100px] rounded-full"></div>
            </div>

            {/* Header */}
            <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-blue-50">
                <div className="max-w-lg mx-auto px-6 h-20 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-blue-100 text-blue-900 transition-all active:scale-95 shadow-sm"
                    >
                        <ChevronLeft size={22} />
                    </button>
                    <h1 className="text-lg font-bold text-blue-900 leading-none">{t.myTeam}</h1>
                    <div className="w-10" />
                </div>
            </div>

            <main className="max-w-lg mx-auto p-4 space-y-6">

                {/* Circular Asset Gauge & Stats Section */}
                <div className="bg-white rounded-[3rem] p-8 shadow-xl shadow-blue-900/5 border border-blue-50 mb-8 relative overflow-hidden group z-10">
                    <div className="flex flex-col sm:flex-row items-center gap-10 relative z-10">
                        {/* 3D Circular Asset Gauge */}
                        <div className="relative w-40 h-40 shrink-0 flex items-center justify-center transform group-hover:scale-105 transition-transform duration-700">
                            {/* Medical Ring */}
                            <div className="absolute inset-0 rounded-full border-[6px] border-blue-50 border-t-blue-500 border-l-blue-500 animate-[spin_10s_linear_infinite]"></div>

                            <svg className="w-full h-full -rotate-90 drop-shadow-xl" viewBox="0 0 100 100">
                                <defs>
                                    <linearGradient id="assetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#3b82f6" />
                                        <stop offset="100%" stopColor="#22c55e" />
                                    </linearGradient>
                                </defs>

                                {/* Track */}
                                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f8fafc" strokeWidth="8" />
                                {/* Progress Indicator */}
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="transparent"
                                    stroke="url(#assetGradient)"
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    strokeDasharray="251.2"
                                    strokeDashoffset="80"
                                    className="animate-[dash_2s_ease-out_forwards]"
                                />
                            </svg>

                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-2 border border-blue-100">
                                    <Trophy size={18} className="text-blue-600" />
                                </div>
                                <span className="text-[10px] font-bold text-blue-900/40 mb-1">{t.sales}</span>
                                <span className="font-bold text-blue-900 text-sm tabular-nums leading-none">
                                    {stats.totalTeamRecharge >= 1000000 ? (stats.totalTeamRecharge / 1000000).toFixed(1) + "M" : stats.totalTeamRecharge.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* List Stats */}
                        <div className="flex-1 w-full space-y-6">
                            <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-50">
                                <div className="text-[10px] font-bold text-blue-900/40 mb-4 flex items-center gap-2">
                                    {t.totalIncome} <div className="h-[1px] flex-1 bg-blue-100"></div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-4xl font-bold text-blue-900 tabular-nums leading-none tracking-tighter">
                                        {stats.totalCommission.toLocaleString()}
                                    </p>
                                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/20">
                                        <Coins size={24} className="text-white" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-blue-50/50 p-5 rounded-[1.5rem] border border-blue-50">
                                    <span className="text-[10px] text-blue-900/40 font-bold block mb-3">{t.joinedToday}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                        <span className="font-bold text-blue-900 text-lg">+{stats.todayJoined}</span>
                                    </div>
                                </div>
                                <div className="bg-blue-50/50 p-5 rounded-[1.5rem] border border-blue-50">
                                    <span className="text-[10px] text-blue-900/40 font-bold block mb-3">{t.totalMembers}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                        <span className="font-bold text-blue-900 text-lg">{stats.totalMembers}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Invite Banner */}
                <button
                    onClick={() => router.push("/users/invite")}
                    className="w-full relative h-[100px] rounded-[2rem] overflow-hidden group border border-blue-50 shadow-xl shadow-blue-900/5 active:scale-[0.98] transition-all z-10"
                >
                    <div className="absolute inset-0 bg-blue-900"></div>
                    <img
                        src="/invite_banner.png"
                        alt="Invite"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-30"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-900 via-blue-900/40 to-transparent"></div>
                    <div className="absolute inset-0 flex items-center justify-between px-8">
                        <div>
                            <h3 className="text-white font-bold text-lg tracking-tight">{t.inviteFriends}</h3>
                            <p className="text-blue-200 text-[10px] font-bold mt-1">{t.shareYourLink}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                            <ChevronLeft size={20} className="rotate-180 text-white" />
                        </div>
                    </div>
                </button>

                {/* Level Selectors */}
                <div className="space-y-4 z-10 relative">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-bold text-blue-900/40">{t.levels}</h3>
                        <div className="text-[10px] font-bold text-green-600">{t.rateLabel.replace("{rate}", String(rates[`level${activeTab}` as keyof typeof rates]))}</div>
                    </div>

                    <div className="bg-blue-50/50 p-1.5 rounded-[1.8rem] border border-blue-100 flex shadow-inner">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 py-4 rounded-[1.2rem] text-[10px] font-bold transition-all duration-500 ${activeTab === tab.id
                                    ? 'bg-blue-900 text-white shadow-lg shadow-blue-900/10 scale-[1.02]'
                                    : 'text-blue-900/30 hover:text-blue-900/60'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Member List */}
                <div className="space-y-4 min-h-[300px] z-10 relative">
                    {currentMembers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 border border-blue-50 rounded-[3rem] bg-blue-50/20">
                            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-blue-900/10 shadow-sm">
                                <Search size={24} />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-blue-900/30">{t.noMembersFound}</p>
                            </div>
                        </div>
                    ) : (
                        currentMembers.map((member, idx) => (
                            <div
                                key={member.uid}
                                className="bg-white rounded-[2rem] p-5 border border-blue-50 flex items-center gap-5 shadow-xl shadow-blue-900/5 hover:border-blue-100 transition-all hover:translate-x-1"
                                style={{ animationDelay: `${idx * 50}ms` }}
                            >
                                <div className="w-14 h-14 shrink-0 rounded-[1.2rem] overflow-hidden border border-blue-50 relative bg-blue-50 p-0.5">
                                    <img
                                        src={encodeURI(`/level ${member.level === 'A' ? 1 : member.level === 'B' ? 2 : member.level === 'C' ? 3 : 4}.jpg`)}
                                        alt="Avatar"
                                        className="w-full h-full object-cover rounded-[1rem]"
                                    />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="text-sm font-bold text-blue-900 truncate">{formatPhone(member.phoneNumber)}</h4>
                                        <span className="text-green-600 text-[10px] font-bold bg-green-50 px-2 py-0.5 rounded-lg border border-green-100">+{member.rewardEarned.toLocaleString()} ETB</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-100/50 text-[9px] font-bold text-blue-900/40">
                                                {t.depositsAmount.replace("{amount}", member.totalRecharge > 999 ? (member.totalRecharge / 1000).toFixed(1) + 'k' : String(member.totalRecharge))}
                                            </span>
                                        </div>
                                        <span className="text-[9px] font-bold text-blue-900/20">
                                            {new Date(member.joinedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div >
    );
}
