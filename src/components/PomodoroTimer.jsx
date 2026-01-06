import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Clock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PomodoroTimer = ({ onSessionComplete }) => {
    const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
    const [isRunning, setIsRunning] = useState(false);
    const [sessionType, setSessionType] = useState('work'); // 'work' or 'break'
    const [sessionsCompleted, setSessionsCompleted] = useState(0);

    useEffect(() => {
        let interval;
        if (isRunning && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        handleSessionEnd();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRunning, timeLeft]);

    const handleSessionEnd = () => {
        setIsRunning(false);

        if (sessionType === 'work') {
            setSessionsCompleted(prev => prev + 1);
            setSessionType('break');
            setTimeLeft(5 * 60); // 5 minute break
            if (onSessionComplete) onSessionComplete('work');
        } else {
            setSessionType('work');
            setTimeLeft(25 * 60); // 25 minute work
            if (onSessionComplete) onSessionComplete('break');
        }

        // Play notification sound (optional)
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Pomodoro Timer', {
                body: sessionType === 'work' ? 'Work session complete! Take a break.' : 'Break over! Time to focus.',
                icon: '/icon.png'
            });
        }
    };

    const toggleTimer = () => {
        setIsRunning(!isRunning);
    };

    const resetTimer = () => {
        setIsRunning(false);
        setTimeLeft(sessionType === 'work' ? 25 * 60 : 5 * 60);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = sessionType === 'work'
        ? ((25 * 60 - timeLeft) / (25 * 60)) * 100
        : ((5 * 60 - timeLeft) / (5 * 60)) * 100;

    return (
        <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock size={16} className="text-accent" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-primary">
                        Pomodoro Timer
                    </h3>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-secondary rounded-lg">
                    <CheckCircle2 size={10} className="text-emerald-500" />
                    <span className="text-[9px] font-black text-secondary">{sessionsCompleted} Sessions</span>
                </div>
            </div>

            <div className="relative">
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                        className={`h-full ${sessionType === 'work' ? 'bg-accent' : 'bg-emerald-500'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>
            </div>

            <div className="text-center space-y-2">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${sessionType === 'work'
                        ? 'bg-accent/10 text-accent'
                        : 'bg-emerald-500/10 text-emerald-600'
                    }`}>
                    {sessionType === 'work' ? '🎯 Focus Session' : '☕ Break Time'}
                </div>

                <motion.div
                    key={timeLeft}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className="text-5xl font-black text-primary tabular-nums"
                >
                    {formatTime(timeLeft)}
                </motion.div>
            </div>

            <div className="flex gap-2">
                <motion.button
                    onClick={toggleTimer}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition ${isRunning
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                            : 'bg-accent text-white shadow-lg shadow-accent/30'
                        }`}
                >
                    {isRunning ? <Pause size={14} /> : <Play size={14} />}
                    {isRunning ? 'PAUSE' : 'START'}
                </motion.button>

                <button
                    onClick={resetTimer}
                    className="px-4 py-3 bg-bg-secondary border border-divider rounded-xl text-secondary hover:bg-secondary transition"
                >
                    <RotateCcw size={14} />
                </button>
            </div>

            <div className="grid grid-cols-4 gap-1">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className={`h-1 rounded-full ${i < sessionsCompleted % 4 ? 'bg-accent' : 'bg-secondary'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
};

export default PomodoroTimer;
