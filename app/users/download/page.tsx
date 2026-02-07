"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Download,
    ChevronLeft,
    Smartphone,
    ShieldCheck,
    Zap,
    Star,
    CheckCircle2,
    Loader2,
    Shield,
    Share2,
    MoreVertical,
    Activity,
    CloudDownload
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { translations, Language } from "@/lib/translations";

export default function DownloadAppPage() {
    const router = useRouter();

    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstruction, setShowInstruction] = useState(false);
    const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'installed'>('idle');
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
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleDownload = async () => {
        if (!deferredPrompt) {
            setShowInstruction(true);
            return;
        }

        try {
            setInstallStatus('installing');
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                setInstallStatus('installed');
            } else {
                setInstallStatus('idle');
                setShowInstruction(true);
            }
            setDeferredPrompt(null);
        } catch (error) {
            console.error('Error during installation:', error);
            setInstallStatus('idle');
            setShowInstruction(true);
        }
    };


    return (
        <div className="min-h-screen bg-white text-blue-900 flex flex-col font-sans relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-50/50 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-50/30 blur-[100px] rounded-full"></div>
            </div>

            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-3xl px-6 h-20 flex items-center justify-between border-b border-blue-50 max-w-lg mx-auto w-full">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white border border-blue-100 text-blue-900 transition-all active:scale-95 shadow-sm">
                        <ChevronLeft size={22} className="text-blue-900" />
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-lg font-bold text-blue-900 leading-none">{t.downloadApp}</h1>
                        <span className="text-[10px] font-medium text-blue-900/40 mt-1">{t.msdMobileExp}</span>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-lg mx-auto w-full relative z-10 overflow-y-auto pb-32">
                {/* Hero App Branding Section */}
                <section className="px-6 py-12 flex flex-col items-center text-center">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-32 h-32 rounded-[2.5rem] bg-white border border-blue-50 p-6 shadow-2xl shadow-blue-900/5 mb-8 relative group"
                    >
                        <img src="/msd-logo.png" alt="MSD App" className="w-full h-full object-contain relative z-10" />
                        <div className="absolute inset-0 bg-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem]"></div>
                    </motion.div>
                    <div className="flex flex-col items-center">
                        <h1 className="text-4xl font-bold tracking-tight text-blue-900 leading-none mb-3">{t.msdMobile}</h1>
                    </div>
                </section>

                {/* Metrics */}
                <section className="px-6">
                    <div className="bg-white rounded-[2rem] p-6 border border-blue-50/50 grid grid-cols-4 gap-2 shadow-sm">
                        <div className="flex flex-col items-center gap-1.5">
                            <div className="flex items-center gap-1">
                                <span className="text-base font-bold text-blue-900">4.9</span>
                                <Star size={12} fill="#1E3A8A" className="text-blue-900" />
                            </div>
                            <span className="text-[10px] text-blue-900/40 font-bold whitespace-nowrap">{t.twelveKReviews}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1.5 border-x border-blue-100/50">
                            <div className="flex items-center gap-1">
                                <Download size={14} className="text-blue-900" />
                                <span className="text-base font-bold text-blue-900">32 MB</span>
                            </div>
                            <span className="text-[10px] text-blue-900/40 font-bold whitespace-nowrap">{t.size}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1.5 border-r border-blue-100/50">
                            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center border border-blue-200">
                                <span className="text-[10px] font-bold leading-none">3+</span>
                            </div>
                            <span className="text-[10px] text-blue-900/40 font-bold whitespace-nowrap">{t.pegiThree}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1.5">
                            <span className="text-base font-bold text-blue-900">500K+</span>
                            <span className="text-[10px] text-blue-900/40 font-bold whitespace-nowrap">{t.fiveHundredKDownloads}</span>
                        </div>
                    </div>
                </section>


                {/* Primary Action Section */}
                <section className="px-6 space-y-4">
                    {installStatus === 'idle' && (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleDownload}
                            className="w-full h-20 bg-orange-500 rounded-[2rem] flex items-center justify-center gap-4 shadow-xl shadow-orange-500/20 group transition-all"
                        >
                            <CloudDownload size={28} className="text-white" />
                            <span className="text-xl font-bold text-white tracking-wider uppercase">{t.downloadApp}</span>
                        </motion.button>
                    )}

                    {installStatus === 'installing' && (
                        <div className="w-full h-18 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-center gap-3">
                            <Loader2 size={24} className="text-blue-600 animate-spin" />
                            <span className="text-base font-bold text-blue-900/40">{t.startingDownload}</span>
                        </div>
                    )}

                    {installStatus === 'installed' && (
                        <button
                            onClick={() => router.push('/users/welcome')}
                            className="w-full h-18 bg-green-600 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-green-600/20"
                        >
                            <CheckCircle2 size={24} className="text-white" />
                            <span className="text-lg font-bold text-white">{t.openApp}</span>
                        </button>
                    )}
                </section>

                {/* Manual Instructions Info */}
                {showInstruction && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-blue-950/20 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-3xl relative border border-blue-50"
                        >
                            <button
                                onClick={() => setShowInstruction(false)}
                                className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center hover:bg-blue-50 rounded-full transition-colors"
                            >
                                <ChevronLeft size={20} className="rotate-180" />
                            </button>

                            <div className="space-y-10">
                                <div className="text-center">
                                    <div className="w-20 h-20 mx-auto mb-6 rounded-[2rem] bg-orange-50 flex items-center justify-center border border-orange-100">
                                        <Smartphone size={36} className="text-orange-500" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-blue-900">{t.howToInstall}</h2>
                                    <p className="text-xs font-semibold text-blue-900/40 mt-1">{t.followSteps}</p>
                                </div>

                                <div className="space-y-6">
                                    {[
                                        { step: "01", text: t.stepOneDownload, icon: <Share2 size={12} /> },
                                        { step: "02", text: t.stepTwoDownload, icon: <MoreVertical size={12} /> },
                                        { step: "03", text: t.stepThreeDownload, icon: <CheckCircle2 size={12} /> }
                                    ].map((s, i) => (
                                        <div key={i} className="flex gap-4 items-center">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                                                <span className="text-sm font-bold text-blue-600">{s.step}</span>
                                            </div>
                                            <p className="text-sm font-bold text-blue-900/80">{s.text}</p>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setShowInstruction(false)}
                                    className="w-full h-16 bg-blue-900 hover:bg-blue-950 rounded-2xl text-white font-bold transition-all shadow-xl shadow-blue-900/10"
                                >
                                    {t.gotIt}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </main>

            {/* Bottom Logistics */}
            <div className="fixed bottom-10 left-0 right-0 flex justify-center pointer-events-none opacity-20">
                <span className="text-[10px] font-bold text-blue-900">{t.secureDownload}</span>
            </div>
        </div>
    );
}
