"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
    Lock,
    Loader2,
    CheckCircle2,
    Delete,
    ChevronLeft,
    ShieldCheck,
    Key,
    AlertCircle,
    Fingerprint,
    Shield,
    Activity
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { translations, Language } from "@/lib/translations";

function ChangePasswordContent() {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const focusInput = () => inputRef.current?.focus();
        focusInput();
        window.addEventListener('click', focusInput);
        return () => window.removeEventListener('click', focusInput);
    }, []);

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [step, setStep] = useState<"enter_old" | "create_new" | "confirm_new">("create_new");
    const [input, setInput] = useState("");
    const [tempNew, setTempNew] = useState("");
    const [hasExistingPass, setHasExistingPass] = useState(false);
    const [existingPass, setExistingPass] = useState("");

    const [shake, setShake] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);
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
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push("/");
                return;
            }
            setUser(currentUser);

            const userRef = doc(db, "users", currentUser.uid);
            const docSnap = await getDoc(userRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.withdrawalPassword) {
                    setHasExistingPass(true);
                    setExistingPass(data.withdrawalPassword);
                    setStep("enter_old");
                }
            }
            setLoading(false);
        });

        return () => unsubscribeAuth();
    }, [router]);


    const handleNumClick = (num: string) => {
        if (input.length < 4) {
            setInput(prev => prev + num);
        }
    };

    const handleDelete = () => {
        setInput(prev => prev.slice(0, -1));
    };

    const handleAction = async () => {
        if (input.length !== 4) return;
        setSubmitting(true);
        setErrorMsg("");

        try {
            if (step === "enter_old") {
                if (input === existingPass) {
                    toast.success(t.verified);
                    setStep("create_new");
                    setInput("");
                } else {
                    triggerShake();
                    setErrorMsg(t.invalidPinRetry);
                    setInput("");
                }
                setSubmitting(false);
            } else if (step === "create_new") {
                if (hasExistingPass && input === existingPass) {
                    setErrorMsg(t.newPinDifferent);
                    triggerShake();
                    setInput("");
                    setSubmitting(false);
                    return;
                }
                setTempNew(input);
                setStep("confirm_new");
                setInput("");
                setSubmitting(false);
            } else if (step === "confirm_new") {
                if (input === tempNew) {
                    await updateDoc(doc(db, "users", user.uid), {
                        withdrawalPassword: input
                    });
                    setSubmitting(false);
                    setShowSuccess(true);
                } else {
                    triggerShake();
                    setErrorMsg(t.pinMismatchRetry);
                    setInput("");
                    setSubmitting(false);
                }
            }

        } catch (error) {
            console.error(error);
            toast.error(t.genericError);
            setSubmitting(false);
        }
    };

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 500);
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (showSuccess) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6  relative font-sans overflow-hidden">
                {/* Ambient Background Glow */}
                <div className="fixed inset-0 pointer-events-none z-0">
                    <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-50/50 blur-[120px] rounded-full"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50/30 blur-[100px] rounded-full"></div>
                </div>

                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full max-w-sm bg-white rounded-[2.5rem] p-10 border border-blue-50 shadow-3xl text-center relative z-10 overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600"></div>

                    <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <CheckCircle2 size={48} className="text-blue-600" />
                    </div>

                    <div className="space-y-3">
                        <h2 className="text-2xl font-bold text-blue-900 leading-none">{t.pinUpdatedTitle}</h2>
                        <p className="text-sm text-blue-900/40 leading-relaxed">
                            {t.pinUpdatedDesc}
                        </p>
                    </div>

                    <div className="w-full pt-8">
                        <button
                            onClick={() => router.back()}
                            className="w-full h-14 bg-blue-900 hover:bg-blue-950 text-white rounded-2xl font-bold transition-all active:scale-95"
                        >
                            {t.finish}
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex flex-col items-center p-6 relative font-sans overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-50/50 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50/30 blur-[100px] rounded-full"></div>
            </div>

            {/* Back Button */}
            <button
                onClick={() => router.back()}
                className="absolute top-8 left-8 w-12 h-12 rounded-2xl bg-white shadow-xl shadow-blue-900/5 border border-blue-50 flex items-center justify-center hover:bg-blue-50 transition-all active:scale-95 z-50 text-blue-900"
            >
                <ChevronLeft size={24} />
            </button>

            {/* Header Icon */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mt-20 mb-10 relative"
            >
                <div className="w-24 h-24 bg-white border border-blue-100 rounded-[2.5rem] shadow-2xl shadow-blue-900/5 flex items-center justify-center relative z-10 text-blue-600">
                    <Fingerprint size={42} strokeWidth={1.5} />
                </div>
                <div className="absolute inset-0 bg-blue-500/5 rounded-[2.5rem] blur-2xl animate-pulse"></div>
            </motion.div>

            {/* Title & Instructions */}
            <div className="space-y-2 mb-10 max-w-xs mx-auto relative z-10 text-center">
                <h2 className="text-3xl font-bold text-blue-900 leading-none">
                    {step === "enter_old" ? t.verifyPinTitle : step === "create_new" ? t.createPinTitle : t.confirmPinTitle}
                </h2>
                <p className="text-sm font-medium text-blue-900/40 leading-relaxed px-4">
                    {step === "enter_old" ? t.enterOldPinDesc : step === "create_new" ? t.enterNewPinDesc : t.confirmNewPinDesc}
                </p>
            </div>

            {/* PIN Display */}
            <div className={`flex gap-6 mb-12 relative z-10 ${shake ? "animate-shake bg-red-50 p-6 rounded-[2rem]" : ""}`}>
                {[...Array(4)].map((_, i) => (
                    <div
                        key={i}
                        className={`w-5 h-5 rounded-full transition-all duration-500 border-2 ${i < input.length
                            ? "bg-blue-600 border-blue-700 scale-125 shadow-lg shadow-blue-600/20"
                            : "bg-blue-50 border-blue-100 scale-100"
                            }`}
                    ></div>
                ))}
            </div>

            {/* Error Message */}
            <div className="h-10 mb-8 w-full flex items-center justify-center relative z-10">
                <AnimatePresence>
                    {errorMsg && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="bg-red-50 border border-red-100 text-red-600 px-5 py-2.5 rounded-xl flex items-center gap-2"
                        >
                            <AlertCircle size={14} />
                            <span className="text-xs font-semibold">{errorMsg}</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-x-14 gap-y-10 mb-14 w-full max-w-[340px] relative z-10">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                        key={num}
                        onClick={() => handleNumClick(num.toString())}
                        className="w-16 h-16 rounded-full text-2xl font-bold text-blue-900 hover:bg-blue-50 active:scale-90 transition-all flex items-center justify-center"
                    >
                        {num}
                    </button>
                ))}
                <div className="w-18 h-18"></div>
                <button
                    onClick={() => handleNumClick("0")}
                    className="w-16 h-16 rounded-full text-2xl font-bold text-blue-900 hover:bg-blue-50 active:scale-90 transition-all flex items-center justify-center"
                >
                    0
                </button>
                <button
                    onClick={handleDelete}
                    className="w-18 h-18 rounded-full flex items-center justify-center text-blue-900/20 hover:text-blue-900/40 transition-all active:scale-90"
                >
                    <Delete size={32} />
                </button>
            </div>

            {/* Action Button */}
            <div className="w-full max-w-[320px] relative z-20">
                <button
                    onClick={handleAction}
                    disabled={input.length !== 4 || submitting}
                    className="w-full h-16 bg-blue-900 disabled:opacity-30 disabled:grayscale text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-blue-900/10"
                >
                    {submitting ? (
                        <Loader2 className="animate-spin" size={20} />
                    ) : (
                        <>
                            <Shield size={20} />
                            <span>{t.confirmPinTitle}</span>
                        </>
                    )}
                </button>
            </div>

            {/* Step Indicators */}
            <div className="mt-10 relative z-10 flex items-center gap-4">
                {[1, 2, 3].map((s) => {
                    const isActive = (step === "enter_old" && s === 1) || (step === "create_new" && s === 2) || (step === "confirm_new" && s === 3);
                    return (
                        <div
                            key={s}
                            className={`w-2 h-2 rounded-full transition-all duration-500 ${isActive ? "bg-blue-900 w-8" : "bg-blue-100"}`}
                        />
                    );
                })}
            </div>

            {/* Bottom Logistics */}
            <div className="fixed bottom-10 left-0 right-0 flex justify-center pointer-events-none opacity-20 z-0 select-none">
                <span className="text-[10px] font-semibold text-blue-900">{t.securePinSetup}</span>
            </div>
        </div>
    );
}

export default function ChangeWithdrawalPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            </div>
        }>
            <ChangePasswordContent />
        </Suspense>
    );
}
