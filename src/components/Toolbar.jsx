import React, { useState, useRef } from 'react';
import { usePDF } from '../context/PDFContext';
import SearchBar from './SearchBar';
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
    Download
} from 'lucide-react';
import DrawingPanel from './DrawingPanel';

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
        brushThickness, handleDownload
    } = usePDF();

    const [isDrawingPanelOpen, setIsDrawingPanelOpen] = useState(false);

    // Removed local isReading state and handleZoomIn duplicate

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 3.0));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));
    const handleRotate = () => setRotation(prev => (prev + 90) % 360);
    const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
    const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, numPages));

    // Page Input Handler
    const handlePageInput = (e) => {
        const val = parseInt(e.target.value);
        if (!isNaN(val) && val >= 1 && val <= numPages) {
            setCurrentPage(val);
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
                    className={`tool - btn ${isSidebarOpen ? 'active' : ''} `}
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
                            value={currentPage}
                            onChange={handlePageInput}
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
                    className={`tool - btn ${annotationMode === 'highlight' ? 'active' : ''} `}
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
                    className={`tool - btn ${isTwoPageMode ? 'active' : ''} `}
                    title="Two Page View"
                    disabled={!pdfDocument}
                >
                    <BookOpen size={20} />
                </button>
                <button
                    onClick={() => {
                        if (isReading) {
                            stopReading();
                            setIsReading(false);
                        } else {
                            setIsReading(true);
                            // Visual cue?
                        }
                    }}
                    className={`tool-btn ${isReading ? 'active' : ''}`}
                    title="Read Aloud Mode (Click text to start)"
                    disabled={!pdfDocument}
                >
                    <Volume2 size={20} />
                </button>
            </div>

            <div className="toolbar-group">
                <SearchBar />
                <div className="divider"></div>
                <button onClick={toggleTheme} title="Toggle Theme" className="theme-btn">
                    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>
            </div>
        </div>
    );
};

export default Toolbar;
