import React, { useState, useRef, useEffect } from 'react';
import { usePDF } from '../context/PDFContext';

const AnnotationLayer = ({ width, height, scale, pageNum }) => {
    const {
        annotationMode,
        annotations,
        setAnnotations,
        addAnnotation, // Use this for history tracking
        addImageAnnotation,
        updateAnnotation,
        annotationColor,

        brushThickness,
        searchResults,
        currentMatchIndex
    } = usePDF();

    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState([]);
    const [draggingId, setDraggingId] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const svgRef = useRef(null);


    // Get annotations for this page
    const pageAnnotations = annotations[pageNum] || [];
    const getCoordinates = (e) => {
        if (!svgRef.current || !width || !height) return { x: 0, y: 0 };
        const rect = svgRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / width,
            y: (e.clientY - rect.top) / height
        };
    };

    // Early return if dimensions are invalid
    if (!width || !height || width <= 0 || height <= 0) {
        return null;
    }

    const handleErase = (idx) => {
        if (annotationMode !== 'erase') return;
        setAnnotations(prev => {
            const pageAnns = [...(prev[pageNum] || [])];
            pageAnns.splice(idx, 1);
            return {
                ...prev,
                [pageNum]: pageAnns
            };
        });
        // Note: For full git-like log, we should also track erasures in addAnnotation action: 'delete'
    };

    const handleMouseDown = (e) => {
        if (annotationMode === 'none') return;
        setIsDrawing(true);
        const coords = getCoordinates(e);
        setCurrentPath([coords]);
    };

    const handleMouseMove = (e) => {
        if (draggingId) {
            const coords = getCoordinates(e);
            updateAnnotation(pageNum, draggingId, {
                x: coords.x - dragOffset.x,
                y: coords.y - dragOffset.y
            });
            return;
        }
        if (!isDrawing || annotationMode === 'none') return;
        const coords = getCoordinates(e);
        setCurrentPath(prev => [...prev, coords]);
    };

    const handleMouseUp = () => {
        setDraggingId(null);
        if (!isDrawing) return;
        setIsDrawing(false);


        if (currentPath.length > 0) {
            const newAnnotation = {
                type: annotationMode === 'highlight' ? 'highlight' : 'draw',
                color: annotationColor, // Use the current active color from palette
                opacity: annotationMode === 'highlight' ? 0.4 : 1,
                strokeWidth: annotationMode === 'highlight' ? 20 : brushThickness,
                points: currentPath
            };

            addAnnotation(pageNum, newAnnotation);
            setCurrentPath([]);
        }
    };

    // Helper to Convert path points to parsed SVG path string
    const pointsToPath = (points) => {
        if (points.length === 0) return '';
        // Scale normalized points back to current width/height
        const start = points[0];
        let d = `M ${start.x * width} ${start.y * height}`;
        for (let i = 1; i < points.length; i++) {
            d += ` L ${points[i].x * width} ${points[i].y * height}`;
        }
        return d;
    };

    return (
        <div
            className="annotation-layer"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: `${width}px`,
                height: `${height}px`,
                zIndex: 10,
                pointerEvents: annotationMode === 'none' ? 'none' : 'auto',
                cursor: annotationMode === 'none' ? 'default' : 'crosshair'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <svg
                ref={svgRef}
                width={width}
                height={height}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            >
                {/* Render Existing Annotations */}
                {pageAnnotations.map((ann, idx) => {
                    if (ann.type === 'image') {
                        return (
                            <image
                                key={ann.id || idx}
                                href={ann.src}
                                x={ann.x * width}
                                y={ann.y * height}
                                width={ann.width * width}
                                height={ann.height * height}
                                style={{
                                    cursor: draggingId === ann.id ? 'grabbing' : 'grab',
                                    pointerEvents: 'auto'
                                }}
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    const coords = getCoordinates(e);
                                    setDraggingId(ann.id);
                                    setDragOffset({
                                        x: coords.x - ann.x,
                                        y: coords.y - ann.y
                                    });
                                }}
                            />
                        );
                    }
                    return (
                        <path
                            key={ann.id || idx}
                            d={pointsToPath(ann.points)}
                            stroke={ann.color}
                            strokeWidth={ann.strokeWidth || 3}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity={ann.opacity || 1}
                            onClick={() => handleErase(idx)}
                            onMouseEnter={() => {
                                if (isDrawing && annotationMode === 'erase') {
                                    handleErase(idx);
                                }
                            }}
                            style={{
                                cursor: annotationMode === 'erase' ? 'pointer' : 'inherit',
                                pointerEvents: annotationMode === 'erase' ? 'auto' : 'none'
                            }}
                        />
                    );
                })}


                {/* Render Search Highlights */}
                {searchResults.map((match, idx) => {
                    // Validate search match coordinates
                    const isValidMatch = match.pageNum === pageNum &&
                        match.x != null && match.y != null &&
                        match.width != null && match.height != null &&
                        !isNaN(match.x) && !isNaN(match.y) &&
                        !isNaN(match.width) && !isNaN(match.height);

                    if (!isValidMatch) return null;

                    return (
                        <rect
                            key={`search-${idx}`}
                            x={match.x * width}
                            y={match.y * height - (match.height * height)} // Adjust since y is baseline usually
                            width={match.width * width}
                            height={match.height * height * 1.5} // slightly taller for visibility
                            fill={idx === currentMatchIndex ? "#0a3d0c" : "#1b5e20"} // Deeper Dark Green for current, Dark Green for others
                            opacity={idx === currentMatchIndex ? 0.7 : 0.4}
                            style={{ pointerEvents: 'none' }}
                        />
                    );
                })}

                {/* Render Current Drawing Path */}
                {currentPath.length > 0 && annotationMode !== 'erase' && (
                    <path
                        d={pointsToPath(currentPath)}
                        stroke={annotationColor}
                        strokeWidth={annotationMode === 'highlight' ? 20 : brushThickness}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={annotationMode === 'highlight' ? 0.4 : 1}
                    />
                )}
            </svg>
        </div>
    );
};

export default AnnotationLayer;
