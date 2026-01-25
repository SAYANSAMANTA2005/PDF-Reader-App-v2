/**
 * Simplified Editing Tools Panel
 * Works with existing annotation system
 */

import React, { useState } from 'react';
import { usePDF } from '../context/PDFContext';
import {
    Hand,
    MousePointer,
    Highlighter,
    Pen,
    Eraser,
    Square,
    Circle,
    Undo2,
    Redo2,
    Download,
    Type
} from 'lucide-react';
import '../styles/editing-tools.css';

const SimplifiedEditingToolsPanel = () => {
    const {
        annotationMode,
        setAnnotationMode,
        annotationColor,
        setAnnotationColor,
        brushThickness,
        setBrushThickness,
        highlightThickness,
        setHighlightThickness,
        handleDownload,
        pdfDocument,
        colorSettings
    } = usePDF();

    const tools = [
        { id: 'none', icon: Hand, label: 'Hand', desc: 'Pan and navigate' },
        { id: 'select', icon: MousePointer, label: 'Select', desc: 'Select text' },
        { id: 'highlight', icon: Highlighter, label: 'Highlight', desc: 'Highlight text' },
        { id: 'draw', icon: Pen, label: 'Draw', desc: 'Freehand drawing' },
        { id: 'erase', icon: Eraser, label: 'Eraser', desc: 'Remove annotations' }
    ];

    const colors = Object.keys(colorSettings);

    const handleToolSelect = (toolId) => {
        setAnnotationMode(toolId);
    };

    return (
        <div className="editing-tools-panel">
            <div className="editing-panel-header">
                <h3>PDF Editing Tools</h3>
                <p className="subtitle">Draw and highlight on your PDF</p>
            </div>

            {/* Action Buttons */}
            <div className="editing-actions">
                <button
                    className="action-btn primary"
                    onClick={handleDownload}
                    disabled={!pdfDocument}
                    title="Download Annotated PDF"
                >
                    <Download size={18} />
                    <span>Export</span>
                </button>
            </div>

            {/* Tools Grid */}
            <div className="tools-container">
                <div className="tool-category">
                    <div className="category-label">Tools</div>
                    <div className="tool-grid">
                        {tools.map((tool) => (
                            <button
                                key={tool.id}
                                className={`tool-button ${annotationMode === tool.id ? 'active' : ''}`}
                                onClick={() => handleToolSelect(tool.id)}
                                title={tool.desc}
                            >
                                <tool.icon size={20} />
                                <span className="tool-label">{tool.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Property Panel */}
            {(annotationMode === 'draw' || annotationMode === 'highlight') && (
                <div className="property-panel">
                    <h4>{annotationMode === 'highlight' ? 'Highlight' : 'Draw'} Properties</h4>

                    <div className="property-row">
                        <label>Colors:</label>
                        <div className="color-grid-inline">
                            {colors.map((color) => (
                                <button
                                    key={color}
                                    className={`color-swatch ${annotationColor === color ? 'active' : ''}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => setAnnotationColor(color)}
                                    title={colorSettings[color]}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="property-row">
                        <label>Thickness:</label>
                        <input
                            type="range"
                            min="1"
                            max={annotationMode === 'highlight' ? 80 : 20}
                            value={annotationMode === 'highlight' ? highlightThickness : brushThickness}
                            onChange={(e) =>
                                annotationMode === 'highlight'
                                    ? setHighlightThickness(parseInt(e.target.value))
                                    : setBrushThickness(parseInt(e.target.value))
                            }
                        />
                        <span>{annotationMode === 'highlight' ? highlightThickness : brushThickness}px</span>
                    </div>

                    {/* Preview */}
                    <div className="preview-section">
                        <svg width="100%" height="40">
                            <path
                                d="M 20 20 Q 80 0, 140 20 T 260 20"
                                stroke={annotationColor}
                                strokeWidth={annotationMode === 'highlight' ? highlightThickness : brushThickness}
                                fill="none"
                                strokeLinecap="round"
                                opacity={annotationMode === 'highlight' ? 0.4 : 1}
                            />
                        </svg>
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div className="editing-instructions">
                <p><strong>Active:</strong> {tools.find(t => t.id === annotationMode)?.label || 'Hand Tool'}</p>
                <p className="help-text">
                    {annotationMode === 'none' ? 'Select a tool to start editing' :
                        annotationMode === 'highlight' || annotationMode === 'draw' ? 'Click and drag on the PDF to draw' :
                            annotationMode === 'erase' ? 'Click on annotations to delete them' :
                                'Click on the PDF to use this tool'}
                </p>
            </div>
        </div>
    );
};

export default SimplifiedEditingToolsPanel;
