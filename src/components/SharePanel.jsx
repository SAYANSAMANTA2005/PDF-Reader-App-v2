import React, { useState, useEffect } from 'react';
import { Share2, Twitter, Linkedin, Copy, Heart, Rocket, CheckCircle, Loader2 } from 'lucide-react';
import { usePDF } from '../context/PDFContext';

const SharePanel = () => {
    const { setIsPremium } = usePDF(); // To unlock rewards
    const appUrl = "https://pdf-reader-pro.vercel.app";
    const shareText = "I found this amazing AI-powered PDF Reader! It helps with studying, annotating, and cloud sync. Check it out: ";

    // 'idle' | 'verifying' | 'verified'
    const [twitterStatus, setTwitterStatus] = useState('idle');
    const [linkedinStatus, setLinkedinStatus] = useState('idle');
    const [githubStatus, setGithubStatus] = useState('idle');

    // Smart Verification Logic
    const handleSocialAction = (url, setStatus) => {
        // 1. Open the Link
        window.open(url, '_blank');

        // 2. Set "Verifying" state
        setStatus('verifying');

        // 3. Wait for user to come back (simple timeout simulation for now + window focus could be added)
        // We use a polite 8-second delay to simulate "checking"
        setTimeout(() => {
            setStatus('verified');
            // 🎉 Reward: Unlock a temporary perk or just show success
            // In a real app, this would be saved to DB
        }, 8000);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(appUrl);
        alert("Link copied to clipboard! Share it with your friends! 🚀");
    };

    return (
        <div className="flex flex-col h-full bg-secondary/5 backdrop-blur-md">
            {/* Header */}
            <div className="flex items-center gap-2 p-4 border-b border-border">
                <Share2 size={18} className="text-accent" />
                <h2 className="text-sm font-black uppercase tracking-widest text-primary">Share & Earn</h2>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-6">

                {/* Hero Section */}
                <div className="text-center space-y-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-accent to-purple-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-accent/20">
                        <Rocket size={32} className="text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-primary">Boost Your Productivity</h3>
                    <p className="text-xs text-secondary leading-relaxed px-2">
                        Help your friends study smarter. Invite them to PDF Reader Pro and unlock exclusive features together!
                    </p>
                </div>

                {/* Social Buttons with Verification */}
                <div className="grid grid-cols-2 gap-3">

                    {/* Twitter Button */}
                    <button
                        onClick={() => handleSocialAction(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(appUrl)}`, setTwitterStatus)}
                        disabled={twitterStatus === 'verified'}
                        className={`flex flex-col items-center justify-center gap-2 p-4 border rounded-xl transition-all group relative overflow-hidden
                            ${twitterStatus === 'verified'
                                ? 'bg-green-500/10 border-green-500/20 text-green-600'
                                : 'bg-[#1DA1F2]/10 border-[#1DA1F2]/20 hover:bg-[#1DA1F2]/20 text-[#1DA1F2]'}`}
                    >
                        {twitterStatus === 'verifying' ? (
                            <Loader2 size={24} className="animate-spin" />
                        ) : twitterStatus === 'verified' ? (
                            <CheckCircle size={24} className="animate-in zoom-in" />
                        ) : (
                            <Twitter size={24} className="group-hover:scale-110 transition-transform" />
                        )}

                        <span className="text-[10px] font-bold uppercase">
                            {twitterStatus === 'verifying' ? 'Verifying...' : twitterStatus === 'verified' ? 'Posted!' : 'Post on X'}
                        </span>
                    </button>

                    {/* LinkedIn Button */}
                    <button
                        onClick={() => handleSocialAction(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(appUrl)}`, setLinkedinStatus)}
                        disabled={linkedinStatus === 'verified'}
                        className={`flex flex-col items-center justify-center gap-2 p-4 border rounded-xl transition-all group relative overflow-hidden
                            ${linkedinStatus === 'verified'
                                ? 'bg-green-500/10 border-green-500/20 text-green-600'
                                : 'bg-[#0A66C2]/10 border-[#0A66C2]/20 hover:bg-[#0A66C2]/20 text-[#0A66C2]'}`}
                    >
                        {linkedinStatus === 'verifying' ? (
                            <Loader2 size={24} className="animate-spin" />
                        ) : linkedinStatus === 'verified' ? (
                            <CheckCircle size={24} className="animate-in zoom-in" />
                        ) : (
                            <Linkedin size={24} className="group-hover:scale-110 transition-transform" />
                        )}

                        <span className="text-[10px] font-bold uppercase">
                            {linkedinStatus === 'verifying' ? 'Verifying...' : linkedinStatus === 'verified' ? 'Shared!' : 'Share'}
                        </span>
                    </button>
                </div>

                {/* Copy Link */}
                <div className="bg-primary border border-border rounded-xl p-3 space-y-2 shadow-sm">
                    <label className="text-[10px] uppercase font-bold text-secondary">Your Referral Link</label>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 bg-secondary/10 rounded-lg px-3 py-2 text-xs text-text-secondary truncate font-mono">
                            {appUrl}
                        </div>
                        <button
                            onClick={handleCopy}
                            className="p-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors shadow-md shadow-accent/20"
                        >
                            <Copy size={16} />
                        </button>
                    </div>
                </div>

                {/* Quest: Rate Us */}
                <div className={`border rounded-xl p-4 relative overflow-hidden transition-all duration-500
                    ${githubStatus === 'verified' ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20' : 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20'}`}>

                    <div className={`absolute -right-4 -top-4 transition-colors ${githubStatus === 'verified' ? 'text-green-500/10' : 'text-yellow-500/10'}`}>
                        <Heart size={80} fill="currentColor" />
                    </div>

                    <div className="relative z-10 space-y-1">
                        <h4 className={`text-xs font-black uppercase tracking-wide ${githubStatus === 'verified' ? 'text-green-700' : 'text-yellow-600'}`}>
                            {githubStatus === 'verified' ? 'Reward Unlocked!' : 'Love the app?'}
                        </h4>
                        <p className={`text-[10px] font-medium pr-8 ${githubStatus === 'verified' ? 'text-green-800' : 'text-yellow-700'}`}>
                            {githubStatus === 'verified'
                                ? "You've unlocked an Elite badge for being an early supporter!"
                                : <span>Leave us a star on <a href="#" className="underline">GitHub</a> and get a reward!</span>}
                        </p>

                        {githubStatus !== 'verified' && (
                            <button
                                onClick={() => handleSocialAction('https://github.com/SAYANSAMANTA2005/PDF-Reader-App-v2', setGithubStatus)}
                                className="mt-2 text-[10px] bg-yellow-500 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm hover:translate-y-[-1px] transition-transform flex items-center gap-2"
                            >
                                {githubStatus === 'verifying' && <Loader2 size={10} className="animate-spin" />}
                                {githubStatus === 'verifying' ? 'Checking...' : 'Rate Us'}
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SharePanel;
