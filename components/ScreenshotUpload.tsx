"use client";

import { UploadCloud, Loader2, X, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { translations, Language } from "@/lib/translations";

interface ScreenshotUploadProps {
    onUploadSuccess: (url: string) => void;
    theme?: "regular" | "express";
}

export default function ScreenshotUpload({ onUploadSuccess, theme = "regular" }: ScreenshotUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
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

    const accentColor = theme === "regular" ? "text-emerald-500" : "text-orange-500";
    const bgColor = theme === "regular" ? "bg-emerald-50" : "bg-orange-50";
    const borderColor = theme === "regular" ? "border-emerald-200" : "border-orange-200";

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview
        const reader = new FileReader();
        reader.onloadend = () => setPreviewUrl(reader.result as string);
        reader.readAsDataURL(file);

        setIsUploading(true);
        setStatus(t.uploadingStatus);

        const uploadData = new FormData();
        uploadData.append("file", file);
        uploadData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ml_default");

        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
                { method: "POST", body: uploadData }
            );
            const data = await response.json();

            if (data.secure_url) {
                onUploadSuccess(data.secure_url);
                setStatus(t.successStatus);
                toast.success(t.uploadSuccessToast);
            } else {
                setStatus(t.failedStatus);
                toast.error(t.uploadFailedToast);
            }
        } catch (error) {
            console.error("Upload error:", error);
            setStatus(t.errorStatus);
            toast.error(t.uploadErrorToast);
        } finally {
            setIsUploading(false);
            setTimeout(() => setStatus(null), 3000);
        }
    };

    const clearPreview = () => {
        setPreviewUrl(null);
        onUploadSuccess("");
    };

    return (
        <div className="space-y-4">
            <div className={`relative group/upload w-full h-48 rounded-[2rem] border-2 border-dashed transition-all overflow-hidden ${previewUrl ? 'border-solid' : 'hover:border-indigo-400 hover:bg-slate-50 border-slate-200'
                } ${previewUrl && borderColor}`}>

                <input
                    type="file"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    accept="image/*"
                    disabled={isUploading}
                />

                <AnimatePresence mode="wait">
                    {previewUrl ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 w-full h-full"
                        >
                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/upload:opacity-100 transition-opacity">
                                <p className="text-white font-bold flex items-center gap-2">
                                    <ImageIcon size={20} />
                                    {t.changeImage}
                                </p>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    clearPreview();
                                }}
                                className="absolute top-4 right-4 z-30 w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
                        >
                            <div className={`w-16 h-16 rounded-3xl ${bgColor} flex items-center justify-center mb-4`}>
                                {isUploading ? (
                                    <Loader2 size={32} className={`animate-spin ${accentColor}`} />
                                ) : (
                                    <UploadCloud size={32} className="text-slate-400" />
                                )}
                            </div>
                            <p className="text-slate-900 font-bold">
                                {isUploading ? t.uploadingScreenshot : t.uploadPaymentScreenshot}
                            </p>
                            <p className="text-slate-400 text-xs mt-1 font-medium">
                                {t.fileSizeLimit}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {status && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-lg ${status === t.successStatus ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                            }`}>
                            {status}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
