/**
 * Interactive Annotation Layer using Fabric.js
 * Handles drag, resize, rotate for all annotation types
 */

import React, { useEffect, useRef } from 'react';
import { Canvas, IText, Rect, Ellipse, Line, FabricImage } from 'fabric';
import { annotationManager, ANNOTATION_TYPES } from '../utils/annotationEngine';
import '../styles/interactive-annotations.css';

const InteractiveAnnotationLayer = ({
    pageNum,
    pageWidth,
    pageHeight,
    scale = 1,
    activeTool,
    toolSettings
}) => {
    const canvasRef = useRef(null);
    const fabricCanvasRef = useRef(null);
    const isDrawingRef = useRef(false);
    const drawingPathRef = useRef([]);

    // Initialize Fabric.js canvas
    useEffect(() => {
        if (!canvasRef.current || fabricCanvasRef.current) return; // Prevent double initialization

        const fabricCanvas = new Canvas(canvasRef.current, {
            selection: activeTool === ANNOTATION_TYPES.SELECT || activeTool === ANNOTATION_TYPES.HAND,
            isDrawingMode: activeTool === ANNOTATION_TYPES.FREEHAND || activeTool === ANNOTATION_TYPES.HIGHLIGHT,
            width: pageWidth * scale,
            height: pageHeight * scale
        });

        fabricCanvasRef.current = fabricCanvas;

        // Cleanup
        return () => {
            fabricCanvas.dispose();
            fabricCanvasRef.current = null;
        };
    }, [pageWidth, pageHeight, scale]);

    // Update canvas size when scale changes
    useEffect(() => {
        if (fabricCanvasRef.current) {
            const canvas = fabricCanvasRef.current;
            canvas.setDimensions({
                width: pageWidth * scale,
                height: pageHeight * scale
            });
            canvas.renderAll();
        }
    }, [scale, pageWidth, pageHeight]);

    // Update drawing mode when tool changes
    useEffect(() => {
        if (!fabricCanvasRef.current) return;

        const canvas = fabricCanvasRef.current;

        // Configure based on active tool
        canvas.isDrawingMode = activeTool === ANNOTATION_TYPES.FREEHAND || activeTool === ANNOTATION_TYPES.HIGHLIGHT;
        canvas.selection = activeTool === ANNOTATION_TYPES.SELECT || activeTool === ANNOTATION_TYPES.HAND;

        // Configure freehand brush
        if (activeTool === ANNOTATION_TYPES.FREEHAND && toolSettings.freehand) {
            canvas.freeDrawingBrush.color = toolSettings.freehand.color;
            canvas.freeDrawingBrush.width = toolSettings.freehand.thickness;
        }

        if (activeTool === ANNOTATION_TYPES.HIGHLIGHT && toolSettings.highlight) {
            canvas.freeDrawingBrush.color = toolSettings.highlight.color;
            canvas.freeDrawingBrush.width = 20;
            canvas.freeDrawingBrush.opacity = toolSettings.highlight.opacity;
        }

        // Change cursor based on tool
        switch (activeTool) {
            case ANNOTATION_TYPES.HAND:
                canvas.defaultCursor = 'grab';
                canvas.hoverCursor = 'grab';
                break;
            case ANNOTATION_TYPES.SELECT:
                canvas.defaultCursor = 'text';
                break;
            case ANNOTATION_TYPES.TEXT:
            case ANNOTATION_TYPES.IMAGE:
            case ANNOTATION_TYPES.STAMP:
                canvas.defaultCursor = 'crosshair';
                break;
            case ANNOTATION_TYPES.ERASER:
                canvas.defaultCursor = 'pointer';
                break;
            default:
                canvas.defaultCursor = 'default';
        }
    }, [activeTool, toolSettings]);

    // Handle mouse down for shape drawing
    useEffect(() => {
        if (!fabricCanvasRef.current) return;

        const canvas = fabricCanvasRef.current;
        let currentShape = null;
        let isDown = false;
        let origX, origY;

        const onMouseDown = (options) => {
            if (![
                ANNOTATION_TYPES.SHAPE_RECT,
                ANNOTATION_TYPES.SHAPE_CIRCLE,
                ANNOTATION_TYPES.SHAPE_LINE,
                ANNOTATION_TYPES.SHAPE_ARROW,
                ANNOTATION_TYPES.TEXT,
                ANNOTATION_TYPES.STAMP
            ].includes(activeTool)) {
                return;
            }

            isDown = true;
            const pointer = canvas.getPointer(options.e);
            origX = pointer.x;
            origY = pointer.y;

            // Create shape based on active tool
            if (activeTool === ANNOTATION_TYPES.SHAPE_RECT) {
                currentShape = new Rect({
                    left: origX,
                    top: origY,
                    width: 0,
                    height: 0,
                    fill: toolSettings.shape.fillColor === 'transparent' ? 'transparent' : toolSettings.shape.fillColor,
                    stroke: toolSettings.shape.strokeColor,
                    strokeWidth: toolSettings.shape.strokeWidth,
                    opacity: toolSettings.shape.opacity
                });
            } else if (activeTool === ANNOTATION_TYPES.SHAPE_CIRCLE) {
                currentShape = new Ellipse({
                    left: origX,
                    top: origY,
                    rx: 0,
                    ry: 0,
                    fill: toolSettings.shape.fillColor === 'transparent' ? 'transparent' : toolSettings.shape.fillColor,
                    stroke: toolSettings.shape.strokeColor,
                    strokeWidth: toolSettings.shape.strokeWidth,
                    opacity: toolSettings.shape.opacity
                });
            } else if (activeTool === ANNOTATION_TYPES.SHAPE_LINE || activeTool === ANNOTATION_TYPES.SHAPE_ARROW) {
                currentShape = new Line([origX, origY, origX, origY], {
                    stroke: toolSettings.shape.strokeColor,
                    strokeWidth: toolSettings.shape.strokeWidth,
                    opacity: toolSettings.shape.opacity
                });
            }

            if (currentShape) {
                canvas.add(currentShape);
            }
        };

        const onMouseMove = (options) => {
            if (!isDown || !currentShape) return;

            const pointer = canvas.getPointer(options.e);

            if (activeTool === ANNOTATION_TYPES.SHAPE_RECT) {
                currentShape.set({
                    width: Math.abs(pointer.x - origX),
                    height: Math.abs(pointer.y - origY),
                    left: Math.min(pointer.x, origX),
                    top: Math.min(pointer.y, origY)
                });
            } else if (activeTool === ANNOTATION_TYPES.SHAPE_CIRCLE) {
                const rx = Math.abs(pointer.x - origX) / 2;
                const ry = Math.abs(pointer.y - origY) / 2;
                currentShape.set({
                    rx,
                    ry,
                    left: Math.min(pointer.x, origX) + rx,
                    top: Math.min(pointer.y, origY) + ry,
                    originX: 'center',
                    originY: 'center'
                });
            } else if (activeTool === ANNOTATION_TYPES.SHAPE_LINE || activeTool === ANNOTATION_TYPES.SHAPE_ARROW) {
                currentShape.set({
                    x2: pointer.x,
                    y2: pointer.y
                });
            }

            canvas.renderAll();
        };

        const onMouseUp = () => {
            if (!isDown) return;
            isDown = false;

            if (currentShape) {
                // Save annotation
                const bounds = currentShape.getBoundingRect();
                const annotationData = {
                    x: bounds.left / pageWidth,
                    y: bounds.top / pageHeight,
                    width: bounds.width / pageWidth,
                    height: bounds.height / pageHeight,
                    strokeColor: currentShape.stroke,
                    fillColor: currentShape.fill,
                    strokeWidth: currentShape.strokeWidth,
                    opacity: currentShape.opacity
                };

                if (activeTool === ANNOTATION_TYPES.SHAPE_LINE || activeTool === ANNOTATION_TYPES.SHAPE_ARROW) {
                    annotationData.x2 = currentShape.x2 / pageWidth;
                    annotationData.y2 = currentShape.y2 / pageHeight;
                }

                annotationManager.addAnnotation(activeTool, pageNum, annotationData);
                currentShape = null;
            }
        };

        canvas.on('mouse:down', onMouseDown);
        canvas.on('mouse:move', onMouseMove);
        canvas.on('mouse:up', onMouseUp);

        return () => {
            canvas.off('mouse:down', onMouseDown);
            canvas.off('mouse:move', onMouseMove);
            canvas.off('mouse:up', onMouseUp);
        };
    }, [activeTool, toolSettings, pageNum, pageWidth, pageHeight]);

    // Handle text annotation placement
    useEffect(() => {
        if (!fabricCanvasRef.current || activeTool !== ANNOTATION_TYPES.TEXT) return;

        const canvas = fabricCanvasRef.current;

        const onMouseDown = (options) => {
            const pointer = canvas.getPointer(options.e);

            const textbox = new IText('Click to edit', {
                left: pointer.x,
                top: pointer.y,
                fontSize: toolSettings.text.fontSize,
                fontFamily: toolSettings.text.fontFamily,
                fill: toolSettings.text.color,
                fontWeight: toolSettings.text.bold ? 'bold' : 'normal',
                fontStyle: toolSettings.text.italic ? 'italic' : 'normal',
                underline: toolSettings.text.underline,
                editable: true
            });

            canvas.add(textbox);
            canvas.setActiveObject(textbox);
            textbox.enterEditing();

            // Save annotation when editing completes
            textbox.on('editing:exited', () => {
                const bounds = textbox.getBoundingRect();
                annotationManager.addAnnotation(ANNOTATION_TYPES.TEXT, pageNum, {
                    text: textbox.text,
                    x: bounds.left / pageWidth,
                    y: bounds.top / pageHeight,
                    width: bounds.width / pageWidth,
                    height: bounds.height / pageHeight,
                    fontSize: textbox.fontSize,
                    fontFamily: textbox.fontFamily,
                    color: textbox.fill,
                    fontWeight: textbox.fontWeight,
                    fontStyle: textbox.fontStyle,
                    underline: textbox.underline
                });
            });
        };

        canvas.on('mouse:down', onMouseDown);

        return () => {
            canvas.off('mouse:down', onMouseDown);
        };
    }, [activeTool, toolSettings, pageNum, pageWidth, pageHeight]);

    // Handle image annotation placement
    useEffect(() => {
        if (!fabricCanvasRef.current || activeTool !== ANNOTATION_TYPES.IMAGE) return;

        const handleImageUpload = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    FabricImage.fromURL(event.target.result, (img) => {
                        const canvas = fabricCanvasRef.current;
                        if (!canvas) return;

                        img.set({
                            left: 100,
                            top: 100,
                            scaleX: 0.5,
                            scaleY: 0.5
                        });

                        canvas.add(img);
                        canvas.setActiveObject(img);

                        // Save annotation
                        img.on('modified', () => {
                            const bounds = img.getBoundingRect();
                            annotationManager.addAnnotation(ANNOTATION_TYPES.IMAGE, pageNum, {
                                src: event.target.result,
                                x: bounds.left / pageWidth,
                                y: bounds.top / pageHeight,
                                width: bounds.width / pageWidth,
                                height: bounds.height / pageHeight
                            });
                        });
                    });
                };
                reader.readAsDataURL(file);
            };
            input.click();
        };

        // Listen for image upload trigger
        const handleImageTrigger = () => {
            handleImageUpload();
        };

        window.addEventListener('trigger-image-upload', handleImageTrigger);

        return () => {
            window.removeEventListener('trigger-image-upload', handleImageTrigger);
        };
    }, [activeTool, pageNum, pageWidth, pageHeight]);

    // Handle eraser tool
    useEffect(() => {
        if (!fabricCanvasRef.current || activeTool !== ANNOTATION_TYPES.ERASER) return;

        const canvas = fabricCanvasRef.current;

        const onMouseDown = (options) => {
            const target = canvas.findTarget(options.e);
            if (target && target !== canvas) {
                canvas.remove(target);
                // Also remove from annotation manager
                // Note: would need to track fabric objects to annotation IDs
            }
        };

        canvas.on('mouse:down', onMouseDown);

        return () => {
            canvas.off('mouse:down', onMouseDown);
        };
    }, [activeTool]);

    // Listen for tool change events
    useEffect(() => {
        const handleToolChange = (event) => {
            // Tool change handled by props
        };

        window.addEventListener('editing-tool-changed', handleToolChange);

        return () => {
            window.removeEventListener('editing-tool-changed', handleToolChange);
        };
    }, []);

    return (
        <div className="interactive-annotation-layer">
            <canvas ref={canvasRef} />
        </div>
    );
};

export default InteractiveAnnotationLayer;
