import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePDF } from '../context/PDFContext';
import * as pdfjsLib from 'pdfjs-dist';
import AnnotationLayer from './AnnotationLayer';

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
        startReading
    } = usePDF();

    const containerRef = useRef(null);
    const pageRefs = useRef({});

    // Scroll to current page when it changes 
    useEffect(() => {
        if (pageRefs.current[currentPage] && containerRef.current) {
            // Only scroll if the page is not already visible (optimization)
            // But for now, let's just scroll to view
        }
    }, [currentPage]);

    // Handle Scroll to update current page
    const handleScroll = useCallback(() => {
        if (!containerRef.current) return;

        // Find the page closest to the top
        const containerTop = containerRef.current.scrollTop;
        const containerHeight = containerRef.current.clientHeight;
        const center = containerTop + containerHeight / 2;

        let bestPage = 1;
        let minDistance = Infinity;

        for (let i = 1; i <= numPages; i++) {
            const el = pageRefs.current[i];
            if (el) {
                const rect = el.getBoundingClientRect();
                const distanceFromCenter = Math.abs(rect.top + rect.height / 2 - window.innerHeight / 2);
                if (distanceFromCenter < minDistance) {
                    minDistance = distanceFromCenter;
                    bestPage = i;
                }
            }
        }

        if (bestPage !== currentPage) {
            setCurrentPage(bestPage);
        }
    }, [numPages, currentPage, setCurrentPage]);

    // Attach scroll listener
    useEffect(() => {
        const container = containerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll, { passive: true });
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [handleScroll]);

    // Imperative scroll when currentPage changes from external source (Thumbnail/Toolbar)
    useEffect(() => {
        const el = pageRefs.current[currentPage];
        const container = containerRef.current;
        if (el && container) {
            // Check if element is in view
            const rect = el.getBoundingClientRect();
            const inView = (
                rect.top >= 0 &&
                rect.bottom <= window.innerHeight
            );

            if (!inView) {
                el.scrollIntoView({ behavior: 'auto', block: 'start' });
            }
        }
    }, [currentPage]);

    return (
        <div className="viewer-scroll-container" ref={containerRef} style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
            <div
                className="viewer-content"
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    padding: '2rem',
                    gap: '2rem',
                    maxWidth: isTwoPageMode ? 'fit-content' : '100%',
                    margin: '0 auto'
                }}
            >
                {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                    <div
                        key={pageNum}
                        ref={el => pageRefs.current[pageNum] = el}
                        style={{
                            flex: isTwoPageMode ? '0 0 auto' : '1 1 100%',
                            display: 'flex',
                            justifyContent: 'center'
                        }}
                    >
                        <PDFPage
                            pageNum={pageNum}
                            pdfDocument={pdfDocument}
                            scale={scale}
                            rotation={rotation}
                            isReading={isReading}
                            onStartReading={startReading}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

const PDFPage = ({ pageNum, pdfDocument, scale, rotation, isReading, onStartReading }) => {
    const canvasRef = useRef(null);
    const textLayerRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Intersection Observer to lazy load
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '500px' }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // Render Page
    useEffect(() => {
        if (!isVisible || !pdfDocument || !canvasRef.current) return;

        let isCancelled = false;

        const renderPage = async () => {
            try {
                const page = await pdfDocument.getPage(pageNum);

                if (isCancelled) return;

                const viewport = page.getViewport({ scale, rotation });
                setDimensions({ width: viewport.width, height: viewport.height });

                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                };

                await page.render(renderContext).promise;

                // Text Layer with Read Aloud support
                if (textLayerRef.current) {
                    const textContent = await page.getTextContent();
                    if (isCancelled) return;

                    textLayerRef.current.innerHTML = '';
                    textLayerRef.current.style.width = `${viewport.width}px`;
                    textLayerRef.current.style.height = `${viewport.height}px`;
                    textLayerRef.current.style.setProperty('--scale-factor', scale);

                    textContent.items.forEach((item, index) => {
                        const tx = pdfjsLib.Util.transform(
                            pdfjsLib.Util.transform(viewport.transform, item.transform),
                            [1, 0, 0, -1, 0, 0]
                        );

                        const style = textContent.styles[item.fontName];
                        const fontHeight = Math.sqrt((tx[2] * tx[2]) + (tx[3] * tx[3]));

                        if (style) {
                            const span = document.createElement('span');
                            span.textContent = item.str;
                            span.style.left = `${tx[4]}px`;
                            span.style.top = `${tx[5] - fontHeight}px`;
                            span.style.fontSize = `${fontHeight}px`;
                            span.style.fontFamily = 'sans-serif';
                            span.style.position = 'absolute';
                            span.style.color = 'transparent';
                            span.style.whiteSpace = 'pre';
                            span.style.cursor = isReading ? 'pointer' : 'text'; // Visual cue

                            // Transform for width (basic approx)
                            span.style.transform = `scaleX(${item.width / (item.str.length * fontHeight)})`;
                            span.style.transformOrigin = '0% 0%';


                            // Read Aloud Interaction
                            span.onclick = (e) => {
                                if (isReading) {
                                    e.stopPropagation();
                                    e.preventDefault(); // Prevent text selection

                                    // Highlight spoken text? (Future)
                                    // Start reading from this point
                                    console.log(`Starting reading from page ${pageNum}, item ${index}`);
                                    onStartReading(pageNum, index);
                                }
                            };

                            textLayerRef.current.appendChild(span);
                        }
                    });
                }

            } catch (err) {
                console.error("Page render error:", err);
            }
        };

        renderPage();

        return () => {
            isCancelled = true;
        };
    }, [isVisible, pdfDocument, pageNum, scale, rotation, isReading, onStartReading]);

    return (
        <div
            className="pdf-page-container"
            ref={containerRef}
            data-page-number={pageNum}
            style={{
                width: dimensions.width ? `${dimensions.width}px` : '600px',
                height: dimensions.height ? `${dimensions.height}px` : '800px',
                position: 'relative'
            }}
        >
            <canvas ref={canvasRef} />
            <div className="textLayer" ref={textLayerRef} style={{ position: 'absolute', top: 0, left: 0 }}></div>
            <AnnotationLayer width={dimensions.width} height={dimensions.height} scale={scale} pageNum={pageNum} />
        </div>
    );
};

export default PDFViewer;
