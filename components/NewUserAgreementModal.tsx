"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Gift,
    Wallet,
    Users as UsersIcon,
    Send,
    ChevronRight,
    MessageCircle,
    HeartHandshake
} from 'lucide-react';

interface NewUserAgreementModalProps {
    data: {
        weekendBonus: number;
        minWithdrawal: number;
        referralRewards: {
            levelA: number;
            levelB: number;
            levelC: number;
            levelD: number;
        };
        telegramChannel: string;
        telegramSupport: string;
    };
    onConfirm: () => void;
    lang: 'EN' | 'AM';
}

const translations = {
    EN: {
        title: "PARTNER AGREEMENT",
        weekendBonus: "Weekend Bonus",
        minWithdrawal: "Min. Withdrawal",
        inviteReward: "Invite Reward",
        joinTelegram: "Join Telegram Channel",
        supportTeam: "Support Team",
        startRefreshing: "START NOW",
        etb: "ETB"
    },
    AM: {
        title: "የአጋር ስምምነት",
        weekendBonus: "የሳምንቱ መጨረሻ ቦነስ",
        minWithdrawal: "ዝቅተኛው ወጪ",
        inviteReward: "የግብዣ ሽልማት",
        joinTelegram: "ቴሌግራም ቻናል ይቀላቀሉ",
        supportTeam: "የድጋፍ ቡድን",
        startRefreshing: "አሁን ጀምር",
        etb: "ETB"
    }
};

export default function NewUserAgreementModal({ data, onConfirm, lang }: NewUserAgreementModalProps) {
    const t = translations[lang] || translations.EN;

    const items = [
        {
            icon: <Gift className="text-orange-500" size={20} />,
            label: t.weekendBonus,
            value: `${data.weekendBonus.toLocaleString()} ${t.etb}`
        },
        {
            icon: <Wallet className="text-orange-500" size={20} />,
            label: t.minWithdrawal,
            value: `${data.minWithdrawal.toLocaleString()} ${t.etb}`
        },
        {
            icon: <UsersIcon className="text-orange-500" size={20} />,
            label: t.inviteReward,
            value: `${data.referralRewards.levelA}% - ${data.referralRewards.levelB}% - ${data.referralRewards.levelC}% - ${data.referralRewards.levelD}%`
        }
    ];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ scale: 0.85, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.85, opacity: 0, y: 20 }}
                    className="relative w-full max-w-[340px] bg-white rounded-[3rem] overflow-hidden shadow-2xl"
                >
                    {/* Compact Header */}
                    <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-8 flex flex-col items-center justify-center text-center relative">
                        <div className="bg-white p-4 rounded-[1.2rem] shadow-xl shadow-orange-900/10">
                            <HeartHandshake className="text-orange-500" size={32} />
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="px-6 py-5 space-y-4">
                        <h2 className="text-lg font-black text-blue-900 text-center uppercase tracking-tight">
                            {t.title}
                        </h2>

                        <div className="space-y-3">
                            {items.map((item, i) => (
                                <div key={i} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                                            {item.icon}
                                        </div>
                                        <span className="text-[13px] font-bold text-slate-700">{item.label}</span>
                                    </div>
                                    <span className="text-[13px] font-black text-slate-900">{item.value}</span>
                                </div>
                            ))}
                        </div>

                        {/* Telegram Links */}
                        <div className="space-y-3 pt-2 border-t border-slate-50">
                            <a
                                href={data.telegramChannel}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 group cursor-pointer"
                            >
                                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                                    <Send className="text-orange-500" size={18} />
                                </div>
                                <span className="text-[13px] font-bold text-orange-600 underline underline-offset-4 decoration-2">
                                    {t.joinTelegram}
                                </span>
                            </a>
                            <a
                                href={`https://t.me/${data.telegramSupport}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 group cursor-pointer"
                            >
                                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                                    <MessageCircle className="text-orange-500" size={18} />
                                </div>
                                <span className="text-[13px] font-bold text-orange-600 underline underline-offset-4 decoration-2">
                                    {t.supportTeam}
                                </span>
                            </a>
                        </div>
                    </div>

                    {/* Action Footer */}
                    <div className="px-6 pb-6">
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={onConfirm}
                            className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black tracking-widest uppercase text-xs flex items-center justify-center shadow-lg shadow-orange-500/20 transition-all"
                        >
                            {t.startRefreshing}
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
