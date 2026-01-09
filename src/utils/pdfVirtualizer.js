// src/utils/pdfVirtualizer.js
// Virtual scroller for PDF pages - Only renders visible pages
// Prevents freezing on large PDFs (400+ pages)

/**
 * PDF Virtualizer
 * Manages which pages are visible and should be rendered
 */
export class PDFVirtualizer {
    constructor(options = {}) {
        this.options = {
            pageHeight: options.pageHeight || 1000, // pixels
            bufferPages: options.bufferPages || 6, // Increased for aggressive preloading
            containerHeight: options.containerHeight || 800, // Viewport height

        };

        this.scrollY = 0;
        this.containerHeight = this.options.containerHeight;
        this.visiblePages = [];
    }

    /**
     * Calculate which pages (or row indices) are visible
     * Returns array of indices [start, end]
     */
    getVisiblePages(scrollY, containerHeight, isTwoPageMode = false) {
        this.scrollY = scrollY;
        this.containerHeight = containerHeight;

        // Current visible page (or row) range
        const startIdx = Math.max(
            0,
            Math.floor(scrollY / this.options.pageHeight) - this.options.bufferPages
        );

        const endIdx = Math.max(startIdx,
            Math.ceil((scrollY + containerHeight) / this.options.pageHeight) + this.options.bufferPages
        );

        this.visiblePages = Array.from(
            { length: endIdx - startIdx + 1 },
            (_, i) => startIdx + i
        );

        return this.visiblePages;
    }

    /**
     * Check if index should be rendered
     */
    shouldRenderIndex(index) {
        return this.visiblePages.includes(index);
    }

    /**
     * Get Y position of page
     */
    getPagePosition(pageNumber) {
        return pageNumber * this.options.pageHeight;
    }

    /**
     * Get page number from Y position
     */
    getPageFromPosition(scrollY) {
        return Math.floor(scrollY / this.options.pageHeight);
    }
}

/**
 * LRU Page Cache - Keeps only recent pages in memory
 */
export class LRUPageCache {
    constructor(maxSize = 30) {

        this.maxSize = maxSize;
        this.cache = new Map(); // page -> { data, timestamp }
        this.accessOrder = []; // Track access order for LRU
    }

    /**
     * Get page from cache
     */
    get(pageNumber) {
        if (!this.cache.has(pageNumber)) {
            return null;
        }

        // Move to end (most recently used)
        this.accessOrder = this.accessOrder.filter(p => p !== pageNumber);
        this.accessOrder.push(pageNumber);

        const entry = this.cache.get(pageNumber);
        entry.timestamp = Date.now();
        return entry.data;
    }

    /**
     * Set page in cache
     */
    set(pageNumber, data) {
        // Remove if exists
        if (this.cache.has(pageNumber)) {
            this.accessOrder = this.accessOrder.filter(p => p !== pageNumber);
        }

        // Add new entry
        this.cache.set(pageNumber, {
            data,
            timestamp: Date.now(),
        });
        this.accessOrder.push(pageNumber);

        // Evict oldest if over capacity
        while (this.cache.size > this.maxSize) {
            const oldest = this.accessOrder.shift();
            this.cache.delete(oldest);
        }
    }

    /**
     * Clear cache
     */
    clear() {
        this.cache.clear();
        this.accessOrder = [];
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            items: Array.from(this.cache.keys()),
        };
    }
}

/**
 * Viewport Manager - Tracks scroll position and visible area
 */
export class ViewportManager {
    constructor(containerElement, options = {}) {
        this.container = containerElement;
        this.scrollY = 0;
        this.containerHeight = containerElement?.clientHeight || 800;
        this.totalHeight = 0;

        this.options = {
            onScroll: options.onScroll || (() => { }),
            debounceMs: options.debounceMs || 100,
        };

        this.scrollTimeout = null;
        this.isScrolling = false;

        this.setupListeners();
    }

    /**
     * Setup scroll listener with debounce
     */
    setupListeners() {
        if (!this.container) return;

        this.container.addEventListener('scroll', (e) => {
            this.scrollY = e.target.scrollTop;
            this.isScrolling = true;

            // Clear existing timeout
            if (this.scrollTimeout) {
                clearTimeout(this.scrollTimeout);
            }

            // Debounce scroll callback
            this.scrollTimeout = setTimeout(() => {
                this.isScrolling = false;
                this.options.onScroll({
                    scrollY: this.scrollY,
                    containerHeight: this.containerHeight,
                    totalHeight: this.totalHeight,
                    isScrolling: false,
                });
            }, this.options.debounceMs);

            // Immediate notification with isScrolling flag
            this.options.onScroll({
                scrollY: this.scrollY,
                containerHeight: this.containerHeight,
                totalHeight: this.totalHeight,
                isScrolling: true,
            });
        });
    }

    /**
     * Update container height
     */
    updateContainerHeight(height) {
        this.containerHeight = height;
    }

    /**
     * Update total content height
     */
    updateTotalHeight(height) {
        this.totalHeight = height;
    }

    /**
     * Get current scroll progress (0-100%)
     */
    getScrollProgress() {
        if (this.totalHeight === 0) return 0;
        return Math.min(100, (this.scrollY / (this.totalHeight - this.containerHeight)) * 100);
    }

    /**
     * Scroll to page
     */
    scrollToPage(pageNumber, pageHeight) {
        if (!this.container) return;
        this.container.scrollTop = pageNumber * pageHeight;
    }

    /**
     * Get viewport bounds
     */
    getViewportBounds() {
        return {
            top: this.scrollY,
            bottom: this.scrollY + this.containerHeight,
            height: this.containerHeight,
        };
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }
    }
}

/**
 * Adaptive Quality Renderer
 * Reduces DPI while scrolling, refines when stopped
 */
export class AdaptiveQualityRenderer {
    constructor(options = {}) {
        this.options = {
            highQualityDPI: options.highQualityDPI || 2, // 2x zoom
            lowQualityDPI: options.lowQualityDPI || 1, // 1x zoom
            refinementDelayMs: options.refinementDelayMs || 500,
        };

        this.currentDPI = this.options.highQualityDPI;
        this.isScrolling = false;
        this.refinementTimeout = null;
    }

    /**
     * Update quality based on scroll state
     */
    updateQuality(isScrolling) {
        this.isScrolling = isScrolling;

        // Clear existing refinement timeout
        if (this.refinementTimeout) {
            clearTimeout(this.refinementTimeout);
        }

        if (isScrolling) {
            // Reduce quality while scrolling
            this.currentDPI = this.options.lowQualityDPI;
        } else {
            // Schedule refinement to high quality
            this.refinementTimeout = setTimeout(() => {
                this.currentDPI = this.options.highQualityDPI;
            }, this.options.refinementDelayMs);
        }
    }

    /**
     * Get current DPI
     */
    getDPI() {
        return this.currentDPI;
    }

    /**
     * Get scale factor
     */
    getScale() {
        return this.currentDPI / this.options.highQualityDPI;
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.refinementTimeout) {
            clearTimeout(this.refinementTimeout);
        }
    }
}

/**
 * Page Renderer Options Builder
 */
export class PageRenderOptions {
    constructor(pageNumber, options = {}) {
        this.pageNumber = pageNumber;
        this.dpi = options.dpi || 2;
        this.scale = options.scale || 1;
        this.quality = options.quality || 'medium';
        this.renderTextLayer = options.renderTextLayer !== false;
        this.renderAnnotations = options.renderAnnotations !== false;
    }

    /**
     * Reduce quality
     */
    static lowQuality(pageNumber) {
        return new PageRenderOptions(pageNumber, {
            dpi: 1,
            scale: 0.75,
            quality: 'low',
            renderTextLayer: false,
        });
    }

    /**
     * High quality
     */
    static highQuality(pageNumber) {
        return new PageRenderOptions(pageNumber, {
            dpi: 2,
            scale: 1,
            quality: 'high',
            renderTextLayer: true,
        });
    }

    /**
     * Get as object
     */
    toObject() {
        return {
            pageNumber: this.pageNumber,
            dpi: this.dpi,
            scale: this.scale,
            quality: this.quality,
            renderTextLayer: this.renderTextLayer,
            renderAnnotations: this.renderAnnotations,
        };
    }
}

/**
 * Performance Monitor
 */
export class PerformanceMonitor {
    constructor() {
        this.metrics = {
            renderTime: [],
            memoryUsage: [],
            fps: [],
        };
        this.maxMetrics = 50;
    }

    /**
     * Record render time
     */
    recordRenderTime(ms) {
        this.metrics.renderTime.push(ms);
        if (this.metrics.renderTime.length > this.maxMetrics) {
            this.metrics.renderTime.shift();
        }
    }

    /**
     * Record memory usage
     */
    recordMemoryUsage() {
        if (performance.memory) {
            const used = performance.memory.usedJSHeapSize / 1048576; // MB
            this.metrics.memoryUsage.push(used);
            if (this.metrics.memoryUsage.length > this.maxMetrics) {
                this.metrics.memoryUsage.shift();
            }
        }
    }

    /**
     * Get average render time
     */
    getAverageRenderTime() {
        if (this.metrics.renderTime.length === 0) return 0;
        const sum = this.metrics.renderTime.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.metrics.renderTime.length);
    }

    /**
     * Get average memory usage
     */
    getAverageMemoryUsage() {
        if (this.metrics.memoryUsage.length === 0) return 0;
        const sum = this.metrics.memoryUsage.reduce((a, b) => a + b, 0);
        return (sum / this.metrics.memoryUsage.length).toFixed(2);
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            averageRenderTime: this.getAverageRenderTime() + 'ms',
            averageMemoryUsage: this.getAverageMemoryUsage() + ' MB',
            totalRenders: this.metrics.renderTime.length,
        };
    }

    /**
     * Reset metrics
     */
    reset() {
        this.metrics = {
            renderTime: [],
            memoryUsage: [],
            fps: [],
        };
    }
}
