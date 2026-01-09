/**
 * Reconstructs text from pdf.js text items using spatial coordinates.
 * Groups text by lines (same Y) and then sorts by X.
 * Handles character/word spacing and paragraph breaks.
 */
export const reconstructTextSpacially = (items) => {
    if (!items || items.length === 0) return "";

    // Sort items by Y (descending) and then X (ascending)
    // transform: [scaleX, skewY, skewX, scaleY, tx, ty]
    // In PDF.js coordinate system, ty is vertical position
    const sortedItems = [...items].sort((a, b) => {
        const yA = a.transform[5];
        const yB = b.transform[5];
        // If Y is close enough, treat as same line (threshold of 2-5 units)
        if (Math.abs(yA - yB) > 5) return yB - yA; // Sort top to bottom
        return a.transform[4] - b.transform[4]; // Sort left to right
    });

    let fullText = "";
    let lastY = -1;
    let lastX = -1;
    let lastHeight = 12; // Default fallback height

    for (const item of sortedItems) {
        const x = item.transform[4];
        const y = item.transform[5];
        const str = item.str;
        const height = Math.abs(item.transform[3]); // approximate font size

        // New line detection
        if (lastY !== -1 && Math.abs(y - lastY) > (height * 0.5 || 5)) {
            // Check for large gap (paragraph)
            if (Math.abs(y - lastY) > (height * 1.8 || 20)) {
                fullText += "\n\n";
            } else {
                fullText += "\n";
            }
            lastX = -1;
        }

        // Space detection within line
        if (lastX !== -1 && str.trim().length > 0) {
            const gap = x - lastX;
            // If gap is positive and significant, add space. 
            // Threshold based on font height
            if (gap > (height * 0.1 || 2)) {
                // Ensure we don't add multiple spaces if it already ends in space
                if (!fullText.endsWith(" ")) {
                    fullText += " ";
                }
            }
        }

        fullText += str;
        lastY = y;
        // Estimate next X position (current X + approximate width)
        // items from PDF.js have 'width' property usually
        lastX = x + (item.width || str.length * (height * 0.6));
        lastHeight = height;
    }

    return fullText.trim();
};

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
        const pageText = reconstructTextSpacially(textContent.items);
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
        const pageText = reconstructTextSpacially(textContent.items);
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
        const pageText = reconstructTextSpacially(textContent.items);

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

/**
 * Extracts all text with detailed page metadata for AI citation.
 * @param {Object} pdfDocument - The pdf.js document object.
 * @returns {Promise<Array>} - Array of objects { page: number, content: string }
 */
export const extractTextWithCitations = async (pdfDocument) => {
    const numPages = pdfDocument.numPages;
    const chunks = [];

    for (let i = 1; i <= numPages; i++) {
        try {
            const page = await pdfDocument.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = reconstructTextSpacially(textContent.items);

            // Clean up text slightly to reduce token count
            const cleanText = pageText.replace(/\s+/g, ' ').trim();

            if (cleanText.length > 50) { // Ignore empty/very short pages
                chunks.push({
                    page: i,
                    content: cleanText
                });
            }
        } catch (error) {
            console.warn(`Failed to extract text from page ${i}`, error);
        }
    }

    return chunks;
};

