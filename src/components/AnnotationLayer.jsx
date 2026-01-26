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
        textFontSize,

        brushThickness,
        highlightThickness,
        searchResults,
        currentMatchIndex
    } = usePDF();

    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState([]);
    const [draggingId, setDraggingId] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [pendingTextPos, setPendingTextPos] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');
    const svgRef = useRef(null);
    const textInputRef = useRef(null);

    useEffect(() => {
        if (pendingTextPos && textInputRef.current) {
            textInputRef.current.focus();
        }
    }, [pendingTextPos]);


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
            let newAnnotation;

            // Handle different annotation modes
            if (annotationMode === 'shape') {
                // For shapes, treat first and last points as bounding box
                const startPoint = currentPath[0];
                const endPoint = currentPath[currentPath.length - 1];
                newAnnotation = {
                    type: 'shape',
                    shapeType: window.selectedShape || 'rectangle',
                    color: annotationColor,
                    opacity: 0.8,
                    strokeWidth: brushThickness,
                    points: [startPoint, endPoint] // Just start and end for shapes
                };
            } else if (annotationMode === 'text') {
                // Instead of adding immediately, open the input
                const point = currentPath[0];
                setPendingTextPos(point);
                setEditText('');
                setIsDrawing(false);
                return;
            } else if (annotationMode === 'stamp') {
                // Stamp placement
                const point = currentPath[0];
                newAnnotation = {
                    type: 'stamp',
                    stampText: window.selectedStamp || 'APPROVED',
                    color: '#ff0000',
                    points: [point]
                };
            } else if (annotationMode === 'video') {
                // Video placement
                const point = currentPath[0];
                newAnnotation = {
                    type: 'video',
                    sourceType: window.videoUploadMode ? 'file' : 'url',
                    src: window.videoUploadMode ? window.videoFileUrl : window.videoUrl,
                    autoplay: window.videoAutoplay,
                    loop: window.videoLoop,
                    points: [point],
                    width: 0.4, // Default relative width
                    height: 0.25 // Default relative height
                };
            } else {
                // Regular draw/highlight
                newAnnotation = {
                    type: annotationMode === 'highlight' ? 'highlight' : 'draw',
                    color: annotationColor,
                    opacity: annotationMode === 'highlight' ? 0.4 : 1,
                    strokeWidth: annotationMode === 'highlight' ? highlightThickness : brushThickness,
                    points: currentPath
                };
            }

            if (newAnnotation) addAnnotation(pageNum, newAnnotation);
            setCurrentPath([]);
        }
    };

    const handleTextSubmit = () => {
        if (editText.trim()) {
            if (editingId) {
                updateAnnotation(pageNum, editingId, { text: editText });
            } else {
                addAnnotation(pageNum, {
                    type: 'text',
                    color: annotationColor,
                    text: editText,
                    fontSize: textFontSize,
                    points: [pendingTextPos]
                });
            }
        }
        setPendingTextPos(null);
        setEditingId(null);
        setEditText('');
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
                {/* Arrow marker definition */}
                <defs>
                    <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="10"
                        refX="9"
                        refY="3"
                        orient="auto"
                    >
                        <polygon points="0 0, 10 3, 0 6" fill={annotationColor} />
                    </marker>
                </defs>
                {/* Render Existing Annotations */}
                {pageAnnotations.map((ann, idx) => {
                    // Image annotations
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

                    // Shape annotations
                    if (ann.type === 'shape' && ann.points && ann.points.length >= 2) {
                        const start = ann.points[0];
                        const end = ann.points[1];
                        const x1 = start.x * width;
                        const y1 = start.y * height;
                        const x2 = end.x * width;
                        const y2 = end.y * height;
                        const w = Math.abs(x2 - x1);
                        const h = Math.abs(y2 - y1);

                        if (ann.shapeType === 'rectangle') {
                            return (
                                <rect
                                    key={ann.id || idx}
                                    x={Math.min(x1, x2)}
                                    y={Math.min(y1, y2)}
                                    width={w}
                                    height={h}
                                    stroke={ann.color}
                                    strokeWidth={ann.strokeWidth || 2}
                                    fill="none"
                                    opacity={ann.opacity || 0.8}
                                    onClick={() => handleErase(idx)}
                                    style={{ cursor: annotationMode === 'erase' ? 'pointer' : 'inherit' }}
                                />
                            );
                        } else if (ann.shapeType === 'circle') {
                            const cx = (x1 + x2) / 2;
                            const cy = (y1 + y2) / 2;
                            const rx = w / 2;
                            const ry = h / 2;
                            return (
                                <ellipse
                                    key={ann.id || idx}
                                    cx={cx}
                                    cy={cy}
                                    rx={rx}
                                    ry={ry}
                                    stroke={ann.color}
                                    strokeWidth={ann.strokeWidth || 2}
                                    fill="none"
                                    opacity={ann.opacity || 0.8}
                                    onClick={() => handleErase(idx)}
                                    style={{ cursor: annotationMode === 'erase' ? 'pointer' : 'inherit' }}
                                />
                            );
                        } else if (ann.shapeType === 'arrow' || ann.shapeType === 'line') {
                            return (
                                <line
                                    key={ann.id || idx}
                                    x1={x1}
                                    y1={y1}
                                    x2={x2}
                                    y2={y2}
                                    stroke={ann.color}
                                    strokeWidth={ann.strokeWidth || 2}
                                    markerEnd={ann.shapeType === 'arrow' ? 'url(#arrowhead)' : undefined}
                                    opacity={ann.opacity || 0.8}
                                    onClick={() => handleErase(idx)}
                                    style={{ cursor: annotationMode === 'erase' ? 'pointer' : 'inherit' }}
                                />
                            );
                        }
                    }

                    // Text annotations
                    if (ann.type === 'text' && ann.points && ann.points.length > 0) {
                        const point = ann.points[0];
                        if (editingId === ann.id) return null; // Don't render text if we're editing it in HTML layer

                        return (
                            <text
                                key={ann.id || idx}
                                x={point.x * width}
                                y={point.y * height}
                                fill={ann.color}
                                fontSize={ann.fontSize || 16}
                                fontWeight="600"
                                onClick={(e) => {
                                    if (annotationMode === 'erase') {
                                        handleErase(idx);
                                    }
                                }}
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    setEditingId(ann.id);
                                    setEditText(ann.text);
                                    setPendingTextPos(point);
                                }}
                                onMouseDown={(e) => {
                                    if (annotationMode === 'none' || annotationMode === 'select') {
                                        e.stopPropagation();
                                        const coords = getCoordinates(e);
                                        setDraggingId(ann.id);
                                        setDragOffset({
                                            x: coords.x - point.x,
                                            y: coords.y - point.y
                                        });
                                    }
                                }}
                                style={{
                                    cursor: annotationMode === 'erase' ? 'pointer' : (annotationMode === 'none' ? 'grab' : 'default'),
                                    userSelect: 'none'
                                }}
                            >
                                {ann.text || 'Text'}
                            </text>
                        );
                    }

                    // Stamp annotations
                    if (ann.type === 'stamp' && ann.points && ann.points.length > 0) {
                        const point = ann.points[0];
                        return (
                            <g key={ann.id || idx} onClick={() => handleErase(idx)}>
                                <rect
                                    x={point.x * width - 40}
                                    y={point.y * height - 15}
                                    width="80"
                                    height="30"
                                    stroke={ann.color || '#ff0000'}
                                    strokeWidth="3"
                                    fill="none"
                                    rx="4"
                                    style={{ cursor: annotationMode === 'erase' ? 'pointer' : 'default' }}
                                />
                                <text
                                    x={point.x * width}
                                    y={point.y * height + 5}
                                    fill={ann.color || '#ff0000'}
                                    fontSize="12"
                                    fontWeight="900"
                                    textAnchor="middle"
                                    letterSpacing="1"
                                    style={{ cursor: annotationMode === 'erase' ? 'pointer' : 'default' }}
                                >
                                    {ann.stampText || 'STAMP'}
                                </text>
                            </g>
                        );
                    }

                    // Regular draw/highlight paths
                    if (ann.points) {
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
                    }

                    return null;
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
                        strokeWidth={annotationMode === 'highlight' ? highlightThickness : brushThickness}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={annotationMode === 'highlight' ? 0.4 : 1}
                    />
                )}
            </svg>

            {/* Render HTML Content Overlays (Video) */}
            {pageAnnotations.map((ann, idx) => {
                if (ann.type === 'video' && ann.points && ann.points.length > 0) {
                    const point = ann.points[0];
                    const w = (ann.width || 0.4) * width;
                    const h = (ann.height || 0.25) * height;
                    const x = point.x * width;
                    const y = point.y * height;

                    return (
                        <div
                            key={ann.id || idx}
                            style={{
                                position: 'absolute',
                                left: x,
                                top: y,
                                width: w,
                                height: h,
                                zIndex: 50,
                                background: '#000',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                borderRadius: '8px',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                {ann.src && (ann.src.includes('youtube.com') || ann.src.includes('youtu.be')) ? (
                                    <iframe
                                        src={`https://www.youtube.com/embed/${ann.src.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1]}?autoplay=${ann.autoplay ? 1 : 0}&loop=${ann.loop ? 1 : 0}`}
                                        style={{ width: '100%', height: '100%', border: 'none' }}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                ) : (
                                    <video
                                        src={ann.src}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        controls
                                        autoPlay={ann.autoplay}
                                        loop={ann.loop}
                                    />
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleErase(idx); }}
                                    style={{
                                        position: 'absolute',
                                        top: '0px',
                                        right: '0px',
                                        background: 'red',
                                        color: 'white',
                                        borderBottomLeftRadius: '4px',
                                        width: '24px',
                                        height: '24px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: annotationMode === 'erase' ? 'flex' : 'none',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        zIndex: 60
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    );
                }
                return null;
            })}
            {/* Pending Text Input */}
            {pendingTextPos && (
                <textarea
                    ref={textInputRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={handleTextSubmit}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleTextSubmit();
                        }
                        if (e.key === 'Escape') {
                            setPendingTextPos(null);
                            setEditingId(null);
                        }
                    }}
                    style={{
                        position: 'absolute',
                        left: `${pendingTextPos.x * width}px`,
                        top: `${pendingTextPos.y * height - 10}px`,
                        minWidth: '100px',
                        background: 'white',
                        border: `2px solid ${annotationColor}`,
                        borderRadius: '4px',
                        color: annotationColor,
                        fontSize: `${textFontSize}px`,
                        fontWeight: '600',
                        padding: '4px',
                        zIndex: 100,
                        outline: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        fontFamily: 'inherit',
                        resize: 'both'
                    }}
                />
            )}
        </div>
    );
};

export default AnnotationLayer;
