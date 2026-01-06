// src/context/HighPerformancePDFContext.jsx
// Production-grade PDF engine with Web Workers, virtualization, and monitoring
// Use this instead of regular PDFContext for large PDF handling

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import PDFRenderWorker from '../workers/pdfRenderWorker?worker';
import { RenderQueueManager, RENDER_PRIORITY } from '../utils/renderQueueManager';
import { LRUCacheManager } from '../utils/lruCacheManager';
import { AsyncSearchEngine } from '../utils/asyncSearchEngine';
import { PerformanceMonitor } from '../utils/performanceMonitor';

// Configure PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const HighPerformancePDFContext = createContext();

export const useHighPerformancePDF = () => {
    const context = useContext(HighPerformancePDFContext);
    if (!context) {
        throw new Error('useHighPerformancePDF must be used within a HighPerformancePDFProvider');
    }
    return context;
};

export const HighPerformancePDFProvider = ({ children }) => {
    // ==================== CORE STATE ====================
    const [pdfDocument, setPdfDocument] = useState(null);
    const [pdfFile, setPdfFile] = useState(null);
    const [fileName, setFileName] = useState("No file selected");
    const [currentPage, setCurrentPage] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [scale, setScale] = useState(1.0);
    const [rotation, setRotation] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // ==================== PERFORMANCE SYSTEMS ====================
    const renderQueueRef = useRef(null);
    const cacheRef = useRef(null);
    const searchEngineRef = useRef(null);
    const monitorRef = useRef(null);
    const renderWorkersRef = useRef([]);
    const workerPoolIndexRef = useRef(0);

    // ==================== VIRTUALIZATION STATE ====================
    const [visibleRange, setVisibleRange] = useState({ start: 1, end: 21 });
    const [renderedPages, setRenderedPages] = useState(new Map());
    const containerRef = useRef(null);

    // ==================== SEARCH STATE ====================
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchProgress, setSearchProgress] = useState(0);

    // ==================== CAPABILITY DETECTION ====================
    const detectCapabilities = useCallback(() => {
        return {
            hasOffscreenCanvas: typeof OffscreenCanvas !== 'undefined',
            hasWorkers: typeof Worker !== 'undefined',
            hardwareConcurrency: navigator.hardwareConcurrency || 2,
            deviceMemory: navigator.deviceMemory || 4,
            connectionType: navigator.connection?.effectiveType || '4g'
        };
    }, []);

    const getOptimalConfig = useCallback((capabilities) => {
        if (capabilities.deviceMemory <= 2) {
            return {
                workerCount: 1,
                maxMemory: 20 * 1024 * 1024,
                maxConcurrent: 1,
                prefetchDistance: 2
            };
        } else if (capabilities.deviceMemory <= 4) {
            return {
                workerCount: 2,
                maxMemory: 50 * 1024 * 1024,
                maxConcurrent: 2,
                prefetchDistance: 5
            };
        } else {
            return {
                workerCount: Math.min(4, capabilities.hardwareConcurrency),
                maxMemory: 100 * 1024 * 1024,
                maxConcurrent: 4,
                prefetchDistance: 10
            };
        }
    }, []);

    // ==================== INITIALIZATION ====================
    useEffect(() => {
        const capabilities = detectCapabilities();
        const config = getOptimalConfig(capabilities);

        console.log('[PDF Engine] Initializing with config:', config);

        // Initialize performance systems
        monitorRef.current = new PerformanceMonitor({
            memoryMax: config.maxMemory,
            slowRenderTime: 500
        });

        renderQueueRef.current = new RenderQueueManager({
            maxConcurrent: config.maxConcurrent
        });

        cacheRef.current = new LRUCacheManager({
            maxMemory: config.maxMemory,
            maxPages: 200,
            onEvict: (info) => {
                console.log(`[Cache] Evicted page ${info.pageNum}`);
            },
            onWarning: (info) => {
                console.warn('[Cache] Memory warning:', info);
            }
        });

        searchEngineRef.current = new AsyncSearchEngine({
            chunkSize: 100,
            maxResults: 5000,
            onIndexProgress: (progress) => {
                console.log(`[Search] Indexing: ${progress.percentage}%`);
            },
            onSearchProgress: (progress) => {
                setSearchProgress((progress.results / progress.total * 100) || 0);
            }
        });

        // Initialize worker pool
        if (capabilities.hasWorkers) {
            const workers = Array(config.workerCount)
                .fill(null)
                .map(() => new PDFRenderWorker());
            renderWorkersRef.current = workers;
        }

        return () => {
            renderWorkersRef.current.forEach(w => w.terminate());
            monitorRef.current.destroy();
            renderQueueRef.current.clear();
            cacheRef.current.clear();
            searchEngineRef.current.clear();
        };
    }, [detectCapabilities, getOptimalConfig]);

    // ==================== PDF LOADING ====================
    const loadPDF = useCallback(async (file) => {
        setIsLoading(true);
        setError(null);

        try {
            let loadingTask;
            let currentFileName = "";

            if (typeof file === 'string') {
                loadingTask = pdfjsLib.getDocument(file);
                currentFileName = file.split('/').pop();
            } else if (file instanceof File) {
                const arrayBuffer = await file.arrayBuffer();
                loadingTask = pdfjsLib.getDocument(arrayBuffer);
                currentFileName = file.name;
            } else {
                throw new Error("Invalid file format");
            }

            const pdf = await loadingTask.promise;

            setPdfDocument(pdf);
            setPdfFile(file);
            setFileName(currentFileName);
            setNumPages(pdf.numPages);
            setCurrentPage(1);
            setVisibleRange({ start: 1, end: Math.min(21, pdf.numPages) });

            // Start indexing for search (non-blocking)
            if (searchEngineRef.current && pdf.numPages > 0) {
                const textContent = {};
                for (let i = 1; i <= Math.min(100, pdf.numPages); i++) {
                    const page = await pdf.getPage(i);
                    const text = await page.getTextContent();
                    textContent[i] = text.items.map(item => item.str).join(' ');
                }

                // Build index in background
                const abortController = new AbortController();
                searchEngineRef.current
                    .buildIndex(textContent, pdf.numPages, abortController.signal)
                    .catch(err => console.error('Index build failed:', err));
            }

            // Schedule initial renders
            scheduleInitialRenders(1, pdf.numPages);

            console.log(`[PDF] Loaded: ${currentFileName} (${pdf.numPages} pages)`);
        } catch (err) {
            console.error("Error loading PDF:", err);
            setError("Failed to load PDF. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ==================== RENDERING SYSTEM ====================
    const getNextWorker = useCallback(() => {
        const worker = renderWorkersRef.current[workerPoolIndexRef.current % renderWorkersRef.current.length];
        workerPoolIndexRef.current++;
        return worker;
    }, []);

    const renderPage = useCallback(
        async (pageNum, signal = null) => {
            if (!pdfDocument) return null;

            // Check cache first
            const cached = cacheRef.current?.get(pageNum);
            if (cached) {
                console.log(`[Render] Cache hit: page ${pageNum}`);
                return cached;
            }

            return new Promise((resolve, reject) => {
                const taskId = `render-${pageNum}-${Date.now()}`;
                const worker = getNextWorker();

                if (!worker) {
                    // Fallback: render on main thread
                    renderPageMainThread(pageNum).then(resolve).catch(reject);
                    return;
                }

                // Send render request to worker
                worker.postMessage({
                    type: 'RENDER_PAGE',
                    payload: {
                        pageNum,
                        scale,
                        rotation,
                        cacheKey: 'pdf-1' // Simplified
                    },
                    taskId
                });

                // Handle response
                const messageHandler = (event) => {
                    const { type, taskId: responseTaskId, success, data, error } = event.data;

                    if (responseTaskId !== taskId) return;

                    if (type === 'PAGE_RENDERED' && success) {
                        // Convert ImageData back from buffer
                        const imageData = new ImageData(
                            data.imageData.data,
                            data.dimensions.width,
                            data.dimensions.height
                        );

                        // Store in cache
                        cacheRef.current?.set(pageNum, imageData, data.imageData.data.byteLength);

                        worker.removeEventListener('message', messageHandler);
                        resolve(imageData);
                    } else if (type === 'ERROR') {
                        worker.removeEventListener('message', messageHandler);
                        reject(new Error(error.message));
                    }
                };

                worker.addEventListener('message', messageHandler);

                // Timeout after 30s
                setTimeout(() => {
                    worker.postMessage({ type: 'CANCEL_RENDER', taskId });
                    reject(new Error('Render timeout'));
                }, 30000);
            });
        },
        [pdfDocument, scale, rotation, getNextWorker]
    );

    const renderPageMainThread = useCallback(async (pageNum) => {
        if (!pdfDocument) return null;

        try {
            const page = await pdfDocument.getPage(pageNum);
            const viewport = page.getViewport({ scale, rotation });

            // Create canvas
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const ctx = canvas.getContext('2d');
            await page.render({
                canvasContext: ctx,
                viewport: viewport
            }).promise;

            // Get image data and store in cache
            const imageData = ctx.getImageData(0, 0, viewport.width, viewport.height);
            cacheRef.current?.set(pageNum, imageData, imageData.data.byteLength);

            return imageData;
        } catch (err) {
            console.error(`Failed to render page ${pageNum}:`, err);
            return null;
        }
    }, [pdfDocument, scale, rotation]);

    /**
     * FAST JUMP DETECTION: Determines if user jumped large distance
     * Returns true if jump > 5 pages (requires aggressive optimization)
     */
    const isFastJump = useCallback((fromPage, toPage) => {
        const distance = Math.abs(toPage - fromPage);
        return distance > 5;
    }, []);

    /**
     * Handle aggressive fast jump to distant page
     * Renders target page instantly, cancels other renders
     * Optimized for Windows 11 with explicit cache cleanup
     */
    const handleFastJump = useCallback(async (targetPage) => {
        if (!renderQueueRef.current || !pdfDocument) return;

        console.time('[FastJump] Page ' + targetPage);

        // 1. AGGRESSIVE CANCEL: Stop ALL other renders immediately
        const cleared = renderQueueRef.current.cancelAllAndClear();
        console.log(`[FastJump] Cleared: ${cleared.active} active + ${cleared.queued} queued`);

        // 2. MEMORY CLEANUP: Aggressive cache clear
        if (cacheRef.current) {
            const result = cacheRef.current.aggressiveClear(targetPage, 2);
            console.log(`[FastJump] ${result.cleared} cached pages removed`);
        }

        // 3. RENDER TARGET PAGE PRIORITY (should be instant, <500ms)
        try {
            const imageData = await renderPage(targetPage);
            if (imageData) {
                setRenderedPages(prev => {
                    const newMap = new Map(prev);
                    newMap.set(targetPage, imageData);
                    return newMap;
                });
                console.log(`[FastJump] ✓ Page ${targetPage} rendered`);
            }
        } catch (err) {
            console.error(`[FastJump] Failed to render page ${targetPage}:`, err);
        }

        // 4. LAZY SCHEDULE ADJACENT PAGES (non-blocking)
        // Schedule with slight delay to ensure main thread is free
        setTimeout(() => {
            const startRender = Math.max(1, targetPage - 3);
            const endRender = Math.min(numPages, targetPage + 7);
            
            for (let i = startRender; i <= endRender; i++) {
                if (i !== targetPage) {
                    const distance = Math.abs(i - targetPage);
                    const priority = distance <= 2 ? RENDER_PRIORITY.HIGH : RENDER_PRIORITY.NORMAL;
                    
                    renderQueueRef.current.enqueue(
                        i,
                        priority,
                        () => renderPage(i)
                    );
                }
            }
            console.log(`[FastJump] Scheduled ${endRender - startRender + 1} pages`);
        }, 50);

        console.timeEnd('[FastJump] Page ' + targetPage);
    }, [pdfDocument, numPages, renderPage]);

    const scheduleInitialRenders = useCallback((startPage, endPage) => {
        if (!renderQueueRef.current) return;

        // Schedule critical pages (first visible)
        for (let i = startPage; i <= Math.min(startPage + 20, endPage); i++) {
            renderQueueRef.current.enqueue(
                i,
                i <= startPage + 5 ? RENDER_PRIORITY.CRITICAL : RENDER_PRIORITY.HIGH,
                () => renderPage(i)
            );
        }
    }, [renderPage]);

    // ==================== VIRTUALIZATION ====================
    useEffect(() => {
        if (!containerRef.current) return;

        const handleScroll = () => {
            const container = containerRef.current;
            const scrollTop = container.scrollTop;
            const viewportHeight = container.clientHeight;
            const avgPageHeight = 1400;

            // Calculate visible range with buffer
            const buffer = 5;
            const startPage = Math.max(
                1,
                Math.floor(scrollTop / avgPageHeight) - buffer
            );
            const endPage = Math.min(
                numPages,
                Math.ceil((scrollTop + viewportHeight) / avgPageHeight) + buffer
            );

            if (startPage !== visibleRange.start || endPage !== visibleRange.end) {
                setVisibleRange({ start: startPage, end: endPage });

                // Cancel low-priority renders outside new range
                if (renderQueueRef.current) {
                    renderQueueRef.current.cancelBelowPriority(RENDER_PRIORITY.NORMAL);
                }

                // Schedule critical renders
                for (let i = startPage; i <= Math.min(startPage + 5, endPage); i++) {
                    renderQueueRef.current.enqueue(
                        i,
                        RENDER_PRIORITY.CRITICAL,
                        () => renderPage(i)
                    );
                }
            }
        };

        const scrollListener = () => {
            requestAnimationFrame(handleScroll);
        };

        container.addEventListener('scroll', scrollListener, { passive: true });

        return () => container.removeEventListener('scroll', scrollListener);
    }, [numPages, visibleRange, renderPage]);

    // ==================== SEARCH ====================
    const performSearch = useCallback(async (query) => {
        if (!query || !searchEngineRef.current) return;

        setIsSearching(true);
        setSearchProgress(0);

        try {
            const result = await searchEngineRef.current.search(query);
            setSearchResults(result.results);
            setSearchProgress(100);

            // Navigate to first result
            if (result.results.length > 0) {
                setCurrentPage(result.results[0].pageNum);
            }
        } catch (err) {
            console.error('Search failed:', err);
            setError('Search failed');
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.length > 2) {
                performSearch(searchQuery);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, performSearch]);

    // ==================== OPTIMIZED PAGE NAVIGATION ====================
    /**
     * Smart page navigation: Detects fast jumps and optimizes accordingly
     * Fast jumps (>5 pages) trigger aggressive cancellation + instant rendering
     */
    const goToPage = useCallback((pageNum) => {
        const newPage = Math.max(1, Math.min(pageNum, numPages));
        const distance = Math.abs(newPage - currentPage);

        // Check if this is a fast jump
        if (distance > 5) {
            console.log(`[Navigation] 🚀 FAST JUMP: ${currentPage} → ${newPage} (${distance} pages)`);
            handleFastJump(newPage);
        } else {
            console.log(`[Navigation] Normal: ${currentPage} → ${newPage}`);
        }

        setCurrentPage(newPage);
    }, [currentPage, numPages, handleFastJump]);

    // ==================== DIAGNOSTICS ====================
    const getPerformanceReport = useCallback(() => {
        return {
            render: renderQueueRef.current?.getStats(),
            cache: cacheRef.current?.getStats(),
            search: searchEngineRef.current?.getStats(),
            monitor: monitorRef.current?.getReport()
        };
    }, []);

    const logDiagnostics = useCallback(() => {
        console.log('\n' + renderQueueRef.current?.visualize());
        console.log(cacheRef.current?.visualize());
        console.log(monitorRef.current?.visualize());
        console.log(searchEngineRef.current?.visualize());
    }, []);

    // ==================== CONTEXT VALUE ====================
    const value = {
        // Core PDF state
        pdfDocument,
        fileName,
        currentPage,
        setCurrentPage: goToPage,  // Use optimized navigation with fast-jump detection
        numPages,
        scale,
        setScale,
        rotation,
        setRotation,
        isLoading,
        error,
        loadPDF,

        // Virtualization
        visibleRange,
        containerRef,
        renderedPages,
        setRenderedPages,

        // Search
        searchQuery,
        setSearchQuery,
        searchResults,
        isSearching,
        searchProgress,
        performSearch,

        // Rendering
        renderPage,
        renderQueueRef,
        cacheRef,

        // Diagnostics
        getPerformanceReport,
        logDiagnostics,
        monitorRef,

        // Helper systems
        renderQueueRef,
        cacheRef,
        searchEngineRef,
        monitorRef
    };

    return (
        <HighPerformancePDFContext.Provider value={value}>
            {children}
        </HighPerformancePDFContext.Provider>
    );
};
