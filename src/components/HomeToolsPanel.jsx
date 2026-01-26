/**
 * Home Tools Panel
 * Central dashboard for most common PDF operations (WPS Pro style)
 */

import React, { useState } from 'react';
import { usePDF } from '../context/PDFContext';
import {
    Hand,
    MousePointer,
    Type,
    Image as ImageIcon,
    FileImage,
    RefreshCw,
    Search,
    ZoomIn,
    ZoomOut,
    Maximize,
    Minimize,
    Scissors,
    Files,
    ArrowRightLeft,
    Settings,
    Grid3X3,
    BookOpen,
    MessageSquare
} from 'lucide-react';
import '../styles/editing-tools.css';
import '../styles/production-editing.css';

const HomeToolsPanel = () => {
    const {
        setAnnotationMode,
        scale,
        setScale,
        rotation,
        setRotation,
        annotationMode,
        currentPage,
        pdfDocument,
        addImageAnnotation,
        setSearchQuery,
        setIsPdfToImageOpen,
        setIsSplitMergeOpen,
        setIsFindReplaceOpen,
        setIsSnipMode,
        setIsCommentPanelOpen,
        annotationColor,
        setAnnotationColor,
        textFontSize,
        setTextFontSize
    } = usePDF();

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
    const handleFitWidth = () => setScale(1.2);
    const handleFitPage = () => setScale(1.0);

    const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

    const handleFind = () => {
        setIsFindReplaceOpen(true);
    };

    const handlePdfToImage = () => {
        setIsPdfToImageOpen(true);
    };

    const handleSplitMerge = () => {
        setIsSplitMergeOpen(true);
    };

    const handleSnip = () => {
        setIsSnipMode(true);
    };

    const handleComment = () => {
        setIsCommentPanelOpen(true);
    };

    const handleAddImage = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    addImageAnnotation(currentPage, event.target.result, 0.3, 0.3, 0.4, 0.4);
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    };

    const handleComingSoon = (feature) => {
        alert(`${feature} is coming soon!`);
    };

    return (
        <div className="editing-tools-panel home-panel">
            <div className="editing-panel-header">
                <h3>Home</h3>
                <p className="subtitle">Common Tools & View Options</p>
            </div>

            <div className="tools-container">

                {/* VIEW & SELECTION */}
                <div className="tool-category">
                    <div className="category-label">View & Select</div>
                    <div className="tool-grid">
                        <button
                            className={`tool-button ${annotationMode === 'none' ? 'active' : ''}`}
                            onClick={() => setAnnotationMode('none')}
                            title="Hand Tool (Pan)"
                        >
                            <Hand size={20} />
                            <span className="tool-label">Pan</span>
                        </button>
                        <button
                            className={`tool-button ${annotationMode === 'select' ? 'active' : ''}`}
                            onClick={() => setAnnotationMode('select')}
                            title="Select Tool"
                        >
                            <MousePointer size={20} />
                            <span className="tool-label">Select</span>
                        </button>
                        <button
                            className="tool-button"
                            onClick={handleFind}
                            title="Find Text"
                        >
                            <Search size={20} />
                            <span className="tool-label">Find</span>
                        </button>
                    </div>
                </div>

                {/* CONTENT EDITING */}
                <div className="tool-category">
                    <div className="category-label">Insert & Edit</div>
                    <div className="tool-grid">
                        <button
                            className={`tool-button ${annotationMode === 'text' ? 'active' : ''}`}
                            onClick={() => setAnnotationMode('text')}
                            title="Add Text Box"
                        >
                            <Type size={20} />
                            <span className="tool-label">Add Text</span>
                        </button>
                        <button
                            className="tool-button"
                            onClick={handleAddImage}
                            title="Add Picture"
                        >
                            <ImageIcon size={20} />
                            <span className="tool-label">Add Pic</span>
                        </button>
                        <button
                            className="tool-button"
                            onClick={handleComment}
                        >
                            <MessageSquare size={20} />
                            <span className="tool-label">Comment</span>
                        </button>
                    </div>
                </div>

                {/* PAGE & VIEW MODES */}
                <div className="tool-category">
                    <div className="category-label">Page & View</div>
                    <div className="tool-grid">
                        <button className="tool-button" onClick={handleZoomIn} title="Zoom In">
                            <ZoomIn size={20} />
                            <span className="tool-label">Zoom In</span>
                        </button>
                        <button className="tool-button" onClick={handleZoomOut} title="Zoom Out">
                            <ZoomOut size={20} />
                            <span className="tool-label">Zoom Out</span>
                        </button>
                        <button className="tool-button" onClick={handleRotate} title="Rotate Pages">
                            <RefreshCw size={20} />
                            <span className="tool-label">Rotate</span>
                        </button>

                        <button className="tool-button" onClick={handleFitWidth} title="Fit Width">
                            <Maximize size={20} />
                            <span className="tool-label">Fit Width</span>
                        </button>

                        <button className="tool-button" onClick={() => handleComingSoon("Read Mode")} title="Read Mode">
                            <BookOpen size={20} />
                            <span className="tool-label">Read Mode</span>
                        </button>
                    </div>
                </div>

                {/* CONVERT & TOOLS (Advanced) - Placeholders mainly */}
                <div className="tool-category">
                    <div className="category-label">Convert & Tools</div>
                    <div className="tool-grid">
                        <button className="tool-button" onClick={handlePdfToImage} title="PDF to Image">
                            <FileImage size={20} />
                            <span className="tool-label">PDF to Pic</span>
                        </button>
                        <button className="tool-button" onClick={() => handleComingSoon("PDF Converter")} title="PDF Converter">
                            <ArrowRightLeft size={20} />
                            <span className="tool-label">Convert</span>
                        </button>
                        <button className="tool-button" onClick={handleSplitMerge} title="Split & Merge">
                            <Files size={20} />
                            <span className="tool-label">Merge</span>
                        </button>
                        <button className="tool-button" onClick={handleSnip} title="Snip & Pin">
                            <Scissors size={20} />
                            <span className="tool-label">Snip</span>
                        </button>
                    </div>
                </div>

                {/* TEXT PROPERTIES (Contextual) */}
                {annotationMode === 'text' && (
                    <div className="tool-category properties-panel" style={{ background: 'rgba(var(--accent-rgb), 0.05)', borderRadius: '12px', padding: '12px', border: '1px solid var(--accent-color)' }}>
                        <div className="category-label" style={{ color: 'var(--accent-color)', fontWeight: 'bold', marginBottom: '10px' }}>Text Properties</div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* Font Size */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '13px' }}>Size:</span>
                                <input
                                    type="number"
                                    value={textFontSize}
                                    onChange={(e) => setTextFontSize(Number(e.target.value))}
                                    style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}
                                />
                            </div>

                            {/* Color Selection */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '13px' }}>Color:</span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {['#ff0000', '#000000', '#0000ff', '#00ff00', '#ffa500'].map(color => (
                                        <div
                                            key={color}
                                            onClick={() => setAnnotationColor(color)}
                                            style={{
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '50%',
                                                background: color,
                                                cursor: 'pointer',
                                                border: annotationColor === color ? '2px solid white' : 'none',
                                                boxShadow: annotationColor === color ? '0 0 0 2px var(--accent-color)' : 'none'
                                            }}
                                        />
                                    ))}
                                    <input
                                        type="color"
                                        value={annotationColor}
                                        onChange={(e) => setAnnotationColor(e.target.value)}
                                        style={{ width: '24px', height: '24px', border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default HomeToolsPanel;
