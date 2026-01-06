# Production-Grade PDF Engine Architecture

## System Design Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      REACT MAIN THREAD                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         PDFViewerVirtualized (60fps scrolling)           │   │
│  │  - Only renders visible pages (viewport-based)          │   │
│  │  - Measures scroll position every frame                 │   │
│  │  - Updates render queue based on priority               │   │
│  │  - Uses IntersectionObserver for visibility              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          ↕                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │        Render Queue Manager (Priority Scheduling)        │   │
│  │  - CRITICAL: visible pages (now)                         │   │
│  │  - HIGH: next 3 pages ahead                              │   │
│  │  - NORMAL: adjacent pages                                │   │
│  │  - LOW: everything else                                  │   │
│  │  - Cancels pending renders if scroll detected            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          ↕                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           LRU Cache Manager (Memory Control)             │   │
│  │  - Max 50MB or 200 pages (whichever is lower)            │   │
│  │  - Evicts least-recently-used when threshold hit         │   │
│  │  - Tracks access patterns                                │   │
│  │  - Pre-warms cache based on scroll velocity              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          ↕                                       │
└─────────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────────┐
│               WEB WORKERS (HEAVY LIFTING)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐   │
│  │   PDF Loader     │  │  Render Workers  │  │ Text Indexer │   │
│  │   (1 Worker)     │  │  (4 Workers)     │  │ (1 Worker)   │   │
│  │                  │  │                  │  │              │   │
│  │ • Load PDF       │  │ • Decode pages   │  │ • Extract    │   │
│  │ • Parse headers  │  │ • Render to      │  │   text       │   │
│  │ • Cache metadata │  │   OffscreenCvs   │  │ • Build      │   │
│  │ • Progressive    │  │ • Serialize      │  │   search     │   │
│  │   decoding       │  │   ImageData      │  │   index      │   │
│  │                  │  │ • Track memory   │  │ • Support    │   │
│  │                  │  │ • Auto-cancel    │  │   regex/bool │   │
│  │                  │  │                  │  │              │   │
│  └──────────────────┘  └──────────────────┘  └──────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Key Principles

### 1. **Non-Blocking Main Thread**
```
❌ BAD:  const pages = [];
        for (let i = 1; i <= 1000; i++) {
            pages.push(await renderPage(i)); // FREEZES UI!
        }

✅ GOOD: Worker handles all rendering asynchronously
        Main thread stays responsive to user input
        Updates flow back via message passing
```

### 2. **Virtualization (Only render visible pages)**
```
Viewport Height: 1000px (fits ~2 pages)

❌ WITHOUT VIRTUALIZATION:
   Renders: Pages 1-1000 = 1000 DOM nodes
   Memory: 500MB+, CPU: 100%, FPS: 1-2

✅ WITH VIRTUALIZATION:
   Renders: Pages 50-52 (visible + buffer)
   Memory: 15MB, CPU: 10%, FPS: 60
```

### 3. **Priority-Based Render Queue**
```
User scrolls to page 100:

QUEUE STATE:
  CRITICAL: Page 100, 101 (visible now) → Render immediately
  HIGH:     Page 102, 103 (scrolling direction) → Next
  NORMAL:   Page 99, 98 (adjacent) → Then
  LOW:      Page 1-97, 104-1000 (cached if available)

Scrolls to page 150 before page 100 finished:
  ✂️ CANCEL: Page 100, 101, 102, 103 renders
  RESCHEDULE: Page 150, 151 (new CRITICAL)
```

### 4. **Intelligent Caching with LRU**
```
Cache Capacity: 50MB

Page Access Pattern: 1→2→3→50→2→3→1→4

Cache State (LRU):
  Time T1: [Page 1, 2, 3]           (12MB)
  Time T2: [Page 3, 50, 2]          (12MB) - Page 1 would be evicted
  Time T3: [Page 2, 3, 1]           (12MB) - Page 50 evicted (never accessed again)

BENEFIT: Re-scrolling back to page 1 is instant (cached)
         Page 50 was one-time access, not worth keeping
```

### 5. **Text Indexing for Search**
```
❌ WITHOUT INDEXING:
   - Load all 1000 pages
   - Extract all text (blocks main thread)
   - Search through entire document
   - User waits 30+ seconds for first result

✅ WITH INDEXING:
   - Workers build text index incrementally
   - Index is inverted (word→pages)
   - Search is sub-second (binary search on index)
   - Async highlighting of results without blocking

Example Index Structure:
{
  "algorithm": [12, 45, 78, 102],        // pages containing "algorithm"
  "neural": [12, 13, 14, 45],
  "network": [12, 13, 45, 78],
  ...
}
Search "neural network": pages [12, 13, 14, 45, 78] intersection
```

## Data Flow: "User scrolls to page 200"

```
STEP 1: User scrolls to page 200
        └─> Main thread detects scroll event (passive listener)
            └─> Calculates new visible range [195-205]
                └─> Updates render queue

STEP 2: Render Queue Manager
        └─> Cancels previous renders (pages 50-60)
        └─> Creates 5 jobs:
            - CRITICAL: Page 200, 201 (render immediately)
            - HIGH: Page 202, 203, 204
            - NORMAL: Page 199, 198, 197
            - LOW: Page 205-210 (prefetch)

STEP 3: Workers receive render jobs
        └─> Request page from cache (100MB limit)
        └─> If not cached:
            - Decode page from PDF.js
            - Render to OffscreenCanvas
            - Return ImageData + metadata
            - Add to cache

STEP 4: Main thread receives rendered pages
        └─> Draws to visible canvases using requestAnimationFrame
        └─> Updates DOM with new content
        └─> User sees smooth transition

STEP 5: LRU Cache monitor
        └─> Checks memory usage
        └─> If > 50MB, evicts oldest unused pages
        └─> Ensures memory stays stable

Result: Smooth 60fps scrolling, no UI freeze ✨
```

## Memory Management Strategy

```
BEFORE (naive approach):
  - Load all 1000 pages
  - Each page: 200KB × 1000 = 200MB
  - Not including canvases, text, metadata = 500MB+
  - User's phone: ❌ Crashes/freezes

AFTER (with smart caching):
  - Load PDF metadata only (10KB)
  - Cache: max 50MB = ~250 pages
  - Visible: 5 pages on screen (~50KB)
  - Workers: 3 pages being rendered (~30KB)
  - Total: ~80MB including overhead ✅

When memory > 50MB:
  Track every page access time:
    Last accessed: [Page 1: 2.5s ago, Page 50: 0.1s ago, Page 100: 15s ago]
  
  Evict least recently accessed:
    Page 100 (15s ago) → FREE 200KB
    Page 75 (12s ago) → FREE 200KB
    ...repeat until < 45MB
```

## Device Degradation

```
HIGH-END (Chrome on Desktop - 8GB RAM):
  ✅ 4 render workers
  ✅ OffscreenCanvas rendering
  ✅ 100MB cache
  ✅ Aggressive prefetching
  ✅ 60fps target

MID-RANGE (iPhone 12 - 4GB RAM):
  ✅ 2 render workers
  ✅ OffscreenCanvas with fallback
  ✅ 50MB cache (limit)
  ✅ Conservative prefetching
  ✅ 30fps target (reduced)

LOW-END (iPhone SE - 2GB RAM):
  ✅ 1 render worker
  ✅ Canvas rendering (no OffscreenCanvas)
  ✅ 20MB cache
  ✅ On-demand rendering only
  ✅ 15-24fps acceptable

VERY LOW-END (Basic Android):
  ✅ Main thread rendering (no workers)
  ✅ No OffscreenCanvas
  ✅ 10MB cache
  ✅ Single page at a time
  ✅ Works, not fast, but functional
```

## Performance Targets

```
METRIC                  TARGET              CURRENT (naive)
─────────────────────────────────────────────────────────
Initial page visible    < 300ms             60-120 seconds ❌
Scroll FPS              60fps               1-5fps ❌
Search response         < 100ms per query   30+ seconds ❌
Zoom operation          < 50ms              2-5 seconds ❌
Memory @ 1000 pages     < 100MB             > 500MB ❌
CPU @ scrolling         < 15%               80-95% ❌
Tab responsiveness      Always              Locks 30-60s ❌
```

## Implementation Checklist

- [ ] Create PDFLoader worker
- [ ] Create RenderQueue system with priority
- [ ] Create LRUCache with memory tracking
- [ ] Create VirtualPDFViewer with IntersectionObserver
- [ ] Create async search engine with text indexing
- [ ] Add performance monitoring/metrics
- [ ] Add memory leak detection
- [ ] Add graceful degradation logic
- [ ] Test with 1000+ page PDF
- [ ] Monitor in Chrome DevTools Performance tab
