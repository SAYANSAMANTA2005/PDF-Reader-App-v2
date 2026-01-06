// src/hooks/usePDFOptimizedViewer.js
// Hook for optimized PDF viewing with virtualization and lazy loading

import { useEffect, useRef, useState, useCallback } from 'react';
import { PDFVirtualizer, LRUPageCache, ViewportManager, AdaptiveQualityRenderer, PerformanceMonitor } from '../utils/pdfVirtualizer';
import { PageRenderScheduler, RenderRequestPool } from '../utils/pdfPageScheduler';

/**
 * Hook for optimized PDF viewing
 * Handles virtualization, caching, lazy loading
 */
export const usePDFOptimizedViewer = (pdfDocument, options = {}) => {
    const containerRef = useRef(null);
    const [visiblePages, setVisiblePages] = useState([]);
    const [renderingQuality, setRenderingQuality] = useState('high');
    const [performanceStats, setPerformanceStats] = useState(null);
    const [loadingStatus, setLoadingStatus] = useState('idle');
    
    // Initialize managers
    const virtualizerRef = useRef(null);
    const cacheRef = useRef(null);
    const schedulerRef = useRef(null);
    const poolRef = useRef(null);
    const viewportRef = useRef(null);
    const qualityRef = useRef(null);
    const performanceRef = useRef(null);
    
    // Initialize on mount
    useEffect(() => {
        if (!pdfDocument) return;
        
        // Create virtualizer
        virtualizerRef.current = new PDFVirtualizer({
            pageHeight: options.pageHeight || 1200,
            bufferPages: options.bufferPages || 2,
            containerHeight: containerRef.current?.clientHeight || 800,
        });
        
        // Create page cache (limit to 15 pages in memory)
        cacheRef.current = new LRUPageCache(options.cacheSize || 15);
        
        // Create render scheduler
        schedulerRef.current = new PageRenderScheduler({
            maxConcurrentRenders: options.maxConcurrentRenders || 2,
            prioritizeVisiblePages: true,
        });
        
        // Create render pool
        poolRef.current = new RenderRequestPool(options.maxConcurrentRenders || 2);
        
        // Create viewport manager
        viewportRef.current = new ViewportManager(
            containerRef.current,
            {
                onScroll: handleViewportScroll,
                debounceMs: options.debounceMs || 100,
            }
        );
        
        // Create quality renderer
        qualityRef.current = new AdaptiveQualityRenderer({
            highQualityDPI: options.highQualityDPI || 2,
            lowQualityDPI: options.lowQualityDPI || 1,
            refinementDelayMs: options.refinementDelayMs || 500,
        });
        
        // Create performance monitor
        performanceRef.current = new PerformanceMonitor();
        
        // Update container height
        viewportRef.current.updateTotalHeight(
            (pdfDocument.numPages || 100) * (options.pageHeight || 1200)
        );
        
        return () => {
            // Cleanup
            viewportRef.current?.destroy();
            qualityRef.current?.destroy();
            cacheRef.current?.clear();
            schedulerRef.current?.clear();
        };
        
    }, [pdfDocument]);
    
    /**
     * Handle viewport scroll
     */
    const handleViewportScroll = useCallback(async (viewportData) => {
        const { scrollY, containerHeight, isScrolling } = viewportData;
        
        // Update quality based on scroll state
        qualityRef.current.updateQuality(isScrolling);
        setRenderingQuality(isScrolling ? 'low' : 'high');
        
        // Get visible pages
        const visible = virtualizerRef.current.getVisiblePages(scrollY, containerHeight);
        setVisiblePages(visible);
        
        // Update scheduler
        schedulerRef.current.updateVisiblePages(visible);
        
        // Schedule renders for visible pages
        for (const pageNum of visible) {
            const cached = cacheRef.current.get(pageNum);
            if (!cached) {
                schedulerRef.current.addPageToQueue(
                    pageNum,
                    (page) => renderPage(page),
                    isScrolling ? 50 : 100
                );
            }
        }
        
    }, [pdfDocument]);
    
    /**
     * Render a single page
     */
    const renderPage = useCallback(async (pageNumber) => {
        if (!pdfDocument) return null;
        
        try {
            // Check cache first
            const cached = cacheRef.current.get(pageNumber);
            if (cached) return cached;
            
            const startTime = performance.now();
            
            // Get page
            const page = await pdfDocument.getPage(pageNumber + 1);
            
            // Get render options based on quality
            const scale = qualityRef.current.getScale();
            const viewport = page.getViewport({ scale });
            
            // Create canvas
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.width = `${viewport.width}px`;
            canvas.style.height = `${viewport.height}px`;
            
            const context = canvas.getContext('2d');
            
            // Render via pool to avoid blocking
            const renderTask = page.render({
                canvasContext: context,
                viewport: viewport,
            });
            
            await renderTask.promise;
            
            // Record performance
            const renderTime = performance.now() - startTime;
            performanceRef.current.recordRenderTime(renderTime);
            performanceRef.current.recordMemoryUsage();
            
            // Cache result
            const renderedData = {
                canvas,
                viewport,
                renderedAt: Date.now(),
            };
            
            cacheRef.current.set(pageNumber, renderedData);
            
            return renderedData;
            
        } catch (error) {
            console.error(`Error rendering page ${pageNumber}:`, error);
            throw error;
        }
    }, [pdfDocument]);
    
    /**
     * Get cached or rendered page
     */
    const getPageCanvas = useCallback((pageNumber) => {
        const cached = cacheRef.current.get(pageNumber);
        return cached?.canvas || null;
    }, []);
    
    /**
     * Scroll to page
     */
    const scrollToPage = useCallback((pageNumber) => {
        const pageHeight = options.pageHeight || 1200;
        viewportRef.current.scrollToPage(pageNumber, pageHeight);
    }, []);
    
    /**
     * Get performance stats
     */
    const getPerformanceStats = useCallback(() => {
        return performanceRef.current.getStats();
    }, []);
    
    /**
     * Get cache stats
     */
    const getCacheStats = useCallback(() => {
        return cacheRef.current.getStats();
    }, []);
    
    /**
     * Clear cache
     */
    const clearCache = useCallback(() => {
        cacheRef.current.clear();
    }, []);
    
    // Update performance stats periodically
    useEffect(() => {
        const interval = setInterval(() => {
            setPerformanceStats(performanceRef.current?.getStats());
        }, 1000);
        
        return () => clearInterval(interval);
    }, []);
    
    return {
        containerRef,
        visiblePages,
        renderingQuality,
        performanceStats,
        loadingStatus,
        getPageCanvas,
        scrollToPage,
        getPerformanceStats,
        getCacheStats,
        clearCache,
    };
};

/**
 * Hook for incremental PDF loading
 */
export const usePDFIncrementalLoader = (pdfUrl, options = {}) => {
    const [loadProgress, setLoadProgress] = useState(0);
    const [loadingStatus, setLoadingStatus] = useState('idle');
    const [error, setError] = useState(null);
    const [pdfBuffer, setPdfBuffer] = useState(null);
    
    useEffect(() => {
        if (!pdfUrl) return;
        
        const loadPDF = async () => {
            try {
                setLoadingStatus('loading');
                setLoadProgress(0);
                
                const response = await fetch(pdfUrl);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const reader = response.body.getReader();
                const chunks = [];
                const contentLength = parseInt(response.headers.get('content-length'), 10);
                let receivedLength = 0;
                
                while (true) {
                    const { done, value } = await reader.read();
                    
                    if (done) break;
                    
                    chunks.push(value);
                    receivedLength += value.length;
                    
                    // Update progress
                    const progress = (receivedLength / contentLength) * 100;
                    setLoadProgress(progress);
                    
                    if (options.onProgress) {
                        options.onProgress({
                            loaded: receivedLength,
                            total: contentLength,
                            percentage: progress.toFixed(1),
                        });
                    }
                }
                
                // Combine chunks
                const chunksAll = new Uint8Array(receivedLength);
                let position = 0;
                for (const chunk of chunks) {
                    chunksAll.set(chunk, position);
                    position += chunk.length;
                }
                
                setPdfBuffer(chunksAll.buffer);
                setLoadingStatus('loaded');
                setLoadProgress(100);
                
            } catch (err) {
                console.error('Error loading PDF:', err);
                setError(err.message);
                setLoadingStatus('error');
            }
        };
        
        loadPDF();
        
    }, [pdfUrl]);
    
    return {
        loadProgress,
        loadingStatus,
        error,
        pdfBuffer,
    };
};
