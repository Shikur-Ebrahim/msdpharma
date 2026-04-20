"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { ChevronLeft, MessageCircle, ExternalLink, ShieldCheck, Loader2, Headphones, BellRing, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { translations, Language } from "@/lib/translations";

export default function ServicePage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [links, setLinks] = useState({
        channelLink: "",
        teamLink: "",
        imoNumber: "",
        whatsappNumber: ""
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
        setMounted(true);
        const fetchLinks = async () => {
            try {
                const docRef = doc(db, "telegram_links", "active");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setLinks({
                        channelLink: docSnap.data().channelLink || "",
                        teamLink: docSnap.data().teamLink || "",
                        imoNumber: docSnap.data().imoNumber || "",
                        whatsappNumber: docSnap.data().whatsappNumber || ""
                    });
                }
            } catch (error) {
                console.error("Error fetching telegram links:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLinks();
    }, []);

    const formatTG = (input: string) => {
        if (!input) return "#";
        if (input.startsWith("http")) return input;
        if (input.startsWith("@")) return `https://t.me/${input.substring(1)}`;
        return `https://t.me/${input}`;
    };

    const contactOptions = [
        {
            title: t.supportTeamTitle,
            description: t.supportTeamDesc,
            image: "/telegram team.jpg",
            link: formatTG(links.teamLink),
            color: "blue"
        },
        {
            title: t.whatsappSupportTitle,
            description: t.whatsappSupportDesc,
            image: "/whatsap.jpg",
            link: links.whatsappNumber ? `whatsapp://send?phone=${links.whatsappNumber}` : "#",
            color: "green"
        },
        {
            title: t.imoSupportTitle,
            description: t.imoSupportDesc,
            image: "/imo.jpg",
            link: links.imoNumber ? `imo://${links.imoNumber}` : "#",
            color: "yellow"
        },
        {
            title: t.officialChannelTitle,
            description: t.officialChannelDesc,
            image: "/telegram.jpg",
            link: formatTG(links.channelLink),
            color: "blue"
        }
    ];

    if (!mounted || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-12 h-12 animate-spin text-green-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white relative overflow-hidden font-sans selection:bg-blue-100">
            {/* Ambient Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-50/50 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-50/30 blur-[100px] rounded-full"></div>
            </div>

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-3xl z-40 px-6 py-5 flex items-center gap-4 border-b border-blue-50 shadow-sm max-w-lg mx-auto">
                <button
                    onClick={() => router.back()}
                    className="w-11 h-11 rounded-2xl bg-white hover:bg-blue-50 flex items-center justify-center transition-all border border-blue-100 active:scale-90 group shadow-sm"
                >
                    <ChevronLeft size={22} className="text-blue-900 group-hover:-translate-x-0.5 transition-transform" />
                </button>
                <div className="flex flex-col">
                    <h1 className="text-lg font-bold text-blue-900 leading-none">{t.customerSupport}</h1>
                    <span className="text-[10px] text-blue-900/60 mt-1">{t.helpAndSupport}</span>
                </div>
            </header>

            <main className="pt-32 px-6 max-w-lg mx-auto space-y-10 pb-32 relative z-10">
                {/* Intro Section */}
                <div className="text-center space-y-6 px-2">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="relative w-28 h-28 mx-auto group"
                    >
                        <div className="absolute inset-0 bg-blue-500 rounded-[2.5rem] blur-2xl opacity-10 group-hover:opacity-20 transition-opacity duration-500"></div>
                        <div className="relative w-full h-full bg-white rounded-[2.8rem] flex items-center justify-center shadow-2xl border border-blue-50 group-hover:rotate-6 transition-transform duration-700">
                            <Headphones size={42} className="text-blue-600" strokeWidth={2.5} />
                        </div>
                    </motion.div>
                    <div className="space-y-3">
                        <h2 className="text-3xl font-bold text-blue-900 tracking-tight leading-tight">{t.helpCenter}</h2>
                        <p className="text-sm text-blue-900/40 leading-relaxed max-w-[240px] mx-auto">
                            {t.connectWithUs}
                        </p>
                    </div>
                </div>

                {/* Contact Options Grid */}
                <div className="space-y-5">
                    {contactOptions.map((option, idx) => (
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            key={idx}
                            onClick={() => option.link && window.open(option.link, "_blank", "noopener,noreferrer")}
                            className="group relative block w-full bg-white rounded-[2.5rem] p-7 border border-blue-50 transition-all duration-500 active:scale-[0.98] overflow-hidden shadow-xl shadow-blue-900/5 hover:border-blue-100"
                        >
                            <div className="flex items-center gap-6 relative z-10">
                                <div className="w-16 h-16 shrink-0 rounded-[1.5rem] bg-blue-50 border border-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-700 relative overflow-hidden">
                                    <img
                                        src={encodeURI(option.image)}
                                        alt={option.title}
                                        className="w-10 h-10 object-contain drop-shadow-xl brightness-110"
                                    />
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <h3 className="text-lg font-bold text-blue-900 mb-1 tracking-tight leading-tight">{option.title}</h3>
                                    <p className="text-[11px] text-blue-900/40 font-medium leading-relaxed">
                                        {option.description}
                                    </p>
                                </div>
                                <div className={`w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center group-hover:translate-x-1 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-sm`}>
                                    <ExternalLink size={20} strokeWidth={2.5} />
                                </div>
                            </div>
                        </motion.button>
                    ))}
                </div>

            </main>
        </div>
    );
}
