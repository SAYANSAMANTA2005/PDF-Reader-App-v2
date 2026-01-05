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
    Brain
} from 'lucide-react';
import DrawingPanel from './DrawingPanel';
import EquationInsightPanel from './EquationInsightPanel';

const Toolbar = () => {
    const {
        scale, setScale,
        rotation, setRotation,
        currentPage, setCurrentPage,
        numPages,
        setIsSidebarOpen, isSidebarOpen,
        theme, toggleTheme,
        pdfDocument,
        annotationMode, setAnnotationMode,
        isTwoPageMode, setIsTwoPageMode,
        annotationColor, setAnnotationColor,
        isReading, setIsReading, stopReading,
        brushThickness, handleDownload,
        isMathMode, setIsMathMode,
        activeEquation, setActiveEquation,
        isActiveRecallMode, setIsActiveRecallMode
    } = usePDF();

    const [isDrawingPanelOpen, setIsDrawingPanelOpen] = useState(false);
    const [isTextToSpeechOpen, setIsTextToSpeechOpen] = useState(false);
    const [isPDFChatOpen, setIsPDFChatOpen] = useState(false);
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
                        setIsMathMode(!isMathMode);
                        if (!isMathMode) {
                            setIsPDFChatOpen(false);
                            setIsTextToSpeechOpen(false);
                        }
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
            </div>

            <div className="toolbar-group">
                <div style={{ maxWidth: '250px', flex: 1 }}>
                    <SearchBar />
                </div>
                <div className="divider"></div>
                <button
                    onClick={toggleTheme}
                    title="Toggle Theme"
                    className={`tool-btn ${theme === 'dark' ? 'active' : ''}`}
                >
                    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>
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
        </div>
    );
};

export default Toolbar;
