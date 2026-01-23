/**
 * Production-Grade PDF Editing Service using pdf-lib
 * Real PDF manipulation - no simulations
 */

import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import { encryptPDF as libraryEncrypt } from '@pdfsmaller/pdf-encrypt-lite';

/**
 * Internal helper to ensure we have an ArrayBuffer from any source
 */
const getBuffer = async (pdfFile) => {
    // Check for raw bytes first (most common now)
    if (pdfFile instanceof Uint8Array || pdfFile instanceof ArrayBuffer) return pdfFile;

    // Then check for File objects
    if (pdfFile instanceof File) return await pdfFile.arrayBuffer();

    // Finally fall back to strings (URLs)
    if (typeof pdfFile === 'string' && (pdfFile.startsWith('http') || pdfFile.startsWith('/') || pdfFile.startsWith('blob:'))) {
        const response = await fetch(pdfFile);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.arrayBuffer();
    }

    return pdfFile;
};

/**
 * Rotate pages in a PDF
 */
export const rotatePDF = async (pdfFile, pageNumbers, angle) => {
    try {
        const pdfBytes = await getBuffer(pdfFile);
        const pdfDoc = await PDFDocument.load(pdfBytes);

        const pages = pdfDoc.getPages();
        const validPages = pageNumbers.filter(num => num >= 1 && num <= pages.length);

        for (const pageNum of validPages) {
            const page = pages[pageNum - 1];
            const currentRotation = page.getRotation().angle;
            page.setRotation(degrees((currentRotation + angle) % 360));
        }

        return await pdfDoc.save();
    } catch (error) {
        console.error('Error rotating PDF:', error);
        throw new Error(`Failed to rotate PDF: ${error.message}`);
    }
};

/**
 * Extract specific pages from a PDF
 */
export const extractPages = async (pdfFile, pageNumbers) => {
    try {
        const pdfBytes = await getBuffer(pdfFile);
        const sourcePdf = await PDFDocument.load(pdfBytes);
        const newPdf = await PDFDocument.create();

        const pages = sourcePdf.getPages();
        const validPages = pageNumbers.filter(num => num >= 1 && num <= pages.length);

        for (const pageNum of validPages) {
            const [copiedPage] = await newPdf.copyPages(sourcePdf, [pageNum - 1]);
            newPdf.addPage(copiedPage);
        }

        return await newPdf.save();
    } catch (error) {
        console.error('Error extracting pages:', error);
        throw new Error(`Failed to extract pages: ${error.message}`);
    }
};

/**
 * Delete specific pages from a PDF
 */
export const deletePages = async (pdfFile, pageNumbers) => {
    try {
        const pdfBytes = await getBuffer(pdfFile);
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

        return await newPdf.save();
    } catch (error) {
        console.error('Error deleting pages:', error);
        throw new Error(`Failed to delete pages: ${error.message}`);
    }
};

/**
 * Merge multiple PDFs into one
 */
export const mergePDFs = async (pdfFiles) => {
    try {
        const mergedPdf = await PDFDocument.create();

        for (const file of pdfFiles) {
            const pdfBytes = await getBuffer(file);
            const sourcePdf = await PDFDocument.load(pdfBytes);
            const pageCount = sourcePdf.getPageCount();

            const copiedPages = await mergedPdf.copyPages(sourcePdf, Array.from({ length: pageCount }, (_, i) => i));
            copiedPages.forEach(page => mergedPdf.addPage(page));
        }

        return await mergedPdf.save();
    } catch (error) {
        console.error('Error merging PDFs:', error);
        throw new Error(`Failed to merge PDFs: ${error.message}`);
    }
};

/**
 * Add text watermark to PDF pages
 */
export const addWatermark = async (pdfFile, text, options = {}) => {
    try {
        const {
            pageNumbers = null,
            opacity = 0.3,
            fontSize = 60,
            color = { r: 0.5, g: 0.5, b: 0.5 },
            rotation = 45
        } = options;

        const pdfBytes = await getBuffer(pdfFile);
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

        return await pdfDoc.save();
    } catch (error) {
        console.error('Error adding watermark:', error);
        throw new Error(`Failed to add watermark: ${error.message}`);
    }
};

/**
 * Insert blank pages at specific locations
 */
export const insertBlankPages = async (pdfFile, positions, pageSize = { width: 612, height: 792 }) => {
    try {
        const pdfBytes = await getBuffer(pdfFile);
        const sourcePdf = await PDFDocument.load(pdfBytes);
        const newPdf = await PDFDocument.create();

        const sourcePages = sourcePdf.getPages();
        let sourceIndex = 0;
        const sortedPositions = [...positions].sort((a, b) => a - b);

        for (let targetPos = 1; targetPos <= sourcePages.length + sortedPositions.length; targetPos++) {
            if (sortedPositions.includes(targetPos)) {
                newPdf.addPage([pageSize.width, pageSize.height]);
            } else {
                if (sourceIndex < sourcePages.length) {
                    const [copiedPage] = await newPdf.copyPages(sourcePdf, [sourceIndex]);
                    newPdf.addPage(copiedPage);
                    sourceIndex++;
                }
            }
        }

        return await newPdf.save();
    } catch (error) {
        console.error('Error inserting blank pages:', error);
        throw new Error(`Failed to insert blank pages: ${error.message}`);
    }
};

/**
 * Encrypt a PDF with a password
 */
export const encryptPDF = async (pdfFile, password) => {
    try {
        const pdfBytes = await getBuffer(pdfFile);
        return await libraryEncrypt(
            new Uint8Array(pdfBytes),
            password,
            password,
            {
                printing: 'allow',
                modifying: 'allow',
                copying: 'allow',
                annotating: 'allow'
            }
        );
    } catch (error) {
        console.error('Error encrypting PDF:', error);
        throw new Error(`Failed to encrypt PDF: ${error.message}`);
    }
};

/**
 * Apply visual redaction to specific areas
 */
export const redactPDF = async (pdfFile, areas) => {
    try {
        const pdfBytes = await getBuffer(pdfFile);
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

        return await pdfDoc.save();
    } catch (error) {
        console.error('Error redacting PDF:', error);
        throw error;
    }
};

/**
 * Embed a signature image into a PDF
 */
export const signPDF = async (pdfFile, signatureDataUrl, position) => {
    try {
        const pdfBytes = await getBuffer(pdfFile);
        const pdfDoc = await PDFDocument.load(pdfBytes);

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

        return await pdfDoc.save();
    } catch (error) {
        console.error('Error signing PDF:', error);
        throw error;
    }
};

/**
 * Split PDF into multiple chunks of N pages each
 */
export const splitPDFByInterval = async (pdfFile, interval) => {
    try {
        const pdfBytes = await getBuffer(pdfFile);
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
 */
export const splitPDFByRanges = async (pdfFile, splitPoints) => {
    try {
        const pdfBytes = await getBuffer(pdfFile);
        const sourcePdf = await PDFDocument.load(pdfBytes);
        const totalPages = sourcePdf.getPageCount();

        const points = [...new Set(splitPoints)]
            .sort((a, b) => a - b)
            .filter(p => p > 0 && p < totalPages);

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

/**
 * Get PDF metadata
 */
export const getPDFMetadata = async (pdfFile) => {
    try {
        const pdfBytes = await getBuffer(pdfFile);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        return {
            pageCount: pdfDoc.getPageCount(),
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
