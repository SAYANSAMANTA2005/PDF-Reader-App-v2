// src/components/OptimizedPDFViewer.jsx
// High-performance PDF viewer with virtualization, lazy loading, adaptive quality
// Prevents UI freezing on large PDFs (400+ pages)

import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { usePDFOptimizedViewer, usePDFIncrementalLoader } from '../hooks/usePDFOptimizedViewer';
import '../styles/optimizedPdfViewer.css';

// Set worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const OptimizedPDFViewer = ({ pdfUrl, file, options = {} }) => {
    const [pdfDocument, setPdfDocument] = useState(null);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [loadError, setLoadError] = useState(null);
    
    const containerRef = useRef(null);
    const pageContainersRef = useRef({});
    
    // Optimized viewer hook
    const viewer = usePDFOptimizedViewer(pdfDocument, {
        pageHeight: options.pageHeight || 1200,
        bufferPages: options.bufferPages || 2,
        cacheSize: options.cacheSize || 15,
        maxConcurrentRenders: options.maxConcurrentRenders || 2,
        debounceMs: options.debounceMs || 100,
    });
    
    // Incremental loader hook
    const loader = usePDFIncrementalLoader(pdfUrl, {
        onProgress: (progress) => {
            console.log(`Loading: ${progress.percentage}%`);
        },
    });
    
    // Load PDF
    useEffect(() => {
        const loadPDF = async () => {
            try {
                let pdfData;
                
                // Get PDF data from file or URL
                if (file) {
                    pdfData = await file.arrayBuffer();
                } else if (loader.pdfBuffer) {
                    pdfData = loader.pdfBuffer;
                } else if (pdfUrl) {
                    const response = await fetch(pdfUrl);
                    pdfData = await response.arrayBuffer();
                }
                
                // Load PDF
                const doc = await pdfjsLib.getDocument({ data: pdfData }).promise;
                
                setPdfDocument(doc);
                setTotalPages(doc.numPages);
                setLoadError(null);
                
            } catch (error) {
                console.error('Error loading PDF:', error);
                setLoadError(error.message);
            }
        };
        
        if (file || loader.pdfBuffer || pdfUrl) {
            loadPDF();
        }
        
    }, [file, pdfUrl, loader.pdfBuffer]);
    
    // Render visible pages
    useEffect(() => {
        const renderVisiblePages = async () => {
            if (!pdfDocument || viewer.visiblePages.length === 0) return;
            
            for (const pageNum of viewer.visiblePages) {
                const canvas = viewer.getPageCanvas(pageNum);
                if (canvas) {
                    const container = pageContainersRef.current[pageNum];
                    if (container) {
                        // Clear previous
                        container.innerHTML = '';
                        // Add canvas
                        container.appendChild(canvas.cloneNode(true));
                    }
                }
            }
        };
        
        renderVisiblePages();
        
    }, [viewer.visiblePages, pdfDocument]);
    
    /**
     * Navigate to page
     */
    const goToPage = (pageNum) => {
        const validPage = Math.max(1, Math.min(pageNum, totalPages));
        setCurrentPage(validPage);
        viewer.scrollToPage(validPage - 1);
    };
    
    /**
     * Next page
     */
    const nextPage = () => {
        goToPage(currentPage + 1);
    };
    
    /**
     * Previous page
     */
    const previousPage = () => {
        goToPage(Math.max(1, currentPage - 1));
    };
    
    /**
     * Render placeholder for page
     */
    const renderPagePlaceholder = (pageNum) => {
        return (
            <div
                key={pageNum}
                className="pdf-page-container"
                style={{
                    height: options.pageHeight || 1200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f5f5f5',
                    border: '1px solid #ddd',
                    marginBottom: '10px',
                    borderRadius: '4px',
                    position: 'relative',
                }}
                ref={(el) => {
                    if (el) pageContainersRef.current[pageNum] = el;
                }}
            >
                {viewer.visiblePages.includes(pageNum) ? (
                    <div className="page-loading">
                        {viewer.renderingQuality === 'low' && (
                            <span className="quality-badge">Low Quality (Scrolling...)</span>
                        )}
                        <p>Page {pageNum + 1}</p>
                    </div>
                ) : (
                    <span className="page-number-only">Page {pageNum + 1}</span>
                )}
            </div>
        );
    };
    
    if (loadError) {
        return (
            <div className="pdf-error">
                <h3>Error Loading PDF</h3>
                <p>{loadError}</p>
            </div>
        );
    }
    
    if (!pdfDocument) {
        return (
            <div className="pdf-loading">
                <div className="spinner"></div>
                <p>Loading PDF...</p>
                {loader.loadProgress > 0 && (
                    <div className="progress-bar">
                        <div 
                            className="progress-fill" 
                            style={{ width: `${loader.loadProgress}%` }}
                        >
                            {loader.loadProgress.toFixed(0)}%
                        </div>
                    </div>
                )}
            </div>
        );
    }
    
    return (
        <div className="optimized-pdf-viewer">
            {/* Toolbar */}
            <div className="pdf-toolbar">
                <button onClick={previousPage} disabled={currentPage <= 1}>
                    ← Previous
                </button>
                
                <span className="page-info">
                    Page {currentPage} / {totalPages}
                </span>
                
                <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => goToPage(parseInt(e.target.value))}
                    className="page-input"
                />
                
                <button onClick={nextPage} disabled={currentPage >= totalPages}>
                    Next →
                </button>
                
                {/* Performance info */}
                {options.showPerformance && viewer.performanceStats && (
                    <div className="performance-info">
                        <span>⚡ {viewer.performanceStats.averageRenderTime}</span>
                        <span>💾 {viewer.performanceStats.averageMemoryUsage}</span>
                    </div>
                )}
                
                {/* Quality indicator */}
                <span className={`quality-indicator ${viewer.renderingQuality}`}>
                    {viewer.renderingQuality === 'high' ? '🔷 High Quality' : '⚡ Fast Mode'}
                </span>
            </div>
            
            {/* PDF Container */}
            <div 
                className="pdf-pages-container"
                ref={containerRef}
                style={{
                    height: '800px',
                    overflowY: 'auto',
                    border: '1px solid #ccc',
                    backgroundColor: '#fff',
                }}
            >
                {Array.from({ length: totalPages }, (_, i) => renderPagePlaceholder(i))}
            </div>
            
            {/* Scroll indicator */}
            <div className="scroll-progress">
                <div 
                    className="scroll-thumb"
                    style={{
                        height: `${(currentPage / totalPages) * 100}%`,
                    }}
                ></div>
            </div>
        </div>
    );
};

export default OptimizedPDFViewer;
