"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
    Users as UsersIcon,
    Search,
    Phone,
    ArrowUpCircle,
    ArrowDownCircle,
    BadgeCheck,
    Clock,
    Menu,
    Calendar,
    CreditCard,
    Loader2 as Loader,
    Check,
    X,
    TrendingUp,
    Key,
    Pencil
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";

function UsersManagement() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editBalance, setEditBalance] = useState("");
    const [editCredits, setEditCredits] = useState("");
    const [editTeamIncome, setEditTeamIncome] = useState("");
    const [editTotalIncome, setEditTotalIncome] = useState("");
    const [editWithdrawalPassword, setEditWithdrawalPassword] = useState("");
    const [editField, setEditField] = useState<"balance" | "credits" | "teamIncome" | "totalIncome" | "withdrawalPassword" | null>(null);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            const isMaster = localStorage.getItem("admin_session") === "true";
            if (!user && !isMaster) {
                router.push("/");
                return;
            }
        });

        const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
        const unsubscribeUsers = onSnapshot(q, (snapshot) => {
            const userData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUsers(userData);
            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeUsers();
        };
    }, [router]);

    useEffect(() => {
        const filtered = users.filter(user =>
            user.phoneNumber?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredUsers(filtered);
    }, [searchQuery, users]);

    const handleUpdateBalance = async (userId: string) => {
        if (!editBalance || isNaN(Number(editBalance))) return;
        setUpdating(true);
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                balance: Number(editBalance)
            });
            setEditingUserId(null);
            setEditField(null);
        } catch (error) {
            console.error("Error updating balance:", error);
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdateCredits = async (userId: string) => {
        if (!editCredits || isNaN(Number(editCredits))) return;
        setUpdating(true);
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                Recharge: Number(editCredits)
            });
            setEditingUserId(null);
            setEditField(null);
        } catch (error) {
            console.error("Error updating credits:", error);
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdateTeamIncome = async (userId: string) => {
        if (!editTeamIncome || isNaN(Number(editTeamIncome))) return;
        setUpdating(true);
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                teamIncome: Number(editTeamIncome)
            });
            setEditingUserId(null);
            setEditField(null);
        } catch (error) {
            console.error("Error updating team income:", error);
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdateTotalIncome = async (userId: string) => {
        if (!editTotalIncome || isNaN(Number(editTotalIncome))) return;
        setUpdating(true);
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                totalIncome: Number(editTotalIncome)
            });
            setEditingUserId(null);
            setEditField(null);
        } catch (error) {
            console.error("Error updating total income:", error);
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdateWithdrawalPassword = async (userId: string) => {
        if (!editWithdrawalPassword) return; // Allow string, no isNaN check needed clearly
        setUpdating(true);
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                withdrawalPassword: editWithdrawalPassword
            });
            setEditingUserId(null);
            setEditField(null);
        } catch (error) {
            console.error("Error updating withdrawal password:", error);
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white text-indigo-600">
                <Loader className="w-12 h-12 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8F9FD] flex">
            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="flex-1 flex flex-col min-h-screen max-w-full overflow-hidden">
                {/* Header */}
                <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between z-30">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="md:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <Menu size={24} className="text-gray-600" />
                    </button>
                    <div className="hidden md:block">
                        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">
                            Manager / <span className="text-indigo-600">Users</span>
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">Total Users</p>
                            <p className="text-lg font-black text-gray-900 leading-none">{users.length}</p>
                        </div>
                        <div className="w-10 h-10 p-1 rounded-full border-2 border-indigo-100 overflow-hidden">
                            <img src="/logo.png" alt="Admin" className="w-full h-full object-contain" />
                        </div>
                    </div>
                </header>

                <main className="p-4 md:p-8 max-w-5xl mx-auto w-full">
                    {/* Welcome Card */}
                    <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100 mb-8 overflow-hidden relative">
                        <div className="relative z-10">
                            <h1 className="text-2xl font-black text-gray-900 mb-2">User Database 👥</h1>
                            <p className="text-gray-500 text-sm font-medium">Track all users, their activity status, and financial statistics.</p>
                        </div>
                        <div className="absolute -top-6 -right-6 opacity-[0.03] pointer-events-none">
                            <UsersIcon size={160} className="text-indigo-600" />
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative mb-6">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Find user by phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-14 pl-14 pr-6 rounded-2xl bg-white border border-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-gray-700 placeholder:text-gray-300"
                        />
                    </div>

                    {/* User Grid/List */}
                    <div className="grid grid-cols-1 gap-4">
                        {filteredUsers.map((user) => {
                            const isActive = (user.totalRecharge || 0) > 0;
                            return (
                                <div
                                    key={user.id}
                                    className="bg-white rounded-3xl p-5 border border-gray-100 hover:border-indigo-100 transition-all group overflow-hidden"
                                >
                                    <div className="flex flex-col sm:flex-row gap-5">
                                        {/* Profile Section */}
                                        <div className="flex sm:flex-col items-center gap-4 sm:gap-2">
                                            <div className="relative">
                                                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-gray-50 shadow-sm">
                                                    <img
                                                        src="/avator profile.jpg"
                                                        alt="User"
                                                        className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all"
                                                    />
                                                </div>
                                                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${isActive ? "bg-emerald-500" : "bg-gray-300"
                                                    }`}>
                                                    {isActive && <BadgeCheck size={10} className="text-white" />}
                                                </div>
                                            </div>
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${isActive
                                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                                : "bg-gray-50 text-gray-400 border border-gray-100"
                                                }`}>
                                                {isActive ? "Active" : "Inactive"}
                                            </span>
                                        </div>

                                        {/* Main Info */}
                                        <div className="flex-1 flex flex-col justify-center gap-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="flex items-center gap-1.5 text-gray-900 font-black text-lg">
                                                    <Phone size={16} className="text-gray-400" />
                                                    {user.phoneNumber}
                                                </div>
                                            </div>
                                            <div className="text-gray-400 text-xs font-medium flex flex-wrap gap-x-4 gap-y-1">
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    Joined: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    VIP: {user.vip || 0}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Financial Stats */}
                                        <div className="flex flex-wrap sm:flex-nowrap gap-3 sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 sm:border-l border-gray-50 sm:pl-5">
                                            <div className="flex-1 sm:w-28 flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-50/50 border border-blue-100 group-hover:bg-blue-50 transition-colors">
                                                <ArrowUpCircle size={14} className="text-blue-500 mb-1" />
                                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">T. Recharge</p>
                                                <p className="text-sm font-black text-blue-600 leading-none">{user.totalRecharge || 0}</p>
                                            </div>
                                            <div className="flex-1 sm:w-28 flex flex-col items-center justify-center p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100 group-hover:bg-indigo-50 transition-colors text-center relative">
                                                <BadgeCheck size={14} className="text-indigo-500 mb-1" />
                                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Credits</p>
                                                {editingUserId === user.id && editField === "credits" ? (
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <input
                                                            type="number"
                                                            value={editCredits}
                                                            onChange={(e) => setEditCredits(e.target.value)}
                                                            className="w-20 h-7 bg-white border border-indigo-200 rounded-lg text-xs font-black text-indigo-600 px-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => handleUpdateCredits(user.id)}
                                                            disabled={updating}
                                                            className="p-1 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors disabled:opacity-50"
                                                        >
                                                            {updating ? <Loader size={12} className="animate-spin" /> : <Check size={12} />}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingUserId(null);
                                                                setEditField(null);
                                                            }}
                                                            className="p-1 bg-gray-100 text-gray-500 rounded-md hover:bg-gray-200 transition-colors"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-black text-indigo-600 leading-none">{user.Recharge || 0}</p>
                                                        <button
                                                            onClick={() => {
                                                                setEditingUserId(user.id);
                                                                setEditField("credits");
                                                                setEditCredits(user.Recharge?.toString() || "0");
                                                            }}
                                                            className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded-lg text-indigo-500 hover:bg-indigo-50"
                                                            title="Edit Credits"
                                                        >
                                                            <Pencil size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 sm:w-28 flex flex-col items-center justify-center p-3 rounded-2xl bg-purple-50/50 border border-purple-100 group-hover:bg-purple-50 transition-colors text-center relative">
                                                <TrendingUp size={14} className="text-purple-500 mb-1" />
                                                <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest leading-none mb-1">Team Inc.</p>
                                                {editingUserId === user.id && editField === "teamIncome" ? (
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <input
                                                            type="number"
                                                            value={editTeamIncome}
                                                            onChange={(e) => setEditTeamIncome(e.target.value)}
                                                            className="w-20 h-7 bg-white border border-purple-200 rounded-lg text-xs font-black text-purple-600 px-2 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => handleUpdateTeamIncome(user.id)}
                                                            disabled={updating}
                                                            className="p-1 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors disabled:opacity-50"
                                                        >
                                                            {updating ? <Loader size={12} className="animate-spin" /> : <Check size={12} />}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingUserId(null);
                                                                setEditField(null);
                                                            }}
                                                            className="p-1 bg-gray-100 text-gray-500 rounded-md hover:bg-gray-200 transition-colors"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-black text-purple-600 leading-none">{user.teamIncome || 0}</p>
                                                        <button
                                                            onClick={() => {
                                                                setEditingUserId(user.id);
                                                                setEditField("teamIncome");
                                                                setEditTeamIncome(user.teamIncome?.toString() || "0");
                                                            }}
                                                            className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded-lg text-purple-500 hover:bg-purple-50"
                                                            title="Edit Team Income"
                                                        >
                                                            <Pencil size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 sm:w-28 flex flex-col items-center justify-center p-3 rounded-2xl bg-orange-50/50 border border-orange-100 group-hover:bg-orange-50 transition-colors text-center relative">
                                                <TrendingUp size={14} className="text-orange-500 mb-1" />
                                                <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest leading-none mb-1">Total Inc.</p>
                                                {editingUserId === user.id && editField === "totalIncome" ? (
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <input
                                                            type="number"
                                                            value={editTotalIncome}
                                                            onChange={(e) => setEditTotalIncome(e.target.value)}
                                                            className="w-20 h-7 bg-white border border-orange-200 rounded-lg text-xs font-black text-orange-600 px-2 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => handleUpdateTotalIncome(user.id)}
                                                            disabled={updating}
                                                            className="p-1 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:opacity-50"
                                                        >
                                                            {updating ? <Loader size={12} className="animate-spin" /> : <Check size={12} />}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingUserId(null);
                                                                setEditField(null);
                                                            }}
                                                            className="p-1 bg-gray-100 text-gray-500 rounded-md hover:bg-gray-200 transition-colors"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-black text-orange-600 leading-none">{user.totalIncome || 0}</p>
                                                        <button
                                                            onClick={() => {
                                                                setEditingUserId(user.id);
                                                                setEditField("totalIncome");
                                                                setEditTotalIncome(user.totalIncome?.toString() || "0");
                                                            }}
                                                            className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded-lg text-orange-500 hover:bg-orange-50"
                                                            title="Edit Total Income"
                                                        >
                                                            <Pencil size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 sm:w-28 flex flex-col items-center justify-center p-3 rounded-2xl bg-rose-50/50 border border-rose-100 group-hover:bg-rose-50 transition-colors text-center relative">
                                                <Key size={14} className="text-rose-500 mb-1" />
                                                <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest leading-none mb-1">Withdraw Pwd</p>
                                                {editingUserId === user.id && editField === "withdrawalPassword" ? (
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <input
                                                            type="text"
                                                            value={editWithdrawalPassword}
                                                            onChange={(e) => setEditWithdrawalPassword(e.target.value)}
                                                            className="w-20 h-7 bg-white border border-rose-200 rounded-lg text-xs font-black text-rose-600 px-2 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => handleUpdateWithdrawalPassword(user.id)}
                                                            disabled={updating}
                                                            className="p-1 bg-rose-500 text-white rounded-md hover:bg-rose-600 transition-colors disabled:opacity-50"
                                                        >
                                                            {updating ? <Loader size={12} className="animate-spin" /> : <Check size={12} />}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingUserId(null);
                                                                setEditField(null);
                                                            }}
                                                            className="p-1 bg-gray-100 text-gray-500 rounded-md hover:bg-gray-200 transition-colors"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-black text-rose-600 leading-none">{user.withdrawalPassword || "Not Set"}</p>
                                                        <button
                                                            onClick={() => {
                                                                setEditingUserId(user.id);
                                                                setEditField("withdrawalPassword");
                                                                setEditWithdrawalPassword(user.withdrawalPassword?.toString() || "");
                                                            }}
                                                            className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded-lg text-rose-500 hover:bg-rose-50"
                                                            title="Edit Withdrawal Password"
                                                        >
                                                            <Pencil size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 sm:w-28 flex flex-col items-center justify-center p-3 rounded-2xl bg-amber-50/50 border border-amber-100 group-hover:bg-amber-50 transition-colors">
                                                <ArrowDownCircle size={14} className="text-amber-500 mb-1" />
                                                <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest leading-none mb-1">Withdraw</p>
                                                <p className="text-sm font-black text-amber-600 leading-none">{user.totalWithdrawal || 0}</p>
                                            </div>
                                            <div className="w-full sm:w-32 flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100 group-hover:bg-emerald-50 transition-colors relative">
                                                <CreditCard size={14} className="text-emerald-500 mb-1" />
                                                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1">Balance</p>
                                                {editingUserId === user.id && editField === "balance" ? (
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <input
                                                            type="number"
                                                            value={editBalance}
                                                            onChange={(e) => setEditBalance(e.target.value)}
                                                            className="w-20 h-7 bg-white border border-emerald-200 rounded-lg text-xs font-black text-emerald-600 px-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => handleUpdateBalance(user.id)}
                                                            disabled={updating}
                                                            className="p-1 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                                        >
                                                            {updating ? <Loader size={12} className="animate-spin" /> : <Check size={12} />}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingUserId(null);
                                                                setEditField(null);
                                                            }}
                                                            className="p-1 bg-gray-100 text-gray-500 rounded-md hover:bg-gray-200 transition-colors"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-black text-emerald-600 leading-none">{user.balance || 0}</p>
                                                        <button
                                                            onClick={() => {
                                                                setEditingUserId(user.id);
                                                                setEditField("balance");
                                                                setEditBalance(user.balance?.toString() || "0");
                                                            }}
                                                            className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded-lg text-emerald-500 hover:bg-emerald-50"
                                                            title="Edit Balance"
                                                        >
                                                            <Pencil size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {filteredUsers.length === 0 && !loading && (
                            <div className="py-20 flex flex-col items-center justify-center text-gray-300">
                                <Search size={48} className="mb-4 opacity-10" />
                                <p className="font-black uppercase tracking-widest text-xs">No users found</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default function UsersPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white text-indigo-600">
                <Loader className="w-12 h-12 animate-spin" />
            </div>
        }>
            <UsersManagement />
        </Suspense>
    );
}
