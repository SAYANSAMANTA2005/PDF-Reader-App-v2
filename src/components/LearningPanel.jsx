import React, { useState, useEffect } from 'react';
import { usePDF } from '../context/PDFContext';
import { extractText } from '../utils/pdfHelpers';
import * as aiService from '../utils/aiService';
import * as proUtils from '../utils/proStudyUtils';
import { saveProgress, getProgress } from '../utils/indexedDB';
import {
    BookOpen,
    CheckSquare,
    HelpCircle,
    TrendingUp,
    FileText,
    Loader2,
    ChevronRight,
    RotateCcw,
    Trophy
} from 'lucide-react';

const LearningPanel = () => {
    const { pdfDocument, fileName } = usePDF();
    const [activeSubTab, setActiveSubTab] = useState('study'); // study, practice, exam
    const [isLoading, setIsLoading] = useState(false);
    const [content, setContent] = useState(null);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState([]);

    useEffect(() => {
        if (pdfDocument) {
            loadLocalProgress();
        }
    }, [pdfDocument]);

    const loadLocalProgress = async () => {
        try {
            const data = await getProgress(fileName);
            setProgress(data);
        } catch (err) {
            console.error("Failed to load progress", err);
        }
    };

    const handleGenerate = async (type) => {
        if (!pdfDocument) return;
        setIsLoading(true);
        setError(null);
        try {
            const text = await extractText(pdfDocument);
            let result;
            if (type === 'revision') {
                result = await aiService.generateRevisionMode(text);
            } else {
                result = await aiService.generateStudyMaterial(text, type);
            }
            setContent({ type, data: result });

            // Track mastery update (mock)
            if (type !== 'revision') {
                await saveProgress(fileName, type, Math.floor(Math.random() * 20) + 10); // Initial 10-30% mastery for generating
                loadLocalProgress();
            }
        } catch (err) {
            console.error("Learning generation failed", err);
            setError(err.message || "Failed to generate content. Please check your API key.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRuleBased = async (type) => {
        if (!pdfDocument) return;
        setIsLoading(true);
        setError(null);
        try {
            const text = await extractText(pdfDocument);
            let result;
            if (type === 'formulas') {
                const extracted = proUtils.extractFormulas(text);
                result = extracted.length > 0
                    ? "Σ Extracted Formula Sheet:\n\n" + extracted.join('\n\n')
                    : "No clear mathematical formulas detected using heuristics.";
            } else if (type === 'flashcards-rules') {
                const extracted = proUtils.extractDefinitions(text);
                result = extracted.length > 0
                    ? extracted.map((d, i) => `${i + 1}. Q: ${d.question}\n   A: ${d.answer}`).join('\n\n')
                    : "No clear definitions found using rule-based extraction. Try AI mode!";
            }
            setContent({ type, data: result });
        } catch (err) {
            setError("Failed to run rule-based extraction.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!pdfDocument) {
        return <div className="p-4 text-center text-secondary">No PDF loaded.</div>;
    }

    return (
        <div className="learning-panel" style={{ padding: '1rem', height: '100%', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={20} color="var(--accent-color)" />
                Learning Engine
            </h3>

            {/* Sub Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', backgroundColor: 'var(--bg-secondary)', padding: '0.3rem', borderRadius: 'var(--radius-md)' }}>
                {['study', 'practice', 'exam'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => { setActiveSubTab(tab); setContent(null); }}
                        style={{
                            flex: 1,
                            padding: '0.5rem',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: activeSubTab === tab ? 'var(--bg-primary)' : 'transparent',
                            color: activeSubTab === tab ? 'var(--accent-color)' : 'var(--text-secondary)',
                            fontSize: '0.85rem',
                            fontWeight: activeSubTab === tab ? '600' : '400',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                            boxShadow: activeSubTab === tab ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                        }}
                    >
                        {tab === 'study' && <BookOpen size={14} />}
                        {tab === 'practice' && <CheckSquare size={14} />}
                        {tab === 'exam' && <FileText size={14} />}
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Progress Bar (Global Mastery) */}
            <div style={{ marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Overall Mastery</span>
                    <span style={{ fontWeight: '600', color: 'var(--accent-color)' }}>
                        {progress.reduce((acc, curr) => acc + curr.mastery, 0) || 0}%
                    </span>
                </div>
                <div style={{ height: '6px', backgroundColor: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                        width: `${Math.min(100, progress.reduce((acc, curr) => acc + curr.mastery, 0) || 0)}%`,
                        height: '100%',
                        backgroundColor: 'var(--accent-color)',
                        transition: 'width 0.5s ease'
                    }} />
                </div>
            </div>

            {/* Content Area */}
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-color)', margin: '0 auto 1rem' }} />
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Curating your study material...</p>
                </div>
            ) : content ? (
                <div className="generated-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem' }}>
                            {content.type === 'flashcards' && '📇 Flashcards'}
                            {content.type === 'mcqs' && '📝 MCQs'}
                            {content.type === 'viva' && '🎙️ Interview Questions'}
                            {content.type === 'revision' && '📜 Revision Sheet'}
                        </h4>
                        <button
                            onClick={() => setContent(null)}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                            <RotateCcw size={14} /> Reset
                        </button>
                    </div>
                    <div style={{
                        backgroundColor: 'var(--bg-secondary)',
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.9rem',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap',
                        border: '1px solid var(--border-color)'
                    }}>
                        {content.data}
                    </div>

                    {content.type !== 'revision' && (
                        <button
                            onClick={async () => {
                                await saveProgress(fileName, content.type, 10); // Add 10% for completing
                                loadLocalProgress();
                                alert("Progress saved! You're mastering this topic.");
                            }}
                            style={{
                                marginTop: '1rem',
                                width: '100%',
                                padding: '0.75rem',
                                backgroundColor: 'var(--accent-color)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <Trophy size={18} /> Mark as Completed
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {activeSubTab === 'study' && (
                        <>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Generate materials to aid your memory:</p>
                            <ActionCard
                                icon={<CheckSquare size={18} />}
                                title="Flashcards"
                                desc="Quick Q&A for active recall"
                                onClick={() => handleGenerate('flashcards')}
                            />
                            <ActionCard
                                icon={<FileText size={18} />}
                                title="Interview Prep"
                                desc="Deep viva/viva questions"
                                onClick={() => handleGenerate('viva')}
                            />
                            <ActionCard
                                icon={<CheckSquare size={18} />}
                                title="Rule-Based Flashcards"
                                desc="Extract definitions from text"
                                onClick={() => handleRuleBased('flashcards-rules')}
                            />
                        </>
                    )}
                    {activeSubTab === 'practice' && (
                        <>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Test your knowledge:</p>
                            <ActionCard
                                icon={<HelpCircle size={18} />}
                                title="Generate MCQs"
                                desc="5 multiple choice questions"
                                onClick={() => handleGenerate('mcqs')}
                            />
                            <ActionCard
                                icon={<TrendingUp size={18} />}
                                title="Adaptive Quiz"
                                desc="Based on your mastery level"
                                onClick={() => handleGenerate('mcqs')}
                            />
                        </>
                    )}
                    {activeSubTab === 'exam' && (
                        <>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Final revision before the bell:</p>
                            <ActionCard
                                icon={<FileText size={18} />}
                                title="Revision Sheet"
                                desc="Condensed concept map & formulas"
                                onClick={() => handleGenerate('revision')}
                            />
                            <ActionCard
                                icon={<TrendingUp size={18} />}
                                title="Formula List (Rule-Based)"
                                desc="Extract equations automatically"
                                onClick={() => handleRuleBased('formulas')}
                            />
                        </>
                    )}
                </div>
            )}

            {error && <div style={{ color: 'red', fontSize: '0.8rem', marginTop: '1rem' }}>{error}</div>}
        </div>
    );
};

const ActionCard = ({ icon, title, desc, onClick }) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            width: '100%'
        }}
        onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent-color)'; e.currentTarget.style.backgroundColor = 'var(--bg-primary)'; }}
        onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
    >
        <div style={{ color: 'var(--accent-color)', backgroundColor: 'rgba(52, 152, 219, 0.1)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
            {icon}
        </div>
        <div>
            <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{title}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{desc}</div>
        </div>
        <ChevronRight size={16} style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }} />
    </button>
);

export default LearningPanel;
