"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    orderBy,
    limit
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import {
    Search,
    UserX,
    UserCheck,
    ShieldAlert,
    Loader2,
    Menu,
    RefreshCcw,
    Users,
    Phone,
    Wallet,
    Calendar,
    CheckCircle2,
    XCircle,
    Copy,
    ArrowRight,
    Gift,
    Lock
} from "lucide-react";
import { toast } from "sonner";

export default function AdminSettings() {
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"hub" | "security">("hub");

    // Search States
    const [searchPhone, setSearchPhone] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResult, setSearchResult] = useState<any>(null);

    // Blocked Directory States
    const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
    const [loadingBlocked, setLoadingBlocked] = useState(true);

    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            const isMaster = localStorage.getItem("admin_session") === "true";
            if (!user && !isMaster) {
                router.push("/");
            } else {
                setLoading(false);
                fetchBlockedUsers();
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchBlockedUsers = async () => {
        setLoadingBlocked(true);
        try {
            const q = query(
                collection(db, "users"),
                where("isBlocked", "==", true),
                limit(100)
            );
            const snapshot = await getDocs(q);
            const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const sortedUsers = users.sort((a: any, b: any) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });

            setBlockedUsers(sortedUsers);
        } catch (error) {
            console.error("Error fetching blocked users:", error);
        } finally {
            setLoadingBlocked(false);
        }
    };

    // ... handleSearch, toggleBlockStatus, copyToClipboard remain the same ...
    const handleSearch = async () => {
        if (!searchPhone.trim()) {
            toast.error("Please enter a phone number");
            return;
        }

        setIsSearching(true);
        setSearchResult(null);

        try {
            let phoneToSearch = searchPhone.trim();
            if (!phoneToSearch.startsWith("+")) {
                const qPlus = query(collection(db, "users"), where("phoneNumber", "==", "+" + phoneToSearch));
                const snapPlus = await getDocs(qPlus);
                if (!snapPlus.empty) {
                    setSearchResult({ id: snapPlus.docs[0].id, ...snapPlus.docs[0].data() });
                    return;
                }
            }

            const q = query(collection(db, "users"), where("phoneNumber", "==", phoneToSearch));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                toast.error("No user found with this phone number");
            } else {
                setSearchResult({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
            }
        } catch (error) {
            console.error("Search error:", error);
            toast.error("Failed to search user");
        } finally {
            setIsSearching(false);
        }
    };

    const toggleBlockStatus = async (user: any) => {
        const newStatus = !user.isBlocked;
        setProcessingId(user.id);

        try {
            const userRef = doc(db, "users", user.id);
            await updateDoc(userRef, {
                isBlocked: newStatus
            });

            const actionMessage = newStatus ? "blocked" : "unblocked";
            toast.success(`User ${actionMessage} successfully`);

            if (searchResult && searchResult.id === user.id) {
                setSearchResult({ ...searchResult, isBlocked: newStatus });
            }
            fetchBlockedUsers();
        } catch (error) {
            console.error("Update error:", error);
            toast.error("Failed to update user status");
        } finally {
            setProcessingId(null);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.info("Copied to clipboard");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600" size={40} />
            </div>
        );
    }

    const SETTINGS_CARDS = [
        {
            id: "recharge",
            title: "Recharge Settings",
            desc: "Minimums, limits & providers",
            icon: Wallet,
            color: "bg-emerald-50 text-emerald-600",
            path: "/admin/settings/recharge"
        },
        {
            id: "withdrawal",
            title: "Withdrawal Settings",
            desc: "Timing, days & frequencies",
            icon: ArrowRight,
            color: "bg-amber-50 text-amber-600",
            path: "/admin/settings/withdrawal"
        },
        {
            id: "income",
            title: "Income Settings",
            desc: "Daily payout schedule logic",
            icon: Calendar,
            color: "bg-indigo-50 text-indigo-600",
            path: "/admin/settings/income"
        },
        {
            id: "weekend",
            title: "Weekend Settings",
            desc: "Default weekend balance config",
            icon: Gift,
            color: "bg-orange-50 text-orange-600",
            path: "/admin/settings/weekend"
        },
        {
            id: "security",
            title: "Account Security",
            desc: "Block/unblock user access",
            icon: ShieldAlert,
            color: "bg-rose-50 text-rose-600",
            action: () => setActiveTab("security")
        },
        {
            id: "reset-password",
            title: "Password Reset",
            desc: "Force reset user login",
            icon: Lock,
            color: "bg-red-50 text-red-600",
            path: "/admin/settings/reset-password"
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="flex-1 flex flex-col min-h-screen w-full text-slate-900">
                {/* Header */}
                <header className="sticky top-0 bg-white/80 backdrop-blur-xl px-6 py-6 flex items-center justify-between z-40 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="md:hidden w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600"
                        >
                            <Menu size={24} />
                        </button>
                        <div className="flex flex-col">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                                {activeTab === "hub" ? "Global Settings" : "Account Security"}
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                {activeTab === "hub" ? "Platform Configuration Hub" : "User Restriction Hub"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {activeTab !== "hub" && (
                            <button
                                onClick={() => setActiveTab("hub")}
                                className="px-6 h-12 flex items-center justify-center rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                            >
                                Back to Hub
                            </button>
                        )}
                        <button
                            onClick={() => window.location.reload()}
                            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                        >
                            <RefreshCcw size={20} />
                        </button>
                    </div>
                </header>

                <main className="p-3 sm:p-8 max-w-4xl mx-auto w-full">
                    {activeTab === "hub" ? (
                        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {SETTINGS_CARDS.map((card) => (
                                <div
                                    key={card.id}
                                    onClick={() => card.action ? card.action() : router.push(card.path!)}
                                    className="group bg-white/70 backdrop-blur-md p-4 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white shadow-lg shadow-slate-900/5 hover:border-indigo-500/20 hover:shadow-2xl hover:shadow-indigo-900/10 transition-all cursor-pointer relative overflow-hidden"
                                >
                                    <div className="flex flex-col gap-3 sm:gap-6 relative z-10">
                                        <div className={`w-10 h-10 sm:w-16 sm:h-16 rounded-[1rem] sm:rounded-[1.5rem] ${card.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                            <card.icon className="w-5 h-5 sm:w-8 sm:h-8" />
                                        </div>
                                        <div className="min-h-[3rem] sm:min-h-0">
                                            <h3 className="text-[10px] sm:text-xl font-black tracking-tight mb-1 sm:mb-2 uppercase leading-none">{card.title}</h3>
                                            <p className="text-[8px] sm:text-sm font-bold text-slate-400 leading-tight">{card.desc}</p>
                                        </div>
                                        <div className="pt-2 sm:pt-4 flex items-center text-[7px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-indigo-600 group-hover:gap-2 transition-all">
                                            <span>Manage</span>
                                            <ArrowRight className="w-2 h-2 sm:w-3.5 sm:h-3.5 ml-1" />
                                        </div>
                                    </div>
                                    {/* Decorative circle */}
                                    <div className="absolute -bottom-8 -right-8 sm:-bottom-12 sm:-right-12 w-20 h-20 sm:w-32 sm:h-32 bg-slate-50 rounded-full group-hover:bg-indigo-50 transition-colors"></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* User Search & Block Section */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/20">
                                        <Search size={20} />
                                    </div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Global Account Search</h3>
                                </div>

                                <div className="bg-white rounded-[2.5rem] p-8 border-2 border-slate-100 shadow-2xl shadow-slate-900/5 space-y-8">
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="flex-1 relative">
                                            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                                <Phone size={20} className="text-slate-300" />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Enter user phone number..."
                                                value={searchPhone}
                                                onChange={(e) => setSearchPhone(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                                className="w-full h-16 pl-14 pr-6 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-indigo-400 focus:bg-white transition-all text-sm font-bold tracking-widest text-slate-900"
                                            />
                                        </div>
                                        <button
                                            onClick={handleSearch}
                                            disabled={isSearching}
                                            className="w-full sm:w-auto px-10 h-16 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
                                        >
                                            {isSearching ? <Loader2 className="animate-spin" size={20} /> : "Search Account"}
                                        </button>
                                    </div>

                                    {searchResult && (
                                        <div className="animate-in slide-in-from-top-4 duration-500 overflow-hidden border-2 border-indigo-50 rounded-[2rem]">
                                            <div className="bg-gradient-to-br from-indigo-50 to-white p-6 sm:p-10">
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg text-indigo-600 ring-4 ring-white/50">
                                                            <Users size={32} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <p className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">{searchResult.phoneNumber}</p>
                                                                <button onClick={() => copyToClipboard(searchResult.phoneNumber)} className="text-slate-300 hover:text-indigo-400 p-1">
                                                                    <Copy size={14} />
                                                                </button>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${searchResult.isBlocked ? "bg-rose-500" : "bg-emerald-500"}`}></div>
                                                                <span className={`text-[10px] font-black uppercase tracking-widest ${searchResult.isBlocked ? "text-rose-500" : "text-emerald-500"}`}>
                                                                    {searchResult.isBlocked ? "Blocked Access" : "Active Member"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => toggleBlockStatus(searchResult)}
                                                        disabled={processingId === searchResult.id}
                                                        className={`w-full sm:w-auto h-16 px-10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 ${searchResult.isBlocked
                                                            ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
                                                            : "bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-600/20"
                                                            }`}
                                                    >
                                                        {processingId === searchResult.id ? (
                                                            <Loader2 className="animate-spin" size={20} />
                                                        ) : (
                                                            <>
                                                                {searchResult.isBlocked ? <UserCheck size={20} /> : <UserX size={20} />}
                                                                <span>{searchResult.isBlocked ? "Restore Access" : "Block User Login"}</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8 pt-8 border-t border-indigo-100/50">
                                                    <div className="bg-white/60 p-4 rounded-2xl border border-white">
                                                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                                                            <Wallet size={12} />
                                                            <span className="text-[9px] font-black uppercase tracking-widest">Wallet Balance</span>
                                                        </div>
                                                        <p className="text-lg font-black text-slate-900 tracking-tight">{searchResult.balance?.toLocaleString() || 0} <span className="text-[10px] text-slate-300">ETB</span></p>
                                                    </div>
                                                    <div className="bg-white/60 p-4 rounded-2xl border border-white">
                                                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                                                            <ShieldAlert size={12} />
                                                            <span className="text-[9px] font-black uppercase tracking-widest">VIP Tier</span>
                                                        </div>
                                                        <p className="text-lg font-black text-slate-900 tracking-tight">VIP {searchResult.vip || 0}</p>
                                                    </div>
                                                    <div className="bg-white/60 p-4 rounded-2xl border border-white col-span-2 md:col-span-1">
                                                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                                                            <Calendar size={12} />
                                                            <span className="text-[9px] font-black uppercase tracking-widest">Member Since</span>
                                                        </div>
                                                        <p className="text-sm font-black text-slate-900 tracking-tight">
                                                            {searchResult.createdAt ? new Date(searchResult.createdAt).toLocaleDateString() : "Unknown"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Blocked Directory */}
                            <section className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                                            <ShieldAlert size={20} />
                                        </div>
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Access Restricted Directory</h3>
                                    </div>
                                    <span className="px-4 py-1.5 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                        {blockedUsers.length} Restricted Accounts
                                    </span>
                                </div>

                                {loadingBlocked ? (
                                    <div className="bg-white rounded-[2.5rem] p-12 border border-slate-100 flex flex-col items-center gap-4 text-center">
                                        <Loader2 className="animate-spin text-slate-300" size={32} />
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scanning Firestore Database...</p>
                                    </div>
                                ) : blockedUsers.length === 0 ? (
                                    <div className="bg-white rounded-[2.5rem] p-16 border border-slate-100 flex flex-col items-center gap-6 text-center">
                                        <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                                            <CheckCircle2 size={40} />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-black text-slate-900 leading-none mb-2 tracking-tight">All Operations Clear</h4>
                                            <p className="text-slate-400 text-sm font-medium">No users are currently blocked on the platform.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {blockedUsers.map((user) => (
                                            <div key={user.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-rose-900/5 transition-all group">
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                            <UserX size={24} />
                                                        </div>
                                                        <div>
                                                            <p className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1">{user.phoneNumber}</p>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Restricted Since {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => toggleBlockStatus(user)}
                                                        disabled={processingId === user.id}
                                                        className="w-full sm:w-auto px-8 h-14 rounded-2xl border-2 border-emerald-100 text-emerald-600 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-50 hover:border-emerald-200 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        {processingId === user.id ? (
                                                            <Loader2 className="animate-spin" size={16} />
                                                        ) : (
                                                            <>
                                                                <UserCheck size={16} />
                                                                <span>Restore Login Access</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
