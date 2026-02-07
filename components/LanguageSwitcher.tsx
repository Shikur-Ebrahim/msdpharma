"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Languages, Check } from "lucide-react";

export default function LanguageSwitcher() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentLang, setCurrentLang] = useState("EN");

    // Load language from localStorage if exists
    useEffect(() => {
        const savedLang = localStorage.getItem("app_lang");
        if (savedLang) setCurrentLang(savedLang);
    }, []);

    const languages = [
        { code: "EN", name: "English", label: "English" },
        { code: "AM", name: "Amharic", label: "አማርኛ" }
    ];

    const toggleLanguage = (code: string) => {
        setCurrentLang(code);
        localStorage.setItem("app_lang", code);
        setIsOpen(false);
        // Dispatch custom event for real-time updates across the app if needed
        window.dispatchEvent(new Event("languageChange"));
    };

    return (
        <div className="relative">
            <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-all shadow-sm active:scale-95"
            >
                <Languages size={18} className="text-blue-900" />
                <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest leading-none">
                    {currentLang}
                </span>
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop to close on click outside */}
                        <div
                            className="fixed inset-0 z-[60]"
                            onClick={() => setIsOpen(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="absolute top-full right-0 mt-3 w-40 bg-white rounded-3xl shadow-2xl border border-blue-50 p-2 z-[70] overflow-hidden"
                        >
                            <div className="flex flex-col gap-1">
                                {languages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => toggleLanguage(lang.code)}
                                        className={`flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${currentLang === lang.code
                                                ? "bg-blue-50 text-blue-900"
                                                : "hover:bg-slate-50 text-slate-600"
                                            }`}
                                    >
                                        <div className="flex flex-col items-start translate-y-[1px]">
                                            <span className="text-[11px] font-black uppercase tracking-widest leading-none">
                                                {lang.name}
                                            </span>
                                            <span className="text-[9px] font-bold opacity-50 block mt-1">
                                                {lang.label}
                                            </span>
                                        </div>
                                        {currentLang === lang.code && (
                                            <Check size={14} className="text-blue-600" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
