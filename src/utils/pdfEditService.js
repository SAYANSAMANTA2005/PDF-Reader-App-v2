/**
 * Production-Grade PDF Editing Service using pdf-lib
 * Real PDF manipulation - no simulations
 */

import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import { encryptPDF as libraryEncrypt } from '@pdfsmaller/pdf-encrypt-lite';

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
/**
 * Encrypt a PDF with a password
 * @param {File|ArrayBuffer} pdfFile 
 * @param {string} password 
 * @returns {Promise<Uint8Array>}
 */
export const encryptPDF = async (pdfFile, password) => {
    try {
        const pdfBytes = pdfFile instanceof File ? await pdfFile.arrayBuffer() : pdfFile;
        // True encryption using industry-standard RC4/AES (via pdf-encrypt-lite)
        // This modifies the PDF trailer and appends the encryption dictionary
        const encryptedBytes = await libraryEncrypt(
            new Uint8Array(pdfBytes),
            password,
            password, // Use same owner password for simplicity
            {
                printing: 'allow',
                modifying: 'allow',
                copying: 'allow',
                annotating: 'allow'
            }
        );
        return encryptedBytes;
    } catch (error) {
        console.error('Error encrypting PDF:', error);
        throw new Error(`Failed to encrypt PDF: ${error.message}`);
    }
};

/**
 * Apply visual redaction to specific areas
 * @param {File|ArrayBuffer} pdfFile 
 * @param {Array<{page: number, x: number, y: number, width: number, height: number, color: {r,g,b}}>} areas 
 * @returns {Promise<Uint8Array>}
 */
export const redactPDF = async (pdfFile, areas) => {
    try {
        const pdfBytes = pdfFile instanceof File ? await pdfFile.arrayBuffer() : pdfFile;
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        for (const area of areas) {
            const page = pages[area.page - 1];
            if (!page) continue;

            const { r, g, b } = area.color || { r: 0, g: 0, b: 0 };
            page.drawRectangle({
                x: area.x,
                y: area.y,
                width: area.width,
                height: area.height,
                color: rgb(r, g, b),
                opacity: 1
            });
        }

        const modifiedBytes = await pdfDoc.save();
        return modifiedBytes;
    } catch (error) {
        console.error('Error redacting PDF:', error);
        throw error;
    }
};

/**
 * Embed a signature image into a PDF
 * @param {File|ArrayBuffer} pdfFile 
 * @param {string} signatureDataUrl - Data URL of the signature image (PNG)
 * @param {Object} position - { page, x, y, width, height }
 * @returns {Promise<Uint8Array>}
 */
export const signPDF = async (pdfFile, signatureDataUrl, position) => {
    try {
        const pdfBytes = pdfFile instanceof File ? await pdfFile.arrayBuffer() : pdfFile;
        const pdfDoc = await PDFDocument.load(pdfBytes);

        // Embed the signature image
        const signatureImageBytes = await fetch(signatureDataUrl).then((res) => res.arrayBuffer());
        const signatureImage = await pdfDoc.embedPng(signatureImageBytes);

        const pages = pdfDoc.getPages();
        const page = pages[position.page - 1];
        if (page) {
            page.drawImage(signatureImage, {
                x: position.x,
                y: position.y,
                width: position.width,
                height: position.height,
            });
        }

        const modifiedBytes = await pdfDoc.save();
        return modifiedBytes;
    } catch (error) {
        console.error('Error signing PDF:', error);
        throw error;
    }
};

/**
 * Split PDF into multiple chunks of N pages each
 * @param {File|ArrayBuffer} pdfFile 
 * @param {number} interval 
 * @returns {Promise<Array<{bytes: Uint8Array, name: string}>>}
 */
export const splitPDFByInterval = async (pdfFile, interval) => {
    try {
        const pdfBytes = pdfFile instanceof File ? await pdfFile.arrayBuffer() : pdfFile;
        const sourcePdf = await PDFDocument.load(pdfBytes);
        const pageCount = sourcePdf.getPageCount();
        const results = [];

        for (let i = 0; i < pageCount; i += interval) {
            const newPdf = await PDFDocument.create();
            const end = Math.min(i + interval, pageCount);
            const pageIndices = Array.from({ length: end - i }, (_, k) => i + k);

            const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
            copiedPages.forEach(page => newPdf.addPage(page));

            const bytes = await newPdf.save();
            results.push({
                bytes,
                name: `part_${Math.floor(i / interval) + 1}_pages_${i + 1}-${end}.pdf`
            });
        }
        return results;
    } catch (error) {
        console.error('Error splitting PDF by interval:', error);
        throw error;
    }
};

/**
 * Split PDF at specific page numbers
 * @param {File|ArrayBuffer} pdfFile 
 * @param {number[]} splitPoints - 1-indexed page numbers where split occurs (points are the LAST page of a chunk)
 * @returns {Promise<Array<{bytes: Uint8Array, name: string}>>}
 */
export const splitPDFByRanges = async (pdfFile, splitPoints) => {
    try {
        const pdfBytes = pdfFile instanceof File ? await pdfFile.arrayBuffer() : pdfFile;
        const sourcePdf = await PDFDocument.load(pdfBytes);
        const totalPages = sourcePdf.getPageCount();

        // Sort and filter points
        const points = [...new Set(splitPoints)]
            .sort((a, b) => a - b)
            .filter(p => p > 0 && p < totalPages);

        // Create ranges: 1 to point1, point1+1 to point2, ..., lastPoint+1 to total
        const ranges = [];
        let lastPoint = 0;
        for (const p of points) {
            ranges.push({ start: lastPoint + 1, end: p });
            lastPoint = p;
        }
        ranges.push({ start: lastPoint + 1, end: totalPages });

        const results = [];
        for (let i = 0; i < ranges.length; i++) {
            const { start, end } = ranges[i];
            const newPdf = await PDFDocument.create();
            const pageIndices = Array.from({ length: end - start + 1 }, (_, k) => start + k - 1);

            const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
            copiedPages.forEach(page => newPdf.addPage(page));

            const bytes = await newPdf.save();
            results.push({
                bytes,
                name: `part_${i + 1}_pages_${start}-${end}.pdf`
            });
        }
        return results;
    } catch (error) {
        console.error('Error splitting PDF by ranges:', error);
        throw error;
    }
};

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
    splitPDFByInterval,
    splitPDFByRanges,
    encryptPDF,
    redactPDF,
    signPDF,
    downloadPDF,
    getPDFMetadata
};
