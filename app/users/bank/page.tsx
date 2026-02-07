"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
    collection,
    query,
    onSnapshot,
    doc,
    setDoc,
    deleteDoc,
    orderBy
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
    ChevronLeft,
    Plus,
    Building2,
    User,
    Hash,
    ShieldCheck,
    Loader2,
    ChevronDown,
    Lock,
    History,
    X,
    CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { translations, Language } from "@/lib/translations";

export default function UserBankPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<"list" | "connect" | "notification">("list");
    const [linkedBank, setLinkedBank] = useState<any>(null);
    const [availableBanks, setAvailableBanks] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [showBankDropdown, setShowBankDropdown] = useState(false);
    const [userData, setUserData] = useState<any>(null);
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

    // Form State
    const [formData, setFormData] = useState({
        bankName: "",
        holderName: "",
        accountNumber: "",
        bankLogoUrl: ""
    });

    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        holderName: "",
        accountNumber: ""
    });
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                router.push("/");
                return;
            }
            setUser(currentUser);

            // Fetch linked bank
            const bankRef = doc(db, "Bank", currentUser.uid);
            const unsubscribeBank = onSnapshot(bankRef, (doc) => {
                setLinkedBank(doc.exists() ? doc.data() : null);
                setLoading(false);
            });

            // Fetch available withdrawal banks
            const banksQuery = query(collection(db, "withdrawalBanks"), orderBy("createdAt", "desc"));
            const unsubscribeAvailable = onSnapshot(banksQuery, (snapshot) => {
                const banks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAvailableBanks(banks);
            });

            // Fetch user data for phone number
            const userRef = doc(db, "users", currentUser.uid);
            const unsubscribeUser = onSnapshot(userRef, (doc) => {
                if (doc.exists()) {
                    setUserData(doc.data());
                }
            });

            return () => {
                unsubscribeBank();
                unsubscribeAvailable();
                unsubscribeUser();
            };
        });

        return () => unsubscribeAuth();
    }, [router]);

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.bankName || !formData.holderName || !formData.accountNumber) {
            toast.error(t.fillAllFields);
            return;
        }

        setSubmitting(true);
        try {
            await setDoc(doc(db, "Bank", user.uid), {
                ...formData,
                uid: user.uid,
                phoneNumber: userData?.phoneNumber || "",
                status: "verified",
                linkedAt: new Date().toISOString()
            });
            toast.success(t.bankLinkedSuccess);
            setView("list");
        } catch (error) {
            console.error(error);
            toast.error(t.bankLinkFailed);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateBankDetails = async () => {
        if (!editForm.holderName || !editForm.accountNumber) {
            toast.error(t.fillAllFields);
            return;
        }

        setUpdating(true);
        try {
            const bankRef = doc(db, "Bank", user.uid);
            await setDoc(bankRef, {
                ...linkedBank,
                holderName: editForm.holderName,
                accountNumber: editForm.accountNumber,
                updatedAt: new Date().toISOString()
            });
            toast.success(t.detailsUpdated);
            setIsEditing(false);
        } catch (error) {
            console.error(error);
            toast.error(t.detailsUpdateFailed);
        } finally {
            setUpdating(false);
        }
    };


    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-orange-500/30 overflow-hidden relative">
            {/* Soft Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-50/50 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-slate-50/30 blur-[100px] rounded-full"></div>
            </div>

            <div className="relative z-10 max-w-lg mx-auto min-h-screen flex flex-col">
                <header className="fixed top-0 left-0 right-0 max-w-lg mx-auto bg-white/90 backdrop-blur-2xl z-50 px-6 py-6 flex items-center justify-between border-b border-slate-50">
                    <button
                        onClick={() => view === "connect" ? setView("list") : router.back()}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-600 active:scale-90 transition-all shadow-sm"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="text-xl font-bold text-slate-900 leading-none">
                        {view === "list" ? t.bankAccount : t.linkBank}
                    </h1>
                    <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-orange-50 text-orange-600 border border-orange-100 italic font-black text-xs">
                        MSD
                    </div>
                </header>

                <main className="flex-1 px-6 py-4 pb-44">
                    {view === "list" ? (
                        linkedBank ? (
                            /* Linked State */
                            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                                <div className="flex items-center justify-between px-2 pt-28">
                                    <h3 className="text-sm font-medium text-slate-400">{t.yourBankAccount}</h3>
                                    <button
                                        onClick={() => router.push("/users/service")}
                                        className="text-xs font-semibold text-orange-600 flex items-center gap-2 transition-all hover:bg-orange-50 px-3 py-2 rounded-lg"
                                    >
                                        <Plus size={14} strokeWidth={3} /> {t.changeBank}
                                    </button>
                                </div>

                                {/* Premium Bank Card */}
                                <div className="bg-white rounded-[3.5rem] p-8 border border-slate-50 shadow-xl shadow-slate-900/5 relative overflow-hidden group/bank">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                                    <div className="flex items-center gap-6 mb-10 relative z-10">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-white border border-slate-100 flex items-center justify-center p-2.5 shadow-sm">
                                            {linkedBank.bankLogoUrl ? (
                                                <img src={linkedBank.bankLogoUrl} className="w-full h-full object-contain" alt="Bank" />
                                            ) : (
                                                <Building2 className="text-slate-100" size={32} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-xl font-bold text-slate-900 leading-none mb-2 truncate">{linkedBank.bankName || t.bank}</h4>
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                <span className="text-xs font-semibold text-emerald-600">{t.verified}</span>
                                            </div>
                                        </div>

                                        {/* Edit Button Relocated here */}
                                        {!isEditing && (
                                            <button
                                                onClick={() => {
                                                    setEditForm({
                                                        holderName: linkedBank.holderName,
                                                        accountNumber: linkedBank.accountNumber
                                                    });
                                                    setIsEditing(true);
                                                }}
                                                className="self-start text-xs font-bold text-slate-400 hover:text-orange-500 transition-all bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm active:scale-95"
                                            >
                                                {t.edit}
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-6 relative z-10">
                                        <div className="bg-slate-50/50 rounded-[2rem] p-7 space-y-5 border border-slate-50 relative group/info">

                                            <div className="flex justify-between items-center gap-4">
                                                <span className="text-xs font-medium text-slate-400">{t.accountNumberLabel}</span>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editForm.accountNumber}
                                                        onChange={(e) => setEditForm({ ...editForm, accountNumber: e.target.value })}
                                                        className="text-sm font-bold text-slate-900 font-mono bg-white border border-slate-100 rounded-lg px-3 py-2 outline-none focus:border-orange-500 w-1/2 text-right"
                                                    />
                                                ) : (
                                                    <span className="text-sm font-bold text-slate-900 font-mono">
                                                        {linkedBank.accountNumber}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex justify-between items-center gap-4 border-t border-slate-100 pt-4">
                                                <span className="text-xs font-medium text-slate-400">{t.accountNameLabel}</span>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editForm.holderName}
                                                        onChange={(e) => setEditForm({ ...editForm, holderName: e.target.value })}
                                                        className="text-xs font-bold text-slate-800 bg-white border border-slate-100 rounded-lg px-3 py-2 outline-none focus:border-orange-500 w-1/2 text-right"
                                                    />
                                                ) : (
                                                    <p className="text-xs font-bold text-slate-800 truncate text-right">
                                                        {linkedBank.holderName}
                                                    </p>
                                                )}
                                            </div>

                                            {isEditing && (
                                                <div className="flex gap-3 pt-2">
                                                    <button
                                                        onClick={() => setIsEditing(false)}
                                                        disabled={updating}
                                                        className="flex-1 py-3 bg-slate-100 text-slate-400 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
                                                    >
                                                        {t.cancel}
                                                    </button>
                                                    <button
                                                        onClick={handleUpdateBankDetails}
                                                        disabled={updating}
                                                        className="flex-2 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all flex items-center justify-center gap-2 px-8 disabled:opacity-50"
                                                    >
                                                        {updating ? (
                                                            <Loader2 size={12} className="animate-spin" />
                                                        ) : (
                                                            t.saveChanges
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Empty State */
                            <div className="h-full flex flex-col items-center justify-center pt-32 pb-16 text-center space-y-12 animate-in zoom-in-95 duration-1000">
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-orange-500 rounded-[4rem] blur-[60px] opacity-10"></div>
                                    <div className="relative w-56 h-56 bg-white rounded-[4rem] border border-slate-50 flex items-center justify-center p-12 shadow-2xl">
                                        <div className="relative">
                                            <Building2 size={80} className="text-slate-100 relative z-10 stroke-[1.2]" />
                                            <div className="absolute -bottom-6 -right-6 bg-orange-500 p-5 rounded-[2rem] border-8 border-white shadow-xl shadow-orange-500/20">
                                                <Plus size={24} strokeWidth={3} className="text-white" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 max-w-xs mx-auto">
                                    <h2 className="text-2xl font-bold text-slate-900">{t.addBankAccount}</h2>
                                    <p className="text-sm text-slate-500 leading-relaxed px-4">{t.addBankDesc}</p>
                                </div>

                                <button
                                    onClick={() => setView("connect")}
                                    className="w-full py-5 bg-slate-900 text-white rounded-2xl text-base font-bold shadow-xl shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-3 hover:bg-black"
                                >
                                    <Plus size={20} strokeWidth={3} />
                                    <span>{t.linkNewAccount}</span>
                                </button>
                            </div>
                        )
                    ) : view === "notification" ? (
                        /* Already Connected Warning */
                        <div className="h-full flex flex-col items-center justify-center py-32 text-center space-y-10 animate-in zoom-in-95 duration-700">
                            <div className="w-24 h-24 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center shadow-sm">
                                <ShieldCheck size={40} className="text-orange-500" />
                            </div>

                            <div className="space-y-4 max-w-xs mx-auto px-4">
                                <h3 className="text-2xl font-bold text-slate-900">{t.accountJoined}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">
                                    {t.accountJoinedDesc}
                                </p>
                            </div>

                            <button
                                onClick={() => router.push("/users/service")}
                                className="w-full py-5 bg-orange-500 text-white rounded-2xl text-base font-bold shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
                            >
                                {t.customerSupport}
                            </button>
                        </div>
                    ) : (
                        /* Connect Form State */
                        <div className="space-y-12 animate-in fade-in slide-in-from-top-6 duration-1000 max-w-sm mx-auto w-full pt-32 pb-44">
                            <div className="text-center space-y-3">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2.5rem] bg-white text-orange-600 border border-slate-50 shadow-xl shadow-slate-900/5">
                                    <Lock size={32} />
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold text-slate-900">{t.addBankAccount}</h2>
                                    <p className="text-sm text-slate-500">{t.addBankDesc}</p>
                                </div>
                            </div>

                            <form onSubmit={handleConnect} className="space-y-8">
                                <div className="space-y-6">
                                    {/* Bank Selector */}
                                    <div className="space-y-3 relative">
                                        <label className="text-sm font-medium text-slate-500 ml-4">{t.selectYourBank}</label>
                                        <div
                                            onClick={() => setShowBankDropdown(!showBankDropdown)}
                                            className="relative w-full h-20 rounded-[1.8rem] bg-white border border-slate-50 hover:border-slate-200 transition-all shadow-xl shadow-slate-900/5 cursor-pointer flex items-center px-6 gap-5 group"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center p-2 transition-all">
                                                {formData.bankLogoUrl ? (
                                                    <img src={formData.bankLogoUrl} className="w-full h-full object-contain" alt="Selected" />
                                                ) : (
                                                    <Building2 size={24} className="text-slate-200" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                {formData.bankName ? (
                                                    <p className="font-bold text-sm text-slate-900 leading-none">{formData.bankName}</p>
                                                ) : (
                                                    <p className="font-bold text-sm text-slate-300 leading-none">{t.selectBank}</p>
                                                )}
                                            </div>
                                            <ChevronDown className={`text-slate-300 transition-transform duration-500 ${showBankDropdown ? "rotate-180" : ""}`} size={20} />
                                        </div>

                                        {showBankDropdown && (
                                            <div className="absolute top-full left-0 right-0 mt-4 p-4 bg-white rounded-[2.5rem] border border-slate-50 shadow-2xl shadow-slate-900/10 z-50 max-h-80 overflow-y-auto animate-in slide-in-from-top-4 fade-in duration-500 scrollbar-hide">
                                                {availableBanks.map((bank) => (
                                                    <button
                                                        key={bank.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({
                                                                ...formData,
                                                                bankName: bank.name,
                                                                bankLogoUrl: bank.logoUrl || ""
                                                            });
                                                            setShowBankDropdown(false);
                                                        }}
                                                        className={`w-full flex items-center gap-5 p-4 rounded-3xl transition-all mb-2 last:mb-0 ${formData.bankName === bank.name ? 'bg-orange-50 border-orange-100 shadow-sm' : 'hover:bg-slate-50 border-transparent'}`}
                                                    >
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center p-2 shadow-sm bg-white border border-slate-50`}>
                                                            {bank.logoUrl ? (
                                                                <img src={bank.logoUrl} className="w-full h-full object-contain" alt={bank.name} />
                                                            ) : (
                                                                <Building2 size={20} className="text-slate-200" />
                                                            )}
                                                        </div>
                                                        <span className={`text-sm font-bold flex-1 tracking-tight text-left ${formData.bankName === bank.name ? "text-orange-600" : "text-slate-600"}`}>
                                                            {bank.name}
                                                        </span>
                                                        {formData.bankName === bank.name && (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Holder Name */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-slate-500 ml-2">Account Holder Name</label>
                                        <div className="relative group">
                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-200">
                                                <User size={20} />
                                            </div>
                                            <input
                                                type="text"
                                                required
                                                placeholder={t.enterFullName}
                                                value={formData.holderName}
                                                onChange={(e) => setFormData({ ...formData, holderName: e.target.value })}
                                                className="w-full h-20 pl-16 pr-8 rounded-[1.8rem] bg-white border border-slate-50 focus:border-slate-900 transition-all font-bold text-sm text-slate-900 outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Account Number */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-slate-500 ml-2">Bank Account Number</label>
                                        <div className="relative group">
                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-200">
                                                <Hash size={20} />
                                            </div>
                                            <input
                                                type="text"
                                                required
                                                placeholder={t.digitsOnly}
                                                value={formData.accountNumber}
                                                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                                className="w-full h-20 pl-16 pr-8 rounded-[1.8rem] bg-white border border-slate-50 focus:border-slate-900 transition-all font-bold text-sm text-slate-900 outline-none font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-5 bg-slate-900 text-white rounded-2xl text-base font-bold flex items-center justify-center gap-3 shadow-xl shadow-slate-900/20 active:scale-95 disabled:opacity-50 mt-8 transition-all hover:bg-black"
                                >
                                    {submitting ? (
                                        <Loader2 className="animate-spin" size={24} />
                                    ) : (
                                        <>
                                            <span>{t.linkAccount}</span>
                                            <div className="w-1.5 h-1.5 rounded-full bg-white opacity-50 shrink-0"></div>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}
                </main>

                {/* Footer Component */}
                <footer className="p-10 text-center relative z-10 mt-auto">
                    <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-xl bg-slate-50 border border-slate-100 italic">
                        <Lock size={12} className="text-slate-300" />
                        <span className="text-xs font-semibold text-slate-400">{t.safeSecure}</span>
                    </div>
                </footer>
            </div>
        </div>
    );
}
