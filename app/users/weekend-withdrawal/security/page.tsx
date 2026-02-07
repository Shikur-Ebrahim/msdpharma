"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, increment, query, where, getDocs, limit } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
    Lock,
    Loader2,
    ShieldCheck,
    AlertCircle,
    CheckCircle2,
    Delete,
    Clock,
    Rocket,
    ChevronLeft,
    Check,
    Fingerprint,
    ShieldAlert,
    Shield,
    Activity
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { translations, Language } from "@/lib/translations";

interface WeekendOrder {
    id: string;
    purchaseDate: any;
    withdrawalDays?: number;
    weekendBalance?: number;
}


function SecurityContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const amountParam = searchParams.get('amount');

    const [user, setUser] = useState<any>(null);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [hasPassword, setHasPassword] = useState(false);
    const [input, setInput] = useState("");
    const [confirmInput, setConfirmInput] = useState("");
    const [step, setStep] = useState<"check" | "set" | "confirm" | "enter">("check");
    const [shake, setShake] = useState(false);

    const [isRestricted, setIsRestricted] = useState(false);
    const [isPartnerRestricted, setIsPartnerRestricted] = useState(false);
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [minRecharge, setMinRecharge] = useState<number>(4500);
    const [withdrawalSettings, setWithdrawalSettings] = useState<any>({
        frequency: 1,
    });
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
                setUserData(data);
                const hasPass = !!data.withdrawalPassword;
                setHasPassword(hasPass);
                setStep(hasPass ? "enter" : "set");
            }
            setLoading(false);
        });

        const fetchSettings = async () => {
            try {
                const docRef = doc(db, "GlobalSettings", "recharge");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const settings = docSnap.data();
                    if (settings.minAmount) {
                        setMinRecharge(Number(settings.minAmount));
                    }
                }

                const withdrawRef = doc(db, "GlobalSettings", "withdrawal");
                const withdrawSnap = await getDoc(withdrawRef);
                if (withdrawSnap.exists()) {
                    setWithdrawalSettings(withdrawSnap.data());
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
            }
        };

        fetchSettings();
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

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [customError, setCustomError] = useState("");

    useEffect(() => {
        if (customError) {
            const timer = setTimeout(() => {
                setCustomError("");
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [customError]);

    const handleAction = async () => {
        if (input.length !== 4) return;
        setVerifying(true);

        try {
            if (step === "set") {
                setConfirmInput(input);
                setInput("");
                setStep("confirm");
                setVerifying(false);
            } else if (step === "confirm") {
                if (input === confirmInput) {
                    await updateDoc(doc(db, "users", user.uid), {
                        withdrawalPassword: input
                    });
                    toast.success(t.pinSetSuccess);
                    setUserData({ ...userData, withdrawalPassword: input });

                    const isRecruited = await checkPartnerStatus();
                    if (!isRecruited) {
                        setIsPartnerRestricted(true);
                        setVerifying(false);
                        return;
                    }

                    const dailyRestricted = await checkRestriction();
                    if (dailyRestricted) {
                        setIsRestricted(true);
                        setStep("enter");
                        setInput("");
                        setVerifying(false);
                        return;
                    }
                    await executeWithdrawal();
                } else {
                    toast.error(t.pinMismatch); // Or generic pin error
                    setInput("");
                    setConfirmInput("");
                    setStep("set");
                    setVerifying(false);
                }
            } else if (step === "enter") {
                if (input === userData.withdrawalPassword) {
                    const isRecruited = await checkPartnerStatus();
                    if (!isRecruited) {
                        setIsPartnerRestricted(true);
                        setVerifying(false);
                        return;
                    }

                    const dailyRestricted = await checkRestriction();
                    if (dailyRestricted) {
                        setIsRestricted(true);
                        setVerifying(false);
                        return;
                    }
                    await executeWithdrawal();
                } else {
                    setShake(true);
                    setTimeout(() => setShake(false), 500);
                    setCustomError(t.invalidPin);
                    setInput("");
                    setVerifying(false);
                }
            }
        } catch (error) {
            console.error(error);
            toast.error(t.noAlerts); // Generic error
            setVerifying(false);
        }
    };

    const checkRestriction = async () => {
        if (!user) return false;
        const now = new Date();
        const f = withdrawalSettings.frequency || 1;
        const checkStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (f - 1));
        const q = query(
            collection(db, "WeekendWithdrawals"),
            where("userId", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        const hasRestrictedWithdrawal = snapshot.docs.some(doc => {
            const data = doc.data();
            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            return createdAt >= checkStartDate;
        });
        return hasRestrictedWithdrawal;
    };

    const checkPartnerStatus = async () => {
        if (!user) return false;
        try {
            const q = query(
                collection(db, "RechargeReview"),
                where("userId", "==", user.uid),
                where("status", "==", "verified"),
                limit(1)
            );
            const snap = await getDocs(q);
            return !snap.empty;
        } catch (error) {
            console.error("Error checking partner status:", error);
            return false;
        }
    };

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isRestricted) {
            timer = setInterval(() => {
                const now = new Date();
                const targetReset = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                targetReset.setHours(0, 0, 0, 0);
                const diff = targetReset.getTime() - now.getTime();
                if (diff <= 0) {
                    setIsRestricted(false);
                    return;
                }
                setTimeLeft({
                    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((diff / (1000 * 60)) % 60),
                    seconds: Math.floor((diff / 1000) % 60)
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isRestricted]);

    const executeWithdrawal = async () => {
        try {
            const amount = Number(amountParam);
            const fee = amount * 0.05;
            const actualReceipt = amount - fee;
            const bankSnap = await getDoc(doc(db, "Bank", user.uid));
            const rawBankData = bankSnap.data() as any;
            const bankDetails = {
                accountNumber: rawBankData?.accountNumber,
                bankLogoUrl: rawBankData?.bankLogoUrl,
                bankName: rawBankData?.bankName,
                holderName: rawBankData?.holderName,
            };


            // Helper function to calculate days passed
            const calculateDaysPassed = (purchaseDate: any) => {
                if (!purchaseDate?.seconds) return 0;
                const purchaseMs = purchaseDate.seconds * 1000;
                const now = Date.now();
                const diffMs = now - purchaseMs;
                return Math.floor(diffMs / (1000 * 60 * 60 * 24));
            };

            // Fetch all weekend orders for this user
            const qOrders = query(
                collection(db, "WeekendUserOrders"),
                where("userId", "==", user.uid)
            );
            const ordersSnapshot = await getDocs(qOrders);
            const allOrders = ordersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as WeekendOrder));

            // Filter only eligible orders (past waiting period)
            const eligibleOrders = allOrders.filter((order: WeekendOrder) => {
                const daysPassed = calculateDaysPassed(order.purchaseDate);
                const withdrawalDays = order.withdrawalDays || 30;
                const daysLeft = withdrawalDays - daysPassed;
                return daysLeft <= 0 && (order.weekendBalance || 0) > 0;
            });

            // Sort eligible orders by purchase date (oldest first)
            eligibleOrders.sort((a: WeekendOrder, b: WeekendOrder) => {
                const dateA = a.purchaseDate?.toDate ? a.purchaseDate.toDate() : new Date(a.purchaseDate);
                const dateB = b.purchaseDate?.toDate ? b.purchaseDate.toDate() : new Date(b.purchaseDate);
                return dateA.getTime() - dateB.getTime();
            });

            // Deduct the withdrawal amount from eligible orders only
            let remainingAmount = amount;
            for (const order of eligibleOrders) {
                if (remainingAmount <= 0) break;

                const orderBalance = order.weekendBalance || 0;
                if (orderBalance > 0) {
                    const deductAmount = Math.min(orderBalance, remainingAmount);
                    const newBalance = orderBalance - deductAmount;

                    // Update the order's weekend balance
                    await updateDoc(doc(db, "WeekendUserOrders", order.id), {
                        weekendBalance: newBalance
                    });

                    remainingAmount -= deductAmount;
                }
            }

            // Create withdrawal record
            await addDoc(collection(db, "WeekendWithdrawals"), {
                userId: user.uid,
                amount: amount,
                fee: fee,
                actualReceipt: actualReceipt,
                bankDetails: bankDetails,
                status: "pending",
                createdAt: serverTimestamp(),
                userEmail: user.email,
                userPhone: userData.phoneNumber || ""
            });

            // Create notification
            await addDoc(collection(db, "UserNotifications"), {
                userId: user.uid,
                type: "weekend-withdrawal",
                amount: amount,
                status: "pending",
                read: false,
                createdAt: serverTimestamp()
            });

            setShowSuccessModal(true);
            setVerifying(false);
        } catch (error) {
            console.error(error);
            toast.error(t.noAlerts); // Adjusted
            setVerifying(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-orange-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-blue-900 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden selection:bg-orange-100 font-sans">
            {/* Ambient Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-50/50 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-50/30 blur-[100px] rounded-full"></div>
            </div>

            {/* Partner Recruitment Modal */}
            <AnimatePresence>
                {isPartnerRestricted && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-[120] bg-white/95 backdrop-blur-2xl flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-white w-full max-w-sm rounded-[3.5rem] p-12 border border-orange-50 shadow-3xl relative overflow-hidden text-center"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-orange-500"></div>

                            <div className="w-28 h-28 rounded-[2.5rem] bg-orange-50 flex items-center justify-center mx-auto mb-10 border border-orange-100 shadow-inner">
                                <Rocket size={56} className="text-orange-600 animate-bounce" strokeWidth={1.5} />
                            </div>

                            <div className="space-y-4 mb-10">
                                <h3 className="text-3xl font-bold text-blue-900 leading-none italic">
                                    {t.activationRequired.replace(" Required", "")}<br />{t.activationRequired.includes(" Required") ? "Required" : ""}
                                </h3>
                                <p className="text-blue-900/40 text-[11px] font-bold leading-relaxed px-4 text-center">
                                    {t.activationDesc}
                                </p>
                            </div>

                            <button
                                onClick={() => router.push(`/users/recharge?amount=${minRecharge}`)}
                                className="w-full py-6 bg-orange-500 text-white rounded-[2rem] text-[11px] font-bold shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
                            >
                                {t.getVerified}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 24-Hour Restriction Overlay */}
            <AnimatePresence>
                {isRestricted && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-[70] bg-white/95 backdrop-blur-2xl flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-white rounded-[3.5rem] p-12 w-full max-w-sm border border-orange-100 shadow-3xl text-center relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-orange-500"></div>

                            <div className="w-24 h-24 rounded-[2rem] bg-orange-50 flex items-center justify-center mx-auto mb-8 border border-orange-100">
                                <Clock size={48} className="text-orange-500" />
                            </div>

                            <div className="space-y-4 mb-8">
                                <h3 className="text-2xl font-bold text-blue-900">Withdrawal Limit</h3>
                                <p className="text-[10px] font-bold text-orange-600">Available again in:</p>
                            </div>

                            <div className="flex gap-6 justify-center w-full bg-orange-50/50 py-8 rounded-[2.5rem] border border-orange-50 mb-10">
                                {[
                                    { val: timeLeft.hours, label: t.hours },
                                    { val: timeLeft.minutes, label: t.minutes },
                                    { val: timeLeft.seconds, label: t.seconds, color: 'text-orange-600' }
                                ].map((t, i) => (
                                    <div key={i} className="flex flex-col items-center min-w-[60px]">
                                        <span className={`text-3xl font-bold ${t.color || 'text-blue-900'} tabular-nums`}>{t.val.toString().padStart(2, '0')}</span>
                                        <span className="text-[9px] font-bold text-blue-900/20 mt-1">{t.label}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => router.push('/users/welcome')}
                                className="w-full py-6 bg-blue-900 text-white rounded-[2rem] text-[11px] font-bold transition-all shadow-xl shadow-blue-900/20"
                            >
                                {t.ok}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Success Modal */}
            <AnimatePresence>
                {showSuccessModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-2xl flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-white w-full max-w-sm rounded-[3.5rem] p-12 border border-orange-50 shadow-3xl text-center relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-orange-500"></div>

                            <div className="w-24 h-24 rounded-[2rem] bg-orange-50 flex items-center justify-center mx-auto mb-10 border border-orange-100 shadow-inner">
                                <CheckCircle2 size={56} className="text-orange-600 animate-in zoom-in duration-500" />
                            </div>

                            <div className="space-y-4 mb-10">
                                <h3 className="text-3xl font-bold text-blue-900 tracking-tight leading-none italic">{t.withdrawalSuccessful}</h3>
                                <p className="text-blue-900/40 text-[11px] font-bold leading-relaxed px-4">
                                    {t.withdrawalSuccessDesc}
                                </p>
                            </div>

                            <button
                                onClick={() => router.push('/users/welcome')}
                                className="w-full py-6 bg-blue-900 text-white rounded-[2rem] text-[11px] font-bold shadow-xl shadow-blue-900/20 active:scale-95 transition-all"
                            >
                                {t.ok}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header Icon */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-10 relative"
            >
                <div className="w-24 h-24 bg-white border border-orange-100 rounded-[2.5rem] shadow-2xl shadow-orange-900/5 flex items-center justify-center relative z-10 text-orange-600">
                    {step === "enter" ? <Lock size={42} strokeWidth={1.5} /> : <Fingerprint size={42} strokeWidth={1.5} />}
                </div>
                <div className="absolute inset-0 bg-orange-500/5 rounded-[2.5rem] blur-2xl animate-pulse"></div>
            </motion.div>

            {/* Title & Instructions */}
            <div className="space-y-4 mb-14 max-w-xs mx-auto relative z-10">
                <h2 className="text-4xl font-bold text-blue-900 tracking-tighter leading-none italic">
                    {step === "set" ? t.setPin : step === "confirm" ? t.confirmPinTitle : t.securityCheck}
                </h2>
                <div className="h-1.5 w-12 bg-orange-600/10 mx-auto rounded-full"></div>
                <p className="text-[11px] font-bold text-blue-900/40 leading-relaxed">
                    {step === "set"
                        ? t.setPinDesc
                        : step === "confirm"
                            ? t.confirmPinDesc
                            : t.enterPinDesc}
                </p>
            </div>

            {/* PIN Display */}
            <div className={`flex gap-6 mb-16 relative z-10 ${shake ? "animate-shake bg-red-50 p-6 rounded-[2rem]" : ""}`}>
                {[...Array(4)].map((_, i) => (
                    <div
                        key={i}
                        className={`w-5 h-5 rounded-full transition-all duration-500 border-2 ${i < input.length
                            ? "bg-orange-500 border-orange-600 scale-125 shadow-lg shadow-orange-500/20"
                            : "bg-orange-50 border-orange-100 scale-100"
                            }`}
                    ></div>
                ))}
            </div>

            {/* Inline Error Message */}
            <div className="h-14 mb-8 w-full flex items-center justify-center relative z-10">
                <AnimatePresence>
                    {customError && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="bg-red-50 border border-red-100 text-red-600 px-6 py-3 rounded-2xl flex items-center gap-3"
                        >
                            <ShieldAlert size={18} />
                            <span className="text-[11px] font-bold">{customError}</span>
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
                        className="w-18 h-18 rounded-full text-3xl font-bold text-blue-900 hover:bg-orange-50 active:scale-90 transition-all flex items-center justify-center"
                    >
                        {num}
                    </button>
                ))}
                <div className="w-18 h-18"></div>
                <button
                    onClick={() => handleNumClick("0")}
                    className="w-18 h-18 rounded-full text-3xl font-bold text-blue-900 hover:bg-orange-50 active:scale-90 transition-all flex items-center justify-center"
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
            <div className="w-full max-w-[340px] relative z-10">
                <button
                    onClick={handleAction}
                    disabled={input.length !== 4 || verifying}
                    className="w-full h-20 bg-blue-900 disabled:opacity-30 disabled:grayscale text-white rounded-[2.5rem] text-sm font-bold shadow-2xl shadow-blue-900/20 active:scale-95 transition-all flex items-center justify-center gap-4"
                >
                    {verifying ? (
                        <Loader2 className="animate-spin" size={24} />
                    ) : (
                        <>
                            {step === "enter" && <Shield size={18} strokeWidth={2.5} />}
                            <span>{step === "enter" ? t.withdrawNow : t.next}</span>
                        </>
                    )}
                </button>

                <button
                    onClick={() => router.back()}
                    className="mt-10 text-[10px] font-bold text-blue-900/20 hover:text-blue-900 transition-all"
                >
                    {t.cancel}
                </button>
            </div>

            {/* Stealth Logistics */}
            <div className="fixed bottom-10 left-0 right-0 flex justify-center pointer-events-none opacity-20 z-0 select-none">
                <span className="text-[10px] font-bold text-blue-900">SECURE GATEWAY</span>
            </div>
        </div>
    );
}

export default function SecurityPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-12 h-12 animate-spin text-orange-600" />
            </div>
        }>
            <SecurityContent />
        </Suspense>
    );
}
