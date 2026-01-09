// src/utils/pdfPageScheduler.js
// Smart page rendering scheduler - Prioritizes visible pages
// Prevents UI freezing by spreading renders across multiple frames

/**
 * Page Rendering Scheduler
 * Manages render queue, prioritizes visible pages, uses requestIdleCallback
 */
export class PageRenderScheduler {
    constructor(options = {}) {
        this.options = {
            maxConcurrentRenders: options.maxConcurrentRenders || 4, // Increased default
            prioritizeVisiblePages: options.prioritizeVisiblePages !== false,
            useIdleCallback: options.useIdleCallback !== false,
            lookaheadCount: options.lookaheadCount || 5, // Number of pages to preload ahead
        };

        this.renderQueue = [];
        this.activeRenders = new Set();
        this.completedPages = new Set();
        this.failedPages = new Map();
        this.preloadedPages = new Set(); // Track preloaded pages explicitly

        this.onRenderStart = options.onRenderStart || (() => { });
        this.onRenderComplete = options.onRenderComplete || (() => { });
        this.onRenderError = options.onRenderError || (() => { });
    }

    /**
     * Add page to render queue with priority
     */
    addPageToQueue(pageNumber, renderFn, priority = 0) {
        // Prevent duplicate queuing of the same page
        if (this.activeRenders.has(pageNumber) || this.renderQueue.some(item => item.pageNumber === pageNumber)) {
            // If already in queue, just update priority if higher
            const existing = this.renderQueue.find(item => item.pageNumber === pageNumber);
            if (existing && priority > existing.priority) {
                existing.priority = priority;
                this.renderQueue.sort((a, b) => b.priority - a.priority);
            }
            return false;
        }

        // Add to queue
        this.renderQueue.push({
            pageNumber,
            renderFn,
            priority,
            addedAt: Date.now(),
        });

        // Sort by priority (higher = more important)
        this.renderQueue.sort((a, b) => b.priority - a.priority);

        // Start processing
        this.processQueue();

        return true;
    }

    /**
     * Update visible pages to reprioritize queue and schedule lookahead
     */
    updateVisiblePages(visiblePages, renderFnLoader) {
        if (!this.options.prioritizeVisiblePages) return;

        // Reprioritize visible pages
        for (const item of this.renderQueue) {
            if (visiblePages.includes(item.pageNumber)) {
                item.priority = 1000 + visiblePages.indexOf(item.pageNumber); // High priority
            }
        }

        // Add lookahead pages to queue with lower priority
        if (visiblePages.length > 0 && renderFnLoader) {
            const lastVisible = Math.max(...visiblePages);
            for (let i = 1; i <= this.options.lookaheadCount; i++) {
                const preloadPage = lastVisible + i;
                // Only if not already rendered or in queue
                if (!this.completedPages.has(preloadPage) && !this.preloadedPages.has(preloadPage)) {
                    const renderFn = renderFnLoader(preloadPage);
                    if (renderFn) {
                        this.addPageToQueue(preloadPage, renderFn, 10); // Low priority for preload
                        this.preloadedPages.add(preloadPage);
                    }
                }
            }
        }

        // Re-sort
        this.renderQueue.sort((a, b) => b.priority - a.priority);
        this.processQueue();
    }

    /**
     * Process render queue
     */
    processQueue() {
        // Check if can start new renders
        while (this.activeRenders.size < this.options.maxConcurrentRenders && this.renderQueue.length > 0) {
            const item = this.renderQueue.shift();
            this.renderPage(item.pageNumber, item.renderFn);
        }
    }

    /**
     * Render a page
     */
    async renderPage(pageNumber, renderFn) {
        // Check if already rendering
        if (this.activeRenders.has(pageNumber)) {
            return;
        }

        this.activeRenders.add(pageNumber);
        this.onRenderStart(pageNumber);

        try {
            // Aggressive rendering: use requestIdleCallback but don't wait forever
            if (this.options.useIdleCallback && 'requestIdleCallback' in window) {
                await new Promise((resolve) => {
                    requestIdleCallback(async (deadline) => {
                        // If we have enough time in this frame, or if it's high priority, proceed
                        await renderFn(pageNumber);
                        resolve();
                    }, { timeout: 200 }); // Max wait 200ms for idle
                });
            } else {
                // Fallback to microtask
                await renderFn(pageNumber);
            }

            this.activeRenders.delete(pageNumber);
            this.completedPages.add(pageNumber);
            this.onRenderComplete(pageNumber);

            // Process next
            this.processQueue();

        } catch (error) {
            this.activeRenders.delete(pageNumber);
            this.failedPages.set(pageNumber, error);
            this.onRenderError(pageNumber, error);

            // Retry later
            this.processQueue();
        }
    }

    /**
     * Retry failed pages
     */
    retryFailed(renderFnMap) {
        for (const [pageNumber, error] of this.failedPages.entries()) {
            const renderFn = renderFnMap.get(pageNumber);
            if (renderFn) {
                this.failedPages.delete(pageNumber);
                this.completedPages.delete(pageNumber);
                this.addPageToQueue(pageNumber, renderFn, 50);
            }
        }
    }

    /**
     * Cancel render of page
     */
    cancelPage(pageNumber) {
        // Remove from queue
        const index = this.renderQueue.findIndex(item => item.pageNumber === pageNumber);
        if (index !== -1) {
            this.renderQueue.splice(index, 1);
        }

        // Note: Cannot cancel active renders (they're already running)
    }

    /**
     * Clear cache and queues
     */
    clear() {
        this.renderQueue = [];
        this.activeRenders.clear();
        this.completedPages.clear();
        this.failedPages.clear();
    }

    /**
     * Get queue stats
     */
    getStats() {
        return {
            queueLength: this.renderQueue.length,
            activeRenders: this.activeRenders.size,
            completedPages: this.completedPages.size,
            failedPages: this.failedPages.size,
        };
    }
}

/**
 * Batch Render Manager
 * Optimizes batch rendering of multiple pages
 */
export class BatchRenderManager {
    constructor(options = {}) {
        this.options = {
            batchSize: options.batchSize || 5,
            delayBetweenBatches: options.delayBetweenBatches || 100,
        };

        this.batches = [];
        this.currentBatch = 0;
        this.isProcessing = false;
    }

    /**
     * Create batches from pages
     */
    createBatches(pages, renderFn) {
        this.batches = [];

        for (let i = 0; i < pages.length; i += this.options.batchSize) {
            const batch = pages.slice(i, i + this.options.batchSize);
            this.batches.push({
                pages: batch,
                renderFn,
                completed: false,
            });
        }

        return this.batches;
    }

    /**
     * Process batches with delay
     */
    async processBatches(onBatchProgress) {
        this.isProcessing = true;

        for (let i = 0; i < this.batches.length; i++) {
            const batch = this.batches[i];

            // Render all pages in batch
            await Promise.all(
                batch.pages.map(page => batch.renderFn(page))
            );

            batch.completed = true;

            if (onBatchProgress) {
                onBatchProgress({
                    batchNumber: i + 1,
                    totalBatches: this.batches.length,
                    completedPages: (i + 1) * this.options.batchSize,
                });
            }

            // Delay before next batch
            if (i < this.batches.length - 1) {
                await new Promise(resolve =>
                    setTimeout(resolve, this.options.delayBetweenBatches)
                );
            }
        }

        this.isProcessing = false;
    }

    /**
     * Get progress
     */
    getProgress() {
        const completed = this.batches.filter(b => b.completed).length;
        return {
            completedBatches: completed,
            totalBatches: this.batches.length,
            percentage: (completed / this.batches.length * 100).toFixed(0),
        };
    }
}

/**
 * Incremental Parser
 * Parses PDF in chunks to avoid loading entire file at once
 */
export class IncrementalPDFParser {
    constructor(pdfUrl, options = {}) {
        this.pdfUrl = pdfUrl;
        this.options = {
            chunkSize: options.chunkSize || 1024 * 1024, // 1MB chunks
            onChunkLoaded: options.onChunkLoaded || (() => { }),
            onParseProgress: options.onParseProgress || (() => { }),
        };

        this.chunks = [];
        this.totalSize = 0;
        this.parsedSize = 0;
    }

    /**
     * Get file size
     */
    async getFileSize() {
        try {
            const response = await fetch(this.pdfUrl, { method: 'HEAD' });
            this.totalSize = parseInt(response.headers.get('content-length'), 10);
            return this.totalSize;
        } catch (error) {
            console.error('Error getting file size:', error);
            return null;
        }
    }

    /**
     * Load PDF in chunks
     */
    async loadChunks() {
        const fileSize = await this.getFileSize();
        if (!fileSize) return null;

        const chunks = [];
        let offset = 0;

        while (offset < fileSize) {
            const end = Math.min(offset + this.options.chunkSize, fileSize);

            try {
                const response = await fetch(this.pdfUrl, {
                    headers: {
                        'Range': `bytes=${offset}-${end - 1}`,
                    },
                });

                const chunk = await response.arrayBuffer();
                chunks.push(chunk);

                this.parsedSize += chunk.byteLength;

                this.options.onChunkLoaded({
                    chunkNumber: chunks.length,
                    chunkSize: chunk.byteLength,
                    totalLoaded: this.parsedSize,
                    totalSize: fileSize,
                    percentage: (this.parsedSize / fileSize * 100).toFixed(1),
                });

                offset = end;

                // Small delay to avoid overwhelming network
                await new Promise(resolve => setTimeout(resolve, 10));

            } catch (error) {
                console.error(`Error loading chunk at offset ${offset}:`, error);
                return null;
            }
        }

        return this.combineChunks(chunks);
    }

    /**
     * Combine chunks into single buffer
     */
    combineChunks(chunks) {
        const totalSize = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
        const combined = new Uint8Array(totalSize);

        let offset = 0;
        for (const chunk of chunks) {
            combined.set(new Uint8Array(chunk), offset);
            offset += chunk.byteLength;
        }

        return combined.buffer;
    }
}

/**
 * Render Request Pool
 * Manages concurrent render requests without blocking
 */
export class RenderRequestPool {
    constructor(maxConcurrent = 2) {
        this.maxConcurrent = maxConcurrent;
        this.active = 0;
        this.queue = [];
    }

    /**
     * Submit render request
     */
    async submit(renderTask) {
        return new Promise((resolve, reject) => {
            this.queue.push({ renderTask, resolve, reject });
            this.process();
        });
    }

    /**
     * Process queue
     */
    async process() {
        while (this.active < this.maxConcurrent && this.queue.length > 0) {
            const { renderTask, resolve, reject } = this.queue.shift();
            this.active++;

            try {
                const result = await renderTask();
                resolve(result);
            } catch (error) {
                reject(error);
            } finally {
                this.active--;
                this.process();
            }
        }
    }

    /**
     * Get queue length
     */
    getQueueLength() {
        return this.queue.length + this.active;
    }
}
