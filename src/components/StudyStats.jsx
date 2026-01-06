import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, BookOpen, Flame, BarChart3, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import * as storage from '../utils/storageService';

const StudyStats = () => {
    const [stats, setStats] = useState({
        todayMinutes: 0,
        weekMinutes: 0,
        monthMinutes: 0,
        streak: 0,
        totalPages: 0,
        avgFocusTime: 0,
        lastStudyDate: null
    });

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = () => {
        const studyData = storage.getItem('study_statistics', {
            sessions: [],
            streak: 0,
            lastStudyDate: null
        });

        const now = new Date();
        const today = now.toDateString();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const todaySessions = studyData.sessions.filter(s =>
            new Date(s.date).toDateString() === today
        );
        const weekSessions = studyData.sessions.filter(s =>
            new Date(s.date) >= weekAgo
        );
        const monthSessions = studyData.sessions.filter(s =>
            new Date(s.date) >= monthAgo
        );

        const todayMinutes = todaySessions.reduce((sum, s) => sum + s.minutes, 0);
        const weekMinutes = weekSessions.reduce((sum, s) => sum + s.minutes, 0);
        const monthMinutes = monthSessions.reduce((sum, s) => sum + s.minutes, 0);
        const totalPages = studyData.sessions.reduce((sum, s) => sum + (s.pages || 0), 0);
        const avgFocusTime = studyData.sessions.length > 0
            ? Math.round(studyData.sessions.reduce((sum, s) => sum + s.minutes, 0) / studyData.sessions.length)
            : 0;

        setStats({
            todayMinutes,
            weekMinutes,
            monthMinutes,
            streak: studyData.streak || 0,
            totalPages,
            avgFocusTime,
            lastStudyDate: studyData.lastStudyDate
        });
    };

    const addStudySession = (minutes, pages = 0) => {
        const studyData = storage.getItem('study_statistics', {
            sessions: [],
            streak: 0,
            lastStudyDate: null
        });

        const now = new Date();
        const today = now.toDateString();

        // Add session
        studyData.sessions.push({
            date: now.toISOString(),
            minutes,
            pages
        });

        // Update streak
        const lastDate = studyData.lastStudyDate ? new Date(studyData.lastStudyDate).toDateString() : null;
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();

        if (lastDate === yesterday || lastDate === today) {
            if (lastDate !== today) {
                studyData.streak = (studyData.streak || 0) + 1;
            }
        } else if (lastDate !== today) {
            studyData.streak = 1;
        }

        studyData.lastStudyDate = now.toISOString();

        storage.setItem('study_statistics', studyData);
        loadStats();
    };

    const formatTime = (minutes) => {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hrs > 0) return `${hrs}h ${mins}m`;
        return `${mins}m`;
    };

    const statCards = [
        {
            label: 'Today',
            value: formatTime(stats.todayMinutes),
            icon: <Clock size={16} />,
            color: 'from-blue-500 to-cyan-500'
        },
        {
            label: 'This Week',
            value: formatTime(stats.weekMinutes),
            icon: <Calendar size={16} />,
            color: 'from-purple-500 to-pink-500'
        },
        {
            label: 'Streak',
            value: `${stats.streak} days`,
            icon: <Flame size={16} />,
            color: 'from-orange-500 to-red-500'
        },
        {
            label: 'Pages Read',
            value: stats.totalPages,
            icon: <BookOpen size={16} />,
            color: 'from-emerald-500 to-teal-500'
        }
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-accent" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-primary">
                        Study Statistics
                    </h3>
                </div>
                <button className="text-[9px] font-bold text-accent hover:underline">
                    View All
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {statCards.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass-card p-4 space-y-3"
                    >
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-lg`}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-2xl font-black text-primary">{stat.value}</p>
                            <p className="text-[9px] font-bold text-secondary uppercase tracking-widest mt-1">
                                {stat.label}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {stats.avgFocusTime > 0 && (
                <div className="glass-card p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <BarChart3 size={14} className="text-indigo-500" />
                            <span className="text-[10px] font-black text-secondary uppercase tracking-widest">
                                Average Focus
                            </span>
                        </div>
                        <span className="text-xs font-black text-accent">{stats.avgFocusTime} min</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (stats.avgFocusTime / 60) * 100)}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                        />
                    </div>
                </div>
            )}

            {/* Exposed for Pomodoro integration */}
            <div data-stats-ready="true" />
        </div>
    );
};

export default StudyStats;
