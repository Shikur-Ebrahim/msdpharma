"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import {
    Menu,
    ArrowLeft,
    Loader2,
    Lock,
    Key,
    Smartphone,
    CheckCircle2,
    AlertCircle
} from "lucide-react";
import { toast } from "sonner";

export default function ResetPasswordPage() {
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [phoneNumber, setPhoneNumber] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!phoneNumber.trim()) {
            toast.error("Please enter a phone number");
            return;
        }

        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setLoading(true);

        try {
            // Ensure phone number starts with + if specific format required, or send as is
            // Standardizing to include + if missing, assuming standard format
            let formattedPhone = phoneNumber.trim();
            if (!formattedPhone.startsWith("+")) {
                formattedPhone = "+" + formattedPhone;
            }

            const response = await fetch("/api/admin/reset-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    phoneNumber: formattedPhone,
                    newPassword: newPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to reset password");
            }

            toast.success("Password reset successfully!");
            setPhoneNumber("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            console.error("Reset error:", error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="flex-1 flex flex-col min-h-screen w-full text-slate-900">
                {/* Header */}
                <header className="sticky top-0 bg-white/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between z-40 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="md:hidden w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600"
                        >
                            <Menu size={20} />
                        </button>
                        <button
                            onClick={() => router.back()}
                            className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex flex-col">
                            <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                                Reset Password
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                Force User Credential Update
                            </p>
                        </div>
                    </div>
                </header>

                <main className="p-4 sm:p-8 max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center">
                    <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 border border-slate-100 shadow-xl shadow-slate-200/50">
                        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-6 mx-auto">
                            <Lock size={32} />
                        </div>

                        <h3 className="text-2xl font-black text-center text-slate-900 mb-2">Manual Password Override</h3>
                        <p className="text-center text-slate-500 text-sm mb-10 max-w-xs mx-auto">
                            Enter the user's phone number and the new password you wish to set for them.
                        </p>

                        <form onSubmit={handleReset} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">User Phone Number</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                        <Smartphone size={18} />
                                    </div>
                                    <input
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        placeholder="+251..."
                                        className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 font-bold text-slate-900 placeholder:text-slate-300 transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">New Password</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                            <Key size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Min 6 chars"
                                            className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 font-bold text-slate-900 placeholder:text-slate-300 transition-all"
                                            required
                                            minLength={6}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Confirm Password</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                            <Key size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm"
                                            className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 font-bold text-slate-900 placeholder:text-slate-300 transition-all"
                                            required
                                            minLength={6}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-14 bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-rose-600 active:scale-[0.98] transition-all disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
                                >
                                    {loading ? (
                                        <Loader2 className="animate-spin" size={20} />
                                    ) : (
                                        <>
                                            <CheckCircle2 size={20} />
                                            <span>Update Credentials</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>

                        <div className="mt-8 pt-8 border-t border-slate-100">
                            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                <AlertCircle className="text-amber-500 flex-shrink-0" size={20} />
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-amber-600 mb-1">Security Warning</h4>
                                    <p className="text-xs text-amber-700/80 leading-relaxed font-medium">
                                        This action immediately invalidates the user's current password. Ensure you are resetting the password for the correct user. This action cannot be undone.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
