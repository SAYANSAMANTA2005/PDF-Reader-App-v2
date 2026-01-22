import React from 'react';
import { usePDF } from '../context/PDFContext';
import { Info } from 'lucide-react';

const DrawingPanel = ({ onClose }) => {
    const {
        annotationColor,
        setAnnotationColor,
        brushThickness,
        setBrushThickness,
        highlightThickness,
        setHighlightThickness,
        annotationMode,
        colorSettings
    } = usePDF();

    const isHighlight = annotationMode === 'highlight';
    const currentThickness = isHighlight ? highlightThickness : brushThickness;
    const setThickness = isHighlight ? setHighlightThickness : setBrushThickness;
    const maxVal = isHighlight ? 80 : 20; // Allow thicker for highlights

    const colors = Object.keys(colorSettings);

    const handleColorClick = (color) => {
        setAnnotationColor(color);
    };

    return (
        <div
            className="drawing-panel"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
        >
            <div className="panel-section">
                <span className="section-title">Colors</span>
                <div className="color-grid">
                    {colors.map((color) => (
                        <button
                            key={color}
                            className={`color-swatch ${annotationColor === color ? 'active' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => handleColorClick(color)}
                        />
                    ))}
                </div>
            </div>

            <div className="panel-section preview-section">
                <svg width="100%" height="40">
                    <path
                        d="M 20 20 Q 80 0, 140 20 T 260 20"
                        stroke={annotationColor}
                        strokeWidth={currentThickness}
                        fill="none"
                        strokeLinecap="round"
                    />
                </svg>
            </div>

            <div className="panel-section">
                <div className="section-header">
                    <span className="section-title">Thickness</span>
                    <Info size={14} className="info-icon" />
                </div>
                <div className="slider-container">
                    <input
                        type="range"
                        min="1"
                        max={maxVal}
                        value={currentThickness}
                        onChange={(e) => setThickness(parseInt(e.target.value))}
                        className="thickness-slider"
                    />
                    <div className="slider-labels">
                        <span>Thin</span>
                        <span>Thick</span>
                    </div>
                </div>
            </div>

            <div className="panel-section footer-section">
                <div className="toggle-container">
                    <span>Text only highlight</span>
                    <label className="switch">
                        <input type="checkbox" />
                        <span className="slider round"></span>
                    </label>
                </div>
            </div>
        </div>
    );
};

export default DrawingPanel;
