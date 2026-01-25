import { convertHandwritingToTyped } from './aiService';
import { renderPageToBase64 } from './pdfStructureAnalysis';
import { jsPDF } from 'jspdf';
import { FastOCRService } from './fastOCR';

/**
 * Service to orchestrate the conversion of handwritten PDF pages to typed text.
 */
export class HandwritingConverterService {
    constructor() {
        this.isProcessing = false;
        this.progressCallback = null;
    }

    /**
     * Converts a range of pages from handwriting to typed markdown.
     * @param {Object} pdfDocument - PDF.js document proxy
     * @param {Array<number>} pageNumbers - Array of page numbers to convert
     * @param {Function} onProgress - Callback(current, total, status)
     * @param {string} mode - 'high_quality' | 'fast'
     * @returns {Promise<string>} - Full Markdown result
     */
    async convertPages(pdfDocument, pageNumbers, onProgress, mode = 'high_quality') {
        this.isProcessing = true;
        let fullMarkdown = "";

        // if (mode === 'fast') {
        //     await FastOCRService.init();
        // }

        for (let i = 0; i < pageNumbers.length; i++) {
            if (!this.isProcessing) break; // Allow cancellation

            const pageNum = pageNumbers[i];
            onProgress(i, pageNumbers.length, `Rendering Page ${pageNum}...`);

            try {
                // 1. Render Page
                const page = await pdfDocument.getPage(pageNum);
                const base64Image = await renderPageToBase64(page);

                // 2. Enhance & Convert
                let pageMarkdown = "";

                if (mode === 'fast') {
                    onProgress(i, pageNumbers.length, `Flash AI Transcribing Page ${pageNum}...`);
                    pageMarkdown = await convertHandwritingToTyped(base64Image, true);
                } else {
                    onProgress(i, pageNumbers.length, `AI Transcribing Page ${pageNum}...`);
                    pageMarkdown = await convertHandwritingToTyped(base64Image, false);
                }

                fullMarkdown += `\n\n# Page ${pageNum}\n\n${pageMarkdown}`;
            } catch (err) {
                console.error(`Failed to convert page ${pageNum}`, err);
                fullMarkdown += `\n\n# Page ${pageNum}\n\n[Error converting page: ${err.message}]`;
            }
        }

        onProgress(pageNumbers.length, pageNumbers.length, "Done!");
        this.isProcessing = false;
        return fullMarkdown;
    }

    cancel() {
        this.isProcessing = false;
    }

    /**
     * Generates a simple PDF from the markdown text using jsPDF.
     * Note: For professional results, users should copy MD to Overleaf/Pandoc.
     * This provides a "Quick Draft" PDF.
     */
    generateSimplePDF(markdownContent, fileName = "typed_notes.pdf") {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 10;
        const maxLineWidth = pageWidth - margin * 2;

        let y = 10; // Start Y position
        const lineHeight = 7;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);

        const lines = markdownContent.split('\n');

        lines.forEach(line => {
            if (y > doc.internal.pageSize.getHeight() - margin) {
                doc.addPage();
                y = 10;
            }

            // Basic Markdown Parsing
            if (line.startsWith('# ')) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(16);
                doc.text(line.replace('# ', ''), margin, y);
                y += 10;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(11);
            } else if (line.startsWith('## ')) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(14);
                doc.text(line.replace('## ', ''), margin, y);
                y += 8;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(11);
            } else {
                // Regular Text with wrapping
                const textLines = doc.splitTextToSize(line, maxLineWidth);
                doc.text(textLines, margin, y);
                y += (textLines.length * 5) + 2;
            }
        });

        doc.save(fileName);
    }
}

export const handwritingService = new HandwritingConverterService();
