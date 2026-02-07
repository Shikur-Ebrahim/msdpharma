"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
    collection,
    onSnapshot,
    query,
    where,
    doc,
    updateDoc,
    deleteDoc,
    increment,
    runTransaction,
    Timestamp,
    getDoc,
    getDocs,
    deleteField
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    Loader2,
    RefreshCcw,
    ArrowLeft,
    ShieldCheck,
    Menu,
    Image as ImageIcon,
    Maximize2,
    X,
    User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AdminSidebar from "@/components/AdminSidebar";
import { toast } from "sonner";

export default function RechargeVerificationPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [verifying, setVerifying] = useState<string | null>(null);
    const [recharges, setRecharges] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [vipRules, setVipRules] = useState<any[]>([]);
    const [confirmAction, setConfirmAction] = useState<{ type: 'verify' | 'reject', data: any } | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [userPhones, setUserPhones] = useState<{ [key: string]: string }>({});

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
            collection(db, "RechargeReview"),
            where("status", "in", ["Under Review", "verified"])
        );

        // Fetch VIP Rules once
        const fetchVipRules = async () => {
            const snap = await getDocs(collection(db, "VipRules"));
            setVipRules(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        fetchVipRules();

        const unsubscribeRecharges = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Extract unique userIds that aren't in our map yet
            const uids = Array.from(new Set(data.map((r: any) => r.userId))).filter(uid => uid && !userPhones[uid]);

            if (uids.length > 0) {
                uids.forEach(async (uid) => {
                    const userSnap = await getDoc(doc(db, "users", uid));
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        setUserPhones(prev => ({ ...prev, [uid]: userData.phoneNumber || "Unknown" }));
                    }
                });
            }

            const sortedData = data.sort((a: any, b: any) => {
                // Primary Sort: Status "Under Review" comes first
                if (a.status === 'Under Review' && b.status !== 'Under Review') return -1;
                if (a.status !== 'Under Review' && b.status === 'Under Review') return 1;

                // Secondary Sort: Newest timestamp first
                const timeA = a.timestamp?.toMillis?.() || 0;
                const timeB = b.timestamp?.toMillis?.() || 0;
                return timeB - timeA;
            });
            setRecharges(sortedData);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeRecharges();
        };
    }, [router]);

    const handleVerify = async (recharge: any) => {
        if (verifying) return;
        setVerifying(recharge.id);
        setConfirmAction(null);

        try {
            await runTransaction(db, async (transaction) => {
                let userDocRef = doc(db, "users", recharge.userId);
                let userDocSnap = await transaction.get(userDocRef);

                // Fallback: If UID lookup fails, try phone number
                if (!userDocSnap.exists()) {
                    console.log("UID lookup failed, trying phone number fallback...");
                    const q = query(collection(db, "users"), where("phoneNumber", "==", recharge.phoneNumber));
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        userDocRef = doc(db, "users", snap.docs[0].id);
                        userDocSnap = await transaction.get(userDocRef);
                    }
                }

                if (!userDocSnap.exists()) {
                    throw new Error("User does not exist!");
                }

                const userData = userDocSnap.data();
                const amount = Number(recharge.amount);

                // 2. Fetch Referral Settings (Dynamic)
                const settingsSnap = await transaction.get(doc(db, "settings", "referral"));
                const defaults = { levelA: 12, levelB: 7, levelC: 4, levelD: 2 };
                const dbRates = settingsSnap.exists() ? settingsSnap.data() : {};
                const rates = { ...defaults, ...dbRates };

                const pctA = Number(rates.levelA) / 100;
                const pctB = Number(rates.levelB) / 100;
                const pctC = Number(rates.levelC) / 100;
                const pctD = Number(rates.levelD) / 100;

                const inviterUids = [
                    { uid: userData.inviterA, pct: pctA },
                    { uid: userData.inviterB, pct: pctB },
                    { uid: userData.inviterC, pct: pctC },
                    { uid: userData.inviterD, pct: pctD }
                ].filter(i => i.uid);

                const inviterRefs = inviterUids.map(i => ({
                    ref: doc(db, "users", i.uid),
                    pct: i.pct
                }));

                const inviterSnaps = await Promise.all(inviterRefs.map(i => transaction.get(i.ref)));
                const isFirstRecharge = (userData.totalRecharge || 0) === 0;

                // 3. Update User
                transaction.update(userDocRef, {
                    totalRecharge: increment(amount),
                    Recharge: increment(amount)
                });

                // Update Recharge Status
                const rechargeRef = doc(db, "RechargeReview", recharge.id);
                transaction.update(rechargeRef, {
                    status: "verified",
                    verifiedAt: Timestamp.now(),
                    screenshotUrl: deleteField()
                });

                // Update Inviters
                inviterSnaps.forEach((snap, index) => {
                    if (snap.exists()) {
                        const { ref, pct } = inviterRefs[index];
                        const inviterData = snap.data();
                        const inviterUpdate: any = {
                            teamAssets: increment(amount)
                        };

                        if (isFirstRecharge) {
                            const bonus = amount * pct;
                            inviterUpdate.teamIncome = increment(bonus);
                            inviterUpdate.investedTeamSize = increment(1);

                            // VIP Eligibility Check
                            const currentInvestedSize = (inviterData.investedTeamSize || 0) + 1;
                            const currentTeamAssets = (inviterData.teamAssets || 0) + amount;
                            const currentVip = inviterData.vip ?? 0;
                            const currentVipNum = typeof currentVip === 'number' ? currentVip : parseInt(currentVip.toString().replace(/\D/g, '') || "0");
                            const nextVipNum = currentVipNum + 1;

                            const nextRule = vipRules.find(r => parseInt(r.level?.replace(/\D/g, '') || "0") === nextVipNum);
                            if (nextRule && currentInvestedSize >= (Number(nextRule.investedTeamSize) || 0) && currentTeamAssets >= (Number(nextRule.totalTeamAssets) || 0)) {
                                inviterUpdate.isVipEligible = true;
                            }

                            // Notification
                            const levelLabels = ["Level A", "Level B", "Level C", "Level D"];
                            const notifRef = doc(collection(db, "UserNotifications"));
                            transaction.set(notifRef, {
                                userId: snap.id,
                                type: "reward",
                                amount: bonus.toFixed(2),
                                level: levelLabels[index],
                                message: `Reward received: ${bonus.toFixed(2)} ETB from ${levelLabels[index]}.`,
                                fromUser: userData.phoneNumber || "A team member",
                                createdAt: Timestamp.now(),
                                read: false
                            });
                        } else {
                            const currentInvestedSize = inviterData.investedTeamSize || 0;
                            const currentTeamAssets = (inviterData.teamAssets || 0) + amount;
                            const currentVip = inviterData.vip ?? 0;
                            const currentVipNum = typeof currentVip === 'number' ? currentVip : parseInt(currentVip.toString().replace(/\D/g, '') || "0");
                            const nextVipNum = currentVipNum + 1;

                            const nextRule = vipRules.find(r => parseInt(r.level?.replace(/\D/g, '') || "0") === nextVipNum);
                            if (nextRule && currentInvestedSize >= (Number(nextRule.investedTeamSize) || 0) && currentTeamAssets >= (Number(nextRule.totalTeamAssets) || 0)) {
                                inviterUpdate.isVipEligible = true;
                            }
                        }
                        transaction.update(ref, inviterUpdate);
                    }
                });
            });

            toast.success(`Verified ETB ${recharge.amount} & Distributed Rewards`);
        } catch (error: any) {
            console.error("Verification error:", error);
            toast.error(error.message === "User does not exist!" ? "User not found in database" : "Failed to verify transaction");
        } finally {
            setVerifying(null);
        }
    };

    const handleReject = async (id: string) => {
        setVerifying(id);
        setConfirmAction(null);
        try {
            await deleteDoc(doc(db, "RechargeReview", id));
            toast.info("Record permanently deleted");
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Error deleting record");
        } finally {
            setVerifying(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                <span className="text-slate-500 font-bold text-sm tracking-tight">Initializing...</span>
            </div>
        );
    }

    const filteredRecharges = recharges.filter(r =>
        r.phoneNumber?.includes(searchTerm) ||
        r.FTcode?.includes(searchTerm) ||
        r.screenshotUrl?.includes(searchTerm)
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-100 overflow-x-hidden relative flex">
            {/* Image Preview Modal */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex flex-col items-center justify-center p-4"
                        onClick={() => setSelectedImage(null)}
                    >
                        <motion.button
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                        >
                            <X size={24} />
                        </motion.button>
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="relative max-w-4xl w-full h-[80vh] flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img
                                src={selectedImage}
                                alt="Payment Verification"
                                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl shadow-black/50"
                            />
                        </motion.div>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-white/60 font-medium mt-6 text-sm flex items-center gap-2"
                        >
                            Click anywhere outside to close
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Confirmation Modal */}
            {confirmAction && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-6 transition-all">
                    <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl space-y-8 border border-white/40">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center ${confirmAction.type === 'verify' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'} shadow-sm`}>
                                {confirmAction.type === 'verify' ? <CheckCircle2 size={40} /> : <XCircle size={40} />}
                            </div>
                            <h3 className="text-xl font-black text-slate-900 leading-tight">
                                {confirmAction.type === 'verify' ? 'Confirm Verification' : 'Permanently Delete?'}
                            </h3>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                {confirmAction.type === 'verify'
                                    ? `Authorize deposit of ETB ${Number(confirmAction.data.amount).toLocaleString()}?`
                                    : "This action will permanently remove the record from the database."
                                }
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setConfirmAction(null)}
                                className="h-14 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm tracking-tight hover:bg-slate-200 transition-all border border-slate-200/50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => confirmAction.type === 'verify' ? handleVerify(confirmAction.data) : handleReject(confirmAction.data.id)}
                                disabled={verifying === confirmAction.data.id}
                                className={`h-14 rounded-2xl text-white font-bold text-sm transition-all shadow-lg ${confirmAction.type === 'verify' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : 'bg-red-600 hover:bg-red-700 shadow-red-500/20'} disabled:opacity-50`}
                            >
                                {verifying === confirmAction.data.id ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="flex-1 flex flex-col min-h-screen max-w-full overflow-hidden">
                <header className="sticky top-0 bg-white/80 backdrop-blur-xl px-4 lg:px-10 py-5 flex items-center justify-between z-50 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="md:hidden w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-90"
                        >
                            <Menu size={20} />
                        </button>
                        <div className="flex flex-col">
                            <h2 className="text-lg lg:text-xl font-black text-slate-900 tracking-tight leading-none">Transactions</h2>
                            <p className="text-[10px] font-bold text-slate-400 mt-1">Verification Queue</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl items-center gap-2">
                            <Clock size={16} className="text-blue-600" />
                            <span className="text-[11px] font-black text-blue-600">Pending: {recharges.filter(r => r.status === 'Under Review').length}</span>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all active:rotate-180 duration-500"
                        >
                            <RefreshCcw size={18} />
                        </button>
                    </div>
                </header>

                <div className="p-4 lg:p-10 space-y-6 max-w-4xl mx-auto w-full">
                    {/* Financial Summary Dashboard */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-emerald-100/50 to-white/50 backdrop-blur-3xl border border-emerald-100/50 p-6 rounded-[2.5rem] shadow-[0_15px_30px_-10px_rgba(16,185,129,0.1)] flex flex-col gap-1 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:scale-125 group-hover:rotate-12 transition-all duration-700">
                                <CheckCircle2 size={60} className="text-emerald-500" />
                            </div>
                            <p className="text-[10px] font-black text-emerald-600 mb-2 drop-shadow-sm">Total Revenue</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-slate-900 tracking-tighter">
                                    {recharges.filter(r => r.status === 'verified').reduce((acc, curr) => acc + Number(curr.amount), 0).toLocaleString()}
                                </span>
                                <span className="text-[10px] font-black text-slate-400">ETB</span>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-blue-100/50 to-white/50 backdrop-blur-3xl border border-blue-100/50 p-6 rounded-[2.5rem] shadow-[0_15px_30px_-10px_rgba(37,99,235,0.1)] flex flex-col gap-1 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:scale-125 group-hover:-rotate-12 transition-all duration-700">
                                <Clock size={60} className="text-blue-500" />
                            </div>
                            <p className="text-[10px] font-black text-blue-600 mb-2 drop-shadow-sm">Live Pipeline</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-slate-900 tracking-tighter">
                                    {recharges.filter(r => r.status === 'Under Review').reduce((acc, curr) => acc + Number(curr.amount), 0).toLocaleString()}
                                </span>
                                <span className="text-[10px] font-black text-slate-400">ETB</span>
                            </div>
                        </div>
                    </div>

                    {/* Elite Search Component */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                            <Search size={20} className="text-slate-400 group-focus-within:text-blue-600 transition-colors duration-300" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search (phone or FT)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-16 pl-14 pr-6 bg-white/50 backdrop-blur-3xl border border-slate-200/60 rounded-[2rem] focus:outline-none focus:border-blue-500/50 focus:ring-8 focus:ring-blue-500/5 transition-all duration-300 text-sm font-bold shadow-xl shadow-slate-200/50 placeholder:text-slate-400 placeholder:font-black"
                        />
                    </div>

                    <div className="space-y-4">
                        {filteredRecharges.length > 0 ? (
                            filteredRecharges.map((recharge) => (
                                <motion.div
                                    key={recharge.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`relative group rounded-[3rem] p-0.5 transition-all duration-700
                                        ${recharge.status === 'verified'
                                            ? 'bg-gradient-to-br from-emerald-100 via-white to-emerald-50 shadow-[0_15px_30px_-5px_rgba(16,185,129,0.05)]'
                                            : 'bg-gradient-to-br from-blue-100 via-white to-blue-50 shadow-[0_15px_30px_-5px_rgba(37,99,235,0.05)]'}
                                    `}
                                >
                                    <div className="bg-white/80 backdrop-blur-3xl rounded-[2.9rem] p-6 lg:p-10 relative overflow-hidden h-full border border-white/40">
                                        {/* Dynamic Mesh Overlays */}
                                        <div className={`absolute -top-32 -right-32 w-80 h-80 rounded-full blur-[100px] opacity-[0.05] pointer-events-none transition-all duration-1000 group-hover:opacity-[0.1]
                                            ${recharge.status === 'verified' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                                        <div className={`absolute bottom-0 left-0 w-[300px] h-[300px] -ml-32 -mb-32 rounded-full blur-[80px] opacity-[0.05] pointer-events-none transition-all duration-1000 group-hover:opacity-[0.1]
                                            ${recharge.status === 'verified' ? 'bg-emerald-300' : 'bg-blue-300'}`}></div>

                                        <div className="flex flex-col gap-6 relative z-10">
                                            {/* Card Header: User Info & Status */}
                                            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-50">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 transition-colors group-hover:border-blue-100 group-hover:text-blue-500">
                                                        <User size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subscriber</p>
                                                        <p className="text-sm font-black text-slate-900 tracking-tight leading-none mt-0.5">{userPhones[recharge.userId] || 'Terminal ' + recharge.userId?.slice(-4)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest border transition-all duration-500
                                                            ${recharge.status === 'verified'
                                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                                                            : 'bg-amber-50 text-amber-600 border-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.1)]'}`}>
                                                        {recharge.status === 'verified' ? 'SETTLED' : 'AWAITING AUTH'}
                                                    </div>
                                                    <div className="hidden sm:flex items-center gap-1.5 text-[9px] font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                                                        <span>{recharge.timestamp?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Card Content: Screenshot & Financials */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                                {/* Payment Evidence - High Priority */}
                                                <div className="space-y-4">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                        <ImageIcon size={12} className="text-blue-500" />
                                                        Payment Evidence
                                                    </p>
                                                    {recharge.screenshotUrl ? (
                                                        <div
                                                            onClick={() => setSelectedImage(recharge.screenshotUrl)}
                                                            className="relative aspect-video rounded-3xl overflow-hidden bg-slate-100 border-4 border-white shadow-xl cursor-zoom-in group/img transition-transform hover:scale-[1.02]"
                                                        >
                                                            <img
                                                                src={recharge.screenshotUrl}
                                                                className="w-full h-full object-cover transition-transform duration-1000 group-hover/img:scale-110"
                                                                alt="Screenshot"
                                                            />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                                <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30 text-white font-bold text-xs flex items-center gap-2">
                                                                    <Maximize2 size={14} />
                                                                    Preview
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="aspect-video rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 p-6 text-center">
                                                            <XCircle size={32} className="text-slate-300" />
                                                            <div>
                                                                <p className="text-xs font-black text-slate-400 uppercase">Legacy Method</p>
                                                                <p className="text-[10px] font-bold text-slate-400 mt-1 capitalize leading-relaxed">No photo screenshot found. Verify via text/FT code below.</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Request Details */}
                                                <div className="grid grid-cols-1 gap-6">
                                                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4 shadow-sm">
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Authorization Value</p>
                                                            <div className="flex items-baseline gap-2">
                                                                <span className={`text-4xl font-black tracking-tighter transition-all duration-500 ${recharge.status === 'verified' ? 'text-emerald-500' : 'text-blue-600'}`}>
                                                                    {Number(recharge.amount).toLocaleString()}
                                                                </span>
                                                                <span className="text-xs font-black text-slate-400">ETB</span>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200/50">
                                                            <div>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Channel</p>
                                                                <p className="text-xs font-black text-slate-700 uppercase tracking-wider">{recharge.paymentMethod || 'Manual'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Reference</p>
                                                                <p className="text-xs font-mono font-bold text-blue-500 truncate">{recharge.accountNumber || recharge.FTcode?.slice(0, 8) || 'N/A'}...</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* FT Code Box (Scrollable if text) */}
                                                    {recharge.FTcode && (
                                                        <div className="relative group/ft">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Raw Transaction Data</p>
                                                            <div className="bg-white border border-slate-100 p-4 rounded-2xl max-h-24 overflow-y-auto no-scrollbar shadow-sm transition-all group-hover/ft:border-blue-100">
                                                                <p className="text-[11px] font-mono text-slate-500 leading-relaxed break-all">
                                                                    {recharge.FTcode}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Controls */}
                                        <div className="pt-8 border-t border-slate-50 flex items-center gap-4">
                                            {recharge.status !== 'verified' && (
                                                <button
                                                    onClick={() => setConfirmAction({ type: 'reject', data: recharge })}
                                                    disabled={verifying === recharge.id}
                                                    className="h-14 px-8 rounded-2xl bg-white border-2 border-red-50 text-red-600 font-black text-[10px] tracking-widest hover:bg-red-50 hover:border-red-100 transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    Discard Entry
                                                </button>
                                            )}
                                            <button
                                                onClick={() => recharge.status !== 'verified' && setConfirmAction({ type: 'verify', data: recharge })}
                                                disabled={verifying === recharge.id || recharge.status === 'verified'}
                                                className={`flex-1 h-14 rounded-2xl font-black text-[10px] tracking-widest transition-all flex items-center justify-center gap-3 
                                                    ${recharge.status === 'verified'
                                                        ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-100'
                                                        : 'bg-blue-600 text-white shadow-[0_20px_40px_-15px_rgba(37,99,235,0.4)] hover:bg-blue-700 hover:shadow-blue-500/40 active:scale-[0.98] disabled:opacity-30'
                                                    } `}
                                            >
                                                {recharge.status === 'verified' ? (
                                                    <><CheckCircle2 size={18} /> Transaction Cleared</>
                                                ) : verifying === recharge.id ? (
                                                    <Loader2 className="animate-spin" size={18} />
                                                ) : (
                                                    'Validate & Add Credit'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-32 space-y-6 bg-gradient-to-b from-white/50 to-slate-50/20 backdrop-blur-3xl border border-dashed border-slate-200 rounded-[4rem] group hover:border-blue-300/50 transition-all duration-700">
                                <div className="w-24 h-24 bg-white shadow-2xl shadow-slate-200 rounded-[2rem] flex items-center justify-center text-slate-300 group-hover:scale-110 group-hover:rotate-12 transition-all duration-700 border border-slate-50">
                                    <ShieldCheck size={40} className="group-hover:text-blue-500 transition-colors" />
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <p className="text-slate-900 font-black text-xs tracking-widest">Operational Readiness</p>
                                    <p className="text-slate-400 font-bold text-[10px]">No active transactions found in queue</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
