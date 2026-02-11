"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import {
    Search,
    Loader2,
    Menu,
    Download,
    ChevronDown,
    ChevronUp,
    Phone,
    Wallet,
    Calendar,
    Briefcase,
    Building2,
    CreditCard,
    CheckCircle2,
    Users
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";

// Interface for Recharge Data
interface RechargeData {
    id: string;
    userId: string;
    phoneNumber: string;
    accountHolderName: string;
    accountNumber: string;
    amount: number;
    bankName: string;
    paymentMethod: string;
    status: string;
    timestamp: any; // Firestore Timestamp
    verifiedAt?: any; // Firestore Timestamp
    FTcode?: string;
    Fyu?: string; // Mentioned in prompt
}

// Interface for Grouped User Data
interface GroupedUser {
    userId: string;
    phoneNumber: string;
    accountHolderName: string;
    totalAmount: number;
    lastRechargeDate: Date;
    recharges: RechargeData[];
}

export default function RechargeTrackingPage() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [recharges, setRecharges] = useState<RechargeData[]>([]);
    const [usersData, setUsersData] = useState<{ [key: string]: string }>({});
    const [groupedUsers, setGroupedUsers] = useState<GroupedUser[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<GroupedUser[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedUserIds, setExpandedUserIds] = useState<Set<string>>(new Set());

    // Fetch users mapping
    useEffect(() => {
        const usersQuery = query(collection(db, "users"));
        const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
            const userMap: { [key: string]: string } = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.phoneNumber) {
                    userMap[doc.id] = data.phoneNumber;
                }
            });
            setUsersData(userMap);
        });
        return () => unsubscribeUsers();
    }, []);

    // Fetch recharges
    useEffect(() => {
        const q = query(
            collection(db, "RechargeReview"),
            where("status", "==", "verified")
        );

        const unsubscribeRecharges = onSnapshot(q, (snapshot) => {
            const rechargeList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as RechargeData[];
            setRecharges(rechargeList);
            setLoading(false);
        });

        return () => unsubscribeRecharges();
    }, []);

    // Group and Merge logic
    useEffect(() => {
        const groups: { [key: string]: GroupedUser } = {};

        recharges.forEach(recharge => {
            const uid = recharge.userId || "unknown";

            if (!groups[uid]) {
                groups[uid] = {
                    userId: uid,
                    phoneNumber: usersData[uid] || recharge.phoneNumber || "Unknown",
                    accountHolderName: recharge.accountHolderName || "Unknown",
                    totalAmount: 0,
                    lastRechargeDate: new Date(0),
                    recharges: []
                };
            }

            groups[uid].recharges.push(recharge);
            groups[uid].totalAmount += Number(recharge.amount) || 0;

            let rechargeDate = new Date();
            if (recharge.verifiedAt?.seconds) {
                rechargeDate = new Date(recharge.verifiedAt.seconds * 1000);
            } else if (recharge.timestamp?.seconds) {
                rechargeDate = new Date(recharge.timestamp.seconds * 1000);
            }

            if (rechargeDate > groups[uid].lastRechargeDate) {
                groups[uid].lastRechargeDate = rechargeDate;
                groups[uid].phoneNumber = usersData[uid] || recharge.phoneNumber || groups[uid].phoneNumber;
                if (recharge.accountHolderName) groups[uid].accountHolderName = recharge.accountHolderName;
            }
        });

        const sortedGroups = Object.values(groups).sort((a, b) =>
            b.lastRechargeDate.getTime() - a.lastRechargeDate.getTime()
        );

        sortedGroups.forEach(group => {
            group.recharges.sort((a, b) => {
                const dateA = a.verifiedAt?.seconds ? a.verifiedAt.seconds : (a.timestamp?.seconds || 0);
                const dateB = b.verifiedAt?.seconds ? b.verifiedAt.seconds : (b.timestamp?.seconds || 0);
                return dateB - dateA;
            });
        });

        setGroupedUsers(sortedGroups);
    }, [recharges, usersData]);

    // Filter logic
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredUsers(groupedUsers);
        } else {
            const lowerQuery = searchQuery.toLowerCase();
            const filtered = groupedUsers.filter(group =>
                group.phoneNumber.toLowerCase().includes(lowerQuery) ||
                group.accountHolderName.toLowerCase().includes(lowerQuery) ||
                group.userId.toLowerCase().includes(lowerQuery)
            );
            setFilteredUsers(filtered);
        }
    }, [searchQuery, groupedUsers]);

    const toggleExpand = (userId: string) => {
        const newExpanded = new Set(expandedUserIds);
        if (newExpanded.has(userId)) {
            newExpanded.delete(userId);
        } else {
            newExpanded.add(userId);
        }
        setExpandedUserIds(newExpanded);
    };

    const formatDate = (date: any) => {
        if (!date) return "N/A";
        // Handle Firestore Timestamp
        if (date.seconds) {
            return new Date(date.seconds * 1000).toLocaleString();
        }
        // Handle Date object
        if (date instanceof Date) {
            return date.toLocaleString();
        }
        return String(date);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-purple-600" size={40} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F0F2F5] flex font-sans">
            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="flex-1 flex flex-col min-h-screen w-full relative">
                {/* Mobile Header / Sticky Nav */}
                <header className="sticky top-0 bg-white/90 backdrop-blur-xl px-4 py-4 flex items-center justify-between z-40 border-b border-gray-100/50 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden w-10 h-10 rounded-xl bg-gray-50 active:bg-gray-100 flex items-center justify-center text-gray-600 transition-colors"
                        >
                            <Menu size={22} />
                        </button>
                        <div>
                            <h2 className="text-lg font-black text-gray-900 leading-none tracking-tight">Tracker</h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Verified History</p>
                        </div>
                    </div>

                    {/* Compact Volume Indicator for Mobile */}
                    <div className="flex flex-col items-end lg:hidden">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Vol</span>
                        <span className="text-sm font-black text-purple-600">
                            {(filteredUsers.reduce((acc, user) => acc + user.totalAmount, 0) / 1000).toFixed(1)}k
                        </span>
                    </div>
                </header>

                <main className="p-4 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
                    {/* Stats & Search Section */}
                    <div className="flex flex-col lg:flex-row gap-4 lg:items-stretch">
                        {/* Total Volume Card - Premium Gradient */}
                        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[1.5rem] p-6 text-white shadow-xl shadow-purple-600/20 relative overflow-hidden shrink-0 lg:w-64">
                            <div className="relative z-10 flex flex-col justify-between h-full gap-4">
                                <div className="p-2 bg-white/10 w-fit rounded-xl backdrop-blur-sm">
                                    <Wallet size={20} className="text-white" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-purple-100 text-xs font-bold uppercase tracking-widest">Total Volume</p>
                                    <h3 className="text-2xl lg:text-3xl font-black tracking-tight">
                                        {filteredUsers.reduce((acc, user) => acc + user.totalAmount, 0).toLocaleString()}
                                        <span className="text-sm lg:text-base font-medium opacity-60 ml-1">ETB</span>
                                    </h3>
                                </div>
                            </div>
                            {/* Decorative Circles */}
                            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                            <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl"></div>
                        </div>

                        {/* Search Input */}
                        <div className="flex-1 relative group">
                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                <Search size={20} className="text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search accounts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-full min-h-[4rem] pl-12 pr-6 bg-white border border-gray-100 rounded-[1.5rem] focus:outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-500/5 transition-all font-semibold text-gray-700 placeholder:text-gray-300 shadow-sm text-lg"
                            />
                        </div>
                    </div>

                    {/* Users List */}
                    <div className="grid gap-4">
                        {filteredUsers.map((user) => (
                            <div
                                key={user.userId}
                                className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-xl hover:shadow-gray-200/50 group"
                            >
                                {/* User Summary Trigger */}
                                <div
                                    onClick={() => toggleExpand(user.userId)}
                                    className="p-5 cursor-pointer flex flex-col relative z-10 bg-white active:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-gray-100 shadow-inner flex items-center justify-center relative">
                                                <img src="/avator profile.jpg" alt="Profile" className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-gray-900 tracking-tight leading-none">
                                                    {user.phoneNumber}
                                                </h3>
                                                <p className="text-xs font-bold text-gray-400 mt-1 flex items-center gap-1">
                                                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                    <span>{user.recharges.length} txns</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${expandedUserIds.has(user.userId) ? "bg-purple-100 text-purple-600 rotate-180" : "bg-gray-50 text-gray-400"}`}>
                                            <ChevronDown size={18} />
                                        </div>
                                    </div>

                                    {/* Quick Stats Banner */}
                                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="flex-1">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total</p>
                                            <p className="text-sm font-black text-gray-900">{user.totalAmount.toLocaleString()} ETB</p>
                                        </div>
                                        <div className="w-px h-6 bg-gray-200"></div>
                                        <div className="flex-1 text-right">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Last Seen</p>
                                            <p className="text-xs font-bold text-gray-600">{formatDate(user.lastRechargeDate).split(',')[0]}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded History - Timeline Style */}
                                {expandedUserIds.has(user.userId) && (
                                    <div className="bg-gray-50/50 border-t border-gray-100 p-5 space-y-6 animate-in slide-in-from-top-2 duration-300">
                                        {user.recharges.map((recharge, idx) => (
                                            <div key={recharge.id} className="relative pl-6 last:pb-0">
                                                {/* Timeline Line */}
                                                {idx !== user.recharges.length - 1 && (
                                                    <div className="absolute top-6 left-2.5 w-0.5 h-full bg-gray-200"></div>
                                                )}
                                                {/* Timeline Dot */}
                                                <div className="absolute top-1.5 left-0 w-5 h-5 rounded-full border-4 border-white bg-green-500 shadow-sm z-10"></div>

                                                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                                                    {/* Header: Bank & Amount */}
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                                                                <Building2 size={14} />
                                                            </div>
                                                            <span className="text-xs font-bold text-gray-700 line-clamp-1 max-w-[120px]">{recharge.bankName}</span>
                                                        </div>
                                                        <span className="text-sm font-black text-gray-900">{recharge.amount.toLocaleString()} ETB</span>
                                                    </div>

                                                    {/* Details Grid */}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="bg-gray-50 p-2 rounded-lg">
                                                            <p className="text-[9px] font-bold text-gray-400 uppercase">Account</p>
                                                            <p className="text-xs font-mono font-semibold text-gray-700 truncate">{recharge.accountNumber}</p>
                                                        </div>
                                                        <div className="bg-gray-50 p-2 rounded-lg">
                                                            <p className="text-[9px] font-bold text-gray-400 uppercase">Timestamp</p>
                                                            <p className="text-xs font-bold text-gray-600">{formatDate(recharge.verifiedAt || recharge.timestamp).split(',')[0]}</p>
                                                        </div>
                                                    </div>

                                                    {/* Codes */}
                                                    {(recharge.FTcode || recharge.Fyu) && (
                                                        <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-50">
                                                            {recharge.FTcode && (
                                                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-50 text-purple-700 text-[10px] font-mono font-bold border border-purple-100">
                                                                    FT: {recharge.FTcode}
                                                                </span>
                                                            )}
                                                            {recharge.Fyu && (
                                                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-mono font-bold border border-indigo-100">
                                                                    REF: {recharge.Fyu}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {filteredUsers.length === 0 && (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300">
                                    <Search size={24} />
                                </div>
                                <h3 className="text-gray-900 font-black text-sm">No Results</h3>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
