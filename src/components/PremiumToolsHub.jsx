import React, { useState, useEffect, useCallback } from 'react';
import { usePDF } from '../context/PDFContext';
import {
    Brain, Scissors, Mic, FileSearch, Share, Sparkles, Play, Pause, Download,
    Plus, Trash2, Copy, ArrowRight, FileText, Loader2, RotateCw, Check,
    Settings, Save, Eye, TrendingUp, BookOpen, Zap, Star, AlertCircle,
    Clock, History, Upload, Bookmark, CheckCircle2, XCircle, Timer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as aiService from '../utils/aiService';
import { extractTextRangeDetailed } from '../utils/pdfHelpers';
import * as pdfEditService from '../utils/pdfEditService';
import * as storage from '../utils/storageService';
import PageRangeSelector from './PageRangeSelector';
import { SkeletonBox, QuizQuestionSkeleton } from './LoadingSkeleton';
import { useToast } from './ToastNotification';

const PremiumToolsHub = () => {
    const { pdfDocument, pdfFile, fileName } = usePDF();
    const [activeTool, setActiveTool] = useState(null);

    const tools = [
        { id: 'quiz', icon: <Brain />, title: 'AI Quiz Engine', color: 'bg-purple-500' },
        { id: 'edit', icon: <Scissors />, title: 'PDF Editor', color: 'bg-emerald-500' },
        { id: 'ocr', icon: <FileSearch />, title: 'Deep OCR', color: 'bg-blue-500' },
        { id: 'tts', icon: <Mic />, title: 'Neural TTS', color: 'bg-orange-500' },
        { id: 'export', icon: <Share />, title: 'Smart Export', color: 'bg-pink-500' },
    ];

    return (
        <div className="flex flex-col h-full bg-primary/10">
            <header className="p-6 border-b border-divider bg-bg-primary/50 backdrop-blur-md">
                <h2 className="text-xl font-black gradient-text">Elite Tools</h2>
                <p className="text-[10px] text-secondary font-black uppercase tracking-widest mt-1">Production-Grade Workflow Suite</p>
            </header>

            <div className="p-4 grid grid-cols-5 gap-2 border-b border-divider bg-bg-secondary/30">
                {tools.map(tool => (
                    <motion.button
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${activeTool === tool.id ? 'bg-accent text-white shadow-lg' : 'bg-bg-primary text-secondary hover:bg-bg-secondary'
                            }`}
                    >
                        <div className={`p-2 rounded-lg ${activeTool === tool.id ? 'bg-white/20' : tool.color + ' text-white'}`}>
                            {React.cloneElement(tool.icon, { size: 18 })}
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-tighter text-center">{tool.title}</span>
                    </motion.button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <AnimatePresence mode="wait">
                    {!activeTool && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center h-full text-center space-y-4"
                        >
                            <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center">
                                <Sparkles size={40} className="text-accent animate-pulse" />
                            </div>
                            <h3 className="text-primary font-black">Select a Tool to Begin</h3>
                            <p className="text-secondary text-xs max-w-xs leading-relaxed">
                                Choose an elite power from the top bar to enhance your reading and productivity workflow.
                            </p>
                        </motion.div>
                    )}

                    {activeTool === 'quiz' && <QuizToolEnhanced key="quiz" />}
                    {activeTool === 'edit' && <EditToolEnhanced key="edit" />}
                    {activeTool === 'ocr' && <OCRToolEnhanced key="ocr" />}
                    {activeTool === 'tts' && <TTSToolEnhanced key="tts" />}
                    {activeTool === 'export' && <ExportToolEnhanced key="export" />}
                </AnimatePresence>
            </div>
        </div>
    );
};

/* ==================== PRODUCTION-GRADE QUIZ ENGINE ==================== */
const QuizToolEnhanced = () => {
    const { pdfDocument, fileName } = usePDF();
    const toast = useToast();
    const [status, setStatus] = useState('idle'); // 'idle', 'generating', 'studying', 'complete'
    const [questions, setQuestions] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [score, setScore] = useState(0);
    const [pageRange, setPageRange] = useState({ start: 1, end: 1, isValid: false });
    const [difficulty, setDifficulty] = useState('medium');
    const [questionType, setQuestionType] = useState('mcq');
    const [questionCount, setQuestionCount] = useState(5);
    const [userAnswers, setUserAnswers] = useState([]);
    const [timerEnabled, setTimerEnabled] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes default
    const [quizStartTime, setQuizStartTime] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [quizHistory, setQuizHistory] = useState([]);

    useEffect(() => {
        setQuizHistory(storage.QuizHistory.getAll());
    }, []);

    // Timer countdown
    useEffect(() => {
        if (status === 'studying' && timerEnabled && timeRemaining > 0) {
            const timer = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        submitQuiz();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [status, timerEnabled, timeRemaining]);

    const generateQuiz = async () => {
        if (!pdfDocument || !pageRange.isValid) {
            toast.error('Please select a valid page range');
            return;
        }

        setStatus('generating');
        try {
            const extracted = await extractTextRangeDetailed(pdfDocument, pageRange.start, pageRange.end);
            const result = await aiService.generateAdvancedQuiz(
                extracted.fullText,
                difficulty,
                questionType,
                questionCount
            );

            if (result && result.length > 0) {
                setQuestions(result);
                setStatus('studying');
                setCurrentIdx(0);
                setScore(0);
                setUserAnswers([]);
                setQuizStartTime(Date.now());
                toast.success(`Generated ${result.length} ${difficulty} questions!`);
            } else {
                throw new Error("No questions generated");
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to generate quiz. Check your API key.');
            setStatus('idle');
        }
    };

    const handleAnswer = (selectedIdx) => {
        const q = questions[currentIdx];
        const isCorrect = selectedIdx === q.answerIndex;

        setUserAnswers(prev => [...prev, { question: q.question, selectedIdx, isCorrect, correctIdx: q.answerIndex }]);

        if (isCorrect) {
            setScore(score + 10);
            toast.success('Correct! 🎉', 2000);
        } else {
            toast.error('Incorrect', 2000);
        }

        if (currentIdx < questions.length - 1) {
            setTimeout(() => setCurrentIdx(currentIdx + 1), 500);
        } else {
            submitQuiz();
        }
    };

    const submitQuiz = () => {
        const timeSpent = quizStartTime ? Math.round((Date.now() - quizStartTime) / 1000) : 0;

        const quizData = {
            fileName,
            pageRange: `${pageRange.start}-${pageRange.end}`,
            difficulty,
            questionType,
            totalQuestions: questions.length,
            score,
            timeSpent,
            percentage: Math.round((score / (questions.length * 10)) * 100)
        };

        storage.QuizHistory.add(quizData);
        setQuizHistory(storage.QuizHistory.getAll());
        setStatus('complete');
        toast.success('Quiz completed!');
    };

    const exportQuiz = (format) => {
        const data = {
            fileName,
            pageRange,
            difficulty,
            questionType,
            totalQuestions: questions.length,
            score: `${score}/${questions.length * 10}`,
            percentage: Math.round((score / (questions.length * 10)) * 100),
            questions: questions.map((q, i) => ({
                ...q,
                userAnswer: userAnswers[i]?.selectedIdx,
                wasCorrect: userAnswers[i]?.isCorrect
            }))
        };

        let content, filename, mimeType;

        if (format === 'json') {
            content = JSON.stringify(data, null, 2);
            filename = `quiz-${Date.now()}.json`;
            mimeType = 'application/json';
        } else if (format === 'csv') {
            const csv = [
                ['Question', 'Your Answer', 'Correct Answer', 'Result'].join(','),
                ...questions.map((q, i) => [
                    `"${q.question.replace(/"/g, '""')}"`,
                    q.options[userAnswers[i]?.selectedIdx] || 'N/A',
                    q.options[q.answerIndex],
                    userAnswers[i]?.isCorrect ? 'Correct' : 'Incorrect'
                ].join(','))
            ].join('\n');
            content = csv;
            filename = `quiz-${Date.now()}.csv`;
            mimeType = 'text/csv';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        toast.success(`Exported as ${format.toUpperCase()}`);
    };

    if (showHistory) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <History size={16} /> Quiz History
                    </h3>
                    <button
                        onClick={() => setShowHistory(false)}
                        className="premium-btn !py-2 !px-4 !text-[10px]"
                    >
                        Back to Quiz
                    </button>
                </div>

                {quizHistory.length === 0 ? (
                    <div className="text-center py-12 text-secondary">
                        <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
                        <p>No quiz history yet. Start your first quiz!</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {quizHistory.map((quiz, idx) => (
                            <motion.div
                                key={quiz.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="glass-card p-4"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <h4 className="text-xs font-bold text-primary mb-1">{quiz.fileName}</h4>
                                        <p className="text-[10px] text-secondary">
                                            Pages {quiz.pageRange} • {quiz.difficulty} • {quiz.totalQuestions} questions
                                        </p>
                                        <p className="text-[10px] text-secondary mt-1">
                                            {new Date(quiz.timestamp).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-2xl font-black ${quiz.percentage >= 70 ? 'text-green-500' : quiz.percentage >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                                            {quiz.percentage}%
                                        </div>
                                        <p className="text-[9px] text-secondary">{quiz.score}/{quiz.totalQuestions * 10}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    if (status === 'generating') {
        return (
            <div className="flex flex-col items-center justify-center p-10 space-y-6">
                <Loader2 size={48} className="text-purple-500 animate-spin" />
                <div className="text-center">
                    <h4 className="text-primary font-black">Crafting Your Exam</h4>
                    <p className="text-secondary text-xs mt-2">AI is analyzing pages {pageRange.start}-{pageRange.end}...</p>
                </div>
            </div>
        );
    }

    if (status === 'studying' && questions.length > 0) {
        const q = questions[currentIdx];
        const formatTime = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        return (
            <motion.div
                key={currentIdx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
            >
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-secondary">
                    <span>Question {currentIdx + 1} of {questions.length}</span>
                    <div className="flex items-center gap-4">
                        {timerEnabled && (
                            <span className={`flex items-center gap-1 ${timeRemaining < 60 ? 'text-red-500' : 'text-accent'}`}>
                                <Timer size={12} /> {formatTime(timeRemaining)}
                            </span>
                        )}
                        <span className="text-accent">Score: {score}/{questions.length * 10}</span>
                    </div>
                </div>

                <div className="glass-card p-6 border-l-4 border-l-purple-500">
                    <div className="flex items-center gap-2 mb-3">
                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded ${q.difficulty === 'easy' ? 'bg-green-500/20 text-green-600' :
                            q.difficulty === 'hard' ? 'bg-red-500/20 text-red-600' :
                                'bg-yellow-500/20 text-yellow-600'
                            }`}>{q.difficulty}</span>
                    </div>
                    <h3 className="text-primary font-bold text-sm leading-relaxed">{q.question}</h3>
                </div>

                <div className="grid gap-3">
                    {q.options && q.options.map((opt, i) => (
                        <motion.button
                            key={i}
                            onClick={() => handleAnswer(i)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="premium-input text-left hover:border-purple-500 transition-all group flex justify-between items-center py-4"
                        >
                            <span className="flex-1">{opt}</span>
                            <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </motion.button>
                    ))}
                </div>
            </motion.div>
        );
    }

    if (status === 'complete') {
        const percentage = Math.round((score / (questions.length * 10)) * 100);

        return (
            <div className="space-y-6">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center p-8 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-3xl border border-purple-500/20"
                >
                    <Star size={48} className="text-purple-500 mb-4" />
                    <h3 className="text-2xl font-black text-primary">Quiz Complete!</h3>
                    <div className="text-5xl font-black gradient-text my-4">{percentage}%</div>
                    <p className="text-secondary text-sm">You scored {score} out of {questions.length * 10}</p>
                </motion.div>

                <div className="space-y-3">
                    {questions.map((q, i) => (
                        <div key={i} className="glass-card p-4 border-l-2" style={{ borderColor: userAnswers[i]?.isCorrect ? '#10b981' : '#ef4444' }}>
                            <div className="flex items-start gap-3">
                                {userAnswers[i]?.isCorrect ?
                                    <CheckCircle2 size={16} className="text-green-500 mt-1 flex-shrink-0" /> :
                                    <XCircle size={16} className="text-red-500 mt-1 flex-shrink-0" />
                                }
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-primary mb-2">{q.question}</p>
                                    {!userAnswers[i]?.isCorrect && (
                                        <p className="text-[10px] text-red-600 mb-1">
                                            Your answer: {q.options[userAnswers[i]?.selectedIdx]}
                                        </p>
                                    )}
                                    <p className="text-[10px] text-green-600 mb-1">
                                        Correct answer: {q.options[q.answerIndex]}
                                    </p>
                                    {q.explanation && (
                                        <p className="text-[10px] text-secondary italic mt-2">{q.explanation}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => exportQuiz('json')} className="premium-btn !bg-purple-600 flex items-center gap-1 justify-center">
                        <Download size={12} /> JSON
                    </button>
                    <button onClick={() => exportQuiz('csv')} className="premium-btn !bg-green-600 flex items-center gap-1 justify-center">
                        <Download size={12} /> CSV
                    </button>
                    <button onClick={() => setStatus('idle')} className="premium-btn !bg-bg-secondary !text-primary !border-2">
                        New Quiz
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex flex-col items-center gap-4 bg-purple-500/5 p-8 rounded-3xl border border-purple-500/10 flex-1">
                    <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500">
                        <Brain size={32} />
                    </div>
                    <div className="text-center">
                        <h3 className="text-primary font-black">AI Quiz Engine</h3>
                        <p className="text-secondary text-[11px] mt-2 max-w-xs leading-relaxed">
                            Generate intelligent exams from any section with custom difficulty and question types.
                        </p>
                    </div>
                </div>
            </div>

            <button
                onClick={() => setShowHistory(true)}
                className="w-full premium-btn !bg-purple-600/10 !text-purple-600 flex items-center justify-center gap-2"
            >
                <History size={14} /> View Quiz History ({quizHistory.length})
            </button>

            <PageRangeSelector onRangeChange={setPageRange} />

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-widest text-secondary">Difficulty</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['easy', 'medium', 'hard'].map(level => (
                            <button
                                key={level}
                                onClick={() => setDifficulty(level)}
                                className={`premium-input text-center text-[10px] font-black uppercase ${difficulty === level ? 'border-purple-500 bg-purple-500/5' : ''}`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-widest text-secondary">Questions: {questionCount}</label>
                    <input
                        type="range"
                        min="3"
                        max="10"
                        value={questionCount}
                        onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                        className="w-full accent-purple-500"
                    />
                </div>
            </div>

            <div className="flex items-center justify-between glass-card p-3">
                <span className="text-[10px] font-black uppercase text-secondary">Timer Mode</span>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={timerEnabled}
                        onChange={(e) => setTimerEnabled(e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-bg-secondary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
            </div>

            <button
                disabled={!pdfDocument || !pageRange.isValid}
                onClick={generateQuiz}
                className={`premium-btn w-full !bg-purple-600 shadow-purple-600/20 ${!pdfDocument || !pageRange.isValid ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <Sparkles size={16} className="inline mr-2" />
                Generate Smart Exam
            </button>
        </div>
    );
};

/* ==================== PRODUCTION-GRADE OCR ENGINE ==================== */
const OCRToolEnhanced = () => {
    const { pdfDocument } = usePDF();
    const toast = useToast();
    const [isScanning, setIsScanning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState(null);
    const [pageRange, setPageRange] = useState({ start: 1, end: 1, isValid: false });
    const [outputFormat, setOutputFormat] = useState('plaintext');
    const [currentPage, setCurrentPage] = useState(0);
    const [showHistory, setShowHistory] = useState(false);
    const [ocrHistory, setOCRHistory] = useState([]);

    useEffect(() => {
        setOCRHistory(storage.OCRHistory.getAll());
    }, []);

    const runOCR = async () => {
        if (!pdfDocument || !pageRange.isValid) {
            toast.error('Please select a valid page range');
            return;
        }

        setIsScanning(true);
        setResult(null);
        setProgress(0);

        try {
            const extracted = await extractTextRangeDetailed(
                pdfDocument,
                pageRange.start,
                pageRange.end,
                (page, total, percentage) => {
                    setCurrentPage(page);
                    setProgress(Math.round(percentage));
                }
            );

            setResult(extracted);

            // Save to history
            storage.OCRHistory.add({
                pageRange: `${pageRange.start}-${pageRange.end}`,
                format: outputFormat,
                wordCount: extracted.metadata.totalWords,
                charCount: extracted.metadata.totalChars,
                preview: extracted.fullText.substring(0, 200)
            });

            setOCRHistory(storage.OCRHistory.getAll());
            toast.success(`Extracted ${extracted.metadata.totalWords.toLocaleString()} words!`);
        } catch (err) {
            console.error(err);
            toast.error('OCR processing failed');
        } finally {
            setIsScanning(false);
        }
    };

    const formatOutput = () => {
        if (!result) return '';

        if (outputFormat === 'plaintext') {
            return result.fullText;
        } else if (outputFormat === 'json') {
            return JSON.stringify(result, null, 2);
        } else if (outputFormat === 'markdown') {
            let md = `# OCR Results\n\n`;
            md += `**Document Metadata**\n`;
            md += `- Pages: ${result.metadata.startPage}-${result.metadata.endPage}\n`;
            md += `- Total Words: ${result.metadata.totalWords.toLocaleString()}\n`;
            md += `- Average Words/Page: ${result.metadata.averageWordsPerPage}\n\n`;
            md += `---\n\n`;

            result.pages.forEach(p => {
                md += `## Page ${p.pageNumber}\n\n${p.text}\n\n`;
            });

            return md;
        }
    };

    const downloadOCR = () => {
        const content = formatOutput();
        const extension = outputFormat === 'json' ? 'json' : outputFormat === 'markdown' ? 'md' : 'txt';
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ocr-pages-${pageRange.start}-${pageRange.end}.${extension}`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Downloaded as ${extension.toUpperCase()}`);
    };

    if (showHistory) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <History size={16} /> OCR History
                    </h3>
                    <button onClick={() => setShowHistory(false)} className="premium-btn !py-2 !px-4 !text-[10px]">
                        Back to OCR
                    </button>
                </div>

                {ocrHistory.length === 0 ? (
                    <div className="text-center py-12 text-secondary">
                        <FileSearch size={48} className="mx-auto mb-4 opacity-30" />
                        <p>No OCR history yet. Start your first scan!</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {ocrHistory.map((ocr, idx) => (
                            <motion.div
                                key={ocr.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="glass-card p-4"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-black uppercase text-accent">Pages {ocr.pageRange}</span>
                                            <span className="text-[9px] text-secondary">• {ocr.format}</span>
                                        </div>
                                        <p className="text-[10px] text-secondary line-clamp-2">{ocr.preview}</p>
                                        <p className="text-[9px] text-secondary mt-2">
                                            {ocr.wordCount?.toLocaleString()} words • {new Date(ocr.timestamp).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {!result ? (
                <>
                    <div className="bg-blue-500/5 p-8 rounded-3xl border border-blue-500/10 flex flex-col items-center gap-4 text-center">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center bg-blue-500/10 text-blue-500 ${isScanning ? 'animate-pulse' : ''}`}>
                            <FileSearch size={40} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black gradient-text">Deep OCR Engine</h3>
                            <p className="text-secondary text-[11px] leading-relaxed max-w-xs mt-2">
                                Extract searchable text from any page range with precision analytics.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowHistory(true)}
                        className="w-full premium-btn !bg-blue-600/10 !text-blue-600 flex items-center justify-center gap-2"
                    >
                        <History size={14} /> View OCR History ({ocrHistory.length})
                    </button>

                    <PageRangeSelector onRangeChange={setPageRange} />

                    {isScanning ? (
                        <div className="space-y-3">
                            <div className="flex justify-between text-[10px] font-black text-secondary uppercase tracking-widest">
                                <span>Processing Page {currentPage}</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="h-2 w-full bg-blue-100 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-blue-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest text-center">
                                Neural Layer Recognition Active
                            </p>
                        </div>
                    ) : (
                        <button
                            onClick={runOCR}
                            disabled={!pdfDocument || !pageRange.isValid}
                            className={`premium-btn w-full !bg-blue-600 shadow-blue-600/20 ${!pdfDocument || !pageRange.isValid ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Zap size={16} className="inline mr-2" />
                            Scan Selected Pages
                        </button>
                    )}
                </>
            ) : (
                <>
                    <div className="flex justify-between items-center">
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-primary">OCR Complete</h4>
                            <p className="text-[10px] text-secondary mt-1">
                                {result.metadata.totalWords.toLocaleString()} words from {result.metadata.totalPages} pages
                            </p>
                        </div>
                        <button onClick={() => setResult(null)} className="premium-btn !py-2 !px-4 !bg-bg-secondary !text-primary !text-[10px]">
                            New Scan
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {['plaintext', 'markdown', 'json'].map(format => (
                            <button
                                key={format}
                                onClick={() => setOutputFormat(format)}
                                className={`premium-input text-center text-[9px] font-black uppercase ${outputFormat === format ? 'border-blue-500 bg-blue-500/5' : ''}`}
                            >
                                {format}
                            </button>
                        ))}
                    </div>

                    <div className="glass-card p-4 bg-bg-primary/50 font-mono text-[9px] text-primary leading-loose border-l-2 border-blue-500 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                        {formatOutput().substring(0, 2000)}...
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(formatOutput());
                                toast.success('Copied to clipboard!');
                            }}
                            className="premium-btn !bg-blue-600 flex items-center gap-2 justify-center"
                        >
                            <Copy size={14} /> Copy Text
                        </button>
                        <button onClick={downloadOCR} className="premium-btn !bg-green-600 flex items-center gap-2 justify-center">
                            <Download size={14} /> Download
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

/* ==================== PRODUCTION-GRADE TTS ENGINE ==================== */
const TTSToolEnhanced = () => {
    const { pdfDocument, fileName } = usePDF();
    const toast = useToast();
    const [isPlaying, setIsPlaying] = useState(false);
    const [rate, setRate] = useState(1);
    const [pageRange, setPageRange] = useState({ start: 1, end: 1, isValid: false });
    const [voices, setVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState(null);
    const [showBookmarks, setShowBookmarks] = useState(false);
    const [bookmarks, setBookmarks] = useState([]);

    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            setVoices(availableVoices);

            // Load saved preference
            const prefs = storage.Preferences.get();
            const savedVoice = availableVoices.find(v => v.name === prefs.ttsDefaultVoice);

            if (savedVoice) {
                setSelectedVoice(savedVoice);
            } else if (availableVoices.length > 0) {
                setSelectedVoice(availableVoices[0]);
            }
        };

        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        // Load bookmarks for current file
        if (fileName) {
            setBookmarks(storage.TTSBookmarks.getAll(fileName));
        }
    }, [fileName]);

    const speak = async () => {
        if (!pdfDocument || !pageRange.isValid) {
            toast.error('Please select a valid page range');
            return;
        }

        if (isPlaying) {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
            toast.info('Playback stopped');
            return;
        }

        try {
            const extracted = await extractTextRangeDetailed(pdfDocument, pageRange.start, pageRange.end);
            const utterance = new SpeechSynthesisUtterance(extracted.fullText);
            utterance.rate = rate;
            if (selectedVoice) utterance.voice = selectedVoice;

            utterance.onstart = () => {
                setIsPlaying(true);
                toast.success('Playback started');
            };
            utterance.onend = () => {
                setIsPlaying(false);
                // Save last position
                if (fileName) {
                    storage.TTSBookmarks.setLastPosition(fileName, pageRange.end, 0);
                }
                toast.info('Playback complete');
            };
            utterance.onerror = () => {
                setIsPlaying(false);
                toast.error('Playback error');
            };

            window.speechSynthesis.speak(utterance);
        } catch (err) {
            console.error(err);
            toast.error('Failed to start playback');
        }
    };

    const saveBookmark = () => {
        if (!fileName || !pageRange.isValid) return;

        storage.TTSBookmarks.add(fileName, {
            type: 'bookmark',
            page: pageRange.start,
            name: `Page ${pageRange.start}`,
            text: `Bookmark at page ${pageRange.start}`
        });

        setBookmarks(storage.TTSBookmarks.getAll(fileName));
        toast.success('Bookmark saved!');
    };

    const jumpToBookmark = (bookmark) => {
        setPageRange({ start: bookmark.page, end: bookmark.page, isValid: true });
        setShowBookmarks(false);
        toast.info(`Jumped to ${bookmark.name}`);
    };

    if (showBookmarks) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <Bookmark size={16} /> Bookmarks
                    </h3>
                    <button onClick={() => setShowBookmarks(false)} className="premium-btn !py-2 !px-4 !text-[10px]">
                        Back to TTS
                    </button>
                </div>

                {bookmarks.length === 0 ? (
                    <div className="text-center py-12 text-secondary">
                        <Bookmark size={48} className="mx-auto mb-4 opacity-30" />
                        <p>No bookmarks yet. Create your first one!</p>
                    </div>
                ) : (
                    <div className="grid gap-2">
                        {bookmarks.filter(b => b.type === 'bookmark').map((bookmark) => (
                            <motion.button
                                key={bookmark.id}
                                onClick={() => jumpToBookmark(bookmark)}
                                whileHover={{ scale: 1.02 }}
                                className="glass-card p-3 text-left hover:border-orange-500 transition-all"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-primary">{bookmark.name}</p>
                                        <p className="text-[10px] text-secondary">{bookmark.text}</p>
                                    </div>
                                    <ArrowRight size={14} className="text-orange-500" />
                                </div>
                            </motion.button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <h3 className="text-sm font-black text-primary flex items-center gap-2">
                    <Mic className="text-orange-500" size={18} /> Neural Voice Engine
                </h3>
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-secondary'}`} />
                    <span className="text-[9px] font-black text-secondary tracking-widest uppercase">
                        {isPlaying ? 'Active' : 'Idle'}
                    </span>
                </div>
            </header>

            <button
                onClick={() => setShowBookmarks(true)}
                className="w-full premium-btn !bg-orange-600/10 !text-orange-600 flex items-center justify-center gap-2"
            >
                <Bookmark size={14} /> View Bookmarks ({bookmarks.filter(b => b.type === 'bookmark').length})
            </button>

            <PageRangeSelector onRangeChange={setPageRange} />

            <div className="glass-card p-6 bg-gradient-to-br from-orange-500/5 to-red-500/5 border-orange-500/20">
                <div className="flex items-center gap-4 mb-6">
                    <motion.button
                        onClick={speak}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${isPlaying ? 'bg-orange-500 text-white' : 'bg-white text-orange-500'
                            }`}
                    >
                        {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                    </motion.button>
                    <div className="flex-1">
                        <h4 className="text-sm font-black text-primary">Natural Neural Voice</h4>
                        <p className="text-[9px] text-secondary font-bold uppercase tracking-tight">High Fidelity AI Speech</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-secondary">Voice Selection</label>
                        <select
                            value={voices.indexOf(selectedVoice)}
                            onChange={(e) => {
                                const voice = voices[parseInt(e.target.value)];
                                setSelectedVoice(voice);
                                storage.Preferences.set({ ttsDefaultVoice: voice.name });
                            }}
                            className="premium-input w-full text-[10px] font-bold"
                        >
                            {voices.map((voice, idx) => (
                                <option key={idx} value={idx}>{voice.name} ({voice.lang})</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black text-secondary uppercase px-1">
                            <span>Reading Speed</span>
                            <span className="text-orange-500">{rate}x</span>
                        </div>
                        <input
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.1"
                            value={rate}
                            onChange={(e) => setRate(parseFloat(e.target.value))}
                            className="w-full h-1 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                        <div className="grid grid-cols-6 text-[8px] text-secondary font-bold">
                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                                <button key={speed} onClick={() => setRate(speed)} className="text-center hover:text-orange-500">
                                    {speed}x
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={speak}
                    disabled={!pdfDocument || !pageRange.isValid}
                    className={`premium-btn !bg-orange-600 ${!pdfDocument || !pageRange.isValid ? 'opacity-50' : ''}`}
                >
                    {isPlaying ? 'Stop Playback' : 'Listen to Selection'}
                </button>
                <button
                    onClick={saveBookmark}
                    disabled={!fileName || !pageRange.isValid}
                    className={`premium-btn !bg-blue-600 flex items-center gap-2 justify-center ${!fileName || !pageRange.isValid ? 'opacity-50' : ''}`}
                >
                    <Bookmark size={14} /> Save Bookmark
                </button>
            </div>
        </div>
    );
};

/* ==================== PRODUCTION-GRADE EXPORT HUB ==================== */
const ExportToolEnhanced = () => {
    const { pdfDocument, fileName } = usePDF();
    const toast = useToast();
    const [isExporting, setIsExporting] = useState(false);
    const [pageRange, setPageRange] = useState({ start: 1, end: 1, isValid: false });
    const [citationFormat, setCitationFormat] = useState('apa');
    const [showHistory, setShowHistory] = useState(false);
    const [exportHistory, setExportHistory] = useState([]);

    useEffect(() => {
        setExportHistory(storage.ExportHistory.getAll());
    }, []);

    const handleExport = async (type) => {
        if (!pdfDocument || !pageRange.isValid) {
            toast.error('Please select a valid page range');
            return;
        }

        setIsExporting(true);

        try {
            const extracted = await extractTextRangeDetailed(pdfDocument, pageRange.start, pageRange.end);
            let content = "";
            let filename = "export.txt";

            if (type === 'Markdown' || type === 'Enhanced Markdown') {
                content = `# ${fileName.replace('.pdf', '')}\n\n`;
                content += `> Pages ${pageRange.start}-${pageRange.end}\n\n`;
                content += `**Document Statistics**\n`;
                content += `- Total Words: ${extracted.metadata.totalWords.toLocaleString()}\n`;
                content += `- Average Words/Page: ${extracted.metadata.averageWordsPerPage}\n\n`;
                content += `---\n\n`;
                extracted.pages.forEach(p => {
                    content += `## Page ${p.pageNumber}\n\n${p.text}\n\n`;
                });
                filename = `${fileName.replace('.pdf', '')}_pages_${pageRange.start}-${pageRange.end}.md`;
            } else if (type === 'Notion') {
                content = `# ${fileName.replace('.pdf', '')}\n\n`;
                content += `> 📄 Pages ${pageRange.start}-${pageRange.end} | `;
                content += `📊 ${extracted.metadata.totalWords.toLocaleString()} words\n\n`;
                extracted.pages.forEach(p => {
                    content += `## Page ${p.pageNumber}\n\n`;
                    content += `<aside>\n💡 ${p.wordCount} words on this page\n</aside>\n\n`;
                    content += `${p.text}\n\n`;
                });
                filename = `notion_${fileName.replace('.pdf', '')}.md`;
            } else if (type === 'Obsidian') {
                content = `---\n`;
                content += `source: ${fileName}\n`;
                content += `pages: ${pageRange.start}-${pageRange.end}\n`;
                content += `words: ${extracted.metadata.totalWords}\n`;
                content += `created: ${new Date().toISOString()}\n`;
                content += `tags: [pdf, imported]\n`;
                content += `---\n\n`;
                content += `# ${fileName.replace('.pdf', '')}\n\n`;
                extracted.pages.forEach(p => {
                    content += `## [[Page ${p.pageNumber}]]\n\n${p.text}\n\n`;
                });
                filename = `${fileName.replace('.pdf', '').replace(/\s+/g, '_')}.md`;
            } else if (type.includes('Citation')) {
                const format = citationFormat;
                content = await aiService.generateCitation(
                    extracted.fullText,
                    format,
                    { start: pageRange.start, end: pageRange.end },
                    { title: fileName.replace('.pdf', ''), author: 'Author Name', year: new Date().getFullYear() }
                );
                filename = `citation_${format}.txt`;
            }

            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);

            // Save to export history
            storage.ExportHistory.add({
                fileName,
                type,
                pageRange: `${pageRange.start}-${pageRange.end}`,
                filename,
                wordCount: extracted.metadata.totalWords
            });

            setExportHistory(storage.ExportHistory.getAll());
            toast.success(`${type} exported successfully!`);
        } catch (err) {
            console.error(err);
            toast.error('Export failed');
        } finally {
            setIsExporting(false);
        }
    };

    if (showHistory) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <History size={16} /> Export History
                    </h3>
                    <button onClick={() => setShowHistory(false)} className="premium-btn !py-2 !px-4 !text-[10px]">
                        Back to Export
                    </button>
                </div>

                {exportHistory.length === 0 ? (
                    <div className="text-center py-12 text-secondary">
                        <Share size={48} className="mx-auto mb-4 opacity-30" />
                        <p>No export history yet. Export your first document!</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {exportHistory.map((exp, idx) => (
                            <motion.div
                                key={exp.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="glass-card p-4"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold text-primary">{exp.type}</span>
                                            <span className="text-[9px] text-secondary">• Pages {exp.pageRange}</span>
                                        </div>
                                        <p className="text-[10px] text-secondary">{exp.filename}</p>
                                        <p className="text-[9px] text-secondary mt-1">
                                            {exp.wordCount?.toLocaleString()} words • {new Date(exp.timestamp).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-primary">Smart Export Hub</h3>
                <div className="flex items-center gap-1 text-[9px] font-black text-secondary uppercase tracking-widest">
                    <Check className="text-green-500" size={10} /> Ready
                </div>
            </div>

            <button
                onClick={() => setShowHistory(true)}
                className="w-full premium-btn !bg-pink-600/10 !text-pink-600 flex items-center justify-center gap-2"
            >
                <History size={14} /> View Export History ({exportHistory.length})
            </button>

            <PageRangeSelector onRangeChange={setPageRange} />

            <div className="space-y-3">
                <h4 className="text-[9px] font-black uppercase tracking-widest text-secondary">Export Formats</h4>
                <div className="grid gap-3">
                    {[
                        { id: 'notion', name: 'Notion', icon: <div className="font-black text-sm">N</div>, color: 'hover:border-black', desc: 'Blocks & Callouts' },
                        { id: 'obsidian', name: 'Obsidian', icon: <FileText size={18} />, color: 'hover:border-purple-600', desc: 'Wiki-links & Frontmatter' },
                        { id: 'markdown', name: 'Enhanced Markdown', icon: <FileText size={18} />, color: 'hover:border-blue-500', desc: 'TOC & Metadata' }
                    ].map(platform => (
                        <motion.button
                            key={platform.id}
                            onClick={() => handleExport(platform.name)}
                            disabled={isExporting || !pageRange.isValid}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`glass-card flex items-center justify-between group transition-all py-3 ${platform.color} active:scale-[0.98] ${isExporting || !pageRange.isValid ? 'opacity-50' : ''
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-bg-primary rounded-xl group-hover:bg-accent group-hover:text-white transition-colors">
                                    {platform.icon}
                                </div>
                                <div className="text-left">
                                    <span className="text-[11px] font-black text-primary uppercase tracking-tight block">{platform.name}</span>
                                    <span className="text-[8px] text-secondary">{platform.desc}</span>
                                </div>
                            </div>
                            <ArrowRight className="text-secondary opacity-0 group-hover:opacity-100 transition-all" size={14} />
                        </motion.button>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <h4 className="text-[9px] font-black uppercase tracking-widest text-secondary">Academic Citations</h4>
                <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                        {['apa', 'mla', 'chicago'].map(format => (
                            <button
                                key={format}
                                onClick={() => setCitationFormat(format)}
                                className={`premium-input text-center text-[9px] font-black uppercase ${citationFormat === format ? 'border-pink-500 bg-pink-500/5' : ''
                                    }`}
                            >
                                {format.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => handleExport(`${citationFormat.toUpperCase()} Citation`)}
                        disabled={isExporting || !pageRange.isValid}
                        className={`premium-btn w-full !bg-pink-600 ${isExporting || !pageRange.isValid ? 'opacity-50' : ''}`}
                    >
                        Generate {citationFormat.toUpperCase()} Citation
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ==================== PRODUCTION-GRADE PDF EDITOR ==================== */
const EditToolEnhanced = () => {
    const { pdfDocument, pdfFile, fileName } = usePDF();
    const toast = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const [pageRange, setPageRange] = useState({ start: 1, end: 1, isValid: false });
    const [operation, setOperation] = useState('rotate');
    const [rotationAngle, setRotationAngle] = useState(90);
    const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');

    const executeOperation = async () => {
        if (!pdfDocument || !pdfFile || !pageRange.isValid) {
            toast.error('Please select a valid page range');
            return;
        }

        setIsProcessing(true);
        const pagesToProcess = Array.from(
            { length: pageRange.end - pageRange.start + 1 },
            (_, i) => pageRange.start + i
        );

        try {
            let resultBytes;
            let resultFilename;

            if (operation === 'rotate') {
                resultBytes = await pdfEditService.rotatePDF(pdfFile, pagesToProcess, rotationAngle);
                resultFilename = `${fileName.replace('.pdf', '')}_rotated_${rotationAngle}.pdf`;
                toast.success(`Rotated ${pagesToProcess.length} pages by ${rotationAngle}°`);
            } else if (operation === 'extract') {
                resultBytes = await pdfEditService.extractPages(pdfFile, pagesToProcess);
                resultFilename = `${fileName.replace('.pdf', '')}_pages_${pageRange.start}-${pageRange.end}.pdf`;
                toast.success(`Extracted ${pagesToProcess.length} pages`);
            } else if (operation === 'delete') {
                resultBytes = await pdfEditService.deletePages(pdfFile, pagesToProcess);
                resultFilename = `${fileName.replace('.pdf', '')}_deleted_${pageRange.start}-${pageRange.end}.pdf`;
                toast.success(`Deleted ${pagesToProcess.length} pages`);
            } else if (operation === 'watermark') {
                resultBytes = await pdfEditService.addWatermark(pdfFile, watermarkText, {
                    pageNumbers: pagesToProcess,
                    opacity: 0.3,
                    rotation: 45
                });
                resultFilename = `${fileName.replace('.pdf', '')}_watermarked.pdf`;
                toast.success('Watermark applied');
            }

            if (resultBytes) {
                pdfEditService.downloadPDF(resultBytes, resultFilename);
            }
        } catch (err) {
            console.error(err);
            toast.error(`Operation failed: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-emerald-500/5 p-8 rounded-3xl border border-emerald-500/10 flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                    <Scissors size={32} />
                </div>
                <div className="text-center">
                    <h3 className="text-primary font-black">Pro PDF Editor</h3>
                    <p className="text-secondary text-[11px] mt-2 max-w-xs">
                        Advanced PDF manipulation with page-level precision using pdf-lib.
                    </p>
                </div>
            </div>

            <PageRangeSelector onRangeChange={setPageRange} />

            <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-widest text-secondary">Operation</label>
                <div className="grid grid-cols-4 gap-2">
                    {[
                        { id: 'rotate', label: 'Rotate', icon: <RotateCw size={14} /> },
                        { id: 'extract', label: 'Extract', icon: <Copy size={14} /> },
                        { id: 'delete', label: 'Delete', icon: <Trash2 size={14} /> },
                        { id: 'watermark', label: 'Watermark', icon: <FileText size={14} /> }
                    ].map(op => (
                        <button
                            key={op.id}
                            onClick={() => setOperation(op.id)}
                            className={`premium-input flex flex-col items-center gap-2 py-3 ${operation === op.id ? 'border-emerald-500 bg-emerald-500/5' : ''
                                }`}
                        >
                            {op.icon}
                            <span className="text-[9px] font-black uppercase">{op.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {operation === 'rotate' && (
                <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-widest text-secondary">Rotation Angle</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[90, 180, 270].map(angle => (
                            <button
                                key={angle}
                                onClick={() => setRotationAngle(angle)}
                                className={`premium-input text-center text-[10px] font-black ${rotationAngle === angle ? 'border-emerald-500 bg-emerald-500/5' : ''
                                    }`}
                            >
                                {angle}°
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {operation === 'watermark' && (
                <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-widest text-secondary">Watermark Text</label>
                    <input
                        type="text"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        className="premium-input w-full text-center font-bold"
                        placeholder="Enter watermark text"
                    />
                </div>
            )}

            <button
                onClick={executeOperation}
                disabled={isProcessing || !pdfDocument || !pageRange.isValid}
                className={`premium-btn w-full !bg-emerald-600 shadow-emerald-600/20 ${isProcessing || !pdfDocument || !pageRange.isValid ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
            >
                {isProcessing ? (
                    <><Loader2 size={16} className="inline mr-2 animate-spin" /> Processing...</>
                ) : (
                    <><Zap size={16} className="inline mr-2" /> Execute {operation.charAt(0).toUpperCase() + operation.slice(1)}</>
                )}
            </button>

            <div className="glass-card p-4 bg-green-500/10 border-green-500/20">
                <div className="flex gap-3">
                    <CheckCircle2 size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[10px] font-bold text-green-700">Real PDF Editing</p>
                        <p className="text-[9px] text-secondary mt-1">
                            Powered by pdf-lib. All operations generate actual modified PDFs with instant download.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PremiumToolsHub;
