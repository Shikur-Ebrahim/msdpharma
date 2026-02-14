"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
    collection,
    onSnapshot,
    query,
    doc,
    runTransaction,
    Timestamp,
    increment,
    orderBy,
    getDocs,
    getDoc,
    where
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
    CheckCircle2,
    Clock,
    Search,
    Loader2,
    RefreshCcw,
    Menu,
    Copy,
    Check,
    Banknote,
    User,
    Phone,
    Calendar,
    ArrowRight,
    TrendingUp,
    ShieldCheck,
    History,
    AlertCircle,
    Edit3,
    Save,
    X
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import { toast } from "sonner";

interface BankDetails {
    accountNumber: string;
    holderName: string;
    bankName: string;
    bankLogoUrl?: string;
}

interface Withdrawal {
    id: string;
    userId: string;
    amount: number | string;
    actualReceipt: number | string;
    fee: number | string;
    status: string;
    userPhone: string;
    bankDetails: BankDetails;
    createdAt: any; // Using any for Timestamp/Date flexibility as seen in code
    verifiedAt?: any;
}

interface WithdrawalGroup {
    timestamp: number;
    items: Withdrawal[];
}

export default function WithdrawalWalletPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [verifying, setVerifying] = useState<string | null>(null);
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [confirmAction, setConfirmAction] = useState<{ type: 'verify', data: any } | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Financial Check States
    const [checkSearchTerm, setCheckSearchTerm] = useState("");
    const [checkLoading, setCheckLoading] = useState(false);
    const [checkResult, setCheckResult] = useState<any>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            const isMaster = localStorage.getItem("admin_session") === "true";
            if (!user && !isMaster) {
                router.push("/");
                return;
            }
            setLoading(false);
        });

        const q = query(
            collection(db, "Withdrawals"),
            orderBy("createdAt", "desc")
        );

        const unsubscribeWithdrawals = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Withdrawal));
            setWithdrawals(data);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeWithdrawals();
        };
    }, [router]);

    const handleVerify = async (withdrawal: Withdrawal) => {
        if (verifying) return;
        setVerifying(withdrawal.id);
        setConfirmAction(null);

        try {
            await runTransaction(db, async (transaction) => {
                const userDocRef = doc(db, "users", withdrawal.userId);
                const withdrawalRef = doc(db, "Withdrawals", withdrawal.id);

                const userDocSnap = await transaction.get(userDocRef);
                if (!userDocSnap.exists()) throw "User does not exist!";

                const amount = Number(withdrawal.amount);

                transaction.update(withdrawalRef, {
                    status: "verified",
                    verifiedAt: Timestamp.now()
                });

                transaction.update(userDocRef, {
                    totalWithdrawal: increment(amount)
                });

                // SEND NOTIFICATION TO USER
                const notifRef = doc(collection(db, "UserNotifications"));
                transaction.set(notifRef, {
                    userId: withdrawal.userId,
                    type: "withdrawal_verified",
                    amount: amount,
                    status: "verified",
                    read: false,
                    createdAt: Timestamp.now()
                });
            });

            toast.success(`Withdrawal of ETB ${withdrawal.amount} verified!`);
        } catch (error) {
            console.error("Verification error:", error);
            toast.error(typeof error === 'string' ? error : "Failed to verify");
        } finally {
            setVerifying(null);
        }
    };

    const copyToClipboard = (text: string, id: string, message: string = "Copied to clipboard") => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
        toast.info(message);
    };

    const handleFinancialCheck = async () => {
        if (!checkSearchTerm.trim()) {
            toast.error("Enter phone number");
            return;
        }

        setCheckLoading(true);
        setCheckResult(null);

        try {
            // 1. Find User by Phone
            const userQ = query(collection(db, "users"), where("phoneNumber", "==", checkSearchTerm.trim()));
            const userSnap = await getDocs(userQ);

            if (userSnap.empty) {
                toast.error("User not found");
                return;
            }

            const userData = userSnap.docs[0].data();
            const userId = userSnap.docs[0].id;

            // 2. Fetch User Orders
            const ordersQ = query(
                collection(db, "UserOrders"),
                where("userId", "==", userId),
                where("status", "==", "active")
            );
            const ordersSnap = await getDocs(ordersQ);
            const orders = ordersSnap.docs.map(doc => doc.data());

            // 3. Calculate Product Income
            const now = new Date();
            let totalProductEarnings = 0;
            orders.forEach(order => {
                const purchaseDate = order.purchaseDate?.toDate?.() || new Date(order.purchaseDate);
                const daysDiff = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
                const productEarnings = (order.dailyIncome || 0) * Math.max(0, daysDiff);
                totalProductEarnings += productEarnings;
            });

            // 4. Fetch Referral Rates
            const referralSnap = await getDoc(doc(db, "settings", "referral"));
            const rates = referralSnap.exists() ? referralSnap.data() : { levelA: 12, levelB: 7, levelC: 4, levelD: 2 };

            // 5. Calculate Team Income (Fetch all levels)
            const levels = [
                { key: 'inviterA', pct: (rates.levelA || 12) / 100 },
                { key: 'inviterB', pct: (rates.levelB || 7) / 100 },
                { key: 'inviterC', pct: (rates.levelC || 4) / 100 },
                { key: 'inviterD', pct: (rates.levelD || 2) / 100 }
            ];

            let rawTeamIncome = 0;
            for (const level of levels) {
                const levelQ = query(collection(db, "users"), where(level.key, "==", userId));
                const levelSnap = await getDocs(levelQ);
                levelSnap.docs.forEach(doc => {
                    rawTeamIncome += (doc.data().totalRecharge || 0) * level.pct;
                });
            }

            const teamEarnings90 = rawTeamIncome * 0.9;
            const totalAllowance = totalProductEarnings + teamEarnings90;
            const currentLiability = (userData.balance || 0) + (userData.totalWithdrawal || 0);
            const isLegal = currentLiability <= totalAllowance;
            const maxLegalWithdrawal = Math.max(0, totalAllowance - (userData.totalWithdrawal || 0));

            setCheckResult({
                phone: checkSearchTerm,
                balance: userData.balance || 0,
                totalWithdrawals: userData.totalWithdrawal || 0,
                productIncome: totalProductEarnings,
                teamIncomeRaw: rawTeamIncome,
                teamIncome90: teamEarnings90,
                allowance: totalAllowance,
                liability: currentLiability,
                isLegal,
                maxLegalWithdrawal,
                orders // Pass orders for display
            });

        } catch (error) {
            console.error("Check error:", error);
            toast.error("Failed to perform check");
        } finally {
            setCheckLoading(false);
        }
    };

    // Organized Data
    const { groupedWithdrawals, stats } = useMemo(() => {
        const filtered = withdrawals.filter(w =>
            w.userPhone?.includes(searchTerm) ||
            w.amount?.toString().includes(searchTerm) ||
            w.bankDetails?.accountNumber?.includes(searchTerm)
        );

        // 1. Separate Pending and Others
        const pendingItems = filtered.filter(w => w.status === 'pending');
        const otherItems = filtered.filter(w => w.status !== 'pending');

        // 2. Sort Pending: Oldest First (FIFO)
        const sortedPending = [...pendingItems].sort((a, b) => {
            const timeA = a.createdAt?.seconds ? a.createdAt.seconds : new Date(a.createdAt).getTime() / 1000;
            const timeB = b.createdAt?.seconds ? b.createdAt.seconds : new Date(b.createdAt).getTime() / 1000;
            return timeA - timeB;
        });

        // 3. Group Others by Date
        const groupsMap = new Map<string, WithdrawalGroup>();
        otherItems.forEach(w => {
            const date = w.createdAt?.toDate ? w.createdAt.toDate() : new Date(w.createdAt);
            const dateKey = date.toDateString();

            let group = groupsMap.get(dateKey);
            if (!group) {
                group = {
                    timestamp: new Date(date).setHours(0, 0, 0, 0),
                    items: []
                };
                groupsMap.set(dateKey, group);
            }
            group.items.push(w);
        });

        const sortedDateGroups = Array.from(groupsMap.values())
            .sort((a, b) => b.timestamp - a.timestamp)
            .map(group => {
                const sortedItems = group.items.sort((a, b) => {
                    const timeA = a.createdAt?.seconds ? a.createdAt.seconds : new Date(a.createdAt).getTime() / 1000;
                    const timeB = b.createdAt?.seconds ? b.createdAt.seconds : new Date(b.createdAt).getTime() / 1000;
                    return timeB - timeA; // Newest First for history
                });

                const date = new Date(group.timestamp);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const yesterday = new Date();
                yesterday.setDate(today.getDate() - 1);
                yesterday.setHours(0, 0, 0, 0);

                let label = date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
                if (date.getTime() === today.getTime()) label = "Today";
                else if (date.getTime() === yesterday.getTime()) label = "Yesterday";

                return { label, items: sortedItems };
            });

        // 4. Combine
        const finalGroups = [];
        if (sortedPending.length > 0) {
            finalGroups.push({
                label: "Action Required • Oldest First",
                items: sortedPending,
                isPendingGroup: true
            });
        }
        finalGroups.push(...sortedDateGroups);

        return {
            groupedWithdrawals: finalGroups,
            stats: {
                totalVerified: withdrawals
                    .filter(w => w.status === 'verified' || w.status === 'approved')
                    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0),
                totalPending: withdrawals
                    .filter(w => w.status === 'pending')
                    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0),
                pendingCount: withdrawals.filter(w => w.status === 'pending').length
            }
        };
    }, [withdrawals, searchTerm]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-20 h-20 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-indigo-500/10 animate-pulse"></div>
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin relative z-10" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 flex">
            {/* Confirmation Drawer */}
            {confirmAction && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 transition-all">
                    <div className="w-full max-w-sm bg-white rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl space-y-8 animate-in slide-in-from-bottom duration-300">
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden"></div>
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-24 h-24 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center ring-[12px] ring-indigo-50/50">
                                <ShieldCheck size={48} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 leading-tight">Authorize Payment?</h3>
                            <p className="text-sm text-slate-500 font-medium px-4">
                                Confirming <span className="text-indigo-600 font-black">ETB {Number(confirmAction.data.amount).toLocaleString()}</span> payout for {confirmAction.data.userPhone}.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => handleVerify(confirmAction.data)}
                                disabled={verifying === confirmAction.data.id}
                                className="w-full h-18 rounded-[1.8rem] bg-slate-900 hover:bg-black text-white font-black text-sm uppercase tracking-widest transition-all shadow-2xl active:scale-95 disabled:opacity-50 py-5 flex items-center justify-center gap-3"
                            >
                                {verifying === confirmAction.data.id ? <Loader2 className="animate-spin" size={24} /> : 'Process Payout Now'}
                            </button>
                            <button
                                onClick={() => setConfirmAction(null)}
                                className="w-full h-14 rounded-2xl bg-white text-slate-400 font-bold text-sm tracking-tight hover:bg-slate-50 transition-all mb-4 sm:mb-0"
                            >
                                Cancel Request
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="flex-1 flex flex-col min-h-screen max-w-full overflow-hidden">
                <header className="sticky top-0 bg-white/90 backdrop-blur-3xl px-6 py-6 flex items-center justify-between z-50 border-b border-slate-100/60">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="md:hidden w-14 h-14 rounded-2xl bg-slate-50 border-2 border-slate-100 flex items-center justify-center text-slate-600 active:scale-90 transition-all"
                        >
                            <Menu size={24} strokeWidth={3} />
                        </button>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">Vault Control</h2>
                                {stats.pendingCount > 0 && (
                                    <div className="flex items-center justify-center min-w-[2.2rem] h-9 px-3 bg-red-500 text-white rounded-[1rem] text-xs font-black shadow-lg shadow-red-500/30 animate-bounce">
                                        {stats.pendingCount}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Settlement Engine</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => window.location.reload()}
                            className="w-14 h-14 flex items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 active:rotate-180 transition-all duration-700 shadow-sm"
                        >
                            <RefreshCcw size={22} strokeWidth={2.5} />
                        </button>
                    </div>
                </header>

                <div className="p-4 sm:p-8 space-y-10 max-w-lg mx-auto w-full">
                    {/* Financial Guard Section - Always Visible */}
                    <div className="bg-white rounded-[2.5rem] p-6 border-2 border-indigo-100 shadow-2xl shadow-indigo-500/10 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                <ShieldCheck size={20} />
                            </div>
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Legality Verification</h3>
                        </div>

                        <div className="flex gap-3">
                            <input
                                type="text"
                                placeholder="USER PHONE..."
                                value={checkSearchTerm}
                                onChange={(e) => setCheckSearchTerm(e.target.value)}
                                className="flex-1 h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-500 text-sm font-bold tracking-widest"
                            />
                            <button
                                onClick={handleFinancialCheck}
                                disabled={checkLoading}
                                className="px-6 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
                            >
                                {checkLoading ? <Loader2 className="animate-spin" size={20} /> : 'Check'}
                            </button>
                        </div>

                        {checkResult && (
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <div className={`p-6 rounded-[2rem] flex flex-col items-center gap-2 ${checkResult.isLegal ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    <div className="flex items-center gap-2">
                                        {checkResult.isLegal ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                                        <span className="text-xl font-black uppercase tracking-widest">{checkResult.isLegal ? 'Legal Account' : 'Illegal Activity'}</span>
                                    </div>
                                    <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Verification Status for {checkResult.phone}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Max Legal Withdrawal</p>
                                        <p className="text-lg font-black text-slate-900 tracking-tighter">{Math.floor(checkResult.maxLegalWithdrawal).toLocaleString()} <span className="text-[10px] text-slate-300">ETB</span></p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Balance</p>
                                        <p className="text-lg font-black text-slate-900 tracking-tighter">{checkResult.balance.toLocaleString()} <span className="text-[10px] text-slate-300">ETB</span></p>
                                    </div>
                                </div>

                                <div className="bg-indigo-50/50 p-4 rounded-2xl space-y-2">
                                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                        <span>Product Earnings</span>
                                        <span className="text-slate-900">{checkResult.productIncome.toLocaleString()} ETB</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                        <span>Team Rewards (90%)</span>
                                        <span className="text-slate-900">{checkResult.teamIncome90.toLocaleString()} ETB</span>
                                    </div>
                                    <div className="pt-2 border-t border-indigo-100 flex justify-between text-[10px] font-black text-rose-500 uppercase">
                                        <span>Total Claimed + Balance</span>
                                        <span>{checkResult.liability.toLocaleString()} ETB</span>
                                    </div>
                                </div>

                                {/* Active Products List */}
                                {checkResult.orders?.length > 0 && (
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Active Portfolio</p>
                                        <div className="space-y-2">
                                            {checkResult.orders.map((order: any, idx: number) => {
                                                const purchaseDate = order.purchaseDate?.toDate?.() || new Date(order.purchaseDate);
                                                const daysPassed = Math.floor((new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
                                                return (
                                                    <div key={idx} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex justify-between items-center group hover:border-indigo-200 transition-all">
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-black text-slate-900">{order.productName || 'Product'}</p>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[9px] font-bold text-slate-400">Day {daysPassed}/{order.contractPeriod}</span>
                                                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                                <span className="text-[9px] font-black text-indigo-600">{order.dailyIncome} ETB/Day</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[9px] font-black text-slate-300 uppercase leading-none mb-1">Total Yield</p>
                                                            <p className="text-sm font-black text-emerald-600 tracking-tighter">{(order.dailyIncome * Math.max(0, daysPassed)).toLocaleString()} ETB</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    {/* Visual Stats Block */}
                    <div className="flex gap-4">
                        <div className="flex-1 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col justify-between h-36">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Settled</p>
                                <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none">
                                    {stats.totalVerified > 1000 ? `${(stats.totalVerified / 1000).toPrecision(3)}k` : stats.totalVerified} <span className="text-[10px] text-slate-300">ETB</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex-1 bg-slate-900 p-6 rounded-[2.5rem] shadow-2xl shadow-slate-900/10 flex flex-col justify-between h-36 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
                            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white mb-2 relative z-10">
                                <Clock size={24} className="animate-pulse" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Active Pipeline</p>
                                <p className="text-2xl font-black text-white tracking-tighter leading-none">
                                    {stats.totalPending > 1000 ? `${(stats.totalPending / 1000).toPrecision(3)}k` : stats.totalPending} <span className="text-[10px] text-white/20">ETB</span>
                                </p>
                            </div>
                        </div>
                    </div>



                    <div className="space-y-12 pb-24">
                        {groupedWithdrawals.map(group => (
                            <div key={group.label} className="space-y-6">
                                <div className="flex items-center gap-4 px-2">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${group.label === "Today" ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                        <Calendar size={18} strokeWidth={3} />
                                    </div>
                                    <h3 className={`text-xs font-black uppercase tracking-[0.3em] ${group.label === "Today" ? 'text-slate-900' : 'text-slate-400'}`}>
                                        {group.label}
                                    </h3>
                                    <div className="flex-1 h-[2px] bg-slate-100/50 rounded-full"></div>
                                </div>
                                <div className="space-y-6">
                                    {group.items.map(item => (
                                        <WithdrawalCard
                                            key={item.id}
                                            item={item}
                                            isPending={item.status === 'pending'}
                                            verifying={verifying}
                                            setConfirmAction={setConfirmAction}
                                            copyToClipboard={copyToClipboard}
                                            copiedId={copiedId}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}

                        {groupedWithdrawals.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-32 text-center space-y-6 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                                <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200">
                                    <Banknote size={48} strokeWidth={1} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Vault Empty</p>
                                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">No transactions matched your query</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Sub-component for clarity and re-renders
function WithdrawalCard({ item, isPending, verifying, setConfirmAction, copyToClipboard, copiedId }: {
    item: Withdrawal;
    isPending: boolean;
    verifying: string | null;
    setConfirmAction: (action: { type: 'verify', data: Withdrawal } | null) => void;
    copyToClipboard: (text: string, id: string, message?: string) => void;
    copiedId: string | null;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedAccountNumber, setEditedAccountNumber] = useState(item.bankDetails?.accountNumber || "");
    const [editedHolderName, setEditedHolderName] = useState(item.bankDetails?.holderName || "");
    const [isUpdating, setIsUpdating] = useState(false);

    const handleUpdateDetails = async () => {
        if (!editedAccountNumber || !editedHolderName) {
            toast.error("Both fields are required");
            return;
        }

        setIsUpdating(true);
        try {
            const bankQ = query(collection(db, "Bank"), where("uid", "==", item.userId));
            const bankSnap = await getDocs(bankQ);

            await runTransaction(db, async (transaction) => {
                const withdrawalRef = doc(db, "Withdrawals", item.id);
                transaction.update(withdrawalRef, {
                    "bankDetails.accountNumber": editedAccountNumber,
                    "bankDetails.holderName": editedHolderName
                });

                if (!bankSnap.empty) {
                    const bankDocRef = doc(db, "Bank", bankSnap.docs[0].id);
                    transaction.update(bankDocRef, {
                        accountNumber: editedAccountNumber,
                        holderName: editedHolderName
                    });
                }
            });

            toast.success("Details updated & synced!");
            setIsEditing(false);
        } catch (error) {
            console.error("Update error:", error);
            toast.error("Failed to update details");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div
            className={`relative rounded-[3rem] overflow-hidden transition-all duration-700 animate-in fade-in slide-in-from-bottom-4 shadow-2xl border-2
                ${isPending
                    ? 'bg-amber-50 border-amber-300 shadow-amber-200/40'
                    : 'bg-white border-emerald-200 shadow-slate-200/50'}
            `}
        >
            {/* Top Accent Line (Boundary) */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${isPending ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>

            <div className="absolute top-4 right-8 z-20 flex gap-2">
                {isEditing ? (
                    <>
                        <button
                            onClick={handleUpdateDetails}
                            disabled={isUpdating}
                            className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all disabled:opacity-50"
                        >
                            {isUpdating ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        </button>
                        <button
                            onClick={() => {
                                setIsEditing(false);
                                setEditedAccountNumber(item.bankDetails?.accountNumber);
                                setEditedHolderName(item.bankDetails?.holderName);
                            }}
                            className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all"
                        >
                            <X size={18} />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="w-10 h-10 rounded-xl bg-white text-slate-400 border border-slate-100 flex items-center justify-center shadow-sm hover:text-indigo-600 active:scale-90 transition-all"
                    >
                        <Edit3 size={18} />
                    </button>
                )}
            </div>

            {isPending && !isEditing && <div className="absolute inset-0 bg-white/40 pointer-events-none"></div>}

            <div className="relative p-7 space-y-7 z-10">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border shadow-sm
                                ${isPending ? 'bg-amber-100 text-amber-700 border-amber-300/50' : 'bg-emerald-50 text-emerald-700 border-emerald-200/50'}`}>
                                {isPending ? '🔴 Action Required' : '🟢 Verified'}
                            </span>
                        </div>
                        <div className="flex items-baseline gap-1 mt-3">
                            <span className={`text-5xl font-black tracking-tighter ${isPending ? 'text-slate-900' : 'text-emerald-600'}`}>
                                {Number(item.actualReceipt).toLocaleString()}
                            </span>
                            <span className="text-xs font-black text-slate-300">ETB</span>
                        </div>
                    </div>

                    <div className="w-16 h-16 rounded-[1.8rem] bg-white shadow-2xl flex items-center justify-center border border-slate-100 p-2">
                        {item.bankDetails?.bankLogoUrl ? (
                            <img src={item.bankDetails.bankLogoUrl} alt="Bank" className="w-full h-full object-contain rounded-xl" />
                        ) : (
                            <Banknote className="text-slate-200" size={32} />
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => copyToClipboard(item.userPhone, item.id + '_phone', "Phone Number Copied")}
                        className="bg-white/60 backdrop-blur-xl rounded-[1.8rem] p-5 border border-white/80 shadow-sm transition-all hover:bg-white text-left group/phone active:scale-95"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Phone size={12} className="text-indigo-400" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile</span>
                            </div>
                            <div className={`transition-all ${copiedId === item.id + '_phone' ? 'text-emerald-500' : 'text-slate-300 opacity-0 group-hover/phone:opacity-100'}`}>
                                {copiedId === item.id + '_phone' ? <Check size={14} strokeWidth={3} /> : <Copy size={12} />}
                            </div>
                        </div>
                        <p className="text-sm font-black text-slate-900 leading-none">{item.userPhone}</p>
                    </button>
                    <div className="bg-white/60 backdrop-blur-xl rounded-[1.8rem] p-5 border border-white/80 shadow-sm transition-all hover:bg-white min-h-[5.5rem] flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-2">
                            <User size={12} className="text-indigo-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client</span>
                        </div>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editedHolderName}
                                onChange={(e) => setEditedHolderName(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-black uppercase text-slate-900 focus:outline-none focus:border-indigo-500"
                                placeholder="Holder Name"
                            />
                        ) : (
                            <p className="text-xs font-black text-slate-800 leading-none truncate uppercase tracking-tighter">{item.bankDetails?.holderName}</p>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Vault</span>
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter bg-indigo-50 px-3 py-1 rounded-lg">{item.bankDetails?.bankName}</span>
                    </div>
                    {isEditing ? (
                        <div className="w-full bg-slate-900 rounded-[1.8rem] p-6 shadow-2xl">
                            <input
                                type="text"
                                value={editedAccountNumber}
                                onChange={(e) => setEditedAccountNumber(e.target.value)}
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-lg font-mono font-black text-indigo-400 tracking-[0.25em] focus:outline-none focus:border-indigo-500"
                                placeholder="Account Number"
                            />
                        </div>
                    ) : (
                        <button
                            onClick={() => copyToClipboard(item.bankDetails?.accountNumber, item.id)}
                            className="w-full bg-slate-900 rounded-[1.8rem] p-6 flex items-center justify-between group overflow-hidden relative shadow-2xl active:scale-95 transition-all"
                        >
                            <span className="text-lg font-mono font-black text-indigo-400 tracking-[0.25em] drop-shadow-sm">
                                {item.bankDetails?.accountNumber}
                            </span>
                            <div className={`p-3 rounded-2xl transition-all ${copiedId === item.id ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/40'}`}>
                                {copiedId === item.id ? <Check size={18} strokeWidth={3} /> : <Copy size={18} strokeWidth={2.5} />}
                            </div>
                        </button>
                    )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100/50">
                    <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-300" />
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">
                            {(() => {
                                try {
                                    const date = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
                                    if (isNaN(date.getTime())) return "Unknown Date";
                                    return `${date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} • ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
                                } catch (e) {
                                    return "Unknown Date";
                                }
                            })()}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Fee Deduced</p>
                            <p className="text-xs font-black text-red-500 tracking-tighter leading-none">-{Number(item.fee).toLocaleString()} ETB</p>
                        </div>
                    </div>
                </div>

                {isEditing ? (
                    <div className="flex gap-3">
                        <button
                            onClick={handleUpdateDetails}
                            disabled={isUpdating}
                            className="flex-1 h-18 rounded-[2rem] bg-emerald-600 text-white font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-2xl shadow-emerald-500/20 py-5 active:scale-95 disabled:opacity-50"
                        >
                            {isUpdating ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                            Save Modifications
                        </button>
                    </div>
                ) : isPending ? (
                    <button
                        onClick={() => setConfirmAction({ type: 'verify', data: item })}
                        disabled={verifying === item.id}
                        className="w-full h-18 rounded-[2rem] bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 shadow-2xl shadow-indigo-600/30 transition-all group active:scale-95 py-5"
                    >
                        {verifying === item.id ? (
                            <Loader2 className="animate-spin" size={24} />
                        ) : (
                            <>Authorize & Release <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" strokeWidth={3} /></>
                        )}
                    </button>
                ) : (
                    <div className="w-full h-18 rounded-[2rem] bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center gap-4 py-5 shadow-sm">
                        <ShieldCheck className="text-emerald-600" size={24} strokeWidth={2.5} />
                        <span className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em]">Settlement Authenticated</span>
                    </div>
                )}
            </div>
        </div>
    );
}
