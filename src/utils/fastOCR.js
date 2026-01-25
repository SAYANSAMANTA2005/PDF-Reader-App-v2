import Tesseract from 'tesseract.js';

/**
 * Fast, On-Device Rule-Based OCR Service
 * Uses Tesseract.js WASM for offline text recognition.
 */
export const FastOCRService = {
    worker: null,

    async init() {
        if (!this.worker) {
            this.worker = await Tesseract.createWorker('eng');
        }
    },

    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
        }
    },

    /**
     * Performs fast OCR and converts to Markdown using structural rules.
     * @param {string} imageBase64 
     * @returns {Promise<string>} Markdown string
     */
    async processImageToMarkdown(imageBase64) {
        if (!this.worker) await this.init();

        const result = await this.worker.recognize(imageBase64);
        const lines = result.data.lines;

        let markdown = "";
        let avgLineHeight = 20;

        // 1. First Pass: Calculate Average Line Height to detect headings
        if (lines.length > 0) {
            const totalHeight = lines.reduce((acc, line) => {
                const height = Math.abs(line.bbox.y1 - line.bbox.y0);
                return acc + height;
            }, 0);
            avgLineHeight = totalHeight / lines.length;
        }

        // 2. Second Pass: Apply Rules
        lines.forEach((line) => {
            const text = line.text.trim();
            if (!text) return;

            const height = Math.abs(line.bbox.y1 - line.bbox.y0);
            const isBold = line.confidence > 85;

            // Rule 1: Headings (Significantly larger text)
            if (height > avgLineHeight * 1.4) {
                markdown += `\n## ${text}\n`;
            }
            // Rule 2: Lists (Starts with -, *, or digit.)
            else if (/^[-*•]/.test(text)) {
                markdown += `- ${text.replace(/^[-*•]\s*/, '')}\n`;
            }
            else if (/^\d+\./.test(text)) {
                markdown += `${text}\n`; // Markdown handles numbered lists naturally
            }
            // Rule 3: Equations (Simple heuristic)
            else if (text.includes('=') && (text.includes('+') || text.includes('-') || text.length < 15)) {
                // Wrap in simple code block or math delimiter if generic
                markdown += `\n$${text}$\n`;
            }
            // Rule 4: Standard Text
            else {
                markdown += `${text} `;
            }
        });

        // Cleanup multiple spaces/newlines
        return markdown.replace(/\n{3,}/g, '\n\n').trim();
    }
};
