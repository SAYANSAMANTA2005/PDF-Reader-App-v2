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
        { name: "Custom Mentor Personas", free: false, pro: false, elite: true }
    ];

    const plans = {
        monthly: [
            { id: 'free', name: 'Free', price: '$0', period: '/forever' },
            { id: 'pro', name: 'Pro', price: '$9.99', period: '/month', popular: false },
            { id: 'elite', name: 'Elite', price: '$19.99', period: '/month', popular: true }
        ],
        yearly: [
            { id: 'free', name: 'Free', price: '$0', period: '/forever' },
            { id: 'pro', name: 'Pro', price: '$79.99', period: '/year', savings: 'Save $40', popular: false },
            { id: 'elite', name: 'Elite', price: '$199.99', period: '/lifetime', savings: 'One-time', popular: true }
        ]
    };

    const currentPlans = plans[billingCycle];

    return (
        <div className="space-y-6">
            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4">
                <span className={`text-xs font-bold ${billingCycle === 'monthly' ? 'text-primary' : 'text-secondary'}`}>
                    Monthly
                </span>
                <button
                    onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                    className="relative w-14 h-7 bg-secondary rounded-full transition"
                >
                    <motion.div
                        className="absolute top-1 w-5 h-5 bg-accent rounded-full shadow-lg"
                        animate={{ left: billingCycle === 'monthly' ? 4 : 32 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                </button>
                <span className={`text-xs font-bold ${billingCycle === 'yearly' ? 'text-primary' : 'text-secondary'} flex items-center gap-1`}>
                    Yearly
                    {billingCycle === 'yearly' && (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 text-[9px] rounded-full font-black">
                            BEST VALUE
                        </span>
                    )}
                </span>
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
                                {currentPlans.map(plan => (
                                    <th key={plan.id} className="p-4 relative">
                                        {plan.popular && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent rounded-full">
                                                <span className="text-[8px] font-black text-white uppercase tracking-widest flex items-center gap-1">
                                                    <Crown size={10} /> Most Popular
                                                </span>
                                            </div>
                                        )}
                                        <div className="text-center space-y-1">
                                            <p className="text-sm font-black text-primary">{plan.name}</p>
                                            <div>
                                                <span className="text-2xl font-black text-accent">{plan.price}</span>
                                                <span className="text-xs text-secondary">{plan.period}</span>
                                            </div>
                                            {plan.savings && (
                                                <p className="text-[9px] font-bold text-emerald-600">{plan.savings}</p>
                                            )}
                                            {plan.id !== 'free' && (
                                                <button
                                                    onClick={() => onSelectPlan && onSelectPlan(plan.id)}
                                                    className={`w-full mt-2 px-4 py-2 rounded-xl text-[10px] font-black transition ${plan.popular
                                                            ? 'bg-accent text-white shadow-lg shadow-accent/30'
                                                            : 'bg-secondary text-primary hover:bg-accent hover:text-white'
                                                        }`}
                                                >
                                                    {plan.popular ? <Sparkles size={12} className="inline mr-1" /> : null}
                                                    Get Started
                                                </button>
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
