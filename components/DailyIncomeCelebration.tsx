"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PartyPopper, TrendingUp, Sparkles, X } from 'lucide-react';

interface DailyIncomeCelebrationProps {
    amount: number;
    lang: 'EN' | 'AM';
    onClose: () => void;
}

const translations = {
    EN: {
        dailyIncomeReached: "Daily Income Reached",
        congratulations: "Congratulations!",
        checkItOut: "OK, Check it out!"
    },
    AM: {
        dailyIncomeReached: "የቀን ገቢ ደርሷል",
        congratulations: "እንኳን ደስ አለዎት!",
        checkItOut: "እሺ፣ ተመልከተው!"
    }
};

// Realistic Physics-based Firework
const RealisticFirework = ({ delay, x, y }: { delay: number; x: number; y: number }) => {
    const particleCount = 70; // Increased for more density
    const colors = ['#00BFFF', '#FFD700', '#00FF7F', '#FF4500', '#FF1493', '#FFFFFF', '#7FFF00', '#00FFFF'];
    const mainColor = useMemo(() => colors[Math.floor(Math.random() * colors.length)], []);

    const particles = useMemo(() => {
        return Array.from({ length: particleCount }).map((_, i) => {
            const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.4;
            const velocity = 2.5 + Math.random() * 5;
            const size = 1.5 + Math.random() * 2.5;
            const life = 1.2 + Math.random() * 1.8;
            const drift = (Math.random() - 0.5) * 60;

            return { angle, velocity, size, life, drift };
        });
    }, [particleCount]);

    return (
        <div style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, zIndex: 40 }}>
            {particles.map((p, i) => (
                <motion.div
                    key={i}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                        x: [
                            0,
                            Math.cos(p.angle) * p.velocity * 120,
                            Math.cos(p.angle) * p.velocity * 180 + p.drift
                        ],
                        y: [
                            0,
                            Math.sin(p.angle) * p.velocity * 120,
                            Math.sin(p.angle) * p.velocity * 180 + 120 // Gravity fall
                        ],
                        opacity: [1, 1, 0],
                        scale: [1, 1.4, 0],
                    }}
                    transition={{
                        duration: p.life,
                        delay: delay,
                        ease: [0.1, 0.6, 0.2, 1],
                    }}
                    style={{
                        position: 'absolute',
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        backgroundColor: mainColor,
                        borderRadius: '50%',
                        boxShadow: `0 0 6px ${mainColor}, 0 0 12px ${mainColor}`,
                    }}
                >
                    {i % 4 === 0 && (
                        <motion.div
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 0.15, repeat: Infinity, delay: delay + 0.4 }}
                            style={{
                                width: '100%',
                                height: '100%',
                                backgroundColor: 'white',
                                borderRadius: '50%',
                                filter: 'blur(1.5px)'
                            }}
                        />
                    )}
                </motion.div>
            ))}
        </div>
    );
};

const FloatingParticle = ({ i }: { i: number }) => (
    <motion.div
        animate={{
            y: [0, -40, 0],
            x: [0, Math.random() * 30 - 15, 0],
            opacity: [0.1, 0.6, 0.1],
            scale: [1, 1.4, 1]
        }}
        transition={{
            duration: 5 + Math.random() * 4,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut"
        }}
        style={{
            position: 'absolute',
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            width: `${1 + Math.random() * 4}px`,
            height: `${1 + Math.random() * 4}px`,
            background: 'white',
            borderRadius: '50%',
            filter: 'blur(2px)',
            zIndex: 10
        }}
    />
);

export default function DailyIncomeCelebration({ amount, lang, onClose }: DailyIncomeCelebrationProps) {
    const t = translations[lang] || translations.EN;
    const [show, setShow] = useState(true);

    // Positions optimized for mobile aspect ratio (taller, narrower)
    const fireworkPositions = useMemo(() => [
        { x: 25, y: 20, delay: 0.1 },
        { x: 75, y: 15, delay: 0.5 },
        { x: 50, y: 35, delay: 0.9 },
        { x: 20, y: 55, delay: 1.3 },
        { x: 80, y: 45, delay: 1.7 },
        { x: 45, y: 75, delay: 2.1 },
        { x: 15, y: 30, delay: 2.5 },
    ], []);

    const handleClose = () => {
        setShow(false);
        setTimeout(onClose, 500);
    };

    return (
        <AnimatePresence>
            {show && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    {/* Deep Cinematic Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/95 backdrop-blur-md"
                        onClick={handleClose}
                    />

                    {/* Realistic Fireworks Layer */}
                    <div className="fixed inset-0 pointer-events-none overflow-hidden">
                        {fireworkPositions.map((fw, i) => (
                            <RealisticFirework key={i} x={fw.x} y={fw.y} delay={fw.delay} />
                        ))}
                        {[...Array(40)].map((_, i) => (
                            <FloatingParticle key={i} i={i} />
                        ))}

                        {/* Immersive Glows */}
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 via-transparent to-black/80" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[80%] bg-blue-500/5 blur-[200px] rounded-full rotate-45" />
                    </div>

                    {/* Celebration Card - Mobile Optimized */}
                    <motion.div
                        initial={{ scale: 0.7, opacity: 0, y: 40 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.7, opacity: 0, y: 40 }}
                        transition={{
                            type: "spring",
                            damping: 22,
                            stiffness: 140
                        }}
                        className="relative w-full max-w-[340px] perspective-1000"
                    >
                        {/* Elegant Floating Motion */}
                        <motion.div
                            animate={{ y: [0, -12, 0] }}
                            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                            className="bg-white/10 backdrop-blur-3xl rounded-[3rem] p-8 border border-white/20 shadow-[0_30px_100px_rgba(0,0,0,0.6)] relative overflow-hidden"
                        >
                            {/* Animated Background Highlights */}
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                                className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-orange-500/10 via-transparent to-transparent blur-[100px]"
                            />

                            <div className="flex flex-col items-center text-center space-y-8 relative z-10">
                                {/* Premium Glass Icon Container */}
                                <motion.div
                                    animate={{
                                        scale: [1, 1.08, 1],
                                        boxShadow: [
                                            "0 15px 35px rgba(249,115,22,0.2)",
                                            "0 15px 50px rgba(249,115,22,0.4)",
                                            "0 15px 35px rgba(249,115,22,0.2)"
                                        ]
                                    }}
                                    transition={{ duration: 5, repeat: Infinity }}
                                    className="w-24 h-24 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded-[2.2rem] flex items-center justify-center relative"
                                >
                                    <TrendingUp size={42} className="text-white drop-shadow-2xl" strokeWidth={3} />
                                    <motion.div
                                        animate={{
                                            opacity: [0.6, 1, 0.6],
                                            scale: [0.9, 1.2, 0.9],
                                        }}
                                        transition={{ duration: 3, repeat: Infinity }}
                                        className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-1 shadow-lg"
                                    >
                                        <Sparkles className="text-white" size={20} fill="white" />
                                    </motion.div>
                                </motion.div>

                                <div className="space-y-3">
                                    <motion.p
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className="text-[9px] font-black uppercase text-orange-400 tracking-[0.5em]"
                                    >
                                        {t.congratulations}
                                    </motion.p>
                                    <h3 className="text-2xl font-black text-white leading-tight tracking-tight px-2">
                                        {t.dailyIncomeReached}
                                    </h3>
                                </div>

                                {/* Highlighted Glassmorphic Card */}
                                <motion.div
                                    initial={{ y: 15, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] py-8 px-4 relative group"
                                >
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-white to-orange-300 drop-shadow-glow">
                                                +{amount.toLocaleString()}
                                            </span>
                                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">ETB</span>
                                        </div>
                                    </div>

                                    {/* Subtle light sweep */}
                                    <motion.div
                                        animate={{ x: ['-100%', '200%'] }}
                                        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 pointer-events-none"
                                    />
                                </motion.div>

                                <div className="w-full pt-2">
                                    <button
                                        onClick={handleClose}
                                        className="w-full h-15 bg-white text-slate-900 rounded-[1.8rem] font-black tracking-widest uppercase text-xs hover:bg-slate-50 active:scale-90 transition-all shadow-[0_20px_40px_rgba(0,0,0,0.3)] flex items-center justify-center gap-3"
                                    >
                                        <PartyPopper size={18} className="text-orange-500 animate-pulse" />
                                        {t.checkItOut}
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        {/* Minimal Discreet Close */}
                        <button
                            onClick={handleClose}
                            className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-white transition-all transform hover:rotate-90 active:scale-75"
                        >
                            <X size={20} />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
