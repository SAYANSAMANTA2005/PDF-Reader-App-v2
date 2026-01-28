# 📊 PDF Load Balancing Debugger - Console Logging Guide

## Overview

The `PDFLoadBalancingDebugger` provides comprehensive console logging for all heavy PDF operations:
- Virtualization & visible page calculations
- Page rendering lifecycle (start, progress, complete, error)
- Cache operations (hit, miss, evict, status)
- Quality adaptation (scrolling vs stopped)
- Render scheduling & queue management
- Incremental PDF loading & chunking
- Performance metrics & memory usage

---

## 🚀 Quick Start

### Enable Debugging in Your App

```javascript
import PDFLoadBalancingDebugger from './utils/pdfLoadBalancingDebugger';

// Create debugger instance (enabled by default)
const debugger = new PDFLoadBalancingDebugger(true);

// Use in your components
debugger.logVirtualizationStart(800, 1200);
debugger.logVisiblePagesCalculated([5, 6, 7, 8, 9], 4800, 800);
debugger.logRenderStart(6, 'high', 100);
debugger.logRenderComplete(6, 45, 'high', 2500000);
```

### Browser Console Commands

Once enabled, use these commands in your browser's DevTools console:

```javascript
// Toggle logging on/off
window.pdfDebugger.enable()           // Turn on
window.pdfDebugger.disable()          // Turn off
window.pdfDebugger.toggle()           // Switch state

// View statistics
window.pdfDebugger.logOverallStats()  // Show comprehensive stats
window.pdfDebugger.resetStats()       // Reset counters
```

---

## 📋 Logging Methods by Category

### 1. VIRTUALIZATION LOGGING

#### `logVirtualizationStart(containerHeight, pageHeight)`
Logs when virtualization system initializes.

```javascript
debugger.logVirtualizationStart(800, 1200);
// Output:
// ⚙️ PDF VIRTUALIZATION INITIALIZED
// Container Height: 800px
// Page Height: 1200px
// Pages per viewport: ~1
```

#### `logVisiblePagesCalculated(visiblePages, scrollY, containerHeight)`
Logs when visible pages are recalculated during scroll.

```javascript
debugger.logVisiblePagesCalculated([5, 6, 7, 8, 9], 4800, 800);
// Output:
// 📍 VISIBLE PAGES CALCULATED (5 pages)
// Pages: [5, 6, 7, 8, 9]
// Scroll Position: 4800px
// Memory Saving: Only rendering 5 pages instead of all
```

#### `logViewportChange(fromPage, toPage, scrollSpeed)`
Logs when viewport moves to a different page range.

```javascript
debugger.logViewportChange(1, 10, 150);
// Output: ↔️ VIEWPORT CHANGED: Page 1 → 10 | Speed: 150px/s
```

#### `logViewportScroll(scrollY, isScrolling)`
Logs ongoing scroll events.

```javascript
debugger.logViewportScroll(4800, true);
// Output: 🔄 SCROLLING | Y: 4800px
```

---

### 2. PAGE RENDERING LOGGING

#### `logRenderStart(pageNumber, quality, priority)`
Called when page rendering begins.

```javascript
debugger.logRenderStart(6, 'high', 100);
// Output: ▶️ RENDER START - Page 6 | 🔷 HIGH | Priority: 100
```

#### `logRenderProgress(pageNumber, progress, status)`
Called during rendering to show progress.

```javascript
debugger.logRenderProgress(6, 0.75, 'Drawing canvas content');
// Output: ⏳ Page 6: 75% | Drawing canvas content
```

#### `logRenderComplete(pageNumber, renderTime, quality, memoryUsed)`
Called when page rendering finishes successfully.

```javascript
debugger.logRenderComplete(6, 45, 'high', 2500000);
// Output: ✅ RENDER COMPLETE - Page 6 | 🔷 HIGH | 45ms | Memory: 2.38MB
```

#### `logRenderError(pageNumber, error)`
Called when page rendering fails.

```javascript
debugger.logRenderError(7, new Error('Canvas rendering failed'));
// Output: 
// ❌ RENDER FAILED - Page 7
// Error: Canvas rendering failed
```

#### `logBatchRenderStart(pages)`
Called when batch rendering starts.

```javascript
debugger.logBatchRenderStart([5, 6, 7, 8, 9]);
// Output:
// 📦 BATCH RENDER START (5 pages)
// Pages: [5, 6, 7, 8, 9]
```

#### `logBatchRenderComplete(pages, totalTime)`
Called when batch rendering completes.

```javascript
debugger.logBatchRenderComplete([5, 6, 7, 8, 9], 225);
// Output: 📦 BATCH RENDER COMPLETE (5 pages in 225ms)
```

---

### 3. CACHE OPERATIONS LOGGING

#### `logCacheHit(pageNumber, cachedData)`
Called when page found in cache (no need to re-render).

```javascript
debugger.logCacheHit(5, cachedImageData);
// Output: 💾 CACHE HIT - Page 5 | Size: 2500000
```

**Speed Benefit:** 10-50x faster than rendering! ⚡

#### `logCacheMiss(pageNumber)`
Called when page not in cache (must render).

```javascript
debugger.logCacheMiss(10);
// Output: ⚠️ CACHE MISS - Page 10 | Re-rendering required
```

#### `logCacheAdd(pageNumber, size, currentSize, maxSize)`
Called when page added to cache.

```javascript
debugger.logCacheAdd(6, 2500000, 10, 15);
// Output: 🗄️ ADD TO CACHE - Page 6 | Size: 2441.41KB | Cache: 10/15
```

#### `logCacheEvict(pageNumber)`
Called when page removed from cache (LRU).

```javascript
debugger.logCacheEvict(2);
// Output: 🗑️ CACHE EVICT - Page 2 (LRU - Least Recently Used)
```

#### `logCacheClear()`
Called when entire cache cleared.

```javascript
debugger.logCacheClear();
// Output: 🗑️ CACHE CLEARED - All pages removed from memory
```

#### `logCacheStatus(cacheItems, cacheSize, maxSize, hitRate)`
Shows current cache state.

```javascript
debugger.logCacheStatus([5, 6, 7, 8, 9, 10], 6, 15, 0.85);
// Output:
// 📊 CACHE STATUS (40% full)
// Cached Pages: [5, 6, 7, 8, 9, 10]
// Cache Size: 6/15 pages
// Hit Rate: 85.00%
```

---

### 4. QUALITY ADAPTATION LOGGING

#### `logAdaptiveQualityStart(highDPI, lowDPI, refinementDelay)`
Called when adaptive quality system initializes.

```javascript
debugger.logAdaptiveQualityStart(2, 1, 500);
// Output:
// ⚙️ ADAPTIVE QUALITY INITIALIZED
// High Quality DPI: 2x
// Low Quality DPI: 1x
// Refinement Delay: 500ms
// Strategy: Fast rendering while scrolling, high quality when stopped
```

#### `logQualityChange(fromQuality, toQuality, reason, dpi)`
Called when quality mode changes.

```javascript
debugger.logQualityChange('low', 'high', 'Scroll stopped', 2);
// Output: 🔷 QUALITY CHANGED: LOW → HIGH | DPI: 2x | Reason: Scroll stopped

debugger.logQualityChange('high', 'low', 'User scrolling', 1);
// Output: ⚡ QUALITY CHANGED: HIGH → LOW | DPI: 1x | Reason: User scrolling
```

---

### 5. SCHEDULER LOGGING

#### `logSchedulerInit(maxConcurrent, useIdleCallback)`
Called when render scheduler initializes.

```javascript
debugger.logSchedulerInit(2, true);
// Output:
// 📋 RENDER SCHEDULER INITIALIZED
// Max Concurrent Renders: 2
// Use requestIdleCallback: YES ✅
// Benefit: Prevents UI thread blocking
```

#### `logPageQueuedForRender(pageNumber, priority, queueSize)`
Called when page added to render queue.

```javascript
debugger.logPageQueuedForRender(6, 100, 3);
// Output: ⏳ PAGE QUEUED - #6 | Priority: 100 | Queue Size: 3
```

#### `logProcessQueue(activeRenders, queuedPages, maxConcurrent)`
Called when processing render queue.

```javascript
debugger.logProcessQueue(2, 3, 2);
// Output: ⏸️ WAITING - Active: 2/2 | Queued: 3

debugger.logProcessQueue(1, 2, 2);
// Output: ▶️ PROCESSING - Active: 1/2 | Queued: 2
```

#### `logSchedulerStats(queueSize, activeRenders, completedPages, failedPages)`
Shows scheduler statistics.

```javascript
debugger.logSchedulerStats(5, 2, 42, 1);
// Output:
// 📊 SCHEDULER STATS
// Queued Pages: 5
// Active Renders: 2
// Completed: 42
// Failed: 1
```

---

### 6. INCREMENTAL LOADING LOGGING

#### `logIncrementalLoadStart(totalSize, chunkSize)`
Called when PDF starts loading incrementally.

```javascript
debugger.logIncrementalLoadStart(15000000, 1048576); // 15MB, 1MB chunks
// Output:
// 📥 INCREMENTAL PDF LOADING START
// Total Size: 14.31MB
// Chunk Size: 1024.00KB
// Total Chunks: 15
// Benefit: Progressive loading, faster initial display
```

#### `logChunkLoaded(chunkIndex, totalChunks, loadTime)`
Called when each chunk loads.

```javascript
debugger.logChunkLoaded(3, 15, 250);
// Output: 📦 CHUNK LOADED (3/15) 20% | 250ms
```

#### `logIncrementalLoadComplete(totalLoadTime)`
Called when all chunks loaded.

```javascript
debugger.logIncrementalLoadComplete(3750);
// Output: ✅ INCREMENTAL LOAD COMPLETE | Total Time: 3750ms
```

---

### 7. PERFORMANCE METRICS LOGGING

#### `logPerformanceMetrics(avgRenderTime, memoryUsage, framesPerSecond)`
Shows real-time performance stats.

```javascript
debugger.logPerformanceMetrics(45.5, 125000000, 58);
// Output:
// 📊 PERFORMANCE METRICS
// Avg Render Time: 45.50ms
// Memory Usage: 119.21MB
// FPS: 58 FPS ✅ GOOD
```

#### `logMemoryWarning(memoryUsage, maxMemory, percentUsed)`
Warns when memory usage is high.

```javascript
debugger.logMemoryWarning(450000000, 500000000, 90);
// Output: 🟠 HIGH MEMORY USAGE - 429.20MB / 476.84MB (90%)

debugger.logMemoryWarning(480000000, 500000000, 96);
// Output: 🔴 CRITICAL MEMORY USAGE - 457.76MB / 476.84MB (96%)
```

---

### 8. OVERALL STATISTICS

#### `logOverallStats()`
Shows comprehensive statistics from session start.

```javascript
window.pdfDebugger.logOverallStats();
// Output:
// 📈 OVERALL STATISTICS
// Total Renders Started: 156
// Total Renders Completed: 154
// Total Renders Failed: 2
// Cache Hit Rate: 87.34%
// Average Render Time: 47.23ms
// Total Memory Used: 625.50MB
// Uptime: 156s
```

---

## 🎯 Integration Examples

### Example 1: Add Logging to PDFVirtualizer

```javascript
import PDFLoadBalancingDebugger from './utils/pdfLoadBalancingDebugger';

export class PDFVirtualizer {
    constructor(options = {}) {
        this.debugger = new PDFLoadBalancingDebugger();
        this.debugger.logVirtualizationStart(options.containerHeight, options.pageHeight);
        // ... rest of constructor
    }

    getVisiblePages(scrollY, containerHeight) {
        // ... calculate visible pages
        this.debugger.logVisiblePagesCalculated(this.visiblePages, scrollY, containerHeight);
        return this.visiblePages;
    }
}
```

### Example 2: Add Logging to Page Renderer

```javascript
async function renderPage(pageNumber) {
    debugger.logRenderStart(pageNumber, 'high', 100);
    const startTime = performance.now();

    try {
        // Render logic
        const canvas = await page.render({ canvasContext: ctx }).promise;
        
        const renderTime = performance.now() - startTime;
        debugger.logRenderComplete(pageNumber, renderTime, 'high', getMemoryUsage());
    } catch (error) {
        debugger.logRenderError(pageNumber, error);
    }
}
```

### Example 3: Add Logging to Cache

```javascript
class LRUPageCache {
    get(pageNumber) {
        const cached = this.cache.get(pageNumber);
        if (cached) {
            debugger.logCacheHit(pageNumber, cached.data);
            return cached.data;
        }
        debugger.logCacheMiss(pageNumber);
        return null;
    }

    set(pageNumber, data) {
        debugger.logCacheAdd(pageNumber, data.length, this.cache.size, this.maxSize);
        // ... cache logic
    }
}
```

---

## 🔧 Configuration

### Enable/Disable Dynamically

```javascript
// Start with logging enabled
const debugger = new PDFLoadBalancingDebugger(true);

// Turn off for production
debugger.disable();

// Turn on for debugging
debugger.enable();

// Toggle
debugger.toggle();
```

### Reset Statistics

```javascript
// Clear all counters
window.pdfDebugger.resetStats();

// View again after new load
window.pdfDebugger.logOverallStats();
```

---

## 📈 What to Monitor

### For Freezing Issues
Look for:
- ⏹️ **Long render times** (>100ms per page)
- 📦 **Large batch renders** (too many pages at once)
- 💾 **Cache misses** (pages re-rendering unnecessarily)

### For Memory Issues
Look for:
- 🔴 **Memory warnings** (>90% usage)
- 🗑️ **Cache not evicting** (pages stuck in memory)
- 📥 **Incremental load failures** (can't load chunks)

### For Quality Issues
Look for:
- ⚡ **Low quality too long** (refinement delay too high)
- 🔷 **Quality changes too frequent** (debounce too low)
- 📊 **FPS drops** (<50 FPS consistently)

---

## ✅ Expected Console Output

When everything works perfectly:

```
⚙️ PDF VIRTUALIZATION INITIALIZED
Container Height: 800px
Page Height: 1200px
Pages per viewport: ~1

📍 VISIBLE PAGES CALCULATED (5 pages)
Pages: [5, 6, 7, 8, 9]
Scroll Position: 4800px
Memory Saving: Only rendering 5 pages instead of all

▶️ RENDER START - Page 6 | 🔷 HIGH | Priority: 100
✅ RENDER COMPLETE - Page 6 | 🔷 HIGH | 45ms | Memory: 2.38MB

💾 CACHE HIT - Page 5 | Size: 2500000  ← FAST! No need to render

🔄 SCROLLING | Y: 4800px
⚡ QUALITY CHANGED: HIGH → LOW | DPI: 1x | Reason: User scrolling
```

---

## 🚀 Browser DevTools Tips

### Organize Console by Log Level

```javascript
// Use different methods for different severities
console.log()      // Info
console.warn()     // Warnings
console.error()    // Errors
console.group()    // Group related logs
```

### Filter Console Output

In DevTools Console:
- Type `pdfDebugger` to filter to debugger logs
- Use `logType:` to search (e.g., "CACHE HIT")
- Click icons to filter by severity

### Export Logs for Analysis

```javascript
// Copy all logs
console.log(window.pdfDebugger.stats);

// Paste into text editor for analysis
```

---

## 🎊 Summary

The `PDFLoadBalancingDebugger` provides **real-time visibility** into:
✅ Virtual page rendering  
✅ Cache hit/miss rates  
✅ Render performance  
✅ Memory usage  
✅ Quality adaptation  
✅ Queue management  
✅ Incremental loading  
✅ Overall statistics  

**Use it to optimize your PDF viewer and eliminate freezing! 🎯**
