/**
 * Production-Grade Editing Tools Panel
 * All WPS Pro features using existing annotation system
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
    ArrowRight,
    Minus,
    Type,
    Image as ImageIcon,
    Stamp as StampIcon,
    Link as LinkIcon,
    Volume2,
    Video,
    Download,
    Edit3,
    ChevronDown
} from 'lucide-react';
import '../styles/editing-tools.css';
import '../styles/editing-tools-simple.css';
import '../styles/production-editing.css';

const ProductionEditingToolsPanel = () => {
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
        currentPage,
        addImageAnnotation,
        colorSettings
    } = usePDF();

    const [selectedShape, setSelectedShape] = useState('rectangle');
    const [selectedStamp, setSelectedStamp] = useState('APPROVED');
    const [showShapeMenu, setShowShapeMenu] = useState(false);
    const [showStampMenu, setShowStampMenu] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [linkUrl, setLinkUrl] = useState('');

    const tools = [
        {
            id: 'none',
            icon: Hand,
            label: 'Hand',
            desc: 'Pan and navigate',
            category: 'Selection'
        },
        {
            id: 'select',
            icon: MousePointer,
            label: 'Select',
            desc: 'Select text',
            category: 'Selection'
        },
        {
            id: 'edit-content',
            icon: Edit3,
            label: 'Edit Content',
            desc: 'Edit PDF content',
            category: 'Content'
        },
        {
            id: 'text',
            icon: Type,
            label: 'Add Text',
            desc: 'Insert text',
            category: 'Content'
        },
        {
            id: 'image',
            icon: ImageIcon,
            label: 'Add Picture',
            desc: 'Insert image',
            category: 'Content'
        },
        {
            id: 'highlight',
            icon: Highlighter,
            label: 'Highlight',
            desc: 'Highlight text',
            category: 'Markup'
        },
        {
            id: 'draw',
            icon: Pen,
            label: 'Draw',
            desc: 'Freehand drawing',
            category: 'Markup'
        },
        {
            id: 'erase',
            icon: Eraser,
            label: 'Eraser',
            desc: 'Remove annotations',
            category: 'Markup'
        }
    ];

    const shapes = [
        { id: 'rectangle', icon: Square, label: 'Rectangle' },
        { id: 'circle', icon: Circle, label: 'Circle' },
        { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
        { id: 'line', icon: Minus, label: 'Line' }
    ];

    const stamps = [
        'APPROVED',
        'REJECTED',
        'CONFIDENTIAL',
        'DRAFT',
        'FINAL',
        'REVIEWED',
        'URGENT',
        'COPY'
    ];

    const colors = colorSettings ? Object.keys(colorSettings) : ['#FFEB3B', '#00BCD4', '#F44336', '#4CAF50'];

    // Sync selected shape/stamp/text to window for AnnotationLayer access
    React.useEffect(() => {
        window.selectedShape = selectedShape;
    }, [selectedShape]);

    React.useEffect(() => {
        window.selectedStamp = selectedStamp;
    }, [selectedStamp]);

    React.useEffect(() => {
        window.textToAdd = textInput;
    }, [textInput]);

    const handleToolSelect = (toolId) => {
        setAnnotationMode(toolId);
        setShowShapeMenu(false);
        setShowStampMenu(false);
    };

    const handleImageUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    // Add image at center of page with reasonable size
                    addImageAnnotation(currentPage, event.target.result, 0.3, 0.3, 0.4, 0.4);
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    };

    const groupedTools = tools.reduce((acc, tool) => {
        if (!acc[tool.category]) acc[tool.category] = [];
        acc[tool.category].push(tool);
        return acc;
    }, {});

    return (
        <div className="editing-tools-panel">
            <div className="editing-panel-header">
                <h3>PDF Editing Tools</h3>
                <p className="subtitle">Professional-grade editing features</p>
            </div>

            {/* Action Buttons */}
            <div className="editing-actions">
                <button
                    className="action-btn primary"
                    onClick={handleDownload}
                    disabled={!pdfDocument}
                    title="Export Annotated PDF"
                >
                    <Download size={18} />
                    <span>Export PDF</span>
                </button>
            </div>

            {/* Tools Grid */}
            <div className="tools-container">
                {Object.entries(groupedTools).map(([category, categoryTools]) => (
                    <div key={category} className="tool-category">
                        <div className="category-label">{category}</div>
                        <div className="tool-grid">
                            {categoryTools.map((tool) => (
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
                ))}

                {/* Shapes Section */}
                <div className="tool-category">
                    <div className="category-label">Shapes</div>
                    <div className="tool-grid">
                        <button
                            className={`tool-button ${annotationMode === 'shape' ? 'active' : ''}`}
                            onClick={() => setShowShapeMenu(!showShapeMenu)}
                            title="Draw Shapes"
                        >
                            {React.createElement(shapes.find(s => s.id === selectedShape)?.icon || Square, { size: 20 })}
                            <span className="tool-label">Shapes</span>
                            <ChevronDown size={14} className={showShapeMenu ? 'rotate-180' : ''} />
                        </button>
                    </div>

                    {showShapeMenu && (
                        <div className="submenu">
                            {shapes.map(shape => (
                                <button
                                    key={shape.id}
                                    className={`submenu-item ${selectedShape === shape.id ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedShape(shape.id);
                                        setAnnotationMode('shape');
                                        setShowShapeMenu(false);
                                    }}
                                >
                                    <shape.icon size={16} />
                                    <span>{shape.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Other Tools */}
                <div className="tool-category">
                    <div className="category-label">Other</div>
                    <div className="tool-grid">
                        <button
                            className={`tool-button ${annotationMode === 'stamp' ? 'active' : ''}`}
                            onClick={() => setShowStampMenu(!showStampMenu)}
                            title="Add Stamp"
                        >
                            <StampIcon size={20} />
                            <span className="tool-label">Stamp</span>
                        </button>

                        <button
                            className={`tool-button ${annotationMode === 'link' ? 'active' : ''}`}
                            onClick={() => handleToolSelect('link')}
                            title="Add Link"
                        >
                            <LinkIcon size={20} />
                            <span className="tool-label">Link</span>
                        </button>

                        <button
                            className={`tool-button ${annotationMode === 'audio' ? 'active' : ''}`}
                            onClick={() => handleToolSelect('audio')}
                            title="Add Audio"
                        >
                            <Volume2 size={20} />
                            <span className="tool-label">Audio</span>
                        </button>

                        <button
                            className={`tool-button ${annotationMode === 'video' ? 'active' : ''}`}
                            onClick={() => handleToolSelect('video')}
                            title="Add Video"
                        >
                            <Video size={20} />
                            <span className="tool-label">Video</span>
                        </button>
                    </div>

                    {showStampMenu && (
                        <div className="submenu stamp-menu">
                            {stamps.map(stamp => (
                                <button
                                    key={stamp}
                                    className={`submenu-item ${selectedStamp === stamp ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedStamp(stamp);
                                        setAnnotationMode('stamp');
                                        setShowStampMenu(false);
                                    }}
                                >
                                    <span className="stamp-text">{stamp}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Property Panels */}
            {annotationMode === 'text' && (
                <div className="property-panel">
                    <h4>Add Text</h4>
                    <div className="property-row">
                        <input
                            type="text"
                            placeholder="Enter text..."
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            className="text-input-field"
                        />
                    </div>
                    <div className="property-row">
                        <label>Color:</label>
                        <div className="color-grid-inline">
                            {colors.map((color) => (
                                <button
                                    key={color}
                                    className={`color-swatch ${annotationColor === color ? 'active' : ''}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => setAnnotationColor(color)}
                                />
                            ))}
                        </div>
                    </div>
                    <p className="help-text">Click on PDF to place text</p>
                </div>
            )}

            {annotationMode === 'image' && (
                <div className="property-panel">
                    <h4>Add Picture</h4>
                    <button onClick={handleImageUpload} className="upload-image-btn">
                        <ImageIcon size={18} />
                        Choose Image
                    </button>
                    <p className="help-text">Select an image file to insert</p>
                </div>
            )}

            {annotationMode === 'link' && (
                <div className="property-panel">
                    <h4>Add Link</h4>
                    <div className="property-row">
                        <input
                            type="url"
                            placeholder="https://example.com"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            className="text-input-field"
                        />
                    </div>
                    <p className="help-text">Enter URL and click area on PDF</p>
                </div>
            )}

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

            {annotationMode === 'shape' && (
                <div className="property-panel">
                    <h4>Shape Properties</h4>
                    <div className="property-row">
                        <label>Shape:</label>
                        <span className="selected-shape">{shapes.find(s => s.id === selectedShape)?.label}</span>
                    </div>
                    <div className="property-row">
                        <label>Color:</label>
                        <div className="color-grid-inline">
                            {colors.map((color) => (
                                <button
                                    key={color}
                                    className={`color-swatch ${annotationColor === color ? 'active' : ''}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => setAnnotationColor(color)}
                                />
                            ))}
                        </div>
                    </div>
                    <p className="help-text">Click and drag on PDF to draw {selectedShape}</p>
                </div>
            )}

            {annotationMode === 'stamp' && (
                <div className="property-panel">
                    <h4>Stamp</h4>
                    <div className="stamp-preview">
                        {selectedStamp}
                    </div>
                    <p className="help-text">Click on PDF to place stamp</p>
                </div>
            )}

            {/* Instructions */}
            <div className="editing-instructions">
                <p><strong>Active:</strong> {
                    tools.find(t => t.id === annotationMode)?.label ||
                    (annotationMode === 'shape' ? 'Shape' :
                        annotationMode === 'stamp' ? 'Stamp' :
                            annotationMode === 'link' ? 'Link' :
                                annotationMode === 'audio' ? 'Audio' :
                                    annotationMode === 'video' ? 'Video' : 'Hand Tool')
                }</p>
                <p className="help-text">
                    {annotationMode === 'none' ? 'Select a tool to start editing' :
                        annotationMode === 'highlight' || annotationMode === 'draw' ? 'Click and drag on PDF to draw' :
                            annotationMode === 'erase' ? 'Click annotations to delete them' :
                                annotationMode === 'text' ? 'Click on PDF to place text' :
                                    annotationMode === 'image' ? 'Upload and place images' :
                                        annotationMode === 'shape' ? 'Click and drag to draw shapes' :
                                            annotationMode === 'stamp' ? 'Click to place stamp' :
                                                annotationMode === 'link' ? 'Click to add hyperlink' :
                                                    'Use this tool on the PDF'}
                </p>
            </div>
        </div>
    );
};

export default ProductionEditingToolsPanel;
