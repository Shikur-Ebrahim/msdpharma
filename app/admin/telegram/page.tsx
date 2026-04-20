"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
    ChevronLeft,
    Send,
    Users,
    MessageCircle,
    Save,
    Loader2,
    Globe,
    CheckCircle2,
    AlertCircle,
    LayoutDashboard,
    Menu
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";

export default function TelegramManagement() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState({ type: "", message: "" });
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [settings, setSettings] = useState({
        channelLink: "",
        teamLink: "",
        whatsappNumber: ""
    });

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            const isMaster = localStorage.getItem("admin_session") === "true";
            if (!user && !isMaster) {
                router.push("/");
                return;
            }
            fetchSettings();
        });

        return () => unsubscribeAuth();
    }, [router]);

    const fetchSettings = async () => {
        try {
            const docRef = doc(db, "telegram_links", "active");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setSettings({
                    channelLink: docSnap.data().channelLink || "",
                    teamLink: docSnap.data().teamLink || "",
                    whatsappNumber: docSnap.data().whatsappNumber || ""
                });
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setStatus({ type: "", message: "" });

        try {
            const docRef = doc(db, "telegram_links", "active");
            await setDoc(docRef, {
                ...settings,
                updatedAt: new Date()
            }, { merge: true });

            setStatus({ type: "success", message: "Contact links updated successfully!" });
        } catch (error) {
            console.error("Error saving settings:", error);
            setStatus({ type: "error", message: "Failed to update links. Please try again." });
        } finally {
            setSaving(false);
            setTimeout(() => setStatus({ type: "", message: "" }), 3000);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white text-purple-600">
                <Loader2 className="w-12 h-12 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8F9FD] flex">
            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="flex-1 flex flex-col min-h-screen max-w-full overflow-hidden">
                {/* Header */}
                <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between z-30">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="md:hidden w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                        >
                            <Menu size={20} />
                        </button>
                        <div>
                            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Manager / <span className="text-purple-600">Support</span></h2>
                            <h1 className="text-xl font-black text-gray-900 tracking-tight">Contact Links</h1>
                        </div>
                    </div>
                    <div className="w-10 h-10 p-1 rounded-full border-2 border-purple-100 overflow-hidden">
                        <img src="/logo.png" alt="Admin" className="w-full h-full object-contain" />
                    </div>
                </header>

                <main className="p-6 md:p-10 max-w-4xl mx-auto w-full space-y-8 pb-20">
                    {/* Intro Card */}
                    <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-purple-900/5 relative overflow-hidden border border-gray-50">
                        <div className="relative z-10">
                            <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Dynamic Support Channels ✨</h2>
                            <p className="text-gray-500 text-sm leading-relaxed max-w-xl font-medium">
                                Update the contact links for users. These changes take effect immediately on the user's Customer Service page.
                            </p>
                        </div>
                        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                            <Send size={120} className="text-purple-600 rotate-12" />
                        </div>
                    </div>

                    {/* Status Message */}
                    {status.message && (
                        <div className={`p-6 rounded-3xl flex items-center gap-4 border animate-in fade-in slide-in-from-top-2 duration-300 ${status.type === "success" ? "bg-green-50 border-green-100 text-green-600" : "bg-red-50 border-red-100 text-red-600"
                            }`}>
                            {status.type === "success" ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                            <span className="font-bold">{status.message}</span>
                        </div>
                    )}

                    {/* Management Form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Channel Link */}
                        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                                    <Send size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 leading-none mb-1">Official Channel</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Public Broadcast</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Telegram Link / Username</label>
                                <div className="relative">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        value={settings.channelLink}
                                        onChange={(e) => setSettings(prev => ({ ...prev, channelLink: e.target.value }))}
                                        placeholder="https://t.me/example or @username"
                                        className="w-full py-4 pl-12 pr-4 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-600/50 outline-none transition-all text-gray-800 font-bold text-sm shadow-inner"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Team Support Link */}
                        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                                    <Users size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 leading-none mb-1">Team Support</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Private Assistance</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Telegram Link / Username</label>
                                <div className="relative">
                                    <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        value={settings.teamLink}
                                        onChange={(e) => setSettings(prev => ({ ...prev, teamLink: e.target.value }))}
                                        placeholder="https://t.me/example or @username"
                                        className="w-full py-4 pl-12 pr-4 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-purple-600/50 outline-none transition-all text-gray-800 font-bold text-sm shadow-inner"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* WhatsApp Support */}
                        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-6 md:col-span-2">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                                    <img src="/whatsap.jpg" alt="WhatsApp" className="w-8 h-8 object-contain rounded-lg" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-gray-900 leading-none mb-1">WhatsApp Support</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Instant Message</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp Phone Number</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">+</div>
                                    <input
                                        type="text"
                                        value={settings.whatsappNumber}
                                        onChange={(e) => setSettings(prev => ({ ...prev, whatsappNumber: e.target.value.replace(/[^0-9]/g, '') }))}
                                        placeholder="251904174741"
                                        className="w-full py-4 pl-8 pr-4 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-green-600/50 outline-none transition-all text-gray-800 font-bold text-sm shadow-inner"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-10 py-5 bg-gray-900 hover:bg-black text-white font-black rounded-3xl shadow-2xl shadow-gray-950/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3 overflow-hidden relative group"
                        >
                            {saving ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    <Save size={20} className="relative z-10" />
                                    <span className="relative z-10 uppercase tracking-widest text-sm">Save Changes</span>
                                </>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                        </button>
                    </div>
                </main>
            </div>
        </div>
    );
}
