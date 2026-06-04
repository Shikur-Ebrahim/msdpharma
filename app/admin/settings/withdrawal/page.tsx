"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import {
    Settings,
    Loader2,
    Menu,
    RefreshCcw,
    Save,
    Coins,
    Calendar,
    Clock
} from "lucide-react";
import { toast } from "sonner";

const DAYS = [
    { label: "Monday", value: 1 },
    { label: "Tuesday", value: 2 },
    { label: "Wednesday", value: 3 },
    { label: "Thursday", value: 4 },
    { label: "Friday", value: 5 },
    { label: "Saturday", value: 6 },
    { label: "Sunday", value: 0 },
];

export default function WithdrawalSettingsPage() {
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [settings, setSettings] = useState({
        minAmount: 300,
        maxAmount: 40000,
        activeDays: [1, 2, 3, 4, 5, 6], // Monday to Saturday (Excluding Sunday by default)
        startTime: "08:00",
        endTime: "17:00",
        frequency: 1,
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            const isMaster = localStorage.getItem("admin_session") === "true";
            if (!user && !isMaster) {
                router.push("/");
            } else {
                fetchSettings();
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, "GlobalSettings", "withdrawal");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setSettings({
                    minAmount: data.minAmount ?? 300,
                    maxAmount: data.maxAmount ?? 40000,
                    activeDays: data.activeDays ?? [1, 2, 3, 4, 5, 6],
                    startTime: data.startTime ?? "08:00",
                    endTime: data.endTime ?? "17:00",
                    frequency: data.frequency ?? 1,
                });
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
            toast.error("Failed to load settings");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (settings.minAmount < 0 || settings.maxAmount < 0) {
            toast.error("Amounts cannot be negative");
            return;
        }
        if (settings.minAmount >= settings.maxAmount) {
            toast.error("Minimum amount must be less than maximum amount");
            return;
        }

        setSaving(true);
        try {
            await setDoc(doc(db, "GlobalSettings", "withdrawal"), {
                ...settings,
                activeDays: settings.activeDays.map((d) => Number(d)),
                updatedAt: new Date().toISOString()
            }, { merge: true });
            toast.success("Withdrawal settings updated successfully");
        } catch (error) {
            console.error("Error saving settings:", error);
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const toggleDay = (dayValue: number) => {
        setSettings(prev => ({
            ...prev,
            activeDays: prev.activeDays.includes(dayValue)
                ? prev.activeDays.filter(d => d !== dayValue)
                : [...prev.activeDays, dayValue]
        }));
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

            <div className="flex-1 flex flex-col min-h-screen w-full">
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
                            <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none">Withdrawal Config</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Global Withdrawal Policy</p>
                        </div>
                    </div>

                    <button
                        onClick={fetchSettings}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                    >
                        <RefreshCcw size={20} />
                    </button>
                </header>

                <main className="p-4 sm:p-8 max-w-2xl mx-auto w-full space-y-10">
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                <Settings size={20} />
                            </div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Withdrawal Limits</h3>
                        </div>

                        <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 border-2 border-slate-100 shadow-2xl shadow-slate-900/5 space-y-10">
                            {/* Min Amount */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 px-1">
                                    <div className="w-1.5 h-4 bg-indigo-600 rounded-full"></div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Minimum Withdrawal (ETB)</label>
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors">
                                        <Coins size={24} />
                                    </div>
                                    <input
                                        type="number"
                                        value={settings.minAmount}
                                        onChange={(e) => setSettings(prev => ({ ...prev, minAmount: Number(e.target.value) }))}
                                        placeholder="Enter min amount..."
                                        className="w-full h-20 pl-16 pr-8 bg-slate-50 border-2 border-slate-50 rounded-3xl focus:outline-none focus:border-indigo-500/20 focus:bg-white transition-all text-2xl font-black tracking-tighter"
                                    />
                                </div>
                            </div>

                            {/* Max Amount */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 px-1">
                                    <div className="w-1.5 h-4 bg-indigo-600 rounded-full"></div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Maximum Withdrawal (ETB)</label>
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors">
                                        <Coins size={24} />
                                    </div>
                                    <input
                                        type="number"
                                        value={settings.maxAmount}
                                        onChange={(e) => setSettings(prev => ({ ...prev, maxAmount: Number(e.target.value) }))}
                                        placeholder="Enter max amount..."
                                        className="w-full h-20 pl-16 pr-8 bg-slate-50 border-2 border-slate-50 rounded-3xl focus:outline-none focus:border-indigo-500/20 focus:bg-white transition-all text-2xl font-black tracking-tighter"
                                    />
                                </div>
                            </div>

                            {/* Frequency */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 px-1">
                                    <div className="w-1.5 h-4 bg-indigo-600 rounded-full"></div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Withdrawal Frequency (Days)</label>
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors">
                                        <Calendar size={24} />
                                    </div>
                                    <input
                                        type="number"
                                        value={settings.frequency || 1}
                                        onChange={(e) => setSettings(prev => ({ ...prev, frequency: Number(e.target.value) }))}
                                        placeholder="e.g. 1 (per day), 2 (every 2 days)..."
                                        className="w-full h-20 pl-16 pr-8 bg-slate-50 border-2 border-slate-50 rounded-3xl focus:outline-none focus:border-indigo-500/20 focus:bg-white transition-all text-2xl font-black tracking-tighter"
                                    />
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 px-2 leading-relaxed">
                                    Set how many days a user must wait between withdrawals. Reset occurs at 0:00 (midnight).
                                    <br />1 = Once per calendar day, 2 = Once every 2 calendar days, etc.
                                </p>
                            </div>

                            <div className="pt-6 border-t border-slate-100 space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
                                        <Calendar size={20} />
                                    </div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Active Days</h3>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    {DAYS.map((day) => {
                                        const isActive = settings.activeDays.includes(day.value);
                                        return (
                                            <button
                                                key={day.value}
                                                onClick={() => toggleDay(day.value)}
                                                className={`px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${isActive
                                                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                                                    : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                                                    }`}
                                            >
                                                {day.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-600/20">
                                        <Clock size={20} />
                                    </div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Withdrawal Hours</h3>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none ml-1">Start Time</label>
                                        <input
                                            type="time"
                                            value={settings.startTime}
                                            onChange={(e) => setSettings(prev => ({ ...prev, startTime: e.target.value }))}
                                            className="w-full h-16 px-6 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:outline-none focus:border-amber-500/20 focus:bg-white transition-all font-black text-lg"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none ml-1">End Time</label>
                                        <input
                                            type="time"
                                            value={settings.endTime}
                                            onChange={(e) => setSettings(prev => ({ ...prev, endTime: e.target.value }))}
                                            className="w-full h-16 px-6 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:outline-none focus:border-amber-500/20 focus:bg-white transition-all font-black text-lg"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full h-20 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-[0.3em] hover:bg-black active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-4 shadow-2xl shadow-slate-900/10 mt-10"
                            >
                                {saving ? (
                                    <Loader2 className="animate-spin" size={24} />
                                ) : (
                                    <>
                                        <Save size={20} />
                                        <span>Apply Global Settings</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}
