import React, { useState, useEffect } from 'react';
import { Leaf, Droplet, Zap, Award, Share2, Heart } from 'lucide-react';

const EcoInsightsPanel = () => {
    const [stats, setStats] = useState({
        pagesSaved: 0,
        treesSaved: 0,
        waterSaved: 0,
        carbonOffset: 0,
        donations: 0
    });

    useEffect(() => {
        // Mock data or load from localStorage
        const saved = Math.floor(Math.random() * 500) + 1240;
        setStats({
            pagesSaved: saved,
            treesSaved: (saved / 8333).toFixed(4), // 8333 pages per tree
            waterSaved: (saved * 10).toFixed(0), // 10 liters per page
            carbonOffset: (saved * 0.05).toFixed(2), // 50g CO2 per page
            donations: Math.floor(saved / 10) // 1 rupee per 10 pages
        });
    }, []);

    const badges = [
        { id: 1, name: 'Digital Disciple', icon: <Zap size={16} />, color: '#ffd700', achieved: true },
        { id: 2, name: 'Forest Guardian', icon: <Leaf size={16} />, color: '#4caf50', achieved: true },
        { id: 3, name: 'Eco Warrior', icon: <Award size={16} />, color: '#2196f3', achieved: false },
    ];

    return (
        <div className="eco-insights-panel p-6 bg-glass border border-white/20 rounded-2xl shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-3 mb-6">
                <Leaf className="text-green-500 animate-pulse" />
                <h2 className="text-2xl font-bold text-white">Eco Insights</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="stat-card p-4 bg-white/10 rounded-xl border border-white/10">
                    <p className="text-xs text-white/60 uppercase tracking-wider">Pages Saved</p>
                    <h3 className="text-3xl font-black text-green-400">{stats.pagesSaved}</h3>
                </div>
                <div className="stat-card p-4 bg-white/10 rounded-xl border border-white/10">
                    <p className="text-xs text-white/60 uppercase tracking-wider">Trees Saved</p>
                    <h3 className="text-3xl font-black text-blue-400">{stats.treesSaved}</h3>
                </div>
                <div className="stat-card p-4 bg-white/10 rounded-xl border border-white/10">
                    <p className="text-xs text-white/60 uppercase tracking-wider">Water Saved (L)</p>
                    <h3 className="text-3xl font-black text-cyan-400">{stats.waterSaved}</h3>
                </div>
                <div className="stat-card p-4 bg-white/10 rounded-xl border border-white/10">
                    <p className="text-xs text-white/60 uppercase tracking-wider">Carbon Offset (kg)</p>
                    <h3 className="text-3xl font-black text-orange-400">{stats.carbonOffset}</h3>
                </div>
            </div>

            <div className="impact-box p-4 bg-green-500/20 border border-green-500/30 rounded-xl mb-8">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Heart className="text-red-400" size={18} />
                        <span className="text-white font-bold">Carbon Offset Donations</span>
                    </div>
                    <span className="text-green-400 font-black">₹{stats.donations}</span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed">
                    Based on your reading, we've contributed ₹{stats.donations} to global carbon offset projects. Thank you for reading digitally!
                </p>
                <button className="mt-4 w-full py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-sm transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2">
                    <Share2 size={14} /> Spread the word
                </button>
            </div>

            <div>
                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Award size={16} className="text-yellow-400" /> Mastery Badges
                </h4>
                <div className="flex gap-4">
                    {badges.map(badge => (
                        <div
                            key={badge.id}
                            className={`badge-item p-3 rounded-full flex items-center justify-center transition-all ${badge.achieved ? 'bg-white/10' : 'opacity-30 grayscale'}`}
                            title={badge.name}
                            style={{ color: badge.color, border: `1px solid ${badge.achieved ? badge.color : 'transparent'}` }}
                        >
                            {badge.icon}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default EcoInsightsPanel;
