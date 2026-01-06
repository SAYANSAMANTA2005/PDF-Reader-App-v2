import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePDF } from '../context/PDFContext';
import {
    Users,
    Globe,
    Share2,
    MessageCircle,
    MoreVertical,
    Heart,
    ArrowUpCircle,
    PlayCircle,
    UserCircle,
    Plus,
    Box,
    Calendar,
    Zap,
    BookOpen,
    Code,
    ExternalLink,
    Terminal,
    Key,
    Save,
    CheckCircle2,
    Trophy,
    Target,
    Users2,
    Video,
    Mic,
    Share,
    Gift,
    Rocket,
    Clock,
    ShoppingBag
} from 'lucide-react';
import {
    exportToAnki,
    exportToNotion,
    exportToReadwise,
    exportToZotero,
    syncToCalendar,
    setupLTI,
    generateDeveloperApiKey
} from '../utils/integrationService';
import {
    generatePublicShareLink,
    inviteFriend,
    getReferralRewards,
    autoPlanStudy
} from '../utils/growthService';
import { setApiKeys } from '../utils/aiService';
import PomodoroTimer from './PomodoroTimer';
import AmbientSoundPlayer from './AmbientSoundPlayer';
import StudyStats from './StudyStats';
import * as storage from '../utils/storageService';

const EcosystemPanel = () => {
    const {
        mentorPersona, setMentorPersona, flashcards, citations, pdfText,
        referralPoints, setReferralPoints, referralCount, leaderboardData,
        studySessions, setStudySessions, activeCall, setActiveCall
    } = usePDF();
    const [activeTab, setActiveTab] = useState('rooms'); // rooms, community, persona, integrations, planner
    const [devApiKey, setDevApiKey] = useState(localStorage.getItem("DEV_API_KEY") || '');
    const [multiApiKeys, setMultiApiKeys] = useState(() => {
        const saved = localStorage.getItem("GEMINI_API_KEYS");
        return saved ? JSON.parse(saved) : ['', '', '', '', ''];
    });
    const [ltiConfig, setLtiConfig] = useState({ url: '', key: '', secret: '' });
    const [saveStatus, setSaveStatus] = useState(null);

    const handleSaveKeys = () => {
        setApiKeys(multiApiKeys);
        setSaveStatus('keys');
        setTimeout(() => setSaveStatus(null), 3000);
    };

    const handleGenerateDevKey = () => {
        const key = generateDeveloperApiKey();
        setDevApiKey(key);
    };

    const tabs = [
        { id: 'rooms', label: 'Rooms', icon: <Video size={14} /> },
        { id: 'community', label: 'Community', icon: <Globe size={14} /> },
        { id: 'planner', label: 'Planner', icon: <Calendar size={14} /> },
        { id: 'persona', label: 'Persona', icon: <UserCircle size={14} /> },
        { id: 'integrations', label: 'Tools', icon: <Box size={14} /> },
    ];

    return (
        <div className="ecosystem-panel h-full flex flex-col bg-primary/30">
            <div className="px-4 py-3 border-b bg-bg-secondary sticky top-0 z-10">
                <div className="flex bg-secondary/50 p-1 rounded-xl border border-divider overflow-x-auto no-scrollbar gap-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center justify-center gap-1.5 py-2 px-4 text-[10px] font-extrabold rounded-lg transition whitespace-nowrap ${activeTab === tab.id ? 'bg-white dark:bg-accent text-accent dark:text-white shadow-sm ring-1 ring-black/5' : 'text-secondary hover:bg-secondary'}`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-8">
                {activeTab === 'community' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                        {/* Referrals & Growth - Premium Card */}
                        <section>
                            <div className="bg-gradient-to-br from-accent to-indigo-600 p-5 rounded-2xl text-white shadow-xl shadow-accent/20 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <Rocket size={80} />
                                </div>
                                <div className="relative z-10 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Referral Credits</p>
                                            <h3 className="text-3xl font-black mt-1">{referralPoints}</h3>
                                        </div>
                                        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                                            <Gift size={20} />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-[10px] font-bold">
                                            <span>Progress to Pro Lock</span>
                                            <span>{referralCount}/5 Joined</span>
                                        </div>
                                        <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                                            <div className="h-full bg-white transition-all duration-1000" style={{ width: `${Math.min(100, (referralCount / 5) * 100)}%` }}></div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            placeholder="friend@university.edu"
                                            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-[10px] text-white placeholder:text-white/50 focus:bg-white/20 outline-none transition"
                                        />
                                        <button className="bg-white text-accent px-4 py-2 rounded-xl text-[10px] font-black hover:bg-opacity-90 transition">
                                            INVITE
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Leaderboard */}
                        <section>
                            <div className="flex items-center justify-between mb-4 px-1">
                                <h4 className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-2">
                                    <Trophy size={14} className="text-amber-500" />
                                    Campus Leaders
                                </h4>
                                <button className="text-[10px] font-bold text-accent">FULL RANKINGS</button>
                            </div>
                            <div className="glass-card overflow-hidden">
                                {leaderboardData.map((user, i) => (
                                    <div key={i} className={`flex items-center gap-4 p-4 ${i !== leaderboardData.length - 1 ? 'border-b border-divider/40' : ''} hover:bg-secondary/30 transition`}>
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-accent/20 to-purple-500/20 flex items-center justify-center text-sm font-black text-accent border border-accent/10">
                                                {user.avatar}
                                            </div>
                                            {i === 0 && <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 border-2 border-white dark:border-bg-secondary"><Trophy size={8} className="text-white" /></div>}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-black text-primary">{user.name}</p>
                                            <p className="text-[9px] text-secondary font-medium">{user.badge}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-accent">{user.points}</p>
                                            <p className="text-[8px] text-secondary font-bold">PTS</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Social Feed */}
                        <section>
                            <h4 className="text-[10px] font-black text-secondary uppercase tracking-widest mb-4 px-1 flex items-center gap-2">
                                <Globe size={14} className="text-indigo-500" />
                                Global Discourse
                            </h4>
                            <div className="space-y-3">
                                {[
                                    { user: "AlexP", content: "Condensed summary of Diagonalization using matrix similarity. Must read!", upvotes: 42, color: "bg-blue-500" },
                                    { user: "SarahStudy", content: "Found a contradiction between Spivak and Stewart on Pg 45.", upvotes: 89, color: "bg-purple-500" }
                                ].map((post, i) => (
                                    <div key={i} className="glass-card p-4 hover:border-indigo-400/50 transition cursor-pointer space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-6 h-6 ${post.color} rounded-lg flex items-center justify-center text-white text-[10px] font-black`}>{post.user[0]}</div>
                                            <span className="text-[11px] font-black text-primary">{post.user}</span>
                                            <span className="ml-auto text-[9px] text-secondary font-bold">2h ago</span>
                                        </div>
                                        <p className="text-[12px] text-secondary leading-relaxed font-medium">"{post.content}"</p>
                                        <div className="flex items-center gap-4 pt-1">
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-secondary">
                                                <Heart size={12} className="text-rose-500" />
                                                {post.upvotes}
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-secondary">
                                                <MessageCircle size={12} className="text-indigo-400" />
                                                12
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'rooms' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                        {/* Room Templates */}
                        <section>
                            <h4 className="text-[10px] font-black text-secondary uppercase tracking-widest px-1 mb-4 flex items-center gap-2">
                                <PlayCircle size={14} className="text-rose-500" />
                                Study Room Templates
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { name: 'Solo Focus', desc: 'Deep work mode', icon: '🎯', color: 'from-blue-500 to-cyan-500' },
                                    { name: 'Group Study', desc: 'Collaborative', icon: '👥', color: 'from-purple-500 to-pink-500' },
                                    { name: 'Exam Prep', desc: 'High intensity', icon: '🔥', color: 'from-orange-500 to-red-500' },
                                    { name: 'Research Lab', desc: 'Long-form reading', icon: '🔬', color: 'from-emerald-500 to-teal-500' }
                                ].map((template, i) => (
                                    <motion.button
                                        key={template.name}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="glass-card p-4 text-left group hover:border-accent transition"
                                    >
                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center text-2xl mb-2 shadow-lg`}>
                                            {template.icon}
                                        </div>
                                        <p className="text-xs font-black text-primary">{template.name}</p>
                                        <p className="text-[9px] text-secondary mt-0.5">{template.desc}</p>
                                    </motion.button>
                                ))}
                            </div>
                        </section>

                        {/* Pomodoro Timer */}
                        <PomodoroTimer onSessionComplete={() => {
                            // Add study session to stats
                            const studyData = storage.getItem('study_statistics', { sessions: [], streak: 0 });
                            studyData.sessions.push({
                                date: new Date().toISOString(),
                                minutes: 25,
                                pages: 0
                            });
                            storage.setItem('study_statistics', studyData);
                        }} />

                        {/* Study Statistics */}
                        <StudyStats />

                        {/* Live Study Rooms */}
                        <section>
                            <div className="flex justify-between items-center mb-4 px-1">
                                <h4 className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-2">
                                    <Users2 size={14} className="text-indigo-500" />
                                    Live Community Rooms
                                </h4>
                                <button className="bg-accent/10 p-2 rounded-xl text-accent hover:bg-accent/20 transition">
                                    <Plus size={16} />
                                </button>
                            </div>

                            <div className="room-card border-none bg-gradient-to-br from-rose-500 to-orange-500 p-0.5 shadow-xl shadow-rose-500/20">
                                <div className="bg-white dark:bg-bg-secondary rounded-[calc(var(--radius-lg)-2px)] p-5 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></div>
                                            <span className="text-[10px] font-black text-rose-500 uppercase tracking-tighter">Live Session</span>
                                        </div>
                                        <div className="flex -space-x-2">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="w-6 h-6 rounded-full border-2 border-white dark:border-bg-secondary bg-accent flex items-center justify-center text-[8px] text-white font-black">U{i}</div>
                                            ))}
                                            <div className="w-6 h-6 rounded-full border-2 border-white dark:border-bg-secondary bg-secondary flex items-center justify-center text-[8px] text-secondary font-black">+8</div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-primary">Neural Networks & Backpropagation</h3>
                                        <p className="text-[10px] text-secondary font-medium mt-1">Deep Learning | Session 4</p>
                                    </div>
                                    <button onClick={() => setActiveCall({ roomId: 'live-1' })} className="w-full bg-rose-500 text-white py-3 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 shadow-lg shadow-rose-500/30 hover:scale-[1.02] transition">
                                        <Mic size={14} /> JOIN SESSION
                                    </button>
                                </div>
                            </div>

                            <div className="grid gap-3 mt-6">
                                {[
                                    { name: "JEE Physics 2026", users: 12, topic: "Electromagnetism", icon: <Zap size={14} /> },
                                    { name: "PhD Thesis Review", users: 3, topic: "Chapter 4 Ref", icon: <BookOpen size={14} /> }
                                ].map((room, i) => (
                                    <div key={i} className="glass-card p-4 hover:border-accent group cursor-pointer flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition">
                                            {room.icon}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-black text-primary">{room.name}</p>
                                            <p className="text-[10px] text-secondary font-medium mt-0.5">{room.topic}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-secondary rounded-lg">
                                            <Users2 size={10} className="text-secondary" />
                                            <span className="text-[10px] font-black text-secondary">{room.users}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'planner' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                        {/* Intelligent Study Course */}
                        <section className="space-y-4">
                            <h4 className="text-[10px] font-black text-secondary uppercase tracking-widest px-1 flex items-center gap-2">
                                <Rocket size={14} className="text-orange-500" />
                                Study Course Overview
                            </h4>
                            <div className="glass-card p-5 bg-gradient-to-br from-secondary/50 to-bg-secondary border-none shadow-sm space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-600 flex-shrink-0">
                                        <Zap size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h5 className="text-xs font-black text-primary">Mastering the Fundamentals</h5>
                                        <p className="text-[10px] text-secondary font-medium mt-1 leading-relaxed">System-generated study path based on your recent PDF annotations and difficulty markers.</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { task: "Finish Chapter 4 Notes", status: "completed" },
                                        { task: "Generate Flashcards for Equations", status: "pending" },
                                        { task: "Take Mock Quiz (10 mins)", status: "pending" }
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 bg-primary/40 rounded-xl">
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${item.status === 'completed' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-divider'}`}>
                                                {item.status === 'completed' && <CheckCircle2 size={10} />}
                                            </div>
                                            <span className={`text-[10px] font-bold ${item.status === 'completed' ? 'text-secondary line-through' : 'text-primary'}`}>
                                                {item.task}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* Focus Mode Planner */}
                        <section className="space-y-4">
                            <h4 className="text-[10px] font-black text-secondary uppercase tracking-widest px-1 flex items-center gap-2">
                                <Target size={14} className="text-accent" />
                                Today's Focus Goals
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="glass-card p-4 flex flex-col items-center gap-2 border-b-4 border-b-accent">
                                    <span className="text-lg font-black text-accent">3.5h</span>
                                    <span className="text-[9px] font-black text-secondary uppercase">Target Time</span>
                                </div>
                                <div className="glass-card p-4 flex flex-col items-center gap-2 border-b-4 border-b-emerald-500">
                                    <span className="text-lg font-black text-emerald-500">12</span>
                                    <span className="text-[9px] font-black text-secondary uppercase">Pages Target</span>
                                </div>
                            </div>
                        </section>

                        {/* Auto-Plan Generator */}
                        <div className="bg-bg-secondary border-2 border-dashed border-divider p-6 rounded-2xl text-center space-y-4">
                            <Calendar size={32} className="mx-auto text-secondary opacity-30" />
                            <div className="space-y-1">
                                <p className="text-xs font-black text-primary">Need a structured plan?</p>
                                <p className="text-[10px] text-secondary font-medium">Auto-generate a daily schedule using AI.</p>
                            </div>
                            <button onClick={autoPlanStudy} className="premium-btn w-full">
                                GENERATE MASTER PLAN
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'persona' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                        <section>
                            <h4 className="text-[10px] font-black text-secondary uppercase tracking-widest px-1 mb-4">AI Mentor Configuration</h4>
                            <div className="grid gap-3">
                                {[
                                    { id: 'Friendly Tutor', desc: "Patient, encouraging, uses analogies", icon: "✨", color: "from-sky-400 to-blue-500" },
                                    { id: 'Strict Exam Coach', desc: "Demanding, rigorous, exam-focused", icon: "🔥", color: "from-orange-400 to-red-600" },
                                    { id: 'Research Advisor', desc: "Academic tone, citation-focused", icon: "🎓", color: "from-indigo-400 to-blue-700" },
                                    { id: 'Explain Like I\'m 12', desc: "Simple terms, fun examples", icon: "👶", color: "from-emerald-400 to-teal-600" }
                                ].map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setMentorPersona(p.id)}
                                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group ${mentorPersona === p.id ? 'border-accent bg-accent/5 ring-4 ring-accent/5' : 'border-divider bg-bg-secondary hover:border-accent/30'}`}
                                    >
                                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${p.color} flex items-center justify-center text-2xl shadow-lg ring-4 ring-white dark:ring-bg-secondary`}>
                                            {p.icon}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-black text-primary">{p.id}</p>
                                            <p className="text-[10px] text-secondary font-medium mt-0.5">{p.desc}</p>
                                        </div>
                                        {mentorPersona === p.id && <CheckCircle2 size={16} className="text-accent" />}
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'integrations' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                        <section className="space-y-4">
                            <h4 className="text-[10px] font-black text-secondary uppercase tracking-widest px-1 flex items-center gap-2">
                                <Key size={14} className="text-accent" />
                                AI Failover Engine
                            </h4>
                            <div className="glass-card p-5 space-y-4">
                                <p className="text-[10px] text-secondary font-medium leading-relaxed">Configure up to 5 Gemini keys. If one hits a rate limit, the system automatically cycles to the next.</p>
                                <div className="space-y-2">
                                    {multiApiKeys.map((key, i) => (
                                        <div key={i} className="relative group">
                                            <input
                                                type="password"
                                                value={key}
                                                onChange={(e) => {
                                                    const newKeys = [...multiApiKeys];
                                                    newKeys[i] = e.target.value;
                                                    setMultiApiKeys(newKeys);
                                                }}
                                                placeholder={`API Key ${i + 1}`}
                                                className="w-full bg-primary border-none rounded-xl px-4 py-3 text-[10px] focus:ring-2 focus:ring-accent transition outline-none"
                                            />
                                            {key && <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />}
                                        </div>
                                    ))}
                                </div>
                                <button onClick={handleSaveKeys} className="premium-btn w-full">
                                    {saveStatus === 'keys' ? <div className="flex items-center gap-2"><CheckCircle2 size={14} /> KEYS DEPLOYED</div> : 'DEPLOY SYSTEM'}
                                </button>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h4 className="text-[10px] font-black text-secondary uppercase tracking-widest px-1 flex items-center gap-2">
                                <Share size={14} className="text-indigo-500" />
                                Workflow Bridges
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { name: "Anki", icon: "🎴", action: () => exportToAnki(flashcards || []) },
                                    { name: "Notion", icon: "📝", action: () => exportToNotion(pdfText || "", "Study Notes") },
                                    { name: "Zotero", icon: "📚", action: () => exportToZotero(citations) },
                                    { name: "Readwise", icon: "📖", action: () => exportToReadwise() }
                                ].map(tool => (
                                    <button key={tool.name} onClick={tool.action} className="glass-card p-4 flex flex-col items-center gap-2 hover:border-indigo-400 group">
                                        <span className="text-2xl group-hover:scale-110 transition">{tool.icon}</span>
                                        <span className="text-[10px] font-black text-secondary">{tool.name}</span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h4 className="text-[10px] font-black text-secondary uppercase tracking-widest px-1 flex items-center gap-2">
                                <Code size={14} className="text-emerald-500" />
                                Developer API
                            </h4>
                            <div className="bg-bg-secondary border-2 border-dashed border-divider p-6 rounded-2xl text-center space-y-4">
                                {devApiKey ? (
                                    <div className="space-y-3">
                                        <code className="text-[10px] font-black text-accent bg-accent/10 px-3 py-2 rounded-lg block overflow-hidden text-ellipsis">{devApiKey}</code>
                                        <p className="text-[9px] text-secondary font-bold">Your private SDK access key</p>
                                    </div>
                                ) : (
                                    <>
                                        <Terminal size={32} className="mx-auto text-secondary opacity-30" />
                                        <button onClick={handleGenerateDevKey} className="text-[10px] font-black text-accent px-6 py-2 border-2 border-accent rounded-xl hover:bg-accent hover:text-white transition">
                                            PROVISION API ACCESS
                                        </button>
                                    </>
                                )}
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
};


export default EcosystemPanel;
