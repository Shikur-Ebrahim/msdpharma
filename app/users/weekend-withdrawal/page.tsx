"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot, collection, query, where, getDocs, limit, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
    ChevronLeft,
    Wallet,
    CreditCard,
    AlertCircle,
    ChevronRight,
    Loader2,
    Lock,
    XCircle,
    CheckCircle2,
    Clock,
    Info,
    ArrowRight
} from "lucide-react";
import { translations, Language } from "@/lib/translations";
import {
    normalizeWithdrawalSettings,
    isWithdrawalOpen,
    getWithdrawalClosedMessage,
    formatScheduleTime,
} from "@/lib/withdrawalSchedule";

const DAYS_MAP: Record<number, string> = {
    1: "Mon",
    2: "Tue",
    3: "Wed",
    4: "Thu",
    5: "Fri",
    6: "Sat",
    0: "Sun"
};

export default function WeekendWithdrawalPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [amount, setAmount] = useState("");
    const [linkedBank, setLinkedBank] = useState<any>(null);
    const [weekendOrders, setWeekendOrders] = useState<any[]>([]);
    const [totalWeekendBalance, setTotalWeekendBalance] = useState(0);
    const [eligibleWithdrawalBalance, setEligibleWithdrawalBalance] = useState(0);
    const [withdrawalSettings, setWithdrawalSettings] = useState<any>({
        minAmount: 300,
        maxAmount: 40000,
        activeDays: [1, 2, 3, 4, 5, 6],
        startTime: "08:00",
        endTime: "17:00",
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

    // Error Modal State
    const [errorModal, setErrorModal] = useState<{ show: boolean, message: string } | null>(null);
    const [withdrawalRuleMessage, setWithdrawalRuleMessage] = useState<string | null>(null);

    useEffect(() => {
        let unsubscribeUser: () => void;
        let unsubscribeOrders: () => void;
        let unsubscribeBank: () => void;
        let unsubscribeSettings: () => void;
        let unsubscribeRules: () => void;

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push("/");
                return;
            }
            setUser(currentUser);

            // Fetch User Data
            const userRef = doc(db, "users", currentUser.uid);
            unsubscribeUser = onSnapshot(userRef, (doc) => {
                if (doc.exists()) {
                    setUserData(doc.data());
                }
            });

            // Fetch Weekend Orders to calculate total weekend balance
            const qOrders = query(
                collection(db, "WeekendUserOrders"),
                where("userId", "==", currentUser.uid)
            );
            unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
                const ordersData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as any[];
                setWeekendOrders(ordersData);

                // Total balance is orders + fixed base
                const ordersTotal = ordersData.reduce((sum, order) => {
                    return sum + (order.weekendBalance || 0);
                }, 0);
                setTotalWeekendBalance(ordersTotal);

                // Calculate eligible withdrawal balance (only from orders past waiting period)
                const calculateDaysPassed = (purchaseDate: any) => {
                    if (!purchaseDate?.seconds) return 0;
                    const purchaseMs = purchaseDate.seconds * 1000;
                    const now = Date.now();
                    const diffMs = now - purchaseMs;
                    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
                };

                const eligibleTotal = ordersData.reduce((sum, order) => {
                    const daysPassed = calculateDaysPassed(order.purchaseDate);
                    const withdrawalDays = order.withdrawalDays || 30;
                    const daysLeft = withdrawalDays - daysPassed;

                    if (daysLeft <= 0) {
                        return sum + (order.weekendBalance || 0);
                    }
                    return sum;
                }, 0);
                setEligibleWithdrawalBalance(eligibleTotal);
                setLoading(false);
            });

            // Fetch Linked Bank
            const bankRef = doc(db, "Bank", currentUser.uid);
            unsubscribeBank = onSnapshot(bankRef, (doc) => {
                setLinkedBank(doc.exists() ? doc.data() : null);
            });

            // Fetch Global Withdrawal Settings
            const settingsRef = doc(db, "GlobalSettings", "withdrawal");
            unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
                if (docSnap.exists()) {
                    setWithdrawalSettings(normalizeWithdrawalSettings(docSnap.data()));
                }
            });

            // Fetch Withdrawal Rules for this user
            const qRules = query(
                collection(db, "withdrawal_rules"),
                where("active", "==", true)
            );
            unsubscribeRules = onSnapshot(qRules, (snapshot) => {
                if (!snapshot.empty) {
                    const applicableRule = snapshot.docs.find(doc => {
                        const data = doc.data();
                        return data.targetAll === true || (data.targetUsers && data.targetUsers.includes(currentUser.uid));
                    });

                    if (applicableRule) {
                        const ruleData = applicableRule.data();
                        setWithdrawalRuleMessage(
                            ruleData.message || t.pleaseWaitUntil.replace("{time}", "")
                        );
                    } else {
                        setWithdrawalRuleMessage(null);
                    }
                } else {
                    setWithdrawalRuleMessage(null);
                }
            });
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeUser) unsubscribeUser();
            if (unsubscribeOrders) unsubscribeOrders();
            if (unsubscribeBank) unsubscribeBank();
            if (unsubscribeSettings) unsubscribeSettings();
            if (unsubscribeRules) unsubscribeRules();
        };
    }, [router]);

    // One-time locking logic
    useEffect(() => {
        if (!user || !userData) return;
        if (userData.fixedWeekendBalance !== undefined) return;

        const fetchAndLock = async () => {
            try {
                const globalRef = doc(db, "GlobalSettings", "weekend");
                const globalSnap = await getDoc(globalRef);

                if (globalSnap.exists()) {
                    const globalData = globalSnap.data();
                    const defaultBalance = Number(globalData.defaultBalance || 0);

                    if (defaultBalance > 0) {
                        const userRef = doc(db, "users", user.uid);
                        await updateDoc(userRef, {
                            fixedWeekendBalance: defaultBalance
                        });
                    }
                }
            } catch (error) {
                console.error("Error in global balance locking:", error);
            }
        };

        fetchAndLock();
    }, [user, userData]);

    const scheduleLabels = {
        opensAt: t.opensAt,
        opensAtTomorrow: t.opensAtTomorrow,
        opensTodayAt: t.opensTodayAt,
        opensOnDayAt: t.opensOnDayAt,
        pleaseWaitUntil: t.pleaseWaitUntil,
        availableUntil: t.availableUntil,
        closed: t.closed,
        active: t.active,
    };

    const handleWithdrawClick = () => {
        if (withdrawalRuleMessage) {
            setErrorModal({ show: true, message: withdrawalRuleMessage });
            return;
        }
        const numAmount = Number(amount);
        const balance = eligibleWithdrawalBalance + (userData?.fixedWeekendBalance || 0);

        if (!linkedBank) {
            setErrorModal({ show: true, message: t.noAlerts }); // Adjusted or add a specific one
            return;
        }

        if (!amount || isNaN(numAmount)) {
            setErrorModal({ show: true, message: t.enterAmount });
            return;
        }

        if (numAmount < withdrawalSettings.minAmount) {
            setErrorModal({ show: true, message: t.minDepositError.replace("{min}", String(withdrawalSettings.minAmount)) });
            return;
        }

        if (numAmount > withdrawalSettings.maxAmount) {
            setErrorModal({ show: true, message: t.limitMsg.replace("{limit}", withdrawalSettings.maxAmount.toLocaleString()) });
            return;
        }

        if (!isWithdrawalOpen(withdrawalSettings)) {
            setErrorModal({
                show: true,
                message: getWithdrawalClosedMessage(withdrawalSettings, scheduleLabels, DAYS_MAP),
            });
            return;
        }

        if (numAmount > balance) {
            setErrorModal({ show: true, message: t.insufficientBalance });
            return;
        }

        // Redirect to Security Page with amount as query param
        router.push(`/users/weekend-withdrawal/security?amount=${amount}`);
    };

    const feePercent = 0.05; // 5% fee
    const withdrawAmount = Number(amount) || 0;
    const fee = withdrawAmount * feePercent;
    const actualReceipt = withdrawAmount - fee;

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-blue-900 font-sans pb-32 relative selection:bg-orange-500/30 overflow-hidden">
            {/* Medical Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-50/50 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-50/30 blur-[100px] rounded-full"></div>
            </div>

            {/* Advanced Error Modal */}
            {errorModal?.show && (
                <div className="fixed inset-0 z-[100] bg-blue-900/60 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in duration-500">
                    <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full blur-3xl -mr-16 -mt-16"></div>

                        <div className="relative z-10 flex flex-col items-center text-center gap-10">
                            <div className="w-24 h-24 rounded-[2.5rem] bg-red-50 flex items-center justify-center border border-red-100 shadow-sm">
                                <XCircle size={48} strokeWidth={1.5} className="text-red-500" />
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-2xl font-bold text-blue-900 tracking-tight">{t.withdrawalAlert}</h3>
                                <p className="text-sm font-medium text-blue-900/40 leading-relaxed px-2">
                                    {errorModal.message}
                                </p>
                            </div>

                            <button
                                onClick={() => setErrorModal(null)}
                                className="w-full py-6 bg-red-500 text-white rounded-[1.8rem] text-sm font-bold shadow-xl shadow-red-500/20 active:scale-95 transition-all"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-2xl z-50 px-6 py-6 flex items-center justify-between border-b border-orange-50">
                <button
                    onClick={() => router.back()}
                    className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-orange-100 text-blue-900 active:scale-90 transition-all shadow-sm"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-xl font-bold text-blue-900 leading-none text-center flex-1">
                    {t.weekendWithdrawal}
                </h1>
                <div className="w-12" /> {/* Spacer */}
            </header>

            <main className="pt-32 p-6 space-y-10 max-w-lg mx-auto relative z-10">
                {/* Withdrawal Schedule Status */}
                <div className="animate-in fade-in slide-in-from-top-4 duration-700">
                    {(() => {
                        const open = isWithdrawalOpen(withdrawalSettings);

                        if (!open) {
                            return (
                                <div className="bg-white border border-red-100 rounded-[3rem] p-8 flex items-center gap-6 shadow-xl shadow-red-900/5">
                                    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 border border-red-100">
                                        <Clock size={32} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-bold text-red-500 mb-1">{t.closed}</p>
                                        <p className="text-base font-bold text-blue-900">
                                            {getWithdrawalClosedMessage(withdrawalSettings, scheduleLabels, DAYS_MAP)}
                                        </p>
                                    </div>
                                </div>
                            );
                        }
                        return (
                            <div className="bg-white border border-orange-100 rounded-[3rem] p-8 flex items-center gap-6 shadow-xl shadow-orange-900/5">
                                <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100">
                                    <CheckCircle2 size={32} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-orange-600 mb-1">{t.success}</p>
                                    <p className="text-base font-bold text-blue-900">
                                        {t.availableUntil.replace("{time}", formatScheduleTime(withdrawalSettings.endTime))}
                                    </p>
                                </div>
                                <div className="w-4 h-4 bg-orange-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.5)]"></div>
                            </div>
                        );
                    })()}
                </div>

                {/* Amount Input Card */}
                <section className="relative group animate-in fade-in slide-in-from-top-6 duration-700 delay-100">
                    <div className="bg-white rounded-[3rem] p-12 border border-orange-50 shadow-xl shadow-orange-900/5 relative overflow-hidden h-64 flex flex-col justify-center">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-orange-50 rounded-full blur-3xl -mr-20 -mt-20"></div>

                        <p className="text-blue-900/40 text-[11px] font-bold mb-4">{t.depositAmount}</p>
                        <div className="flex items-baseline gap-4 relative z-10">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                className="w-full bg-transparent text-6xl font-black text-blue-900 placeholder:text-blue-900/10 outline-none border-none p-0 tabular-nums leading-none"
                            />
                            <span className="text-blue-900/40 font-bold text-base shrink-0">ETB</span>
                        </div>

                        <div className="mt-10 flex gap-2">
                            {[...Array(10)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${amount && i < amount.length ? "bg-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.3)]" : "bg-orange-50"
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                </section>

                {/* Info Card */}
                <section className="bg-white rounded-[3.5rem] p-10 border border-orange-50 space-y-8 shadow-xl shadow-orange-900/5 relative overflow-hidden group/info">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                    <div className="flex justify-between items-center p-6 rounded-[2rem] bg-orange-50/50 border border-orange-100">
                        <span className="text-[10px] font-bold text-blue-900/40 mb-1">{t.weekendBalance}</span>
                        <span className="text-xl font-bold text-blue-900 tabular-nums">
                            {Math.floor(totalWeekendBalance + (userData?.fixedWeekendBalance || 0)).toLocaleString()} <span className="text-[10px] text-blue-900/40">ETB</span>
                        </span>
                    </div>

                    <div className="space-y-4 px-2">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-blue-900/40">{t.withdrawalFee}</span>
                                <div className="px-3 py-1 rounded-lg bg-orange-500 text-white text-[9px] font-bold leading-none">5%</div>
                            </div>
                            <span className="text-sm font-bold text-red-500 tabular-nums">-{fee.toLocaleString()} ETB</span>
                        </div>
                        <div className="h-[1px] bg-orange-50"></div>
                        <div className="flex justify-between items-end pt-2">
                            <span className="text-[10px] font-bold text-blue-900 mb-1">{t.youWillReceive}</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold text-orange-600 tabular-nums tracking-tighter">
                                    {actualReceipt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </span>
                                <span className="text-orange-600/40 font-bold text-sm">ETB</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Bank Selection */}
                <section className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-900"></div>
                        <h2 className="text-[10px] font-bold text-blue-900/40 items-center">{t.bankNameLabel}</h2>
                    </div>

                    {linkedBank ? (
                        <div className="bg-white rounded-[3rem] p-2 border border-orange-50 hover:border-orange-200 transition-all group/bank shadow-xl shadow-orange-900/5">
                            <div className="p-10 relative overflow-hidden flex flex-col gap-10">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-orange-50 rounded-full blur-3xl -mr-20 -mt-20"></div>

                                <div className="flex items-center gap-6 relative z-10">
                                    <div className="w-20 h-20 rounded-[1.8rem] bg-orange-50 border border-orange-100 flex items-center justify-center p-3 shadow-inner group-hover/bank:scale-105 transition-all">
                                        {linkedBank.bankLogoUrl ? (
                                            <img src={linkedBank.bankLogoUrl} alt={linkedBank.bankName} className="w-full h-full object-contain filter drop-shadow-[0_2px_5px_rgba(30,58,138,0.1)]" />
                                        ) : (
                                            <Wallet className="text-blue-900/40" size={36} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-2xl font-bold text-blue-900 truncate tracking-tight leading-none">{linkedBank.bankName}</h4>
                                        <p className="text-[10px] font-bold text-blue-900/40 mt-2">{linkedBank.holderName}</p>
                                    </div>
                                    <div className="text-blue-900/10 group-hover/bank:text-blue-900 transition-all">
                                        <ChevronRight size={28} />
                                    </div>
                                </div>

                                <div className="pt-10 border-t border-orange-50 grid grid-cols-2 gap-8 relative z-10">
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-blue-900/20">{t.accountNumberLabel}</p>
                                        <p className="text-base font-bold text-blue-900 tracking-widest font-mono truncate">{linkedBank.accountNumber}</p>
                                    </div>
                                    <div className="space-y-2 text-right">
                                        <p className="text-[10px] font-bold text-blue-900/20">{t.status}</p>
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="w-2 h-2 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
                                            <p className="text-xs font-bold text-orange-600">{t.verified}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div
                            onClick={() => router.push('/users/bank')}
                            className="bg-white rounded-[3.5rem] p-12 text-center border-2 border-dashed border-orange-100 hover:border-orange-400 hover:bg-orange-50/30 transition-all cursor-pointer group/add shadow-xl shadow-orange-900/5"
                        >
                            <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-6 group-hover/add:scale-110 transition-all text-orange-600 border border-orange-100">
                                <CreditCard size={36} />
                            </div>
                            <p className="text-[10px] font-bold text-blue-900 mb-2">{t.noProductsActive}</p>
                            <p className="text-sm text-blue-900/40 font-bold tracking-tight">{t.bankNameLabel}</p>
                        </div>
                    )}
                </section>

                {/* Usage Tips */}
                <section className="bg-white rounded-[3rem] p-10 border border-orange-50 space-y-10 shadow-xl shadow-orange-900/5 relative overflow-hidden group/rules z-10">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center text-blue-900 border border-orange-100">
                            <AlertCircle size={22} />
                        </div>
                        <h3 className="text-[11px] font-bold text-blue-900">{t.guidelines}</h3>
                    </div>

                    <ul className="space-y-8">
                        {[
                            `${t.hospitalHours}: ${formatScheduleTime(withdrawalSettings.startTime)} - ${formatScheduleTime(withdrawalSettings.endTime)} (EAT) (${withdrawalSettings.activeDays.map((d: number) => DAYS_MAP[d]).join(", ")})`,
                            `${t.dosageLimits}: ${withdrawalSettings.minAmount} - ${withdrawalSettings.maxAmount.toLocaleString()} ETB per request`,
                            `${t.oneRefundPer.replace("{days}", String(withdrawalSettings.frequency))}`,
                            t.processingTimeDesc
                        ].map((rule, i) => {
                            const [label, ...val] = rule.split(": ");
                            return (
                                <li key={i} className="flex gap-4 items-start group/tip">
                                    <div className="w-8 h-8 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 mt-0.5 group-hover/tip:bg-orange-600 group-hover/tip:text-white transition-all">
                                        <span className="text-[11px] font-black transition-colors">{i + 1}</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-blue-900/40 leading-relaxed group-hover/tip:text-blue-900 transition-all tracking-tight">
                                            <span className="text-blue-900/20 mr-1">{label}:</span> {val.join(": ")}
                                        </p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            </main>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl p-8 pb-12 border-t border-orange-50 shadow-[0_-20px_50px_rgba(0,0,0,0.05)] relative z-[60]">
                <button
                    onClick={handleWithdrawClick}
                    className="w-full bg-orange-500 text-white py-7 rounded-[2.5rem] font-bold text-sm shadow-xl shadow-orange-500/20 hover:shadow-2xl hover:bg-orange-600 transition-all duration-500 flex items-center justify-center gap-4 group"
                >
                    <Lock size={20} className="group-hover:scale-110 transition-transform" />
                    <span>{t.withdrawNow}</span>
                </button>
            </div>
        </div>
    );
}
