import React, { useState } from 'react';
import { Check, X, Crown, Zap, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const PricingComparison = ({ onSelectPlan }) => {
    const [billingCycle, setBillingCycle] = useState('yearly'); // 'monthly' or 'yearly'

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
        { id: 'free', name: 'Free', price: '₹0', period: '/forever' },
        { id: 'pro', name: 'Pro', price: '₹5', period: '/month', popular: false },
        { id: 'elite', name: 'Elite', price: '₹7', period: '/month', popular: true }
    ];

    return (
        <div className="space-y-6">
            {/* Simple Heading */}
            <div className="text-center">
                <p className="text-[10px] font-black tracking-[0.2em] text-accent uppercase">Strictly Monthly Membership</p>
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
                                        onClick={() => plan.id !== 'free' && onSelectPlan && onSelectPlan(plan.id)}
                                    >
                                        {plan.popular && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent rounded-full z-20 shadow-lg group-hover:scale-110 transition-transform">
                                                <span className="text-[8px] font-black text-white uppercase tracking-widest flex items-center gap-1">
                                                    <Crown size={10} /> Most Popular
                                                </span>
                                            </div>
                                        )}
                                        <div className="text-center space-y-2 relative z-10">
                                            <p className="text-sm font-black text-primary group-hover:text-accent transition-colors tracking-tight">{plan.name}</p>
                                            <div className="group-hover:scale-110 transition-transform duration-300">
                                                <span className="text-3xl font-black text-accent">{plan.price}</span>
                                                <span className="text-xs text-secondary">{plan.period}</span>
                                            </div>
                                            {plan.savings && (
                                                <p className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 py-1 rounded-full">{plan.savings}</p>
                                            )}
                                            {plan.id !== 'free' && (
                                                <div
                                                    className={`w-full mt-3 px-4 py-2.5 rounded-xl text-[10px] font-black transition-all duration-300 ${plan.popular
                                                        ? 'bg-accent text-white shadow-lg shadow-accent/30 scale-105'
                                                        : 'bg-secondary text-primary group-hover:bg-accent group-hover:text-white'
                                                        }`}
                                                >
                                                    {plan.popular ? <Sparkles size={12} className="inline mr-1" /> : null}
                                                    {plan.popular ? 'Unlock Now' : 'Get Started'}
                                                </div>
                                            )}
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
                    <span className="text-[10px] font-bold text-secondary">30-Day Money Back</span>
                </div>
                <div className="flex items-center gap-2">
                    <Crown size={16} className="text-amber-500" />
                    <span className="text-[10px] font-bold text-secondary">50,000+ Happy Users</span>
                </div>
            </div>
        </div>
    );
};

export default PricingComparison;
