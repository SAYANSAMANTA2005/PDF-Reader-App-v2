import React, { useState, useRef } from 'react';
import { usePDF } from '../context/PDFContext';
import SearchBar from './SearchBar';
import TextToSpeechPanel from './TextToSpeechPanel';
import PDFContextChat from './PDFContextChat';
import {
    ZoomIn,
    ZoomOut,
    RotateCw,
    PanelLeft,
    Sun,
    Moon,
    ChevronLeft,
    ChevronRight,
    Highlighter,
    Pen,
    Eraser,
    Volume2,
    Info,
    Download,
    BookOpen,
    MessageSquare,
    Sigma,
    Brain,
    Sparkles,
    Palette,
    Coffee,
    TreePine,
    Waves,
    FileType,
    Image as ImageIcon,
    X
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import DrawingPanel from './DrawingPanel';
import EquationInsightPanel from './EquationInsightPanel';

const Toolbar = () => {
    const {
        scale, setScale,
        rotation, setRotation,
        currentPage, setCurrentPage,
        numPages,
        setIsSidebarOpen, isSidebarOpen,
        theme, setTheme, toggleTheme,
        pdfDocument,
        annotationMode, setAnnotationMode,
        isTwoPageMode, setIsTwoPageMode,
        annotationColor, setAnnotationColor,
        isReading, setIsReading, stopReading,
        brushThickness, handleDownload,
        isMathMode, setIsMathMode,
        activeEquation, setActiveEquation,
        isActiveRecallMode, setIsActiveRecallMode,
        setActiveSidebarTab, isPremium,
        addImageAnnotation,
        setActiveToolId // Add this
    } = usePDF();


    const [isDrawingPanelOpen, setIsDrawingPanelOpen] = useState(false);
    const [isTextToSpeechOpen, setIsTextToSpeechOpen] = useState(false);
    const [isPDFChatOpen, setIsPDFChatOpen] = useState(false);
    const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
    const [pageInputValue, setPageInputValue] = useState('');

    // Sync page input with current page
    React.useEffect(() => {
        setPageInputValue(currentPage.toString());
    }, [currentPage]);

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 3.0));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));
    const handleRotate = () => {
        setRotation(prev => (prev + 90) % 360);
    };
    const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
    const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, numPages));

    // Page Input Handlers
    const handlePageInputChange = (e) => {
        setPageInputValue(e.target.value);
    };

    const handlePageInputCommit = () => {
        const val = parseInt(pageInputValue);
        if (!isNaN(val) && val >= 1 && val <= numPages) {
            setCurrentPage(val);
        } else {
            // Reset to current page if invalid
            setPageInputValue(currentPage.toString());
        }
    };

    const handlePageInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            handlePageInputCommit();
            e.target.blur();
        }
    };

    return (
        <div className="toolbar">
            <div className="toolbar-group">
                <button
                    onClick={handleDownload}
                    className="tool-btn"
                    title="Download Annotated PDF"
                    disabled={!pdfDocument}
                >
                    <Download size={20} />
                </button>
                <div className="divider"></div>
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className={`tool-btn ${isSidebarOpen ? 'active' : ''}`}
                    title="Toggle Sidebar"
                    disabled={!pdfDocument}
                >
                    <PanelLeft size={20} />
                </button>
                <div className="divider"></div>
                <div className="page-nav">
                    <button onClick={handlePrevPage} disabled={!pdfDocument || currentPage <= 1} title="Previous Page">
                        <ChevronLeft size={20} />
                    </button>
                    <span className="page-info">
                        <input
                            type="number"
                            value={pageInputValue}
                            onChange={handlePageInputChange}
                            onBlur={handlePageInputCommit}
                            onKeyDown={handlePageInputKeyDown}
                            min={1}
                            max={numPages}
                            disabled={!pdfDocument}
                            className="page-input"
                        />
                        <span className="page-total"> / {numPages || '--'}</span>
                    </span>
                    <button onClick={handleNextPage} disabled={!pdfDocument || currentPage >= numPages} title="Next Page">
                        <ChevronRight size={20} />
                    </button>
                </div>
                <div className="divider"></div>
                <button
                    onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                            const file = e.target.files[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = (re) => {
                                    addImageAnnotation(currentPage, re.target.result, 0.1, 0.1, 0.2, 0.2);
                                };
                                reader.readAsDataURL(file);
                            }
                        };
                        input.click();
                    }}
                    className="tool-btn"
                    title="Insert Image / Object"
                    disabled={!pdfDocument}
                >
                    <ImageIcon size={20} />
                </button>
            </div>


            <div className="toolbar-group">
                <button onClick={handleZoomOut} disabled={!pdfDocument} title="Zoom Out">
                    <ZoomOut size={20} />
                </button>
                <span className="zoom-text">{Math.round(scale * 100)}%</span>
                <button onClick={handleZoomIn} disabled={!pdfDocument} title="Zoom In">
                    <ZoomIn size={20} />
                </button>
                <div className="divider"></div>
                <button onClick={handleRotate} disabled={!pdfDocument} title="Rotate">
                    <RotateCw size={20} />
                </button>
            </div>

            <div className="toolbar-group">
                <button
                    onClick={() => setAnnotationMode(annotationMode === 'highlight' ? 'none' : 'highlight')}
                    className={`tool-btn ${annotationMode === 'highlight' ? 'active' : ''}`}
                    title="Highlight (Freehand)"
                    disabled={!pdfDocument}
                >
                    <Highlighter size={20} color={annotationMode === 'highlight' ? 'white' : 'gold'} />
                </button>
                <button
                    onClick={() => {
                        setAnnotationMode(annotationMode === 'erase' ? 'none' : 'erase');
                        setIsDrawingPanelOpen(false);
                    }}
                    className={`tool-btn ${annotationMode === 'erase' ? 'active' : ''}`}
                    title="Eraser"
                    disabled={!pdfDocument}
                >
                    <Eraser size={20} />
                </button>
                <div className="drawing-control-wrapper" style={{ position: 'relative' }}>
                    <button
                        onClick={() => {
                            if (annotationMode !== 'draw' && annotationMode !== 'highlight') {
                                setAnnotationMode('draw');
                                setIsDrawingPanelOpen(true);
                            } else {
                                setIsDrawingPanelOpen(!isDrawingPanelOpen);
                            }
                        }}
                        className={`tool-btn drawing-tools-btn ${(annotationMode === 'draw' || annotationMode === 'highlight') ? 'active' : ''}`}
                        title="Drawing Tools"
                        disabled={!pdfDocument}
                    >
                        <Pen size={18} />
                        <span className="btn-text">Draw</span>
                        <ChevronRight size={14} className={`dropdown-arrow ${isDrawingPanelOpen ? 'open' : ''}`} style={{ transform: isDrawingPanelOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>
                    {isDrawingPanelOpen && (
                        <DrawingPanel onClose={() => setIsDrawingPanelOpen(false)} />
                    )}
                </div>
                <button
                    onClick={() => setIsTwoPageMode(!isTwoPageMode)}
                    className={`tool-btn ${isTwoPageMode ? 'active' : ''}`}
                    title="Two Page View"
                    disabled={!pdfDocument}
                >
                    <BookOpen size={20} />
                </button>
                <button
                    onClick={() => {
                        console.log('Toggling TTS Panel');
                        setIsTextToSpeechOpen(prev => {
                            const newState = !prev;
                            if (newState) setIsPDFChatOpen(false);
                            return newState;
                        });
                    }}
                    className={`tool-btn ${isTextToSpeechOpen ? 'active' : ''}`}
                    title="Text-to-Speech (Read Aloud with Controls)"
                    disabled={!pdfDocument}
                >
                    <Volume2 size={20} />
                </button>
                <button
                    onClick={() => {
                        console.log('Toggling AI Chat Panel');
                        setIsPDFChatOpen(prev => {
                            const newState = !prev;
                            if (newState) setIsTextToSpeechOpen(false);
                            return newState;
                        });
                    }}
                    className={`tool-btn ${isPDFChatOpen ? 'active' : ''}`}
                    title="Ask PDF with AI (Context-Aware Questions)"
                    disabled={!pdfDocument}
                >
                    <MessageSquare size={20} />
                </button>
                <button
                    onClick={() => {
                        setIsSidebarOpen(true);
                        setActiveSidebarTab('store');
                        setActiveToolId('equations'); // Directly open the tool

                        // Legacy mode toggle (optional, keeping for safety)
                        setIsMathMode(!isMathMode);
                    }}
                    className={`tool-btn ${isMathMode ? 'active' : ''}`}
                    style={{ color: isMathMode ? 'var(--accent-color)' : 'inherit' }}
                    title="Equation Intelligence (Explain math/formulas)"
                    disabled={!pdfDocument}
                >
                    <Sigma size={20} />
                </button>
                <button
                    onClick={() => setIsActiveRecallMode(!isActiveRecallMode)}
                    className={`tool-btn ${isActiveRecallMode ? 'active' : ''}`}
                    style={{ color: isActiveRecallMode ? 'var(--accent-color)' : 'inherit' }}
                    title="Active Recall First Mode (Hide content until explained)"
                    disabled={!pdfDocument}
                >
                    <Brain size={20} />
                </button>
                <div className="divider"></div>
                <button
                    onClick={() => setActiveSidebarTab('store')}
                    className={`tool-btn ${isPremium ? 'text-yellow-500' : 'text-accent animate-pulse'}`}
                    title={isPremium ? "Elite Member" : "Get Pro Version"}
                >
                    <Sparkles size={20} />
                    {!isPremium && <span className="text-[10px] font-black uppercase ml-1">Pro</span>}
                </button>
            </div>

            <div className="toolbar-group relative">
                <div style={{ maxWidth: '250px', flex: 1 }}>
                    <SearchBar />
                </div>
                <div className="divider"></div>

                <div className="relative">
                    <button
                        onClick={() => setIsThemePickerOpen(!isThemePickerOpen)}
                        title="Change Reading Theme"
                        className={`tool-btn ${isThemePickerOpen ? 'active' : ''}`}
                    >
                        <Palette size={20} />
                    </button>

                    <AnimatePresence>
                        {isThemePickerOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: -20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                                className="theme-picker-card"
                            >
                                <div className="theme-picker-header">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black tracking-[0.2em] text-accent uppercase" style={{ opacity: 0.8 }}>Reading</span>
                                        <span className="text-sm font-black text-primary uppercase" style={{ letterSpacing: '0.02em' }}>Themes</span>
                                    </div>
                                    <button
                                        onClick={() => setIsThemePickerOpen(false)}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="theme-picker-grid">
                                    {[
                                        { id: 'light', icon: <Sun />, label: 'Day', color: '#f8fafc' },
                                        { id: 'dark', icon: <Moon />, label: 'Night', color: '#0f172a' },
                                        { id: 'sepia', icon: <Coffee />, label: 'Sepia Full', color: '#e6dfc7' },
                                        { id: 'sepia-ui', icon: <Palette />, label: 'Sepia Lite', color: '#f4ecd8' },
                                        { id: 'forest', icon: <TreePine />, label: 'Forest', color: '#1a241e' },
                                        { id: 'ocean', icon: <Waves />, label: 'Ocean', color: '#0d1e3d' },
                                        { id: 'paper', icon: <FileType />, label: 'Paper', color: '#fcfcfc' }
                                    ].map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => {
                                                setTheme(t.id);
                                                // Immediate application fallback
                                                document.documentElement.setAttribute('data-theme', t.id);
                                                localStorage.setItem('theme', t.id);
                                                setIsThemePickerOpen(false);
                                            }}
                                            className={`theme-option-btn ${theme === t.id ? 'active' : ''}`}
                                        >
                                            <div className="theme-swatch" style={{ background: t.color }}>
                                                <div className="theme-swatch-glow" style={{ background: t.color }} />
                                                <div style={{ position: 'relative', zIndex: 2, display: 'flex' }}>
                                                    {React.cloneElement(t.icon, {
                                                        size: 11,
                                                        color: (theme === t.id) ? '#fff' : ((t.id === 'light' || t.id.includes('sepia') || t.id === 'paper') ? '#433422' : '#f1f5f9')
                                                    })}
                                                </div>
                                            </div>
                                            <span className="theme-label">{t.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Text-to-Speech Panel */}
            {isTextToSpeechOpen && (
                <TextToSpeechPanel onClose={() => setIsTextToSpeechOpen(false)} />
            )}

            {/* PDF Context Chat Panel */}
            {isPDFChatOpen && (
                <PDFContextChat onClose={() => setIsPDFChatOpen(false)} />
            )}

            {/* Equation Insight Modal */}
            {activeEquation && (
                <EquationInsightPanel
                    equation={activeEquation}
                    onClose={() => setActiveEquation(null)}
                />
            )}
        </div >
    );
};

export default Toolbar;
