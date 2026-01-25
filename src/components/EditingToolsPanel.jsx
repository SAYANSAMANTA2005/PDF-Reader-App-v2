import React, { useState } from 'react';
import { usePDF } from '../context/PDFContext';
import { annotationManager, ANNOTATION_TYPES } from '../utils/annotationEngine';
import { exportAnnotatedPDF, downloadPDF } from '../utils/pdfExportService';
import {
    Hand,
    MousePointer,
    Type,
    Image as ImageIcon,
    Edit3,
    Eraser,
    Square,
    Circle,
    ArrowRight,
    Minus,
    Pentagon,
    Stamp,
    Link,
    Volume2,
    Video,
    Bookmark,
    Crop,
    Undo2,
    Redo2,
    Download,
    Palette,
    Sliders
} from 'lucide-react';
import '../styles/editing-tools.css';

const EditingToolsPanel = () => {
    const {
        pdfFile,
        fileName,
        currentPage,
        setActiveSidebarTab
    } = usePDF();

    const [activeTool, setActiveTool] = useState(ANNOTATION_TYPES.HAND);
    const [toolSettings, setToolSettings] = useState({
        text: {
            fontSize: 14,
            fontFamily: 'Arial',
            color: '#000000',
            bold: false,
            italic: false,
            underline: false
        },
        shape: {
            strokeColor: '#FF0000',
            fillColor: 'transparent',
            strokeWidth: 2,
            opacity: 1
        },
        freehand: {
            color: '#000000',
            thickness: 3
        },
        highlight: {
            color: '#FFFF00',
            opacity: 0.5
        },
        eraser: {
            size: 20
        },
        stamp: {
            text: 'APPROVED',
            color: '#FF0000'
        }
    });

    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    // Subscribe to annotation changes for undo/redo state
    React.useEffect(() => {
        const unsubscribe = annotationManager.subscribe(() => {
            setCanUndo(annotationManager.undoStack.length > 0);
            setCanRedo(annotationManager.redoStack.length > 0);
        });
        return unsubscribe;
    }, []);

    const tools = [
        {
            category: 'Selection',
            items: [
                { id: ANNOTATION_TYPES.HAND, icon: Hand, label: 'Hand Tool', desc: 'Pan and navigate' },
                { id: ANNOTATION_TYPES.SELECT, icon: MousePointer, label: 'Select Tool', desc: 'Select text' }
            ]
        },
        {
            category: 'Content',
            items: [
                { id: ANNOTATION_TYPES.TEXT, icon: Type, label: 'Add Text', desc: 'Insert text box' },
                { id: ANNOTATION_TYPES.IMAGE, icon: ImageIcon, label: 'Add Picture', desc: 'Insert image' }
            ]
        },
        {
            category: 'Markup',
            items: [
                { id: ANNOTATION_TYPES.FREEHAND, icon: Edit3, label: 'Draw', desc: 'Freehand drawing' },
                { id: ANNOTATION_TYPES.HIGHLIGHT, icon: Palette, label: 'Highlight', desc: 'Highlight text' },
                { id: ANNOTATION_TYPES.ERASER, icon: Eraser, label: 'Eraser', desc: 'Remove annotations' }
            ]
        },
        {
            category: 'Shapes',
            items: [
                { id: ANNOTATION_TYPES.SHAPE_RECT, icon: Square, label: 'Rectangle', desc: 'Draw rectangle' },
                { id: ANNOTATION_TYPES.SHAPE_CIRCLE, icon: Circle, label: 'Circle', desc: 'Draw circle' },
                { id: ANNOTATION_TYPES.SHAPE_ARROW, icon: ArrowRight, label: 'Arrow', desc: 'Draw arrow' },
                { id: ANNOTATION_TYPES.SHAPE_LINE, icon: Minus, label: 'Line', desc: 'Draw line' },
                { id: ANNOTATION_TYPES.SHAPE_POLYGON, icon: Pentagon, label: 'Polygon', desc: 'Draw polygon' }
            ]
        },
        {
            category: 'Other',
            items: [
                { id: ANNOTATION_TYPES.STAMP, icon: Stamp, label: 'Stamp', desc: 'Add stamp' },
                { id: ANNOTATION_TYPES.LINK, icon: Link, label: 'Link', desc: 'Add hyperlink' },
                { id: ANNOTATION_TYPES.AUDIO, icon: Volume2, label: 'Audio', desc: 'Audio annotation' },
                { id: ANNOTATION_TYPES.VIDEO, icon: Video, label: 'Video', desc: 'Video annotation' },
                { id: ANNOTATION_TYPES.BOOKMARK, icon: Bookmark, label: 'Bookmark', desc: 'Add bookmark' },
                { id: ANNOTATION_TYPES.CROP, icon: Crop, label: 'Crop', desc: 'Crop pages' }
            ]
        }
    ];

    const handleToolSelect = (toolId) => {
        setActiveTool(toolId);

        // Dispatch event to notify PDFViewer of tool change
        window.dispatchEvent(new CustomEvent('editing-tool-changed', {
            detail: { tool: toolId, settings: toolSettings }
        }));
    };

    const handleUndo = () => {
        if (annotationManager.undo()) {
            // Trigger re-render in PDFViewer
            window.dispatchEvent(new CustomEvent('annotations-updated'));
        }
    };

    const handleRedo = () => {
        if (annotationManager.redo()) {
            window.dispatchEvent(new CustomEvent('annotations-updated'));
        }
    };

    const handleExport = async () => {
        if (!pdfFile) {
            alert('No PDF loaded');
            return;
        }

        try {
            // Get original PDF bytes
            let pdfBytes;
            if (pdfFile instanceof File) {
                pdfBytes = await pdfFile.arrayBuffer();
            } else if (typeof pdfFile === 'string') {
                const response = await fetch(pdfFile);
                pdfBytes = await response.arrayBuffer();
            } else {
                throw new Error('Unsupported PDF file type');
            }

            // Export annotations
            const annotations = annotationManager.getAllAnnotations();
            const annotatedPdfBytes = await exportAnnotatedPDF(new Uint8Array(pdfBytes), annotations);

            // Download
            const exportFileName = fileName.replace('.pdf', '_edited.pdf');
            downloadPDF(annotatedPdfBytes, exportFileName);

            alert('PDF exported successfully!');
        } catch (err) {
            console.error('Export failed:', err);
            alert('Failed to export PDF: ' + err.message);
        }
    };

    const updateToolSetting = (category, key, value) => {
        setToolSettings(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [key]: value
            }
        }));

        // Notify PDFViewer of settings change
        window.dispatchEvent(new CustomEvent('editing-settings-changed', {
            detail: { settings: { ...toolSettings, [category]: { ...toolSettings[category], [key]: value } } }
        }));
    };

    const renderPropertyPanel = () => {
        switch (activeTool) {
            case ANNOTATION_TYPES.TEXT:
                return (
                    <div className="property-panel">
                        <h4>Text Properties</h4>
                        <div className="property-row">
                            <label>Font:</label>
                            <select
                                value={toolSettings.text.fontFamily}
                                onChange={(e) => updateToolSetting('text', 'fontFamily', e.target.value)}
                            >
                                <option value="Arial">Arial</option>
                                <option value="Times New Roman">Times New Roman</option>
                                <option value="Courier New">Courier New</option>
                                <option value="Verdana">Verdana</option>
                            </select>
                        </div>
                        <div className="property-row">
                            <label>Size:</label>
                            <input
                                type="number"
                                min="8"
                                max="72"
                                value={toolSettings.text.fontSize}
                                onChange={(e) => updateToolSetting('text', 'fontSize', parseInt(e.target.value))}
                            />
                        </div>
                        <div className="property-row">
                            <label>Color:</label>
                            <input
                                type="color"
                                value={toolSettings.text.color}
                                onChange={(e) => updateToolSetting('text', 'color', e.target.value)}
                            />
                        </div>
                        <div className="property-row">
                            <div className="format-buttons">
                                <button
                                    className={toolSettings.text.bold ? 'active' : ''}
                                    onClick={() => updateToolSetting('text', 'bold', !toolSettings.text.bold)}
                                    title="Bold"
                                >
                                    <strong>B</strong>
                                </button>
                                <button
                                    className={toolSettings.text.italic ? 'active' : ''}
                                    onClick={() => updateToolSetting('text', 'italic', !toolSettings.text.italic)}
                                    title="Italic"
                                >
                                    <em>I</em>
                                </button>
                                <button
                                    className={toolSettings.text.underline ? 'active' : ''}
                                    onClick={() => updateToolSetting('text', 'underline', !toolSettings.text.underline)}
                                    title="Underline"
                                >
                                    <u>U</u>
                                </button>
                            </div>
                        </div>
                    </div>
                );

            case ANNOTATION_TYPES.SHAPE_RECT:
            case ANNOTATION_TYPES.SHAPE_CIRCLE:
            case ANNOTATION_TYPES.SHAPE_ARROW:
            case ANNOTATION_TYPES.SHAPE_LINE:
            case ANNOTATION_TYPES.SHAPE_POLYGON:
                return (
                    <div className="property-panel">
                        <h4>Shape Properties</h4>
                        <div className="property-row">
                            <label>Stroke:</label>
                            <input
                                type="color"
                                value={toolSettings.shape.strokeColor}
                                onChange={(e) => updateToolSetting('shape', 'strokeColor', e.target.value)}
                            />
                        </div>
                        <div className="property-row">
                            <label>Fill:</label>
                            <input
                                type="color"
                                value={toolSettings.shape.fillColor === 'transparent' ? '#ffffff' : toolSettings.shape.fillColor}
                                onChange={(e) => updateToolSetting('shape', 'fillColor', e.target.value)}
                            />
                            <label>
                                <input
                                    type="checkbox"
                                    checked={toolSettings.shape.fillColor === 'transparent'}
                                    onChange={(e) => updateToolSetting('shape', 'fillColor', e.target.checked ? 'transparent' : '#ffffff')}
                                />
                                Transparent
                            </label>
                        </div>
                        <div className="property-row">
                            <label>Width:</label>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={toolSettings.shape.strokeWidth}
                                onChange={(e) => updateToolSetting('shape', 'strokeWidth', parseInt(e.target.value))}
                            />
                            <span>{toolSettings.shape.strokeWidth}px</span>
                        </div>
                        <div className="property-row">
                            <label>Opacity:</label>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={toolSettings.shape.opacity}
                                onChange={(e) => updateToolSetting('shape', 'opacity', parseFloat(e.target.value))}
                            />
                            <span>{Math.round(toolSettings.shape.opacity * 100)}%</span>
                        </div>
                    </div>
                );

            case ANNOTATION_TYPES.FREEHAND:
                return (
                    <div className="property-panel">
                        <h4>Draw Properties</h4>
                        <div className="property-row">
                            <label>Color:</label>
                            <input
                                type="color"
                                value={toolSettings.freehand.color}
                                onChange={(e) => updateToolSetting('freehand', 'color', e.target.value)}
                            />
                        </div>
                        <div className="property-row">
                            <label>Thickness:</label>
                            <input
                                type="range"
                                min="1"
                                max="20"
                                value={toolSettings.freehand.thickness}
                                onChange={(e) => updateToolSetting('freehand', 'thickness', parseInt(e.target.value))}
                            />
                            <span>{toolSettings.freehand.thickness}px</span>
                        </div>
                    </div>
                );

            case ANNOTATION_TYPES.HIGHLIGHT:
                return (
                    <div className="property-panel">
                        <h4>Highlight Properties</h4>
                        <div className="property-row">
                            <label>Color:</label>
                            <input
                                type="color"
                                value={toolSettings.highlight.color}
                                onChange={(e) => updateToolSetting('highlight', 'color', e.target.value)}
                            />
                        </div>
                        <div className="property-row">
                            <label>Opacity:</label>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={toolSettings.highlight.opacity}
                                onChange={(e) => updateToolSetting('highlight', 'opacity', parseFloat(e.target.value))}
                            />
                            <span>{Math.round(toolSettings.highlight.opacity * 100)}%</span>
                        </div>
                    </div>
                );

            case ANNOTATION_TYPES.ERASER:
                return (
                    <div className="property-panel">
                        <h4>Eraser Properties</h4>
                        <div className="property-row">
                            <label>Size:</label>
                            <input
                                type="range"
                                min="10"
                                max="50"
                                value={toolSettings.eraser.size}
                                onChange={(e) => updateToolSetting('eraser', 'size', parseInt(e.target.value))}
                            />
                            <span>{toolSettings.eraser.size}px</span>
                        </div>
                    </div>
                );

            case ANNOTATION_TYPES.STAMP:
                return (
                    <div className="property-panel">
                        <h4>Stamp Properties</h4>
                        <div className="property-row">
                            <label>Text:</label>
                            <input
                                type="text"
                                value={toolSettings.stamp.text}
                                onChange={(e) => updateToolSetting('stamp', 'text', e.target.value)}
                                placeholder="Stamp text"
                            />
                        </div>
                        <div className="property-row">
                            <label>Presets:</label>
                            <select onChange={(e) => updateToolSetting('stamp', 'text', e.target.value)}>
                                <option>APPROVED</option>
                                <option>REJECTED</option>
                                <option>CONFIDENTIAL</option>
                                <option>DRAFT</option>
                                <option>FINAL</option>
                                <option>URGENT</option>
                            </select>
                        </div>
                        <div className="property-row">
                            <label>Color:</label>
                            <input
                                type="color"
                                value={toolSettings.stamp.color}
                                onChange={(e) => updateToolSetting('stamp', 'color', e.target.value)}
                            />
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="editing-tools-panel">
            <div className="editing-panel-header">
                <h3>PDF Editing Tools</h3>
                <p className="subtitle">Professional-grade editing features</p>
            </div>

            {/* Action Buttons */}
            <div className="editing-actions">
                <button
                    className="action-btn"
                    onClick={handleUndo}
                    disabled={!canUndo}
                    title="Undo (Ctrl+Z)"
                >
                    <Undo2 size={18} />
                    <span>Undo</span>
                </button>
                <button
                    className="action-btn"
                    onClick={handleRedo}
                    disabled={!canRedo}
                    title="Redo (Ctrl+Y)"
                >
                    <Redo2 size={18} />
                    <span>Redo</span>
                </button>
                <button
                    className="action-btn primary"
                    onClick={handleExport}
                    disabled={!pdfFile}
                    title="Export Edited PDF"
                >
                    <Download size={18} />
                    <span>Export</span>
                </button>
            </div>

            {/* Tools Grid */}
            <div className="tools-container">
                {tools.map((category, idx) => (
                    <div key={idx} className="tool-category">
                        <div className="category-label">{category.category}</div>
                        <div className="tool-grid">
                            {category.items.map((tool) => (
                                <button
                                    key={tool.id}
                                    className={`tool-button ${activeTool === tool.id ? 'active' : ''}`}
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
            </div>

            {/* Property Panel */}
            {renderPropertyPanel()}

            {/* Instructions */}
            <div className="editing-instructions">
                <p><strong>Active:</strong> {tools.flatMap(c => c.items).find(t => t.id === activeTool)?.label || 'None'}</p>
                <p className="help-text">
                    Select a tool and click on the PDF to use it
                </p>
            </div>
        </div>
    );
};

export default EditingToolsPanel;
