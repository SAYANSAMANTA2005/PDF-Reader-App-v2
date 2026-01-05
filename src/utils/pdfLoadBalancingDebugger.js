// src/utils/pdfLoadBalancingDebugger.js
// Comprehensive console logging for PDF load balancing and rendering operations
// Track virtualization, caching, scheduling, and performance metrics

export class PDFLoadBalancingDebugger {
    constructor(enabled = true) {
        this.enabled = enabled;
        this.startTime = Date.now();
        this.stats = {
            pageRendersStarted: 0,
            pageRendersCompleted: 0,
            pageRendersFailed: 0,
            cacheHits: 0,
            cacheMisses: 0,
            totalRenderTime: 0,
            totalMemoryUsed: 0,
        };
    }

    // ============================================
    // VIRTUALIZATION LOGGING
    // ============================================

    logVirtualizationStart(containerHeight, pageHeight) {
        if (!this.enabled) return;
        console.group(
            '%c⚙️  PDF VIRTUALIZATION INITIALIZED',
            'color: #667eea; font-weight: bold; font-size: 14px; background: #f0f0f0; padding: 4px 8px; border-radius: 3px'
        );
        console.log(`%cContainer Height:`, 'color: #764ba2; font-weight: bold', `${containerHeight}px`);
        console.log(`%cPage Height:`, 'color: #764ba2; font-weight: bold', `${pageHeight}px`);
        console.log(`%cPages per viewport:`, 'color: #764ba2; font-weight: bold', `~${Math.ceil(containerHeight / pageHeight)}`);
        console.groupEnd();
    }

    logVisiblePagesCalculated(visiblePages, scrollY, containerHeight) {
        if (!this.enabled) return;
        console.group(
            `%c📍 VISIBLE PAGES CALCULATED (${visiblePages.length} pages)`,
            'color: #00b8a0; font-weight: bold; font-size: 12px'
        );
        console.log(`%cPages: [${visiblePages.join(', ')}]`, 'color: #00b8a0; font-weight: bold');
        console.log(`%cScroll Position:`, 'color: #00b8a0', `${Math.round(scrollY)}px`);
        console.log(`%cMemory Saving:`, 'color: #00b8a0; font-style: italic', `Only rendering ${visiblePages.length} pages instead of all`);
        console.groupEnd();
    }

    logViewportChange(fromPage, toPage, scrollSpeed) {
        if (!this.enabled) return;
        console.log(
            `%c↔️  VIEWPORT CHANGED: Page ${fromPage} → ${toPage} | Speed: ${Math.round(scrollSpeed)}px/s`,
            'color: #ff9800; font-weight: bold'
        );
    }

    logViewportScroll(scrollY, isScrolling) {
        if (!this.enabled) return;
        const state = isScrolling ? '🔄 SCROLLING' : '✅ SCROLL STOPPED';
        console.log(
            `%c${state} | Y: ${Math.round(scrollY)}px`,
            `color: ${isScrolling ? '#843838ff' : '#51cf66'}; font-weight: bold`
        );
    }

    // ============================================
    // PAGE RENDERING LOGGING
    // ============================================

    logRenderStart(pageNumber, quality, priority) {
        if (!this.enabled) return;
        this.stats.pageRendersStarted++;
        const qualityIcon = quality === 'high' ? '🔷' : '⚡';
        console.log(
            `%c▶️  RENDER START - Page ${pageNumber} | ${qualityIcon} ${quality.toUpperCase()} | Priority: ${priority}`,
            'color: #667eea; font-weight: bold; background: #f0f0f0; padding: 2px 6px; border-radius: 2px'
        );
    }

    logRenderProgress(pageNumber, progress, status) {
        if (!this.enabled) return;
        const percentage = Math.round(progress * 100);
        console.log(
            `%c  ⏳ Page ${pageNumber}: ${percentage}% | ${status}`,
            'color: #667eea'
        );
    }

    logRenderComplete(pageNumber, renderTime, quality, memoryUsed) {
        if (!this.enabled) return;
        this.stats.pageRendersCompleted++;
        this.stats.totalRenderTime += renderTime;
        this.stats.totalMemoryUsed = memoryUsed;

        const qualityIcon = quality === 'high' ? '🔷' : '⚡';
        console.log(
            `%c✅ RENDER COMPLETE - Page ${pageNumber} | ${qualityIcon} ${quality.toUpperCase()} | ${renderTime}ms | Memory: ${(memoryUsed / 1024 / 1024).toFixed(2)}MB`,
            'color: #51cf66; font-weight: bold; background: #f0f0f0; padding: 2px 6px; border-radius: 2px'
        );
    }

    logRenderError(pageNumber, error) {
        if (!this.enabled) return;
        this.stats.pageRendersFailed++;
        console.error(
            `%c❌ RENDER FAILED - Page ${pageNumber}`,
            'color: #d32f2f; font-weight: bold; background: #ffebee; padding: 2px 6px; border-radius: 2px'
        );
        console.error(`%cError: ${error.message}`, 'color: #d32f2f');
    }

    logBatchRenderStart(pages) {
        if (!this.enabled) return;
        console.group(
            `%c📦 BATCH RENDER START (${pages.length} pages)`,
            'color: #9c27b0; font-weight: bold; font-size: 13px'
        );
        console.log(`%cPages: [${pages.join(', ')}]`, 'color: #9c27b0; font-weight: bold');
        console.groupEnd();
    }

    logBatchRenderComplete(pages, totalTime) {
        if (!this.enabled) return;
        console.log(
            `%c📦 BATCH RENDER COMPLETE (${pages.length} pages in ${totalTime}ms)`,
            'color: #9c27b0; font-weight: bold; background: #f3e5f5; padding: 2px 6px; border-radius: 2px'
        );
    }

    // ============================================
    // CACHE OPERATIONS LOGGING
    // ============================================

    logCacheHit(pageNumber, cachedData) {
        if (!this.enabled) return;
        this.stats.cacheHits++;
        const size = cachedData ? (cachedData.length || '?') : '?';
        console.log(
            `%c💾 CACHE HIT - Page ${pageNumber} | Size: ${size}`,
            'color: #4caf50; font-weight: bold'
        );
    }

    logCacheMiss(pageNumber) {
        if (!this.enabled) return;
        this.stats.cacheMisses++;
        console.log(
            `%c⚠️  CACHE MISS - Page ${pageNumber} | Re-rendering required`,
            'color: #ff9800; font-weight: bold'
        );
    }

    logCacheAdd(pageNumber, size, currentSize, maxSize) {
        if (!this.enabled) return;
        const isFull = currentSize >= maxSize;
        console.log(
            `%c🗄️  ADD TO CACHE - Page ${pageNumber} | Size: ${(size / 1024).toFixed(2)}KB | Cache: ${currentSize}/${maxSize}${isFull ? ' (FULL - EVICTING)' : ''}`,
            'color: #2196f3; font-weight: bold'
        );
    }

    logCacheEvict(pageNumber) {
        if (!this.enabled) return;
        console.log(
            `%c🗑️  CACHE EVICT - Page ${pageNumber} (LRU - Least Recently Used)`,
            'color: #f44336; font-weight: bold'
        );
    }

    logCacheClear() {
        if (!this.enabled) return;
        console.log(
            `%c🗑️  CACHE CLEARED - All pages removed from memory`,
            'color: #f44336; font-weight: bold; background: #ffebee; padding: 2px 6px; border-radius: 2px'
        );
    }

    logCacheStatus(cacheItems, cacheSize, maxSize, hitRate) {
        if (!this.enabled) return;
        const percentage = Math.round((cacheSize / maxSize) * 100);
        console.group(
            `%c📊 CACHE STATUS (${percentage}% full)`,
            'color: #2196f3; font-weight: bold; font-size: 13px'
        );
        console.log(`%cCached Pages:`, 'color: #2196f3; font-weight: bold', `[${cacheItems.join(', ')}]`);
        console.log(`%cCache Size:`, 'color: #2196f3', `${cacheSize}/${maxSize} pages`);
        console.log(`%cHit Rate:`, 'color: #2196f3', `${(hitRate * 100).toFixed(2)}%`);
        console.groupEnd();
    }

    // ============================================
    // QUALITY ADAPTATION LOGGING
    // ============================================

    logQualityChange(fromQuality, toQuality, reason, dpi) {
        if (!this.enabled) return;
        const icon = toQuality === 'high' ? '🔷' : '⚡';
        console.log(
            `%c${icon} QUALITY CHANGED: ${fromQuality.toUpperCase()} → ${toQuality.toUpperCase()} | DPI: ${dpi}x | Reason: ${reason}`,
            `color: ${toQuality === 'high' ? '#667eea' : '#ff9800'}; font-weight: bold; background: #f0f0f0; padding: 2px 6px; border-radius: 2px`
        );
    }

    logAdaptiveQualityStart(highDPI, lowDPI, refinementDelay) {
        if (!this.enabled) return;
        console.group(
            '%c⚙️  ADAPTIVE QUALITY INITIALIZED',
            'color: #667eea; font-weight: bold; font-size: 14px; background: #f0f0f0; padding: 4px 8px; border-radius: 3px'
        );
        console.log(`%cHigh Quality DPI:`, 'color: #667eea; font-weight: bold', `${highDPI}x`);
        console.log(`%cLow Quality DPI:`, 'color: #667eea; font-weight: bold', `${lowDPI}x`);
        console.log(`%cRefinement Delay:`, 'color: #667eea; font-weight: bold', `${refinementDelay}ms`);
        console.log(`%cStrategy:`, 'color: #667eea; font-style: italic', 'Fast rendering while scrolling, high quality when stopped');
        console.groupEnd();
    }

    // ============================================
    // SCHEDULER LOGGING
    // ============================================

    logSchedulerInit(maxConcurrent, useIdleCallback) {
        if (!this.enabled) return;
        console.group(
            '%c📋 RENDER SCHEDULER INITIALIZED',
            'color: #9c27b0; font-weight: bold; font-size: 14px; background: #f3e5f5; padding: 4px 8px; border-radius: 3px'
        );
        console.log(`%cMax Concurrent Renders:`, 'color: #9c27b0; font-weight: bold', maxConcurrent);
        console.log(`%cUse requestIdleCallback:`, 'color: #9c27b0; font-weight: bold', useIdleCallback ? 'YES ✅' : 'NO');
        console.log(`%cBenefit:`, 'color: #9c27b0; font-style: italic', 'Prevents UI thread blocking');
        console.groupEnd();
    }

    logPageQueuedForRender(pageNumber, priority, queueSize) {
        if (!this.enabled) return;
        console.log(
            `%c⏳ PAGE QUEUED - #${pageNumber} | Priority: ${priority} | Queue Size: ${queueSize}`,
            'color: #ff9800; font-weight: bold'
        );
    }

    logProcessQueue(activeRenders, queuedPages, maxConcurrent) {
        if (!this.enabled) return;
        const canRender = activeRenders < maxConcurrent;
        const status = canRender ? '▶️  PROCESSING' : '⏸️  WAITING';
        console.log(
            `%c${status} - Active: ${activeRenders}/${maxConcurrent} | Queued: ${queuedPages}`,
            'color: #2196f3; font-weight: bold'
        );
    }

    logSchedulerStats(queueSize, activeRenders, completedPages, failedPages) {
        if (!this.enabled) return;
        console.group(
            `%c📊 SCHEDULER STATS`,
            'color: #9c27b0; font-weight: bold; font-size: 13px'
        );
        console.log(`%cQueued Pages:`, 'color: #9c27b0', queueSize);
        console.log(`%cActive Renders:`, 'color: #9c27b0', activeRenders);
        console.log(`%cCompleted:`, 'color: #51cf66', completedPages);
        console.log(`%cFailed:`, 'color: #f44336', failedPages);
        console.groupEnd();
    }

    // ============================================
    // INCREMENTAL LOADING LOGGING
    // ============================================

    logIncrementalLoadStart(totalSize, chunkSize) {
        if (!this.enabled) return;
        const chunks = Math.ceil(totalSize / chunkSize);
        console.group(
            `%c📥 INCREMENTAL PDF LOADING START`,
            'color: #2196f3; font-weight: bold; font-size: 14px; background: #e3f2fd; padding: 4px 8px; border-radius: 3px'
        );
        console.log(`%cTotal Size:`, 'color: #2196f3; font-weight: bold', `${(totalSize / 1024 / 1024).toFixed(2)}MB`);
        console.log(`%cChunk Size:`, 'color: #2196f3; font-weight: bold', `${(chunkSize / 1024).toFixed(2)}KB`);
        console.log(`%cTotal Chunks:`, 'color: #2196f3; font-weight: bold', chunks);
        console.log(`%cBenefit:`, 'color: #2196f3; font-style: italic', 'Progressive loading, faster initial display');
        console.groupEnd();
    }

    logChunkLoaded(chunkIndex, totalChunks, loadTime) {
        if (!this.enabled) return;
        const percentage = Math.round((chunkIndex / totalChunks) * 100);
        console.log(
            `%c📦 CHUNK LOADED (${chunkIndex}/${totalChunks}) ${percentage}% | ${loadTime}ms`,
            'color: #2196f3; font-weight: bold'
        );
    }

    logIncrementalLoadComplete(totalLoadTime) {
        if (!this.enabled) return;
        console.log(
            `%c✅ INCREMENTAL LOAD COMPLETE | Total Time: ${totalLoadTime}ms`,
            'color: #51cf66; font-weight: bold; background: #e8f5e9; padding: 2px 6px; border-radius: 2px'
        );
    }

    // ============================================
    // PERFORMANCE METRICS LOGGING
    // ============================================

    logPerformanceMetrics(avgRenderTime, memoryUsage, framesPerSecond) {
        if (!this.enabled) return;
        const fpsStatus = framesPerSecond >= 50 ? '✅ GOOD' : '⚠️  WATCH';
        console.group(
            `%c📊 PERFORMANCE METRICS`,
            'color: #00bcd4; font-weight: bold; font-size: 13px'
        );
        console.log(`%cAvg Render Time:`, 'color: #00bcd4; font-weight: bold', `${avgRenderTime.toFixed(2)}ms`);
        console.log(`%cMemory Usage:`, 'color: #00bcd4; font-weight: bold', `${(memoryUsage / 1024 / 1024).toFixed(2)}MB`);
        console.log(`%cFPS:`, 'color: #00bcd4; font-weight: bold', `${framesPerSecond.toFixed(0)} FPS ${fpsStatus}`);
        console.groupEnd();
    }

    logMemoryWarning(memoryUsage, maxMemory, percentUsed) {
        if (!this.enabled) return;
        const level = percentUsed > 90 ? '🔴 CRITICAL' : percentUsed > 75 ? '🟠 HIGH' : '🟡 MEDIUM';
        console.warn(
            `%c${level} MEMORY USAGE - ${(memoryUsage / 1024 / 1024).toFixed(2)}MB / ${(maxMemory / 1024 / 1024).toFixed(2)}MB (${percentUsed.toFixed(0)}%)`,
            'color: #f44336; font-weight: bold; background: #ffebee; padding: 2px 6px; border-radius: 2px'
        );
    }

    // ============================================
    // OVERALL STATISTICS
    // ============================================

    logOverallStats() {
        if (!this.enabled) return;
        const hitRate = this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) || 0;
        const avgRenderTime = this.stats.totalRenderTime / this.stats.pageRendersCompleted || 0;

        console.group(
            `%c📈 OVERALL STATISTICS`,
            'color: #4caf50; font-weight: bold; font-size: 14px; background: #e8f5e9; padding: 4px 8px; border-radius: 3px'
        );
        console.log(`%cTotal Renders Started:`, 'color: #4caf50; font-weight: bold', this.stats.pageRendersStarted);
        console.log(`%cTotal Renders Completed:`, 'color: #51cf66; font-weight: bold', this.stats.pageRendersCompleted);
        console.log(`%cTotal Renders Failed:`, 'color: #f44336; font-weight: bold', this.stats.pageRendersFailed);
        console.log(`%cCache Hit Rate:`, 'color: #2196f3; font-weight: bold', `${(hitRate * 100).toFixed(2)}%`);
        console.log(`%cAverage Render Time:`, 'color: #ff9800; font-weight: bold', `${avgRenderTime.toFixed(2)}ms`);
        console.log(`%cTotal Memory Used:`, 'color: #9c27b0; font-weight: bold', `${(this.stats.totalMemoryUsed / 1024 / 1024).toFixed(2)}MB`);
        console.log(`%cUptime:`, 'color: #00bcd4; font-weight: bold', `${Math.round((Date.now() - this.startTime) / 1000)}s`);
        console.groupEnd();
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    logSeparator() {
        if (!this.enabled) return;
        console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #999');
    }

    enable() {
        this.enabled = true;
        console.log('%c✅ PDF Load Balancing Debugger ENABLED', 'color: #4caf50; font-weight: bold; background: #e8f5e9; padding: 4px 8px; border-radius: 3px');
    }

    disable() {
        this.enabled = false;
        console.log('%c❌ PDF Load Balancing Debugger DISABLED', 'color: #f44336; font-weight: bold; background: #ffebee; padding: 4px 8px; border-radius: 3px');
    }

    toggle() {
        this.enabled ? this.disable() : this.enable();
    }

    resetStats() {
        this.stats = {
            pageRendersStarted: 0,
            pageRendersCompleted: 0,
            pageRendersFailed: 0,
            cacheHits: 0,
            cacheMisses: 0,
            totalRenderTime: 0,
            totalMemoryUsed: 0,
        };
        console.log('%c🔄 Statistics Reset', 'color: #2196f3; font-weight: bold');
    }
}

// Create global debugger instance for easy access
if (typeof window !== 'undefined') {
    window.pdfDebugger = new PDFLoadBalancingDebugger(true);
    
    // Helpful commands for console
    console.log(
        `%c
🎯 PDF Load Balancing Debugger Ready!

Available Commands:
  window.pdfDebugger.enable()          - Enable logging
  window.pdfDebugger.disable()         - Disable logging
  window.pdfDebugger.toggle()          - Toggle logging
  window.pdfDebugger.resetStats()      - Reset statistics
  window.pdfDebugger.logOverallStats() - Show overall stats
        `,
        'color: #667eea; font-weight: bold; background: #f0f0f0; padding: 12px; border-radius: 4px; font-family: monospace'
    );
}

export default PDFLoadBalancingDebugger;
