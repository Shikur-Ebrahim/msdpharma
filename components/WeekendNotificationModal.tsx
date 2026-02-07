"use client";

import { motion, AnimatePresence } from "framer-motion";
import { PartyPopper } from "lucide-react";
import { useEffect, useState } from "react";
import { translations, Language } from "@/lib/translations";

interface WeekendNotificationModalProps {
    title: string;
    message: string;
    onConfirm: () => void;
}

export default function WeekendNotificationModal({
    title,
    message,
    onConfirm
}: WeekendNotificationModalProps) {
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
    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-sm bg-white rounded-[2rem] overflow-hidden shadow-2xl shadow-orange-500/20 ring-1 ring-orange-100"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Decorative Header Background */}
                    <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-orange-400 to-orange-600">
                        {/* Abstract bubbles */}
                        <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                        <div className="absolute bottom-[-10%] left-[-10%] w-24 h-24 bg-black/10 rounded-full blur-xl" />
                    </div>

                    <div className="relative pt-8 px-6 pb-6 flex flex-col items-center text-center">
                        {/* Icon Badge */}
                        <div className="w-20 h-20 rounded-2xl bg-white shadow-xl shadow-orange-900/10 flex items-center justify-center text-orange-500 mb-6 rotate-3 transform border-4 border-white">
                            <PartyPopper size={32} strokeWidth={2.5} />
                        </div>

                        {/* Content */}
                        <h3 className="text-xl font-black text-blue-900 uppercase tracking-tight mb-3">
                            {title}
                        </h3>

                        <p className="text-sm font-medium text-gray-500 leading-relaxed mb-8 px-2">
                            {message}
                        </p>

                        {/* Action Button */}
                        <button
                            onClick={onConfirm}
                            className="w-full py-4 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-orange-500/25 transition-all text-sm"
                        >
                            {t.checkItOut}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
