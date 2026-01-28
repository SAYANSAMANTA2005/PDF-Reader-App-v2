import React, { useState } from 'react';
import { Check, X, Crown, Zap, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const PricingComparison = ({ onSelectPlan }) => {
    // Removed unused billingCycle state

    const features = [
        { name: "AI Quiz Generator", free: false, pro: true, elite: true },
        { name: "Deep OCR Search", free: false, pro: true, elite: true },
        { name: "Neural TTS", free: false, pro: true, elite: true },
        { name: "Smart Export (Notion, Obsidian)", free: false, pro: true, elite: true },
        { name: "PDF Editor", free: false, pro: false, elite: true },
        { name: "AI Flashcards", free: true, pro: true, elite: true },
        { name: "Basic Summaries", free: true, pro: true, elite: true },
        { name: "Equation Recognition", free: false, pro: true, elite: true },
        { name: "Growth Tracking", free: false, pro: true, elite: true },
        { name: "Priority AI Models", free: false, pro: false, elite: true },
        { name: "Lifetime Updates", free: false, pro: false, elite: true },
        { name: "Multi-Format Converter (Word, Excel, JPG)", free: false, pro: true, elite: true },
        { name: "Batch File Processing", free: false, pro: false, elite: true },
        { name: "OCR-Powered Document Recon", free: false, pro: false, elite: true },
        { name: "Custom Mentor Personas", free: false, pro: false, elite: true }
    ];

    const plans = [
        { id: 'free', name: 'Free', price: '₹0', period: '', displayPrice: 'Free' },
        { id: 'pro', name: 'Pro', price: 'FREE', period: '', originalPrice: '3 Friends', popular: false },
        { id: 'elite', name: 'Elite', price: 'FREE', period: '', originalPrice: '5 Friends', popular: true }
    ];

    return (
        <div className="space-y-6">
            {/* Simple Heading */}
            <div className="text-center">
                <p className="text-[10px] font-black tracking-[0.2em] text-accent uppercase animate-pulse">Launch Offer: All Plans FREE</p>
            </div>

            {/* Comparison Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-divider">
                                <th className="text-left p-4 text-xs font-black uppercase tracking-widest text-secondary">
                                    Features
                                </th>
                                {plans.map(plan => (
                                    <th
                                        key={plan.id}
                                        className={`p-4 relative transition-all duration-300 ${plan.id !== 'free' ? 'cursor-pointer hover:bg-accent/10 rounded-2xl group active:scale-95' : ''}`}
                                    >
                                        {plan.popular && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent rounded-full z-20 shadow-lg group-hover:scale-110 transition-transform">
                                                <span className="text-[8px] font-black text-white uppercase tracking-widest flex items-center gap-1">
                                                    <Crown size={10} /> Limited Time
                                                </span>
                                            </div>
                                        )}
                                        <div className="text-center space-y-2 relative z-10 pt-4">
                                            <p className="text-sm font-black text-primary group-hover:text-accent transition-colors tracking-tight h-5">{plan.name}</p>
                                            <div className="group-hover:scale-110 transition-transform duration-300 min-h-[50px] flex flex-col items-center justify-center">
                                                {plan.originalPrice && (
                                                    <span className="text-[9px] text-secondary line-through font-medium opacity-70 mb-1">{plan.originalPrice}</span>
                                                )}
                                                <span className="text-3xl font-black text-accent leading-none">{plan.price}</span>
                                            </div>

                                            <div
                                                className={`w-full mt-2 px-3 py-2 rounded-xl text-[9px] font-black transition-all duration-300 ${plan.popular
                                                    ? 'bg-accent text-white shadow-lg shadow-accent/30'
                                                    : 'bg-secondary/10 text-primary'
                                                    }`}
                                            >
                                                {plan.popular ? <Sparkles size={10} className="inline mr-1" /> : null}
                                                Active Now
                                            </div>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {features.map((feature, i) => (
                                <tr key={i} className={`border-b border-divider/30 ${i % 2 === 0 ? 'bg-primary/5' : ''}`}>
                                    <td className="p-4 text-xs font-medium text-secondary">
                                        {feature.name}
                                    </td>
                                    <td className="p-4 text-center">
                                        {feature.free ? (
                                            <Check size={16} className="text-emerald-500 mx-auto" />
                                        ) : (
                                            <X size={16} className="text-secondary/30 mx-auto" />
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        {feature.pro ? (
                                            <Check size={16} className="text-emerald-500 mx-auto" />
                                        ) : (
                                            <X size={16} className="text-secondary/30 mx-auto" />
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        {feature.elite ? (
                                            <Check size={16} className="text-accent mx-auto" />
                                        ) : (
                                            <X size={16} className="text-secondary/30 mx-auto" />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-8 flex-wrap p-6 bg-secondary/30 rounded-2xl">
                <div className="flex items-center gap-2">
                    <Zap size={16} className="text-accent" />
                    <span className="text-[10px] font-bold text-secondary">Instant Access</span>
                </div>
                <div className="flex items-center gap-2">
                    <Check size={16} className="text-emerald-500" />
                    <span className="text-[10px] font-bold text-secondary">Unlimited Sharing</span>
                </div>
                <div className="flex items-center gap-2">
                    <Crown size={16} className="text-amber-500" />
                    <span className="text-[10px] font-bold text-secondary">Premium Features</span>
                </div>
            </div>
        </div>
    );
};

export default PricingComparison;
