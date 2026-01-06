/**
 * Extracts all text from a PDF document.
 * @param {Object} pdfDocument - The pdf.js document object.
 * @param {Function} onProgress - Optional callback for progress updates.
 * @returns {Promise<string>} - The full text of the PDF.
 */
export const extractText = async (pdfDocument, onProgress) => {
    let fullText = "";
    const numPages = pdfDocument.numPages;

    for (let i = 1; i <= numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(" ");
        fullText += `[Page ${i}]\n${pageText}\n\n`;

        if (onProgress) {
            onProgress((i / numPages) * 100);
        }
    }

    return fullText;
};

/**
 * Extracts text from a specific page range.
 */
export const extractTextRange = async (pdfDocument, startPage, endPage) => {
    let text = "";
    const total = pdfDocument.numPages;
    const start = Math.max(1, startPage);
    const end = Math.min(total, endPage);

    for (let i = start; i <= end; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(" ");
        text += `[Page ${i}]\n${pageText}\n\n`;
    }

    return text;
};

/**
 * Extracts text from a page range with detailed metadata and progress tracking.
 * @param {Object} pdfDocument - The pdf.js document object.
 * @param {number} startPage - Starting page number (1-indexed).
 * @param {number} endPage - Ending page number (1-indexed).
 * @param {Function} onProgress - Optional callback for progress updates (page, total, percentage).
 * @returns {Promise<Object>} - Object with fullText, pages array, metadata
 */
export const extractTextRangeDetailed = async (pdfDocument, startPage, endPage, onProgress) => {
    const total = pdfDocument.numPages;
    const start = Math.max(1, startPage);
    const end = Math.min(total, endPage);

    let fullText = "";
    const pages = [];
    let totalChars = 0;
    let totalWords = 0;

    for (let i = start; i <= end; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(" ");

        const pageData = {
            pageNumber: i,
            text: pageText,
            charCount: pageText.length,
            wordCount: pageText.trim().split(/\s+/).filter(w => w.length > 0).length
        };

        pages.push(pageData);
        fullText += `[Page ${i}]\n${pageText}\n\n`;
        totalChars += pageData.charCount;
        totalWords += pageData.wordCount;

        if (onProgress) {
            const progress = ((i - start + 1) / (end - start + 1)) * 100;
            onProgress(i, end - start + 1, progress);
        }
    }

    return {
        fullText,
        pages,
        metadata: {
            startPage: start,
            endPage: end,
            totalPages: end - start + 1,
            totalChars,
            totalWords,
            averageWordsPerPage: Math.round(totalWords / (end - start + 1))
        }
    };
};

/**
 * Validates a page range against the document.
 * @param {number} startPage - Starting page number.
 * @param {number} endPage - Ending page number.
 * @param {number} totalPages - Total pages in document.
 * @returns {Object} - { valid: boolean, error: string|null }
 */
export const validatePageRange = (startPage, endPage, totalPages) => {
    const start = parseInt(startPage);
    const end = parseInt(endPage);

    if (isNaN(start) || isNaN(end)) {
        return { valid: false, error: 'Page numbers must be valid integers' };
    }

    if (start < 1 || end < 1) {
        return { valid: false, error: 'Page numbers must be greater than 0' };
    }

    if (start > totalPages || end > totalPages) {
        return { valid: false, error: `Page numbers cannot exceed ${totalPages}` };
    }

    if (start > end) {
        return { valid: false, error: 'Start page must be less than or equal to end page' };
    }

    return { valid: true, error: null };
};

/**
 * Gets dimensions and metadata for a specific page.
 * @param {Object} pdfDocument - The pdf.js document object.
 * @param {number} pageNum - Page number (1-indexed).
 * @returns {Promise<Object>} - Page dimensions and metadata.
 */
export const getPageDimensions = async (pdfDocument, pageNum) => {
    const page = await pdfDocument.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });

    return {
        pageNumber: pageNum,
        width: viewport.width,
        height: viewport.height,
        rotation: page.rotate
    };
};
