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
            drawTextAnnotation(page, annotation, pageWidth, pageHeight, font);
            break;

        case ANNOTATION_TYPES.IMAGE:
            await drawImageAnnotation(pdfDoc, page, annotation, pageWidth, pageHeight);
            break;

        case ANNOTATION_TYPES.SHAPE_RECT:
            drawRectangleAnnotation(page, annotation, pageWidth, pageHeight);
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
            drawFreehandAnnotation(page, annotation, pageWidth, pageHeight);
            break;

        case ANNOTATION_TYPES.STAMP:
            drawStampAnnotation(page, annotation, pageWidth, pageHeight, boldFont);
            break;

        // Note: Links, Audio, Video, Bookmarks are handled differently
        // They require PDF interactive features
    }
}

/**
 * Draw text annotation
 */
function drawTextAnnotation(page, annotation, pageWidth, pageHeight) {
    const { x, y, width, height, text, fontSize = 14, color = '#000000', fontWeight } = annotation;

    // Convert relative coordinates to absolute
    const absX = x * pageWidth;
    const absY = pageHeight - (y * pageHeight) - (height * pageHeight); // PDF coords are bottom-left origin

    // Parse color
    const [r, g, b] = hexToRgb(color);

    page.drawText(text || '', {
        x: absX,
        y: absY,
        size: fontSize,
        color: rgb(r, g, b),
        maxWidth: width * pageWidth
    });
}

/**
 * Draw image annotation
 */
async function drawImageAnnotation(pdfDoc, page, annotation, pageWidth, pageHeight) {
    const { x, y, width, height, src } = annotation;

    try {
        // Determine image type and embed
        let image;
        if (src.startsWith('data:image/png')) {
            const imageBytes = dataURLToBytes(src);
            image = await pdfDoc.embedPng(imageBytes);
        } else if (src.startsWith('data:image/jpg') || src.startsWith('data:image/jpeg')) {
            const imageBytes = dataURLToBytes(src);
            image = await pdfDoc.embedJpg(imageBytes);
        } else {
            console.warn('Unsupported image format:', src.substring(0, 30));
            return;
        }

        const absX = x * pageWidth;
        const absY = pageHeight - (y * pageHeight) - (height * pageHeight);
        const absWidth = width * pageWidth;
        const absHeight = height * pageHeight;

        page.drawImage(image, {
            x: absX,
            y: absY,
            width: absWidth,
            height: absHeight
        });
    } catch (err) {
        console.error('Failed to draw image annotation:', err);
    }
}

/**
 * Draw rectangle annotation
 */
function drawRectangleAnnotation(page, annotation, pageWidth, pageHeight) {
    const { x, y, width, height, strokeColor = '#FF0000', fillColor, strokeWidth = 2, opacity = 1 } = annotation;

    const absX = x * pageWidth;
    const absY = pageHeight - (y * pageHeight) - (height * pageHeight);
    const absWidth = width * pageWidth;
    const absHeight = height * pageHeight;

    const [r, g, b] = hexToRgb(strokeColor);

    if (fillColor && fillColor !== 'transparent') {
        const [fr, fg, fb] = hexToRgb(fillColor);
        page.drawRectangle({
            x: absX,
            y: absY,
            width: absWidth,
            height: absHeight,
            color: rgb(fr, fg, fb),
            opacity: opacity * 0.3
        });
    }

    page.drawRectangle({
        x: absX,
        y: absY,
        width: absWidth,
        height: absHeight,
        borderColor: rgb(r, g, b),
        borderWidth: strokeWidth,
        opacity: opacity
    });
}

/**
 * Draw circle annotation
 */
function drawCircleAnnotation(page, annotation, pageWidth, pageHeight) {
    const { x, y, width, height, strokeColor = '#FF0000', fillColor, strokeWidth = 2, opacity = 1 } = annotation;

    const centerX = x * pageWidth + (width * pageWidth) / 2;
    const centerY = pageHeight - (y * pageHeight) - (height * pageHeight) / 2;
    const radiusX = (width * pageWidth) / 2;
    const radiusY = (height * pageHeight) / 2;

    const [r, g, b] = hexToRgb(strokeColor);

    if (fillColor && fillColor !== 'transparent') {
        const [fr, fg, fb] = hexToRgb(fillColor);
        page.drawEllipse({
            x: centerX,
            y: centerY,
            xScale: radiusX,
            yScale: radiusY,
            color: rgb(fr, fg, fb),
            opacity: opacity * 0.3
        });
    }

    page.drawEllipse({
        x: centerX,
        y: centerY,
        xScale: radiusX,
        yScale: radiusY,
        borderColor: rgb(r, g, b),
        borderWidth: strokeWidth,
        opacity: opacity
    });
}

/**
 * Draw line annotation
 */
function drawLineAnnotation(page, annotation, pageWidth, pageHeight) {
    const { x, y, x2, y2, strokeColor = '#FF0000', strokeWidth = 2, opacity = 1 } = annotation;

    const absX1 = x * pageWidth;
    const absY1 = pageHeight - (y * pageHeight);
    const absX2 = x2 * pageWidth;
    const absY2 = pageHeight - (y2 * pageHeight);

    const [r, g, b] = hexToRgb(strokeColor);

    page.drawLine({
        start: { x: absX1, y: absY1 },
        end: { x: absX2, y: absY2 },
        color: rgb(r, g, b),
        thickness: strokeWidth,
        opacity: opacity
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
function drawStampAnnotation(page, annotation, pageWidth, pageHeight, font) {
    const { x, y, width, height, stampText, color = '#FF0000' } = annotation;

    const absX = x * pageWidth;
    const absY = pageHeight - (y * pageHeight) - (height * pageHeight);

    const [r, g, b] = hexToRgb(color);

    // Draw stamp border
    page.drawRectangle({
        x: absX,
        y: absY,
        width: width * pageWidth,
        height: height * pageHeight,
        borderColor: rgb(r, g, b),
        borderWidth: 3
    });

    // Draw stamp text
    const fontSize = Math.min(24, (height * pageHeight) * 0.6);
    page.drawText(stampText || 'STAMP', {
        x: absX + 10,
        y: absY + (height * pageHeight) / 2 - fontSize / 2,
        size: fontSize,
        font: font,
        color: rgb(r, g, b)
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
