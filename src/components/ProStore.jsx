import React, { useState, useRef } from 'react';
import { usePDF } from '../context/PDFContext';
import {
    Zap,
    Crown,
    Check,
    Clock,
    Award,
    Shield,
    CreditCard,
    ArrowRight,
    Layout,
    FileText,
    Settings,
    Sparkles,
    Brain,
    Mic,
    Scissors,
    FileSearch,
    Share,
    Bookmark,
    RefreshCw,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import PremiumToolsHub from './PremiumToolsHub';
import TestimonialCarousel from './TestimonialCarousel';
import PricingComparison from './PricingComparison';

// Simple confetti component to avoid external dependency
const SimpleConfetti = () => (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
        {Array.from({ length: 50 }).map((_, i) => (
            <div
                key={i}
                className="absolute w-2 h-2 bg-accent rounded-full animate-confetti"
                style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${2 + Math.random() * 2}s`
                }}
            />
        ))}
    </div>
);

const ProStore = () => {
    const { isPremium, setIsPremium } = usePDF();
    const [showCheckout, setShowCheckout] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState('yearly');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const pricingRef = useRef(null);

    const scrollToPricing = () => {
        pricingRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handlePurchase = () => {
        setIsProcessing(true);

        // Simulate payment processing
        setTimeout(() => {
            setIsProcessing(false);
            setShowSuccess(true);

            // Hide checkout and show success confetti
            setTimeout(() => {
                setIsPremium(true);
                setShowCheckout(false);
                setShowSuccess(false);
            }, 3000);
        }, 2000);
    };

    if (isPremium) {
        return <PremiumToolsHub />;
    }

    return (
        <div className="bg-primary/20 p-2 md:p-10 relative overflow-y-auto h-screen custom-scrollbar">
            {showSuccess && <SimpleConfetti />}

            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-6xl mx-auto relative z-10">
                {/* Header */}
                <div className="text-center space-y-4 mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 bg-accent/10 px-4 py-2 rounded-full border border-accent/20"
                    >
                        <Zap size={16} className="text-accent" />
                        <span className="text-accent text-xs font-black uppercase tracking-widest">Limited Time Offer</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-black text-primary tracking-tight cursor-pointer"
                        onClick={scrollToPricing}
                    >
                        Unlock Your <span className="gradient-text">Genius Mode</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-secondary text-sm md:text-base max-w-2xl mx-auto font-medium leading-relaxed"
                    >
                        Transform your PDF reading into an AI-powered learning experience. Join 50,000+ students who've increased their productivity by 300%.
                    </motion.p>
                </div>

                <motion.div
                    ref={pricingRef}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-16 scroll-mt-20"
                >
                    <PricingComparison onSelectPlan={(plan) => {
                        setSelectedPlan(plan);
                        setShowCheckout(true);
                    }} />
                </motion.div>

                {/* Feature Showcase - Elite Tools Preview */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mb-16"
                >
                    <h2 className="text-2xl font-black text-center text-primary mb-8">
                        What You'll Get Access To
                    </h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { icon: <Brain size={24} />, title: "AI Quiz Generator", desc: "Smart exam prep with adaptive difficulty", color: "from-purple-500 to-indigo-600" },
                            { icon: <RefreshCw size={24} />, title: "Elite Converter", desc: "PDF to Word, Excel & Image instantly", color: "from-emerald-500 to-cyan-600" },
                            { icon: <FileSearch size={24} />, title: "Deep OCR Engine", desc: "Search any text in scanned PDFs", color: "from-blue-500 to-cyan-600" },
                            { icon: <Mic size={24} />, title: "Neural TTS", desc: "Listen to your documents with AI voice", color: "from-orange-500 to-red-600" },
                            { icon: <Share size={24} />, title: "Smart Export", desc: "Export to Notion, Obsidian & more", color: "from-pink-500 to-rose-600" },
                            { icon: <Scissors size={24} />, title: "Pro PDF Editor", desc: "Edit, merge, rotate PDFs effortlessly", color: "from-emerald-500 to-teal-600" },
                            { icon: <Sparkles size={24} />, title: "AI Flashcards", desc: "Auto-generated study materials", color: "from-amber-500 to-yellow-600" }
                        ].map((feature, i) => (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 + i * 0.1 }}
                                className="glass-card p-6 hover:scale-105 transition-transform"
                            >
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white shadow-lg mb-4`}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-sm font-black text-primary mb-2">{feature.title}</h3>
                                <p className="text-xs text-secondary leading-relaxed">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Testimonials */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mb-16"
                >
                    <TestimonialCarousel />
                </motion.div>

                {/* FAQ Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="mb-16"
                >
                    <h2 className="text-2xl font-black text-center text-primary mb-8">
                        Frequently Asked Questions
                    </h2>
                    <div className="space-y-4 max-w-3xl mx-auto">
                        {[
                            { q: "Can I cancel anytime?", a: "Yes! No long-term commitments. Cancel with one click." },
                            { q: "Do you offer a free trial?", a: "We offer a 30-day money-back guarantee instead." },
                            { q: "What payment methods do you accept?", a: "We accept all major credit cards, UPI, and more." },
                            { q: "Can I use it offline?", a: "Yes! Most features work offline once your PDF is loaded." }
                        ].map((faq, i) => (
                            <div key={i} className="glass-card p-5">
                                <h4 className="text-sm font-black text-primary mb-2 flex items-center gap-2">
                                    <ArrowRight size={14} className="text-accent" />
                                    {faq.q}
                                </h4>
                                <p className="text-xs text-secondary leading-relaxed pl-6">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Checkout Modal */}
            <AnimatePresence>
                {showCheckout && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
                        onClick={() => !isProcessing && setShowCheckout(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="glass-card p-8 max-w-md w-full space-y-6 relative"
                        >
                            <button
                                onClick={() => !isProcessing && setShowCheckout(false)}
                                className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-lg transition"
                                disabled={isProcessing}
                            >
                                <X size={16} />
                            </button>

                            <div className="text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-accent to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl mx-auto mb-4 shadow-lg">
                                    <Crown />
                                </div>
                                <h3 className="text-xl font-black text-primary mb-2">Complete Your Purchase</h3>
                                <p className="text-xs text-secondary">Secure checkout simulation</p>
                            </div>

                            {!showSuccess ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-secondary mb-2 block">Card Number</label>
                                        <input
                                            type="text"
                                            placeholder="4242  4242  4242  4242"
                                            className="premium-input w-full"
                                            disabled={isProcessing}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-secondary mb-2 block">Expiry</label>
                                            <input
                                                type="text"
                                                placeholder="MM / YY"
                                                className="premium-input w-full"
                                                disabled={isProcessing}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-secondary mb-2 block">CVC</label>
                                            <input
                                                type="text"
                                                placeholder="123"
                                                className="premium-input w-full"
                                                disabled={isProcessing}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={handlePurchase}
                                        disabled={isProcessing}
                                        className={`premium-btn w-full !bg-accent ${isProcessing ? 'opacity-50' : ''}`}
                                    >
                                        {isProcessing ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                Processing...
                                            </div>
                                        ) : (
                                            <>
                                                <CreditCard size={16} className="inline mr-2" />
                                                Pay {selectedPlan === 'pro' ? '₹5' : '₹7'}
                                            </>
                                        )}
                                    </button>

                                    <div className="flex items-center justify-center gap-4 text-[9px] text-secondary">
                                        <div className="flex items-center gap-1">
                                            <Shield size={10} /> Secure Encryption
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Check size={10} /> Instant Activation
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="text-center space-y-4 py-8"
                                >
                                    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white text-3xl mx-auto shadow-lg">
                                        <Check />
                                    </div>
                                    <h4 className="text-xl font-black text-primary">Welcome to Pro!</h4>
                                    <p className="text-xs text-secondary">All features are now unlocked. Enjoy!</p>
                                </motion.div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProStore;

