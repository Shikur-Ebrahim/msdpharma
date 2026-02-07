"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";
import { ChevronLeft, Lock, Eye, EyeOff, Shield, CheckCircle2, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { translations, Language } from "@/lib/translations";

export default function ChangePasswordPage() {
    const router = useRouter();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
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

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!currentPassword || !newPassword || !confirmPassword) {
                toast.error(t.allFieldsRequired);
                setLoading(false);
                return;
            }

            if (newPassword.length < 6) {
                toast.error(t.passwordMinLength);
                setLoading(false);
                return;
            }

            if (newPassword !== confirmPassword) {
                toast.error(t.passwordsDoNotMatch);
                setLoading(false);
                return;
            }

            const user = auth.currentUser;
            if (!user || !user.email) {
                toast.error(t.sessionExpired);
                router.push("/");
                return;
            }

            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);

            await addDoc(collection(db, "UserNotifications"), {
                userId: user.uid,
                type: "security_update",
                message: t.passwordChangedSuccess,
                createdAt: new Date(),
                read: false
            });

            setSuccess(true);
            toast.success(t.passwordUpdated);

            setTimeout(() => {
                router.push("/users/profile");
            }, 3000);

        } catch (error: any) {
            console.error("Password update error:", error);
            if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
                toast.error(t.invalidCurrentPassword);
            } else {
                toast.error(t.genericError);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white text-blue-900 font-sans selection:bg-blue-100 flex flex-col relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-50/50 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-50/30 blur-[100px] rounded-full"></div>
            </div>

            {/* Success Overlay */}
            <AnimatePresence>
                {success && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-2xl flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="w-full max-w-sm bg-white rounded-[3rem] p-12 border border-blue-50 shadow-3xl text-center space-y-8 relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div>

                            <div className="w-28 h-28 rounded-full bg-green-50 flex items-center justify-center mx-auto relative">
                                <CheckCircle2 size={56} className="text-green-600" strokeWidth={2.5} />
                            </div>

                            <div className="space-y-3">
                                <h2 className="text-3xl font-bold text-blue-900 leading-none">{t.passwordChangedTitle}</h2>
                                <p className="text-sm font-semibold text-green-600">{t.success}</p>
                            </div>

                            <p className="text-sm text-blue-900/60 leading-relaxed px-4">
                                {t.passwordUpdateRedirect}
                            </p>

                            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" strokeWidth={3} />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-3xl px-6 h-20 flex items-center justify-between border-b border-blue-50 max-w-lg mx-auto w-full">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="w-11 h-11 rounded-2xl bg-white hover:bg-blue-50 flex items-center justify-center transition-all border border-blue-100 active:scale-90 group shadow-sm"
                    >
                        <ChevronLeft size={22} className="text-blue-900 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-lg font-bold text-blue-900 leading-none">{t.changePassword}</h1>
                        <span className="text-[10px] font-medium text-blue-900/40 mt-1">{t.updateAccountPassword}</span>
                    </div>
                </div>
                <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
                    <Shield size={24} strokeWidth={2.5} />
                </div>
            </header>

            <main className="px-6 py-10 max-w-lg mx-auto w-full relative z-10 flex-1 overflow-y-auto">
                {/* Info Card */}
                <div className="mb-10 bg-blue-900 p-8 rounded-[2.5rem] shadow-2xl shadow-blue-900/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-16 -mt-16"></div>
                    <div className="flex items-start gap-6 relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white flex-shrink-0 border border-white/10 backdrop-blur-md">
                            <KeyRound size={28} strokeWidth={2.5} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-white/60">{t.securityRules}</h3>
                            <p className="text-xs text-white/40 leading-relaxed">
                                {t.passwordSecurityDesc}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Password Change Form */}
                <form onSubmit={handleChangePassword} className="space-y-8 pb-32">
                    {/* Inputs */}
                    {[
                        { label: t.currentPassword, value: currentPassword, setter: setCurrentPassword, show: showCurrentPassword, setShow: setShowCurrentPassword, placeholder: t.enterCurrentPassword },
                        { label: t.newPassword, value: newPassword, setter: setNewPassword, show: showNewPassword, setShow: setShowNewPassword, placeholder: t.enterNewPassword },
                        { label: t.confirmNewPassword, value: confirmPassword, setter: setConfirmPassword, show: showConfirmPassword, setShow: setShowConfirmPassword, placeholder: t.enterNewPasswordAgain }
                    ].map((field, i) => (
                        <div key={i} className="space-y-3">
                            <label className="text-sm font-medium text-blue-900/60 pl-2">
                                {field.label}
                            </label>
                            <div className="relative group/input">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-900/20 group-focus-within/input:text-blue-600 transition-colors">
                                    <Lock size={20} />
                                </div>
                                <input
                                    type={field.show ? "text" : "password"}
                                    value={field.value}
                                    onChange={(e) => field.setter(e.target.value)}
                                    placeholder={field.placeholder}
                                    className="w-full h-18 pl-14 pr-14 rounded-[1.5rem] bg-blue-50 border border-blue-100 focus:border-blue-300 focus:bg-white focus:outline-none text-blue-900 text-sm font-bold transition-all shadow-inner placeholder:text-blue-900/10"
                                />
                                <button
                                    type="button"
                                    onClick={() => field.setShow(!field.show)}
                                    className="absolute right-6 top-1/2 -translate-y-1/2 text-blue-900/20 hover:text-blue-600 transition-colors"
                                >
                                    {field.show ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Requirements */}
                    <div className="bg-white rounded-[2rem] p-8 border border-blue-50 shadow-inner space-y-5">
                        <span className="text-[11px] font-bold text-blue-900/20 block mb-2">{t.passwordRequirements}</span>
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                { met: newPassword.length >= 6, text: t.atLeast6Chars },
                                { met: newPassword && confirmPassword && newPassword === confirmPassword, text: t.passwordsMatch },
                                { met: newPassword && currentPassword && newPassword !== currentPassword, text: t.diffFromCurrent }
                            ].map((req, idx) => (
                                <div key={idx} className={`flex items-center gap-4 transition-all duration-500 ${req.met ? 'translate-x-1' : 'opacity-40'}`}>
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${req.met ? 'bg-green-50 border-green-200 text-green-600' : 'border-blue-100 text-blue-900/20'}`}>
                                        <CheckCircle2 size={12} strokeWidth={3} />
                                    </div>
                                    <span className={`text-xs font-semibold ${req.met ? 'text-blue-900' : 'text-blue-900/40'}`}>{req.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-18 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3 active:scale-[0.98] text-base"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={24} className="animate-spin" strokeWidth={2.5} />
                                <span className="animate-pulse">{t.saving}</span>
                            </>
                        ) : (
                            <>
                                <Shield size={22} strokeWidth={2.5} />
                                <span>{t.changePassword}</span>
                            </>
                        )}
                    </button>
                </form>
            </main>
        </div>
    );
}
