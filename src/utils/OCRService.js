import Tesseract from 'tesseract.js';

/**
 * OCR Service
 * Handles text extraction from images/scanned PDFs
 * Supports multiple languages including English, Bengali, Hindi
 */
class OCRService {
    constructor() {
        this.worker = null;
        this.isInitializing = false;
        this.queue = [];
        this.isProcessing = false;
    }

    async init(langs = 'eng+ben+hin') {
        if (this.worker) return;
        if (this.isInitializing) {
            while (this.isInitializing) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return;
        }

        this.isInitializing = true;
        try {
            this.worker = await Tesseract.createWorker(langs, 1, {
                logger: m => console.log('OCR Progress:', m),
            });
            console.log('✅ OCR Worker Initialized');
        } catch (error) {
            console.error('❌ OCR Initialization Error:', error);
        } finally {
            this.isInitializing = false;
        }
    }

    /**
     * Recognize text from a canvas or image URL with detailed bounding boxes
     */
    async recognize(imageSource, onProgress) {
        await this.init();
        if (!this.worker) throw new Error('OCR Worker not initialized');

        try {
            // Tesseract.js returns `data` which has `text` and `words` (with bbox)
            const result = await this.worker.recognize(imageSource);
            // Return rich object if available, otherwise just text
            if (result.data && result.data.words) {
                return {
                    text: result.data.text,
                    words: result.data.words.map(w => ({
                        text: w.text,
                        bbox: w.bbox, // {x0, y0, x1, y1}
                        confidence: w.confidence
                    })),
                    lines: result.data.lines ? result.data.lines.map(l => ({
                        text: l.text,
                        bbox: l.bbox
                    })) : []
                };
            }
            return result.data.text;
        } catch (error) {
            console.error('OCR Recognition Error:', error);
            throw error;
        }
    }

    // Alias for explicit calls
    async recognizeDetailed(imageSource) {
        return this.recognize(imageSource);
    }

    /**
     * Terminate worker to free memory
     */
    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
        }
    }

    /**
     * Add OCR job to queue
     * @param {string} imageSource - Base64 or URL
     * @returns {Promise<string>} - The extract text
     */
    addToQueue(imageSource) {
        return new Promise((resolve, reject) => {
            this.queue.push({ imageSource, resolve, reject });
            this.processQueue();
        });
    }

    /**
     * Process the queue sequentially
     */
    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        const job = this.queue.shift();

        // For scrolling, latest page is most important. So maybe LIFO?
        // Let's stick to FIFO for stability, user might wait. Or...
        // Actually, if I scroll fast, I want the current page.
        // Let's implement a priority queue logic later if needed.

        try {
            const text = await this.recognize(job.imageSource);
            job.resolve(text);
        } catch (error) {
            job.reject(error);
        } finally {
            this.isProcessing = false;
            // Add small delay to yield to main thread
            setTimeout(() => this.processQueue(), 50);
        }
    }
}

export const ocrService = new OCRService();
