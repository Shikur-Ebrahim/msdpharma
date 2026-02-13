"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import {
    Search,
    Loader2,
    Menu,
    RefreshCcw,
    Users,
    Phone,
    Wallet,
    Calendar,
    ShieldAlert,
    Key,
    Lock,
    CheckCircle2,
    AlertCircle,
    Eye,
    EyeOff
} from "lucide-react";
import { toast } from "sonner";

export default function ResetPasswordPage() {
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    // Search States
    const [searchPhone, setSearchPhone] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResult, setSearchResult] = useState<any>(null);

    // Password States
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            const isMaster = localStorage.getItem("admin_session") === "true";
            if (!user && !isMaster) {
                router.push("/");
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const handleSearch = async () => {
        if (!searchPhone.trim()) {
            toast.error("Please enter a phone number");
            return;
        }

        setIsSearching(true);
        setSearchResult(null);
        setNewPassword("");
        setConfirmPassword("");

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

    const handleResetPassword = async () => {
        if (!newPassword || !confirmPassword) {
            toast.error("Please enter both password fields");
            return;
        }

        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters long");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setIsResetting(true);

        try {
            const response = await fetch("/api/admin/reset-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    phoneNumber: searchResult.phoneNumber,
                    newPassword: newPassword,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("Password reset successfully!");
                setNewPassword("");
                setConfirmPassword("");
                setSearchResult(null);
                setSearchPhone("");
            } else {
                toast.error(data.error || "Failed to reset password");
            }
        } catch (error) {
            console.error("Reset error:", error);
            toast.error("Failed to reset password. Please try again.");
        } finally {
            setIsResetting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600" size={40} />
            </div>
        );
    }

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
                                Password Reset
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                User Credential Management
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push("/admin/settings")}
                            className="px-6 h-12 flex items-center justify-center rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                        >
                            Back to Settings
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                        >
                            <RefreshCcw size={20} />
                        </button>
                    </div>
                </header>

                <main className="p-3 sm:p-8 max-w-4xl mx-auto w-full">
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* User Search Section */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-lg shadow-purple-900/20">
                                    <Search size={20} />
                                </div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Find User Account</h3>
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
                                            className="w-full h-16 pl-14 pr-6 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-purple-400 focus:bg-white transition-all text-sm font-bold tracking-widest text-slate-900"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSearch}
                                        disabled={isSearching}
                                        className="w-full sm:w-auto px-10 h-16 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
                                    >
                                        {isSearching ? <Loader2 className="animate-spin" size={20} /> : "Search User"}
                                    </button>
                                </div>

                                {searchResult && (
                                    <div className="animate-in slide-in-from-top-4 duration-500 overflow-hidden border-2 border-purple-50 rounded-[2rem]">
                                        <div className="bg-gradient-to-br from-purple-50 to-white p-6 sm:p-10">
                                            <div className="flex items-center gap-5 mb-8">
                                                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg text-purple-600 ring-4 ring-white/50">
                                                    <Users size={32} />
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase mb-1">{searchResult.phoneNumber}</p>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Account Found</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8 pb-8 border-b border-purple-100/50">
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

                                            {/* Password Reset Form */}
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                                                        <Key size={16} />
                                                    </div>
                                                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Reset Login Password</h4>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                                            <Lock size={20} className="text-slate-300" />
                                                        </div>
                                                        <input
                                                            type={showPassword ? "text" : "password"}
                                                            placeholder="Enter new password..."
                                                            value={newPassword}
                                                            onChange={(e) => setNewPassword(e.target.value)}
                                                            className="w-full h-14 pl-14 pr-14 bg-white border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-purple-400 transition-all text-sm font-bold text-slate-900"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            className="absolute inset-y-0 right-0 pr-6 flex items-center text-slate-400 hover:text-purple-600"
                                                        >
                                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                        </button>
                                                    </div>

                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                                            <Lock size={20} className="text-slate-300" />
                                                        </div>
                                                        <input
                                                            type={showConfirmPassword ? "text" : "password"}
                                                            placeholder="Confirm new password..."
                                                            value={confirmPassword}
                                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                                            onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
                                                            className="w-full h-14 pl-14 pr-14 bg-white border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-purple-400 transition-all text-sm font-bold text-slate-900"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                            className="absolute inset-y-0 right-0 pr-6 flex items-center text-slate-400 hover:text-purple-600"
                                                        >
                                                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                        </button>
                                                    </div>

                                                    {newPassword && (
                                                        <div className="flex items-center gap-2 px-4">
                                                            {newPassword.length >= 6 ? (
                                                                <>
                                                                    <CheckCircle2 size={16} className="text-emerald-500" />
                                                                    <span className="text-xs font-bold text-emerald-600">Password meets requirements</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <AlertCircle size={16} className="text-amber-500" />
                                                                    <span className="text-xs font-bold text-amber-600">Password must be at least 6 characters</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}

                                                    <button
                                                        onClick={handleResetPassword}
                                                        disabled={isResetting || !newPassword || !confirmPassword}
                                                        className="w-full h-16 bg-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-purple-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                                    >
                                                        {isResetting ? (
                                                            <Loader2 className="animate-spin" size={20} />
                                                        ) : (
                                                            <>
                                                                <Key size={20} />
                                                                <span>Reset Password Now</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Info Section */}
                        <section className="bg-purple-50 rounded-[2rem] p-6 border border-purple-100">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0">
                                    <AlertCircle size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-900 mb-2">Important Information</h4>
                                    <ul className="space-y-1 text-xs text-slate-600">
                                        <li>• Password must be at least 6 characters long</li>
                                        <li>• User will be able to login immediately with the new password</li>
                                        <li>• Previous password will be permanently replaced</li>
                                        <li>• User will not be notified of this password change</li>
                                    </ul>
                                </div>
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}
