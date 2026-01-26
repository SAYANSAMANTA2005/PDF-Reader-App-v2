/**
 * Image Export Service
 * Export PDF pages as high-quality images
 */

/**
 * Export a single PDF page as an image
 * @param {PDFDocument} pdfDocument - PDF.js document
 * @param {number} pageNum - Page number to export
 * @param {string} format - 'png', 'jpeg', or 'webp'
 * @param {number} dpi - Resolution (96=standard, 150=high, 300=print)
 * @returns {Promise<Blob>} Image blob
 */
export async function exportPageAsImage(pdfDocument, pageNum, format = 'png', dpi = 150) {
    try {
        const page = await pdfDocument.getPage(pageNum);
        const scale = dpi / 72; // PDF default is 72 DPI
        const viewport = page.getViewport({ scale });

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext('2d');

        // Render PDF page
        await page.render({
            canvasContext: ctx,
            viewport: viewport
        }).promise;

        // Convert to blob
        const quality = format === 'jpeg' ? 0.95 : undefined;
        const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';

        return new Promise((resolve) => {
            canvas.toBlob(resolve, mimeType, quality);
        });
    } catch (error) {
        console.error('Error exporting page as image:', error);
        throw error;
    }
}

/**
 * Export all pages as images in a ZIP file
 * @param {PDFDocument} pdfDocument - PDF.js document
 * @param {string} format - Image format
 * @param {number} dpi - Resolution
 * @param {Function} onProgress - Progress callback (current, total)
 * @returns {Promise<Blob>} ZIP file blob
 */
export async function exportAllPagesAsImages(pdfDocument, format = 'png', dpi = 150, onProgress) {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const numPages = pdfDocument.numPages;

    for (let i = 1; i <= numPages; i++) {
        const blob = await exportPageAsImage(pdfDocument, i, format, dpi);
        const extension = format === 'jpeg' ? 'jpg' : format;
        zip.file(`page-${String(i).padStart(3, '0')}.${extension}`, blob);

        if (onProgress) {
            onProgress(i, numPages);
        }
    }

    return await zip.generateAsync({ type: 'blob' });
}

/**
 * Download a blob as a file
 * @param {Blob} blob - File blob
 * @param {string} filename - Desired filename
 */
export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Copy image blob to clipboard
 * @param {Blob} blob - Image blob
 */
export async function copyImageToClipboard(blob) {
    try {
        await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob })
        ]);
        return true;
    } catch (error) {
        console.warn('Clipboard API failed:', error);
        // Fallback: open in new tab for manual copy
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        return false;
    }
}

/**
 * Capture a rectangular area of the canvas
 * @param {HTMLCanvasElement} sourceCanvas - Source canvas element
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate  
 * @param {number} width - Width
 * @param {number} height - Height
 * @returns {Promise<Blob>} Cropped image blob
 */
export async function captureCanvasArea(sourceCanvas, x, y, width, height) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;

    const ctx = tempCanvas.getContext('2d');
    ctx.drawImage(sourceCanvas, x, y, width, height, 0, 0, width, height);

    return new Promise((resolve) => {
        tempCanvas.toBlob(resolve, 'image/png');
    });
}
