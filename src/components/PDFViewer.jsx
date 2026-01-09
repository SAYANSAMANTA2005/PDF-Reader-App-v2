import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { usePDF } from '../context/PDFContext';
import * as pdfjsLib from 'pdfjs-dist';
import AnnotationLayer from './AnnotationLayer';
import ActiveRecallOverlay from './ActiveRecallOverlay';
import { PDFVirtualizer, LRUPageCache, AdaptiveQualityRenderer } from '../utils/pdfVirtualizer';
import { PageRenderScheduler } from '../utils/pdfPageScheduler';
import { ocrService } from '../utils/OCRService';

// Intersection Observer Hook for visibility detection
const useIntersectionObserver = (ref, options) => {
    const [isIntersecting, setIntersecting] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            setIntersecting(entry.isIntersecting);
        }, options);

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            if (ref.current) observer.unobserve(ref.current);
        };
    }, [ref, options]);

    return isIntersecting;
};

const PAGE_HEIGHT_ESTIMATE = 1100; // Default height for virtualizer
const BUFFER_PAGES = 3; // Number of pages to buffer above/below viewport

const PDFViewer = () => {
    const {
        pdfDocument,
        numPages,
        scale,
        currentPage,
        setCurrentPage,
        rotation,
        isTwoPageMode,
        isReading,
        startReading,
        isMathMode,
        setActiveEquation,
        isActiveRecallMode
    } = usePDF();

    const containerRef = useRef(null);
    const [visiblePages, setVisiblePages] = useState([]);
    const [renderingQuality, setRenderingQuality] = useState('high');
    const isJumping = useRef(false);
    const jumpTimeout = useRef(null);

    // Initialize high-performance utilities
    const virtualizer = useMemo(() => new PDFVirtualizer({
        pageHeight: PAGE_HEIGHT_ESTIMATE * scale,
        bufferPages: BUFFER_PAGES,
        containerHeight: window.innerHeight,
    }), [scale, isTwoPageMode]); // Re-init virtualizer when mode changes

    const scheduler = useMemo(() => new PageRenderScheduler({
        maxConcurrentRenders: 2,
        prioritizeVisiblePages: true,
    }), [pdfDocument]);

    const qualityManager = useMemo(() => new AdaptiveQualityRenderer({
        highQualityDPI: 1.5,
        lowQualityDPI: 0.8,
        refinementDelayMs: 400
    }), []);

    const lastScrollTop = useRef(0);
    const isScrollChange = useRef(false);

    // Handle Scroll
    const handleScroll = useCallback((force = false) => {
        if (!containerRef.current) return;

        const scrollY = containerRef.current.scrollTop;
        const containerHeight = containerRef.current.clientHeight;

        // Prevent flickering from tiny jitter movements (less than 1px)
        if (!force && Math.abs(scrollY - lastScrollTop.current) < 1 && !isJumping.current) {
            return;
        }
        lastScrollTop.current = scrollY;

        // Skip updating currentPage from scroll if we just performed a programmatic jump
        // UNLESS forced (e.g. during an actual jump)
        if (isJumping.current && !force) {
            return;
        }

        // Update virtualization
        const visible = virtualizer.getVisiblePages(scrollY, containerHeight, isTwoPageMode);

        // In Two-Page mode, indices are rows. In Single-Page, indices are pages.
        const maxIndex = isTwoPageMode ? Math.ceil(numPages / 2) : numPages;
        const validVisible = visible.filter(p => p >= 0 && p < maxIndex);

        setVisiblePages(prev => {
            if (prev.length === validVisible.length && prev.every((v, i) => v === validVisible[i])) {
                return prev;
            }
            return validVisible;
        });

        // Update current page with stable offset (25% from top)
        const scrollReference = scrollY + (containerHeight * 0.25);
        const middleRowIdx = virtualizer.getPageFromPosition(scrollReference);
        const middlePage = isTwoPageMode
            ? Math.min(numPages, (middleRowIdx * 2) + 1)
            : Math.min(numPages, Math.max(1, middleRowIdx + 1));

        if (middlePage !== currentPage) {
            // Only set isScrollChange if we are NOT forcing (i.e. regular scroll)
            if (!force) isScrollChange.current = true;
            setCurrentPage(middlePage);
        }

        // Ensure the current index is in the visible list
        const middleIdx = isTwoPageMode ? middleRowIdx : middlePage - 1;
        setVisiblePages(prev => {
            if (!prev.includes(middleIdx) && middleIdx >= 0 && middleIdx < maxIndex) {
                return [...prev, middleIdx].sort((a, b) => a - b);
            }
            return prev;
        });

        // Adaptive quality
        if (renderingQuality !== 'low') {
            qualityManager.updateQuality(true);
            setRenderingQuality('low');
        }

        if (window.renderTimeout) clearTimeout(window.renderTimeout);
        window.renderTimeout = setTimeout(() => {
            // CRITICAL: Final forced check to ensure virtualization didn't miss 
            // the final scroll position due to guards/jitter.
            handleScroll(true);

            qualityManager.updateQuality(false);
            setRenderingQuality('high');
        }, 400);

    }, [virtualizer, numPages, currentPage, setCurrentPage, qualityManager, renderingQuality]);

    // Update virtualization on scale change
    useEffect(() => {
        virtualizer.options.pageHeight = PAGE_HEIGHT_ESTIMATE * scale;
        handleScroll();
    }, [scale, virtualizer, handleScroll]);

    // Initial setup and event listeners
    useEffect(() => {
        const container = containerRef.current;
        if (container) {
            container.addEventListener('scroll', () => handleScroll(), { passive: true });
            handleScroll(); // Initial calc
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [handleScroll]);

    // Handle external page changes (Smart Jumping)
    useEffect(() => {
        // If the current page changed due to a scroll event, don't trigger the jump logic
        if (isScrollChange.current) {
            isScrollChange.current = false;
            return;
        }

        if (containerRef.current && currentPage) {
            let pageOffset = currentPage - 1;

            // In Two-Page mode, we jump to the "pair" start row
            if (isTwoPageMode) {
                pageOffset = Math.floor((currentPage - 1) / 2);
            }

            const targetPos = pageOffset * (PAGE_HEIGHT_ESTIMATE * scale);
            const currentPos = containerRef.current.scrollTop;

            // Only scroll if difference is significant (e.g. from jump or zoom)
            if (Math.abs(currentPos - targetPos) > 10) {
                isJumping.current = true;
                if (jumpTimeout.current) clearTimeout(jumpTimeout.current);

                // Perform the jump
                containerRef.current.scrollTop = targetPos;

                // CRITICAL: Manually update the lastScrollTop and trigger the visibility check
                lastScrollTop.current = targetPos;
                handleScroll(true); // Forced update to bypass isJumping check

                // Extended timeout to prevent scroll event conflicts
                jumpTimeout.current = setTimeout(() => {
                    isJumping.current = false;
                }, 400);
            }
        }
        return () => {
            if (jumpTimeout.current) clearTimeout(jumpTimeout.current);
        };
    }, [currentPage, scale, isTwoPageMode, handleScroll]);

    if (!pdfDocument) return null;

    return (
        <div
            className="viewer-scroll-container"
            ref={containerRef}
            style={{
                width: '100%',
                height: 'calc(100vh - 64px)',
                overflowY: 'auto',
                position: 'relative',
                background: '#525659'
            }}
        >
            {/* The "Spacious" list container that defines total scroll height */}
            <div
                className="viewer-virtual-list"
                style={{
                    height: `${(isTwoPageMode ? Math.ceil(numPages / 2) : numPages) * (PAGE_HEIGHT_ESTIMATE * scale)}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {/* Render only visible pages (or pairs) at absolute positions */}
                {visiblePages.map((pageIdx) => {
                    // Logic for Two-Page rendering: each "visible page slot" represents a row
                    if (isTwoPageMode) {
                        const pairIndex = pageIdx; // Row index in 2-page mode
                        const leftPageNum = (pairIndex * 2) + 1;
                        const rightPageNum = (pairIndex * 2) + 2;

                        if (leftPageNum > numPages) return null;

                        return (
                            <div
                                key={`pair-${pairIndex}`}
                                style={{
                                    position: 'absolute',
                                    top: `${pairIndex * (PAGE_HEIGHT_ESTIMATE * scale)}px`,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '100%',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    gap: '20px',
                                    padding: '20px 0'
                                }}
                            >
                                <PDFPage
                                    pageNum={leftPageNum}
                                    pdfDocument={pdfDocument}
                                    scale={scale}
                                    rotation={rotation}
                                    scheduler={scheduler}
                                    quality={renderingQuality}
                                    isReading={isReading}
                                    onStartReading={startReading}
                                    isMathMode={isMathMode}
                                    setActiveEquation={setActiveEquation}
                                    isActiveRecallMode={isActiveRecallMode}
                                />
                                {rightPageNum <= numPages && (
                                    <PDFPage
                                        pageNum={rightPageNum}
                                        pdfDocument={pdfDocument}
                                        scale={scale}
                                        rotation={rotation}
                                        scheduler={scheduler}
                                        quality={renderingQuality}
                                        isReading={isReading}
                                        onStartReading={startReading}
                                        isMathMode={isMathMode}
                                        setActiveEquation={setActiveEquation}
                                        isActiveRecallMode={isActiveRecallMode}
                                    />
                                )}
                            </div>
                        );
                    }

                    // Standard Single-Page rendering
                    return (
                        <div
                            key={pageIdx}
                            style={{
                                position: 'absolute',
                                top: `${pageIdx * (PAGE_HEIGHT_ESTIMATE * scale)}px`,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: 'fit-content',
                                padding: '20px 0'
                            }}
                        >
                            <PDFPage
                                pageNum={pageIdx + 1}
                                pdfDocument={pdfDocument}
                                scale={scale}
                                rotation={rotation}
                                scheduler={scheduler}
                                quality={renderingQuality}
                                isReading={isReading}
                                onStartReading={startReading}
                                isMathMode={isMathMode}
                                setActiveEquation={setActiveEquation}
                                isActiveRecallMode={isActiveRecallMode}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Scroll Indicator / Quality Badge */}
            <div style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '10px',
                zIndex: 1000,
                pointerEvents: 'none',
                backdropFilter: 'blur(4px)'
            }}>
                {renderingQuality === 'low' ? '⚡ PERFORMANCE MODE' : '✨ HIGH QUALITY'} | Page {currentPage} of {numPages}
            </div>
        </div>
    );
};

const PDFPage = React.memo(({
    pageNum,
    pdfDocument,
    scale,
    rotation,
    scheduler,
    quality,
    isReading,
    onStartReading,
    isMathMode,
    setActiveEquation,
    isActiveRecallMode
}) => {
    const canvasRef = useRef(null);
    const textLayerRef = useRef(null);
    const [dimensions, setDimensions] = useState(() => {
        // Calculate initial dimensions to prevent flickering
        const estimatedWidth = 800 * scale;
        const estimatedHeight = PAGE_HEIGHT_ESTIMATE * scale;
        return { width: estimatedWidth, height: estimatedHeight };
    });
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [isRendered, setIsRendered] = useState(false);
    const isStableRender = useRef(false); // Changed to Ref to avoid re-render cycles
    const renderTaskRef = useRef(null);
    const lastRenderQuality = useRef(null);

    // Instant Scroll-OCR Logic
    const containerRef = useRef(null);
    const isVisible = useIntersectionObserver(containerRef, { threshold: 0.1 });
    const [ocrData, setOcrData] = useState(null);
    const [isOcrProcessing, setIsOcrProcessing] = useState(false);

    useEffect(() => {
        // Trigger OCR if: Page Visible AND Not Rendered/No Text AND Not Processing
        if (isVisible && !isOcrProcessing && !ocrData) {
            checkAndRunOCR();
        }
    }, [isVisible, isOcrProcessing, ocrData]);

    const checkAndRunOCR = async () => {
        try {
            const page = await pdfDocument.getPage(pageNum);
            const textContent = await page.getTextContent();

            // If page has almost no text (likely scanned image)
            if (textContent.items.length < 5) {
                setIsOcrProcessing(true);
                console.log(`🔍 OCR: Page ${pageNum} appears scanned. Queuing...`);

                // Get high-quality image for OCR
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({ canvasContext: ctx, viewport }).promise;
                const imageBase64 = canvas.toDataURL('image/png');

                // Send to BG Worker
                const result = await ocrService.addToQueue(imageBase64);

                // Convert simple text result to mock items if needed, or just store text
                // Ideally we'd use bounding boxes from recognizeDetailed but for now let's just get text
                setOcrData(result.words || result); // text or detailed object
                console.log(`✅ OCR: Page ${pageNum} processed.`);
            }
        } catch (e) {
            console.warn(`OCR Failed for page ${pageNum}`, e);
        } finally {
            setIsOcrProcessing(false);
        }
    };

    // Cleanup logic
    const cleanup = useCallback(() => {
        if (renderTaskRef.current) {
            renderTaskRef.current.cancel();
            renderTaskRef.current = null;
        }
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        if (textLayerRef.current) {
            textLayerRef.current.innerHTML = '';
        }
    }, []);

    // Effect to render using the scheduler
    useEffect(() => {
        let isCancelled = false;

        // Check if we can skip the heavy canvas rendering
        const canSkipCanvas = isStableRender.current &&
            lastRenderQuality.current === 'high' &&
            (quality === 'high' || quality === 'low');

        const renderJob = async () => {
            if (isCancelled) return;

            try {
                const page = await pdfDocument.getPage(pageNum);
                if (isCancelled) return;

                const displayViewport = page.getViewport({ scale, rotation });
                setDimensions({ width: displayViewport.width, height: displayViewport.height });

                // Update text layer if needed (it's fast and doesn't flicker the canvas)
                if (textLayerRef.current) {
                    renderTextLayer(page, displayViewport);
                }

                // Skip canvas redraw if already have a stable high-quality render
                if (canSkipCanvas) return;

                const viewport = page.getViewport({ scale: scale * (quality === 'low' ? 0.8 : 1.5), rotation });

                const canvas = canvasRef.current;
                if (!canvas) return;

                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                canvas.style.width = `${displayViewport.width}px`;
                canvas.style.height = `${displayViewport.height}px`;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                };

                const renderTask = page.render(renderContext);
                renderTaskRef.current = renderTask;
                await renderTask.promise;

                if (isCancelled) return;
                setIsRendered(true);
                lastRenderQuality.current = quality;

                // Mark as stable if rendered at high quality
                if (quality === 'high') {
                    isStableRender.current = true;
                }

                // Defer text layer for high performance
                if (quality !== 'low' && textLayerRef.current) {
                    renderTextLayer(page, displayViewport);
                }

            } catch (err) {
                if (err.name !== 'RenderingCancelledException') console.error(err);
            }
        };

        const renderTextLayer = async (page, viewport) => {
            const textContent = await page.getTextContent();
            if (isCancelled || !textLayerRef.current) return;

            textLayerRef.current.innerHTML = '';
            textLayerRef.current.style.width = `${viewport.width}px`;
            textLayerRef.current.style.height = `${viewport.height}px`;

            const fragment = document.createDocumentFragment();
            textContent.items.forEach((item, index) => {
                const tx = pdfjsLib.Util.transform(
                    pdfjsLib.Util.transform(viewport.transform, item.transform),
                    [1, 0, 0, -1, 0, 0]
                );

                const style = textContent.styles[item.fontName];
                const fontHeight = Math.sqrt((tx[2] * tx[2]) + (tx[3] * tx[3]));

                const span = document.createElement('span');
                span.textContent = item.str;
                span.style.left = `${tx[4]}px`;
                span.style.top = `${tx[5] - fontHeight}px`;
                span.style.fontSize = `${fontHeight}px`;
                span.style.fontFamily = 'sans-serif';
                span.style.position = 'absolute';
                span.style.color = 'transparent';
                span.style.whiteSpace = 'pre';
                span.style.cursor = isReading ? 'pointer' : (isMathMode ? 'crosshair' : 'text');
                span.style.transform = `scaleX(${item.width / (item.str.length * fontHeight)})`;
                span.style.transformOrigin = '0% 0%';

                span.addEventListener('click', (e) => {
                    if (isReading) onStartReading(pageNum, index);
                    else if (isMathMode) setActiveEquation(item.str);
                });

                fragment.appendChild(span);
            });
            textLayerRef.current.appendChild(fragment);
        };

        // Add to scheduler queue
        scheduler.addPageToQueue(pageNum, renderJob, quality === 'low' ? 50 : 100);

        return () => {
            isCancelled = true;
            // Only cancel task, don't clear canvas if we are potentially staying stable
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
                renderTaskRef.current = null;
            }
            scheduler.cancelPage(pageNum);
        };
    }, [pdfDocument, pageNum, scheduler, scale, rotation, quality]);

    // Reset stable state when scale or rotation changes
    useEffect(() => {
        isStableRender.current = false;
        lastRenderQuality.current = null;
    }, [scale, rotation]);

    return (
        <div
            ref={containerRef}
            className="pdf-page-container"
            style={{
                width: dimensions.width ? `${dimensions.width}px` : '600px',
                height: dimensions.height ? `${dimensions.height}px` : `${PAGE_HEIGHT_ESTIMATE * scale}px`,
                position: 'relative',
                backgroundColor: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                margin: '10px 0'
            }}
        >
            {!isRendered && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f0f0f0',
                    color: '#999',
                    fontSize: '12px'
                }}>
                    Rendering Page {pageNum}...
                </div>
            )}
            <canvas ref={canvasRef} />
            <div className="textLayer" ref={textLayerRef} style={{ position: 'absolute', top: 0, left: 0 }}>
                {/* Fallback OCR Layer if native text is missing */}
                {ocrData && (
                    <div className="ocr-layer" style={{
                        position: 'absolute', inset: 0,
                        color: 'transparent', whiteSpace: 'pre-wrap',
                        fontSize: `${12 * scale}px`, lineHeight: 1.5,
                        pointerEvents: 'all', userSelect: 'text', cursor: 'text',
                        padding: '20px', overflow: 'hidden'
                    }}>
                        {typeof ocrData === 'string' ? ocrData : ocrData.text}
                    </div>
                )}
            </div>
            <AnnotationLayer width={dimensions.width} height={dimensions.height} scale={scale} pageNum={pageNum} />

            {isActiveRecallMode && !isUnlocked && (
                <ActiveRecallOverlay pageNum={pageNum} onReveal={() => setIsUnlocked(true)} />
            )}
        </div>
    );
});

export default PDFViewer;
