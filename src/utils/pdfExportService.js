/**
 * PDF Export Service
 * Export annotated PDFs using pdf-lib
 */

import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { ANNOTATION_TYPES } from './annotationEngine';

/**
 * Export PDF with annotations flattened
 */
export async function exportAnnotatedPDF(originalPdfBytes, annotations) {
    try {
        // Load the original PDF
        const pdfDoc = await PDFDocument.load(originalPdfBytes);
        const pages = pdfDoc.getPages();

        // Embed standard font for text annotations
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // Process each page
        for (const pageNum in annotations) {
            const pageIndex = parseInt(pageNum) - 1; // Convert to 0-indexed
            if (pageIndex < 0 || pageIndex >= pages.length) continue;

            const page = pages[pageIndex];
            const { width, height } = page.getSize();
            const pageAnnotations = annotations[pageNum];

            // Draw each annotation
            for (const annotation of pageAnnotations) {
                await drawAnnotation(pdfDoc, page, annotation, width, height, font, boldFont);
            }
        }

        // Serialize the PDFDocument to bytes
        const pdfBytes = await pdfDoc.save();
        return pdfBytes;

    } catch (err) {
        console.error('Error exporting PDF:', err);
        throw new Error('Failed to export annotated PDF');
    }
}

/**
 * Draw individual annotation on page
 */
async function drawAnnotation(pdfDoc, page, annotation, pageWidth, pageHeight, font, boldFont) {
    const { type } = annotation;

    switch (type) {
        case ANNOTATION_TYPES.TEXT:
        case 'text':
            drawTextAnnotation(page, annotation, pageWidth, pageHeight, font);
            break;

        case ANNOTATION_TYPES.IMAGE:
        case 'image':
            await drawImageAnnotation(pdfDoc, page, annotation, pageWidth, pageHeight);
            break;

        case ANNOTATION_TYPES.SHAPE_RECT:
        case 'shape':
            if (annotation.shapeType === 'rectangle') {
                drawRectangleAnnotation(page, annotation, pageWidth, pageHeight);
            } else if (annotation.shapeType === 'circle') {
                drawCircleAnnotation(page, annotation, pageWidth, pageHeight);
            } else if (annotation.shapeType === 'arrow' || annotation.shapeType === 'line') {
                drawLineAnnotation(page, annotation, pageWidth, pageHeight);
            }
            break;

        case ANNOTATION_TYPES.SHAPE_CIRCLE:
            drawCircleAnnotation(page, annotation, pageWidth, pageHeight);
            break;

        case ANNOTATION_TYPES.SHAPE_ARROW:
        case ANNOTATION_TYPES.SHAPE_LINE:
            drawLineAnnotation(page, annotation, pageWidth, pageHeight);
            break;

        case ANNOTATION_TYPES.FREEHAND:
        case ANNOTATION_TYPES.HIGHLIGHT:
        case 'draw':
        case 'highlight':
            drawFreehandAnnotation(page, annotation, pageWidth, pageHeight);
            break;

        case ANNOTATION_TYPES.STAMP:
        case 'stamp':
            drawStampAnnotation(page, annotation, pageWidth, pageHeight, boldFont);
            break;

        case 'video':
            drawVideoPlaceholder(page, annotation, pageWidth, pageHeight, font);
            break;
    }
}

/**
 * Helper to get bounds from annotation (handles both x/y and points)
 */
function getBounds(annotation, pageWidth, pageHeight) {
    let x, y, width, height;

    if (annotation.points && annotation.points.length >= 1) {
        if (annotation.points.length >= 2) {
            const p1 = annotation.points[0];
            const p2 = annotation.points[1];
            x = Math.min(p1.x, p2.x);
            y = Math.min(p1.y, p2.y);
            width = Math.abs(p2.x - p1.x);
            height = Math.abs(p2.y - p1.y);
        } else {
            x = annotation.points[0].x;
            y = annotation.points[0].y;
            width = annotation.width || 0;
            height = annotation.height || 0;
        }
    } else {
        x = annotation.x;
        y = annotation.y;
        width = annotation.width;
        height = annotation.height;
    }
    return { x, y, width, height };
}

/**
 * Draw text annotation
 */
/**
 * Draw text annotation
 */
function drawTextAnnotation(page, annotation, pageWidth, pageHeight, font) {
    const bounds = getBounds(annotation, pageWidth, pageHeight);
    const { text, fontSize = 14, color = '#000000' } = annotation;

    const absX = bounds.x * pageWidth;
    const absY = pageHeight - (bounds.y * pageHeight) - (fontSize); // Text origin adjustment

    const [r, g, b] = hexToRgb(color);

    try {
        page.drawText(text || '', {
            x: absX,
            y: absY,
            size: fontSize,
            font: font,
            color: rgb(r, g, b),
        });
    } catch (e) { console.warn(e); }
}

/**
 * Draw image annotation
 */
async function drawImageAnnotation(pdfDoc, page, annotation, pageWidth, pageHeight) {
    const bounds = getBounds(annotation, pageWidth, pageHeight);
    const { src } = annotation;

    if (!src) return;

    try {
        let image;
        if (src.startsWith('data:image/png')) await pdfDoc.embedPng(dataURLToBytes(src)).then(img => image = img);
        else if (src.startsWith('data:image/jpg') || src.startsWith('data:image/jpeg')) await pdfDoc.embedJpg(dataURLToBytes(src)).then(img => image = img);
        else return;

        const absX = bounds.x * pageWidth;
        const absY = pageHeight - (bounds.y * pageHeight) - (bounds.height * pageHeight);
        const absWidth = bounds.width * pageWidth;
        const absHeight = bounds.height * pageHeight;

        page.drawImage(image, { x: absX, y: absY, width: absWidth, height: absHeight });
    } catch (err) { console.error(err); }
}

/**
 * Draw rectangle annotation
 */
function drawRectangleAnnotation(page, annotation, pageWidth, pageHeight) {
    const bounds = getBounds(annotation, pageWidth, pageHeight);
    const { strokeColor = '#FF0000', fillColor, strokeWidth = 2, opacity = 1 } = annotation;

    const absX = bounds.x * pageWidth;
    const absY = pageHeight - (bounds.y * pageHeight) - (bounds.height * pageHeight);
    const absWidth = bounds.width * pageWidth;
    const absHeight = bounds.height * pageHeight;

    const [r, g, b] = hexToRgb(strokeColor);

    if (fillColor && fillColor !== 'transparent') {
        const [fr, fg, fb] = hexToRgb(fillColor);
        page.drawRectangle({
            x: absX, y: absY, width: absWidth, height: absHeight,
            color: rgb(fr, fg, fb), opacity: opacity * 0.3
        });
    }

    page.drawRectangle({
        x: absX, y: absY, width: absWidth, height: absHeight,
        borderColor: rgb(r, g, b), borderWidth: strokeWidth, opacity: opacity
    });
}

/**
 * Draw circle annotation
 */
/**
 * Draw circle annotation
 */
function drawCircleAnnotation(page, annotation, pageWidth, pageHeight) {
    const bounds = getBounds(annotation, pageWidth, pageHeight);
    const { strokeColor = '#FF0000', fillColor, strokeWidth = 2, opacity = 1 } = annotation;

    const centerX = bounds.x * pageWidth + (bounds.width * pageWidth) / 2;
    const centerY = pageHeight - (bounds.y * pageHeight) - (bounds.height * pageHeight) / 2;
    const radiusX = (bounds.width * pageWidth) / 2;
    const radiusY = (bounds.height * pageHeight) / 2;

    const [r, g, b] = hexToRgb(strokeColor);

    if (fillColor && fillColor !== 'transparent') {
        const [fr, fg, fb] = hexToRgb(fillColor);
        page.drawEllipse({
            x: centerX, y: centerY, xScale: radiusX, yScale: radiusY,
            color: rgb(fr, fg, fb), opacity: opacity * 0.3
        });
    }

    page.drawEllipse({
        x: centerX, y: centerY, xScale: radiusX, yScale: radiusY,
        borderColor: rgb(r, g, b), borderWidth: strokeWidth, opacity: opacity
    });
}

/**
 * Draw line annotation
 */
/**
 * Draw line annotation
 */
function drawLineAnnotation(page, annotation, pageWidth, pageHeight) {
    let x1, y1, x2, y2;
    if (annotation.points && annotation.points.length >= 2) {
        x1 = annotation.points[0].x; y1 = annotation.points[0].y;
        x2 = annotation.points[1].x; y2 = annotation.points[1].y;
    } else {
        x1 = annotation.x; y1 = annotation.y;
        x2 = annotation.x2; y2 = annotation.y2;
    }

    const { strokeColor = '#FF0000', strokeWidth = 2, opacity = 1 } = annotation;
    const [r, g, b] = hexToRgb(strokeColor);

    page.drawLine({
        start: { x: x1 * pageWidth, y: pageHeight - y1 * pageHeight },
        end: { x: x2 * pageWidth, y: pageHeight - y2 * pageHeight },
        color: rgb(r, g, b), thickness: strokeWidth, opacity: opacity
    });
}

/**
 * Draw freehand/highlight annotation
 */
function drawFreehandAnnotation(page, annotation, pageWidth, pageHeight) {
    const { points, strokeColor = '#FFFF00', strokeWidth = 3, opacity = 0.5 } = annotation;

    if (!points || points.length < 2) return;

    const [r, g, b] = hexToRgb(strokeColor);

    // Draw line segments
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];

        page.drawLine({
            start: {
                x: p1.x * pageWidth,
                y: pageHeight - (p1.y * pageHeight)
            },
            end: {
                x: p2.x * pageWidth,
                y: pageHeight - (p2.y * pageHeight)
            },
            color: rgb(r, g, b),
            thickness: strokeWidth,
            opacity: opacity
        });
    }
}

/**
 * Draw stamp annotation
 */
/**
 * Draw stamp annotation
 */
function drawStampAnnotation(page, annotation, pageWidth, pageHeight, font) {
    const bounds = getBounds(annotation, pageWidth, pageHeight);
    // Force standard stamp size if too small
    const width = bounds.width < 0.05 ? 0.2 : bounds.width;
    const height = bounds.height < 0.02 ? 0.05 : bounds.height;

    // Center logic
    const absX = bounds.x * pageWidth - (width * pageWidth / 2);
    const absY = pageHeight - (bounds.y * pageHeight) - (height * pageHeight / 2);

    const { stampText, color = '#FF0000' } = annotation;
    const [r, g, b] = hexToRgb(color);

    // Draw stamp border
    page.drawRectangle({
        x: absX, y: absY, width: width * pageWidth, height: height * pageHeight,
        borderColor: rgb(r, g, b), borderWidth: 3
    });

    const fontSize = Math.min(24, (height * pageHeight) * 0.6);
    page.drawText(stampText || 'STAMP', {
        x: absX + 10, y: absY + 5,
        size: fontSize, font: font, color: rgb(r, g, b)
    });
}

function drawVideoPlaceholder(page, annotation, pageWidth, pageHeight, font) {
    const bounds = getBounds(annotation, pageWidth, pageHeight);
    let { width, height } = bounds;
    if (!width) width = 0.4; if (!height) height = 0.25;

    const absX = bounds.x * pageWidth;
    const absY = pageHeight - (bounds.y * pageHeight) - (height * pageHeight);
    const absWidth = width * pageWidth;
    const absHeight = height * pageHeight;

    page.drawRectangle({
        x: absX, y: absY, width: absWidth, height: absHeight,
        color: rgb(0.9, 0.9, 0.9), opacity: 0.5,
        borderColor: rgb(0, 0, 1), borderWidth: 2
    });

    page.drawText("VIDEO: " + (annotation.src || "Linked Video"), {
        x: absX + 10, y: absY + absHeight / 2, size: 12,
        font: font, color: rgb(0, 0, 1)
    });
}

/**
 * Convert hex color to RGB values (0-1 range)
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255
        ]
        : [0, 0, 0];
}

/**
 * Convert data URL to bytes
 */
function dataURLToBytes(dataURL) {
    const base64 = dataURL.split(',')[1];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

/**
 * Save PDF bytes to file
 */
export function downloadPDF(pdfBytes, filename = 'annotated.pdf') {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}
