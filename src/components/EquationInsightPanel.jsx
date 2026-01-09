import React, { useState, useEffect } from 'react';
import { usePDF } from '../context/PDFContext';
import * as aiService from '../utils/aiService';
import {
    X,
    Zap,
    BookOpen,
    Activity,
    ArrowRightCircle,
    Loader2
} from 'lucide-react';

const EquationInsightPanel = ({ equation, contextText, onClose }) => {
    const [insight, setInsight] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchInsight = async () => {
            setIsLoading(true);
            try {
                const res = await aiService.solveMathEquation(equation);
                setInsight(res);
            } catch (err) {
                console.error(err);
                setInsight("Failed to analyze equation. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchInsight();
    }, [equation]);

    return (
        <div className="equation-insight-card fixed bottom-10 left-1/2 -translate-x-1/2 w-[450px] bg-primary border-2 border-accent shadow-2xl rounded-xl z-[2000] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10">
            <div className="header bg-accent text-white p-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Zap size={18} />
                    <span className="font-bold text-sm">Equation Intelligence</span>
                </div>
                <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full"><X size={18} /></button>
            </div>

            <div className="content p-5 max-h-[60vh] overflow-y-auto">
                <div className="equation-display bg-secondary p-4 rounded-lg mb-4 text-center border font-mono text-lg text-accent">
                    {equation}
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center py-10 gap-3 text-secondary">
                        <Loader2 className="animate-spin" size={32} />
                        <p className="text-sm">Solving step-by-step...</p>
                    </div>
                ) : (
                    <div className="insight-body prose prose-sm dark:prose-invert">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed text-primary">
                            {insight}
                        </div>
                    </div>
                )}
            </div>

            <div className="footer bg-secondary p-3 border-t flex justify-between items-center px-5">
                <span className="text-[10px] text-secondary uppercase font-bold tracking-wider">AI-Powered Analysis</span>
                <div className="flex gap-2">
                    <button className="text-[10px] bg-accent/10 text-accent px-2 py-1 rounded hover:bg-accent hover:text-white transition">Copy Derivation</button>
                </div>
            </div>
        </div>
    );
};

export default EquationInsightPanel;
