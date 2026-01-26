/**
 * Snip Tool Overlay
 * Handle screen capture selection
 */

import React, { useState, useRef, useEffect } from 'react';
import { usePDF } from '../context/PDFContext';
import { Copy, Download, X, Pin } from 'lucide-react';
import { captureCanvasArea, copyImageToClipboard, downloadBlob } from '../utils/imageExportService';

const SnipOverlay = () => {
    const { isSnipMode, setIsSnipMode } = usePDF();
    const [startPos, setStartPos] = useState(null);
    const [endPos, setEndPos] = useState(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const [capturedBlob, setCapturedBlob] = useState(null);
    const overlayRef = useRef(null);

    if (!isSnipMode) return null;

    const handleMouseDown = (e) => {
        if (capturedBlob) return;
        const rect = overlayRef.current.getBoundingClientRect();
        setStartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setIsSelecting(true);
    };

    const handleMouseMove = (e) => {
        if (!isSelecting) return;
        const rect = overlayRef.current.getBoundingClientRect();
        setEndPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleMouseUp = async () => {
        if (!isSelecting || !startPos || !endPos) {
            setIsSelecting(false);
            return;
        }
        setIsSelecting(false);

        // Perform capture
        const x = Math.min(startPos.x, endPos.x);
        const y = Math.min(startPos.y, endPos.y);
        const w = Math.abs(endPos.x - startPos.x);
        const h = Math.abs(endPos.y - startPos.y);

        if (w < 10 || h < 10) return;

        // Find the correct canvas to capture from (the one closest to the selection)
        const canvases = document.querySelectorAll('.pdf-page-canvas');
        let bestCanvas = null;
        let maxOverlap = -1;

        // selection center in screen coords for heuristic
        const selCX = x + (w / 2);
        const selCY = y + (h / 2);

        canvases.forEach(canvas => {
            const crect = canvas.getBoundingClientRect();
            // Basic overlap or distance check
            const overlapX = Math.max(0, Math.min(x + w, crect.right) - Math.max(x, crect.left));
            const overlapY = Math.max(0, Math.min(y + h, crect.bottom) - Math.max(y, crect.top));
            const overlap = overlapX * overlapY;

            if (overlap > maxOverlap) {
                maxOverlap = overlap;
                bestCanvas = canvas;
            }
        });

        if (bestCanvas) {
            const crect = bestCanvas.getBoundingClientRect();

            // Coordinate transformation: Screen -> Canvas relative
            const scaleX = bestCanvas.width / crect.width;
            const scaleY = bestCanvas.height / crect.height;

            const captureX = Math.max(0, (x - crect.left) * scaleX);
            const captureY = Math.max(0, (y - crect.top) * scaleY);
            const captureW = Math.min(bestCanvas.width - captureX, w * scaleX);
            const captureH = Math.min(bestCanvas.height - captureY, h * scaleY);

            if (captureW > 0 && captureH > 0) {
                const blob = await captureCanvasArea(bestCanvas, captureX, captureY, captureW, captureH);
                setCapturedBlob(blob);
            } else {
                alert("Selection outside of visible page area.");
                setIsSelecting(false);
            }
        } else {
            alert("No PDF page found in selection.");
        }
    };

    const handleCopy = async () => {
        if (capturedBlob) {
            await copyImageToClipboard(capturedBlob);
            setCapturedBlob(null);
            setIsSnipMode(false);
        }
    };

    const handleDownload = () => {
        if (capturedBlob) {
            downloadBlob(capturedBlob, `snip_${Date.now()}.png`);
            setCapturedBlob(null);
            setIsSnipMode(false);
        }
    };

    const selectionStyles = startPos && endPos ? {
        left: Math.min(startPos.x, endPos.x),
        top: Math.min(startPos.y, endPos.y),
        width: Math.abs(endPos.x - startPos.x),
        height: Math.abs(endPos.y - startPos.y)
    } : null;

    return (
        <div
            ref={overlayRef}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: capturedBlob ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
                zIndex: 2000, cursor: 'crosshair', pointerEvents: 'auto'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', background: 'black', color: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '14px' }}>
                {capturedBlob ? 'Area Captured!' : 'Click and drag to snip an area'}
            </div>

            {selectionStyles && (
                <div
                    style={{
                        position: 'absolute',
                        border: '2px solid var(--accent-color)',
                        background: 'rgba(var(--accent-rgb), 0.1)',
                        ...selectionStyles
                    }}
                >
                    {capturedBlob && (
                        <div style={{ position: 'absolute', bottom: '-45px', right: 0, display: 'flex', gap: '8px', background: 'var(--bg-primary)', padding: '5px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                            <button onClick={handleCopy} title="Copy to Clipboard" style={{ padding: '8px', border: 'none', background: 'none', cursor: 'pointer' }}><Copy size={18} /></button>
                            <button onClick={handleDownload} title="Download PNG" style={{ padding: '8px', border: 'none', background: 'none', cursor: 'pointer' }}><Download size={18} /></button>
                            <button onClick={() => setIsSnipMode(false)} title="Cancel" style={{ padding: '8px', border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                    )}
                </div>
            )}

            {!capturedBlob && (
                <button
                    onClick={() => setIsSnipMode(false)}
                    style={{ position: 'fixed', top: '20px', right: '20px', padding: '10px', borderRadius: '50%', background: 'white', border: 'none', cursor: 'pointer' }}
                >
                    <X size={20} />
                </button>
            )}
        </div>
    );
};

export default SnipOverlay;
