/**
 * Production-Grade PDF Editing Service using pdf-lib
 * Real PDF manipulation - no simulations
 */

import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';

/**
 * Rotate pages in a PDF
 * @param {File|ArrayBuffer} pdfFile - Source PDF
 * @param {number[]} pageNumbers - Pages to rotate (1-indexed)
 * @param {number} angle - Rotation angle (90, 180, 270)
 * @returns {Promise<Uint8Array>} - Modified PDF bytes
 */
export const rotatePDF = async (pdfFile, pageNumbers, angle) => {
    try {
        const pdfBytes = pdfFile instanceof File ? await pdfFile.arrayBuffer() : pdfFile;
        const pdfDoc = await PDFDocument.load(pdfBytes);

        const pages = pdfDoc.getPages();
        const validPages = pageNumbers.filter(num => num >= 1 && num <= pages.length);

        for (const pageNum of validPages) {
            const page = pages[pageNum - 1];
            const currentRotation = page.getRotation().angle;
            page.setRotation(degrees((currentRotation + angle) % 360));
        }

        const modifiedBytes = await pdfDoc.save();
        return modifiedBytes;
    } catch (error) {
        console.error('Error rotating PDF:', error);
        throw new Error(`Failed to rotate PDF: ${error.message}`);
    }
};

/**
 * Extract specific pages from a PDF
 * @param {File|ArrayBuffer} pdfFile - Source PDF
 * @param {number[]} pageNumbers - Pages to extract (1-indexed)
 * @returns {Promise<Uint8Array>} - New PDF with extracted pages
 */
export const extractPages = async (pdfFile, pageNumbers) => {
    try {
        const pdfBytes = pdfFile instanceof File ? await pdfFile.arrayBuffer() : pdfFile;
        const sourcePdf = await PDFDocument.load(pdfBytes);
        const newPdf = await PDFDocument.create();

        const pages = sourcePdf.getPages();
        const validPages = pageNumbers.filter(num => num >= 1 && num <= pages.length);

        for (const pageNum of validPages) {
            const [copiedPage] = await newPdf.copyPages(sourcePdf, [pageNum - 1]);
            newPdf.addPage(copiedPage);
        }

        const extractedBytes = await newPdf.save();
        return extractedBytes;
    } catch (error) {
        console.error('Error extracting pages:', error);
        throw new Error(`Failed to extract pages: ${error.message}`);
    }
};

/**
 * Delete specific pages from a PDF
 * @param {File|ArrayBuffer} pdfFile - Source PDF
 * @param {number[]} pageNumbers - Pages to delete (1-indexed)
 * @returns {Promise<Uint8Array>} - Modified PDF
 */
export const deletePages = async (pdfFile, pageNumbers) => {
    try {
        const pdfBytes = pdfFile instanceof File ? await pdfFile.arrayBuffer() : pdfFile;
        const sourcePdf = await PDFDocument.load(pdfBytes);
        const newPdf = await PDFDocument.create();

        const pages = sourcePdf.getPages();
        const pagesToKeep = [];

        for (let i = 0; i < pages.length; i++) {
            if (!pageNumbers.includes(i + 1)) {
                pagesToKeep.push(i);
            }
        }

        for (const pageIndex of pagesToKeep) {
            const [copiedPage] = await newPdf.copyPages(sourcePdf, [pageIndex]);
            newPdf.addPage(copiedPage);
        }

        const modifiedBytes = await newPdf.save();
        return modifiedBytes;
    } catch (error) {
        console.error('Error deleting pages:', error);
        throw new Error(`Failed to delete pages: ${error.message}`);
    }
};

/**
 * Merge multiple PDFs into one
 * @param {File[]|ArrayBuffer[]} pdfFiles - Array of PDFs to merge
 * @returns {Promise<Uint8Array>} - Merged PDF
 */
export const mergePDFs = async (pdfFiles) => {
    try {
        const mergedPdf = await PDFDocument.create();

        for (const file of pdfFiles) {
            const pdfBytes = file instanceof File ? await file.arrayBuffer() : file;
            const sourcePdf = await PDFDocument.load(pdfBytes);
            const pageCount = sourcePdf.getPageCount();

            const copiedPages = await mergedPdf.copyPages(sourcePdf, Array.from({ length: pageCount }, (_, i) => i));
            copiedPages.forEach(page => mergedPdf.addPage(page));
        }

        const mergedBytes = await mergedPdf.save();
        return mergedBytes;
    } catch (error) {
        console.error('Error merging PDFs:', error);
        throw new Error(`Failed to merge PDFs: ${error.message}`);
    }
};

/**
 * Add text watermark to PDF pages
 * @param {File|ArrayBuffer} pdfFile - Source PDF
 * @param {string} text - Watermark text
 * @param {Object} options - Watermark options
 * @returns {Promise<Uint8Array>} - Watermarked PDF
 */
export const addWatermark = async (pdfFile, text, options = {}) => {
    try {
        const {
            pageNumbers = null, // null = all pages
            opacity = 0.3,
            fontSize = 60,
            color = { r: 0.5, g: 0.5, b: 0.5 },
            rotation = 45
        } = options;

        const pdfBytes = pdfFile instanceof File ? await pdfFile.arrayBuffer() : pdfFile;
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

        const pages = pdfDoc.getPages();
        const pagesToWatermark = pageNumbers || Array.from({ length: pages.length }, (_, i) => i + 1);

        for (const pageNum of pagesToWatermark) {
            if (pageNum < 1 || pageNum > pages.length) continue;

            const page = pages[pageNum - 1];
            const { width, height } = page.getSize();
            const textWidth = helveticaFont.widthOfTextAtSize(text, fontSize);

            page.drawText(text, {
                x: width / 2 - textWidth / 2,
                y: height / 2,
                size: fontSize,
                font: helveticaFont,
                color: rgb(color.r, color.g, color.b),
                rotate: degrees(rotation),
                opacity
            });
        }

        const watermarkedBytes = await pdfDoc.save();
        return watermarkedBytes;
    } catch (error) {
        console.error('Error adding watermark:', error);
        throw new Error(`Failed to add watermark: ${error.message}`);
    }
};

/**
 * Insert blank pages at specific locations
 * @param {File|ArrayBuffer} pdfFile - Source PDF
 * @param {number[]} positions - Positions to insert blank pages (1-indexed)
 * @param {Object} pageSize - { width, height } in points (default: letter size)
 * @returns {Promise<Uint8Array>} - Modified PDF
 */
export const insertBlankPages = async (pdfFile, positions, pageSize = { width: 612, height: 792 }) => {
    try {
        const pdfBytes = pdfFile instanceof File ? await pdfFile.arrayBuffer() : pdfFile;
        const sourcePdf = await PDFDocument.load(pdfBytes);
        const newPdf = await PDFDocument.create();

        const sourcePages = sourcePdf.getPages();
        let sourceIndex = 0;
        const sortedPositions = [...positions].sort((a, b) => a - b);

        for (let targetPos = 1; targetPos <= sourcePages.length + sortedPositions.length; targetPos++) {
            if (sortedPositions.includes(targetPos)) {
                // Insert blank page
                newPdf.addPage([pageSize.width, pageSize.height]);
            } else {
                // Copy existing page
                if (sourceIndex < sourcePages.length) {
                    const [copiedPage] = await newPdf.copyPages(sourcePdf, [sourceIndex]);
                    newPdf.addPage(copiedPage);
                    sourceIndex++;
                }
            }
        }

        const modifiedBytes = await newPdf.save();
        return modifiedBytes;
    } catch (error) {
        console.error('Error inserting blank pages:', error);
        throw new Error(`Failed to insert blank pages: ${error.message}`);
    }
};

/**
 * Download PDF bytes as file
 * @param {Uint8Array} pdfBytes - PDF data
 * @param {string} filename - Desired filename
 */
export const downloadPDF = (pdfBytes, filename) => {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Get PDF metadata
 * @param {File|ArrayBuffer} pdfFile - Source PDF
 * @returns {Promise<Object>} - PDF metadata
 */
export const getPDFMetadata = async (pdfFile) => {
    try {
        const pdfBytes = pdfFile instanceof File ? await pdfFile.arrayBuffer() : pdfFile;
        const pdfDoc = await PDFDocument.load(pdfBytes);

        const pages = pdfDoc.getPages();
        const pageCount = pages.length;

        return {
            pageCount,
            title: pdfDoc.getTitle() || 'Untitled',
            author: pdfDoc.getAuthor() || 'Unknown',
            subject: pdfDoc.getSubject() || '',
            keywords: pdfDoc.getKeywords() || '',
            creator: pdfDoc.getCreator() || '',
            producer: pdfDoc.getProducer() || '',
            creationDate: pdfDoc.getCreationDate() || null,
            modificationDate: pdfDoc.getModificationDate() || null
        };
    } catch (error) {
        console.error('Error getting PDF metadata:', error);
        throw new Error(`Failed to get PDF metadata: ${error.message}`);
    }
};

export default {
    rotatePDF,
    extractPages,
    deletePages,
    mergePDFs,
    addWatermark,
    insertBlankPages,
    downloadPDF,
    getPDFMetadata
};
