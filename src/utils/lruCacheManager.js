// src/utils/lruCacheManager.js
// Intelligent cache with memory limits and LRU eviction
// Prevents memory bloat when handling large PDFs

export class LRUCacheManager {
    constructor(options = {}) {
        // Memory limit in bytes (default 50MB)
        this.maxMemory = options.maxMemory || 50 * 1024 * 1024;
        
        // Max pages regardless of memory (prevents too many DOM nodes)
        this.maxPages = options.maxPages || 200;
        
        // Warning threshold (80% of limit)
        this.warningThreshold = this.maxMemory * 0.8;
        
        // Data structure: { pageNum -> { data, size, accessTime, accessCount } }
        this.cache = new Map();
        
        // Track memory usage
        this.currentMemory = 0;
        
        // Access history for LRU calculation
        this.accessLog = [];
        
        // Eviction callbacks
        this.onEvict = options.onEvict || (() => {});
        this.onWarning = options.onWarning || (() => {});
        
        // Statistics
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            peakMemory: 0
        };
    }

    /**
     * Get item from cache
     * Updates LRU tracking
     */
    get(pageNum) {
        if (this.cache.has(pageNum)) {
            const entry = this.cache.get(pageNum);
            
            // Update access tracking
            entry.accessTime = performance.now();
            entry.accessCount++;
            this.accessLog.push({ pageNum, time: entry.accessTime });
            
            // Keep log manageable (last 1000 accesses)
            if (this.accessLog.length > 1000) {
                this.accessLog = this.accessLog.slice(-500);
            }
            
            this.stats.hits++;
            return entry.data;
        }
        
        this.stats.misses++;
        return null;
    }

    /**
     * Add item to cache
     * Automatically evicts LRU items if memory exceeded
     */
    set(pageNum, data, estimatedSize = null) {
        // Calculate actual size if not provided
        const size = estimatedSize || this.estimateSize(data);
        
        // If item already cached, remove old one first
        if (this.cache.has(pageNum)) {
            this.currentMemory -= this.cache.get(pageNum).size;
        }

        // Add new entry
        this.cache.set(pageNum, {
            data,
            size,
            accessTime: performance.now(),
            accessCount: 0
        });
        
        this.currentMemory += size;
        this.stats.peakMemory = Math.max(this.stats.peakMemory, this.currentMemory);

        // Check if eviction needed
        this.evictIfNeeded();
        
        // Warn if approaching limit
        if (this.currentMemory > this.warningThreshold) {
            this.onWarning({
                currentMemory: this.currentMemory,
                maxMemory: this.maxMemory,
                percentage: (this.currentMemory / this.maxMemory * 100).toFixed(1)
            });
        }
    }

    /**
     * Check if eviction needed and perform it
     * Uses LRU algorithm: evicts least recently used pages
     */
    evictIfNeeded() {
        // Check memory limit
        if (this.currentMemory <= this.maxMemory && this.cache.size <= this.maxPages) {
            return; // No eviction needed
        }

        // Calculate how much space we need
        const targetMemory = this.maxMemory * 0.75; // Leave 25% headroom
        const targetPages = Math.floor(this.maxPages * 0.8);

        // Evict until within limits
        while ((this.currentMemory > targetMemory || this.cache.size > targetPages) && this.cache.size > 0) {
            this.evictOne();
        }
    }

    /**
     * Evict single least recently used page
     * Priority: least recently accessed, lowest access count, oldest
     */
    evictOne() {
        let victimPageNum = null;
        let victimScore = Infinity;

        // Score each page: lower score = evict first
        // Formula: 1 / (accessCount + 1) / (timeSinceAccess + 1)
        // This favors: old pages with few accesses
        for (const [pageNum, entry] of this.cache.entries()) {
            const timeSinceAccess = performance.now() - entry.accessTime;
            const score = 1 / (entry.accessCount + 1) * timeSinceAccess;

            if (score < victimScore) {
                victimScore = score;
                victimPageNum = pageNum;
            }
        }

        if (victimPageNum !== null) {
            const entry = this.cache.get(victimPageNum);
            this.currentMemory -= entry.size;
            this.cache.delete(victimPageNum);
            this.stats.evictions++;

            this.onEvict({
                pageNum: victimPageNum,
                size: entry.size,
                accessCount: entry.accessCount,
                currentMemory: this.currentMemory
            });
        }
    }

    /**
     * Check if page is cached
     */
    has(pageNum) {
        return this.cache.has(pageNum);
    }

    /**
     * AGGRESSIVE CLEAR: Remove all cached pages except adjacent ones
     * Used during fast page jumps to free memory instantly
     * Keeps targetPage ± keepRange pages only
     */
    aggressiveClear(targetPage, keepRange = 3) {
        const pagesToKeep = new Set();
        for (let i = targetPage - keepRange; i <= targetPage + keepRange; i++) {
            pagesToKeep.add(i);
        }

        const cachedPages = Array.from(this.cache.keys());
        let cleared = 0;
        let freedMemory = 0;

        for (const pageNum of cachedPages) {
            if (!pagesToKeep.has(pageNum)) {
                const entry = this.cache.get(pageNum);
                freedMemory += entry.size;
                this.cache.delete(pageNum);
                cleared++;
            }
        }

        this.currentMemory -= freedMemory;
        console.log(`[Cache] Aggressive clear: Removed ${cleared} pages, freed ${(freedMemory / 1024 / 1024).toFixed(1)}MB`);
        return { cleared, freedMemory };
    }

    /**
     * Clear entire cache
     */
    clear() {
        this.cache.clear();
        this.currentMemory = 0;
        this.accessLog = [];
    }

    /**
     * Remove specific page from cache
     */
    delete(pageNum) {
        if (this.cache.has(pageNum)) {
            const entry = this.cache.get(pageNum);
            this.currentMemory -= entry.size;
            this.cache.delete(pageNum);
            return true;
        }
        return false;
    }

    /**
     * Estimate data size (approximate)
     * Used for memory tracking
     */
    estimateSize(data) {
        if (!data) return 0;

        // For ImageData objects (common case)
        if (data instanceof ImageData) {
            return data.data.byteLength + 50; // data + overhead
        }

        // For regular objects
        if (typeof data === 'object') {
            try {
                // Use JSON stringification as rough estimate
                return JSON.stringify(data).length * 2; // Rough estimate
            } catch {
                return 1024 * 100; // Default 100KB estimate
            }
        }

        return 1024; // 1KB default
    }

    /**
     * Warm cache by preloading pages
     * Useful when user scrolls or jumps to new page
     */
    prewarm(pageNumbers) {
        // Just mark these as important in access log
        // Actual data loading handled separately
        pageNumbers.forEach(pageNum => {
            if (this.cache.has(pageNum)) {
                const entry = this.cache.get(pageNum);
                entry.accessTime = performance.now();
                entry.accessCount += 0.5; // Slight boost but not full access
            }
        });
    }

    /**
     * Get cache statistics and health
     */
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0
            ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
            : '0.00';

        return {
            pages: this.cache.size,
            maxPages: this.maxPages,
            memory: this.formatBytes(this.currentMemory),
            maxMemory: this.formatBytes(this.maxMemory),
            percentage: (this.currentMemory / this.maxMemory * 100).toFixed(1) + '%',
            peakMemory: this.formatBytes(this.stats.peakMemory),
            hits: this.stats.hits,
            misses: this.stats.misses,
            hitRate: hitRate + '%',
            evictions: this.stats.evictions,
            efficiency: this.calculateEfficiency()
        };
    }

    /**
     * Get list of cached pages
     * Sorted by access time (most recent first)
     */
    getCachedPages() {
        const pages = Array.from(this.cache.entries())
            .map(([pageNum, entry]) => ({
                pageNum,
                size: this.formatBytes(entry.size),
                accessCount: entry.accessCount,
                accessedAgo: this.formatTime(performance.now() - entry.accessTime)
            }))
            .sort((a, b) => b.accessCount - a.accessCount);

        return pages;
    }

    /**
     * Predict memory pressure
     * Returns pressure level: 'low', 'medium', 'high', 'critical'
     */
    getPressure() {
        const percentage = this.currentMemory / this.maxMemory;
        
        if (percentage < 0.5) return 'low';
        if (percentage < 0.75) return 'medium';
        if (percentage < 0.9) return 'high';
        return 'critical';
    }

    /**
     * Calculate cache efficiency
     * Higher = better (more hits, fewer evictions)
     */
    calculateEfficiency() {
        const total = this.stats.hits + this.stats.misses;
        if (total === 0) return 0;

        const hitRatio = this.stats.hits / total;
        const evictionPenalty = this.stats.evictions / Math.max(total, 1);

        return (hitRatio - evictionPenalty * 0.1).toFixed(2);
    }

    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Format time duration
     */
    formatTime(ms) {
        if (ms < 1000) return Math.round(ms) + 'ms';
        if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
        return (ms / 60000).toFixed(1) + 'm';
    }

    /**
     * Visualization for debugging
     */
    visualize() {
        const stats = this.getStats();
        const pressure = this.getPressure();
        const pressureBar = {
            low: '░░░░░░░░░░',
            medium: '▒▒▒░░░░░░░',
            high: '▓▓▓▓▓░░░░░',
            critical: '█████████░'
        }[pressure];

        const lines = [
            `\n${'='.repeat(60)}`,
            `LRU Cache Status`,
            `${'='.repeat(60)}`,
            `Memory: ${stats.memory} / ${stats.maxMemory} (${stats.percentage})`,
            `Pressure: [${pressureBar}] ${pressure.toUpperCase()}`,
            `Peak: ${stats.peakMemory}`,
            `Pages: ${stats.pages} / ${stats.maxPages}`,
            ``,
            `Performance:`,
            `  Cache Hits: ${stats.hits}`,
            `  Cache Misses: ${stats.misses}`,
            `  Hit Rate: ${stats.hitRate}`,
            `  Evictions: ${stats.evictions}`,
            `  Efficiency Score: ${stats.efficiency}`,
            `${'='.repeat(60)}\n`
        ];

        return lines.join('\n');
    }
}
