import React, { useState } from 'react';
import { usePDF } from '../context/PDFContext';
import { handwritingService } from '../utils/handwritingConverter';
import { FileText, Download, Play, StopCircle, CheckCircle, Copy, AlertCircle, PenTool, Eye, Code, Zap, Sparkles } from 'lucide-react';
import { useToast } from './ToastNotification';
import TypedNotePreview from './TypedNotePreview';
import html2pdf from 'html2pdf.js';

const HandwritingPanel = () => {
    const { pdfDocument, currentPage, numPages } = usePDF();
    const [rangeType, setRangeType] = useState('current'); // 'current', 'all', 'range'
    const [rangeStart, setRangeStart] = useState('1');
    const [rangeEnd, setRangeEnd] = useState('1');
    const [conversionMode, setConversionMode] = useState('high_quality'); // 'fast' | 'high_quality'
    const [isConverting, setIsConverting] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
    const [resultMarkdown, setResultMarkdown] = useState('');
    const [viewMode, setViewMode] = useState('preview'); // 'preview', 'markdown'
    const previewRef = React.useRef(null);
    const toast = useToast();

    const handleConvert = async () => {
        if (!pdfDocument) return;

        let pages = [];
        if (rangeType === 'current') {
            pages = [currentPage];
        } else if (rangeType === 'all') {
            pages = Array.from({ length: numPages }, (_, i) => i + 1);
        } else {
            const start = parseInt(rangeStart);
            const end = parseInt(rangeEnd);
            if (isNaN(start) || isNaN(end) || start > end) {
                toast.error("Invalid page range");
                return;
            }
            for (let i = start; i <= end; i++) pages.push(i);
        }

        // Limit for demo/safety
        if (pages.length > 5) {
            if (!confirm(`You are about to process ${pages.length} pages using AI Vision. This might take a while. Continue?`)) return;
        }

        setIsConverting(true);
        setResultMarkdown('');

        try {
            const result = await handwritingService.convertPages(pdfDocument, pages, (curr, total, status) => {
                setProgress({ current: curr, total, status });
            }, conversionMode);
            setResultMarkdown(result);
            toast.success("Conversion Complete!");
        } catch (error) {
            console.error(error);
            toast.error("Conversion failed.");
        } finally {
            setIsConverting(false);
        }
    };

    const handleDownloadPDF = () => {
        if (!resultMarkdown) return;

        // Use html2pdf for high quality render if in preview mode
        if (viewMode === 'preview' && previewRef.current) {
            const element = previewRef.current;
            const opt = {
                margin: 10,
                filename: 'Typed_Notes_Converted.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            html2pdf().set(opt).from(element).save();
            toast.success("Generating High Quality PDF...");
        } else {
            // Fallback to simple text dump if viewing markdown
            handwritingService.generateSimplePDF(resultMarkdown, "Typed_Notes_Draft.pdf");
            toast.success("Draft PDF Downloaded!");
        }
    };

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(resultMarkdown);
        toast.success("Markdown copied to clipboard!");
    };

    return (
        <div className="handwriting-panel" style={{ padding: '20px', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(var(--accent-rgb), 0.1)', color: 'var(--accent-color)' }}>
                        <PenTool size={20} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>Handwriting to Text</h2>
                        <p style={{ fontSize: '0.75rem', opacity: 0.7, margin: 0 }}>Convert messy notes to structured Typed PDF</p>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="panel-controls" style={{ background: 'var(--bg-secondary)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <button
                        className={`mode-btn ${rangeType === 'current' ? 'active' : ''}`}
                        onClick={() => setRangeType('current')}
                        style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: rangeType === 'current' ? 'var(--accent-color)' : 'transparent', color: rangeType === 'current' ? 'white' : 'var(--text-primary)', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                        Current Page
                    </button>
                    <button
                        className={`mode-btn ${rangeType === 'range' ? 'active' : ''}`}
                        onClick={() => setRangeType('range')}
                        style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: rangeType === 'range' ? 'var(--accent-color)' : 'transparent', color: rangeType === 'range' ? 'white' : 'var(--text-primary)', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                        Range
                    </button>
                </div>

                {rangeType === 'range' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                        <input type="number" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} style={{ width: '60px', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                        <span>to</span>
                        <input type="number" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} style={{ width: '60px', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                    </div>
                )}

                {/* Mode Selection */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                    <button
                        onClick={() => setConversionMode('high_quality')}
                        style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '8px',
                            border: `1px solid ${conversionMode === 'high_quality' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                            background: conversionMode === 'high_quality' ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent',
                            color: conversionMode === 'high_quality' ? 'var(--accent-color)' : 'var(--text-secondary)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Sparkles size={16} />
                            <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Pro AI</span>
                        </div>
                        <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>Best Quality (Slower)</span>
                    </button>

                    <button
                        onClick={() => setConversionMode('fast')}
                        style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '8px',
                            border: `1px solid ${conversionMode === 'fast' ? 'var(--accent-color)' : 'var(--border-color)'}`,
                            background: conversionMode === 'fast' ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent',
                            color: conversionMode === 'fast' ? 'var(--accent-color)' : 'var(--text-secondary)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Zap size={16} />
                            <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Blitz</span>
                        </div>
                        <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>Fastest (No AI)</span>
                    </button>
                </div>

                <button
                    onClick={handleConvert}
                    disabled={isConverting}
                    style={{
                        width: '100%',
                        padding: '10px',
                        background: 'var(--premium-gradient, linear-gradient(135deg, #6366f1 0%, #a855f7 100%))',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        cursor: isConverting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        opacity: isConverting ? 0.7 : 1
                    }}
                >
                    {isConverting ? <StopCircle size={18} /> : <Play size={18} />}
                    {isConverting ? 'Scanning...' : 'Start Transformation'}
                </button>
            </div>

            {/* Progress */}
            {isConverting && (
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                        <span>{progress.status}</span>
                        <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${(progress.current / progress.total) * 100}%`, height: '100%', background: 'var(--accent-color)', transition: 'width 0.3s ease' }}></div>
                    </div>
                </div>
            )}

            {/* Result Area */}
            {resultMarkdown && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Preview (Markdown)</h4>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setViewMode(viewMode === 'preview' ? 'markdown' : 'preview')} title="Toggle View" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                {viewMode === 'preview' ? <Code size={16} /> : <Eye size={16} />}
                            </button>
                            <button onClick={handleCopyToClipboard} title="Copy" style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.7 }}><Copy size={16} /></button>
                            <button onClick={handleDownloadPDF} title="Download PDF" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-color)' }}><Download size={16} /></button>
                        </div>
                    </div>

                    {viewMode === 'preview' ? (
                        <div style={{
                            flex: 1,
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            overflow: 'auto',
                            background: '#525659', // Dark background for contrast like PDF viewer
                            padding: '10px'
                        }}>
                            {/* Wrapper to center the A4 page */}
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <TypedNotePreview ref={previewRef} markdown={resultMarkdown} />
                            </div>
                        </div>
                    ) : (
                        <textarea
                            value={resultMarkdown}
                            readOnly
                            style={{
                                flex: 1,
                                width: '100%',
                                resize: 'none',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                padding: '12px',
                                fontFamily: 'monospace',
                                fontSize: '0.85rem',
                                color: 'var(--text-primary)'
                            }}
                        />
                    )}
                    <div style={{ marginTop: '10px', fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', gap: '6px' }}>
                        <AlertCircle size={14} />
                        <span>Tip: Copy this markdown to Overleaf for professional LaTeX rendering.</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HandwritingPanel;
