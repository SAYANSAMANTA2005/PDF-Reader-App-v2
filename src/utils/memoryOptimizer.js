// src/utils/memoryOptimizer.js
// Memory optimization utilities for large PDFs
import { useEffect } from 'react';

export class MemoryOptimizer {
    constructor() {
        this.pageCache = new Map(); // { pageNum: pageData }
        this.maxCacheSize = 10; // Max pages to keep in memory
        this.metrics = {
            pagesCached: 0,
            pagesFreed: 0,
            memoryFreedMB: 0
        };
    }

    /**
     * Cache page data with LRU eviction
     * When cache exceeds maxCacheSize, evicts least recently used
     */
    cachePage(pageNum, pageData) {
        if (this.pageCache.has(pageNum)) {
            // Move to end (most recently used)
            const data = this.pageCache.get(pageNum);
            this.pageCache.delete(pageNum);
            this.pageCache.set(pageNum, data);
            return;
        }

        // Add new page
        this.pageCache.set(pageNum, pageData);
        this.metrics.pagesCached++;

        // Evict LRU if cache exceeds size
        if (this.pageCache.size > this.maxCacheSize) {
            const lruKey = this.pageCache.keys().next().value;
            this.evictPage(lruKey);
        }
    }

    /**
     * Evict page from cache and cleanup resources
     */
    evictPage(pageNum) {
        const pageData = this.pageCache.get(pageNum);
        if (pageData) {
            // Cleanup page resources
            if (typeof pageData.cleanup === 'function') {
                pageData.cleanup();
            }
            this.pageCache.delete(pageNum);
            this.metrics.pagesFreed++;
        }
    }

    /**
     * Clear all pages except visible range
     * Aggressive cleanup for large PDFs
     */
    clearOutsideRange(visibleStart, visibleEnd, margin = 5) {
        const clearStart = visibleStart - margin;
        const clearEnd = visibleEnd + margin;

        for (const pageNum of this.pageCache.keys()) {
            if (pageNum < clearStart || pageNum > clearEnd) {
                this.evictPage(pageNum);
            }
        }
    }

    /**
     * Cleanup all cached pages
     */
    clearAll() {
        const sizeBefore = this.pageCache.size;
        for (const pageNum of this.pageCache.keys()) {
            this.evictPage(pageNum);
        }
        console.log(`🧹 Memory: Cleared ${sizeBefore} cached pages`);
    }

    /**
     * Get memory usage estimate in MB
     */
    getMemoryUsage() {
        if (performance.memory) {
            return {
                usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2),
                totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2),
                jsHeapSizeLimit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2),
                cachedPages: this.pageCache.size
            };
        }
        return { error: 'Memory API not available' };
    }

    /**
     * Aggressive garbage collection trigger
     * Forces browser to collect garbage
     */
    forceGarbageCollection() {
        // Clear caches and request garbage collection
        if (window.gc) {
            window.gc();
        } else {
            console.warn('⚠️ Garbage collection not available. Run Chrome with --js-flags=\"--expose-gc\"');
        }
    }

    /**
     * Monitor and log memory periodically
     */
    startMonitoring(intervalMs = 5000) {
        this.monitoringInterval = setInterval(() => {
            const memory = this.getMemoryUsage();
            console.log('📊 Memory Status:', memory);
        }, intervalMs);
    }

    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
    }

    /**
     * Get optimization recommendations
     */
    getOptimizationStatus() {
        const memory = this.getMemoryUsage();
        if (memory.error) return 'Memory API unavailable';

        const used = parseFloat(memory.usedJSHeapSize);
        const limit = parseFloat(memory.jsHeapSizeLimit);
        const usage = (used / limit) * 100;

        return {
            heapUsagePercent: usage.toFixed(2),
            status: usage > 80 ? '🔴 CRITICAL' : usage > 60 ? '🟡 HIGH' : '🟢 NORMAL',
            cachedPages: this.pageCache.size,
            recommendation: usage > 80 ? 'Clear cache immediately' : 'Normal operation'
        };
    }
}

// Singleton instance
export const memoryOptimizer = new MemoryOptimizer();

/**
 * React Hook for memory optimization
 */
export const useMemoryOptimizer = () => {
    useEffect(() => {
        // Start monitoring on mount
        memoryOptimizer.startMonitoring(10000); // Every 10 seconds

        return () => {
            // Stop monitoring on unmount
            memoryOptimizer.stopMonitoring();
        };
    }, []);

    return {
        clearCache: () => memoryOptimizer.clearAll(),
        getStatus: () => memoryOptimizer.getOptimizationStatus(),
        getMemory: () => memoryOptimizer.getMemoryUsage()
    };
};

// Utility to cleanup on page visibility change
export const setupPageVisibilityCleanup = (onHidden) => {
    const handleVisibilityChange = () => {
        if (document.hidden) {
            console.log('📱 Page hidden - clearing memory caches');
            memoryOptimizer.clearAll();
            if (onHidden) onHidden();
        }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
};
