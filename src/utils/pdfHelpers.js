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
