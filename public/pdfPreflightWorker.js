// public/pdfPreflightWorker.js
// Web Worker for analyzing PDFs without blocking main thread
// Handles: Page count detection, metadata extraction, validation
// Does NOT render any pages - only analysis

// Import PDF.js (already loaded in main app)
importScripts('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');

// Global PDF worker setup
pdfjsWorker.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/**
 * Main message handler
 * Receives: { command, data }
 * Sends back: { status, analysis, error }
 */
self.onmessage = async (event) => {
    const { command, data, messageId } = event.data;
    
    try {
        let result;
        
        switch (command) {
            case 'ANALYZE_PDF':
                result = await analyzePDF(data);
                break;
                
            case 'GET_PAGE_COUNT':
                result = await getPageCount(data);
                break;
                
            case 'VALIDATE_PDF':
                result = await validatePDF(data);
                break;
                
            case 'EXTRACT_METADATA':
                result = await extractMetadata(data);
                break;
                
            default:
                throw new Error(`Unknown command: ${command}`);
        }
        
        self.postMessage({
            messageId,
            status: 'SUCCESS',
            analysis: result,
        });
        
    } catch (error) {
        self.postMessage({
            messageId,
            status: 'ERROR',
            error: {
                message: error.message,
                stack: error.stack,
            },
        });
    }
};

/**
 * Complete PDF analysis
 * Returns: { pageCount, fileSize, metadata, isEncrypted, hasImages, avgPageSize, ... }
 */
async function analyzePDF(data) {
    const { arrayBuffer, fileSize } = data;
    
    // Load PDF without rendering
    const pdf = await pdfjsWorker.getDocument({
        data: new Uint8Array(arrayBuffer),
        disableAutoFetch: false,
        disableStream: false,
    }).promise;
    
    try {
        // Get basic info
        const pageCount = pdf.numPages;
        const metadata = await pdf.getMetadata().catch(() => ({}));
        const isEncrypted = pdf.isEncrypted;
        
        // Estimate page metrics without rendering
        let totalTextSize = 0;
        let maxPageWidth = 0;
        let maxPageHeight = 0;
        let hasImages = false;
        let pageAnalysis = [];
        
        // Analyze first few pages to estimate metrics
        const samplesToCheck = Math.min(5, pageCount);
        const sampleIndices = [0, Math.floor(pageCount / 4), Math.floor(pageCount / 2), Math.floor(pageCount * 3 / 4), pageCount - 1].filter((i, idx) => idx < samplesToCheck);
        
        for (const pageIndex of sampleIndices) {
            try {
                const page = await pdf.getPage(pageIndex + 1);
                const viewport = page.getViewport({ scale: 1 });
                
                maxPageWidth = Math.max(maxPageWidth, viewport.width);
                maxPageHeight = Math.max(maxPageHeight, viewport.height);
                
                // Check for images without rendering
                const operatorList = await page.getOperatorList();
                if (operatorList && operatorList.fnArray) {
                    const hasImageOps = operatorList.fnArray.some((fn, idx) => {
                        const fnNames = [
                            pdfjsWorker.OPS.paintInlineImageXObject,
                            pdfjsWorker.OPS.paintImageXObject,
                            pdfjsWorker.OPS.paintShadingPattern,
                        ];
                        return fnNames.includes(fn);
                    });
                    
                    if (hasImageOps) {
                        hasImages = true;
                    }
                }
                
                // Get text size estimate
                const textContent = await page.getTextContent();
                if (textContent && textContent.items) {
                    totalTextSize += textContent.items.reduce((sum, item) => sum + (item.str ? item.str.length : 0), 0);
                }
                
                pageAnalysis.push({
                    pageNum: pageIndex + 1,
                    width: viewport.width,
                    height: viewport.height,
                });
            } catch (err) {
                console.warn(`Error analyzing page ${pageIndex + 1}:`, err.message);
            }
        }
        
        // Calculate averages
        const avgPageWidth = pageAnalysis.length > 0 ? pageAnalysis.reduce((sum, p) => sum + p.width, 0) / pageAnalysis.length : 612;
        const avgPageHeight = pageAnalysis.length > 0 ? pageAnalysis.reduce((sum, p) => sum + p.height, 0) / pageAnalysis.length : 792;
        const avgTextPerPage = samplesToCheck > 0 ? totalTextSize / samplesToCheck : 0;
        
        // Estimate memory usage
        const estimatedPageMemory = (avgPageWidth * avgPageHeight * 4) / (1024 * 1024); // RGBA pixels in MB
        const estimatedTotalMemory = 15 + (pageCount * 2) + (estimatedPageMemory * pageCount * 0.3); // Base + text + images
        
        return {
            pageCount,
            fileSize,
            fileSizeMB: Math.round((fileSize / (1024 * 1024)) * 100) / 100,
            isEncrypted,
            hasImages,
            hasHighResolution: (avgPageWidth > 800 && avgPageHeight > 1000) || hasImages,
            metadata: {
                title: metadata.info?.Title || 'Unknown',
                author: metadata.info?.Author || 'Unknown',
                producer: metadata.info?.Producer || 'Unknown',
                creationDate: metadata.info?.CreationDate || null,
            },
            pageMetrics: {
                avgWidth: Math.round(avgPageWidth),
                avgHeight: Math.round(avgPageHeight),
                avgTextLength: Math.round(avgTextPerPage),
                maxWidth: Math.round(maxPageWidth),
                maxHeight: Math.round(maxPageHeight),
            },
            estimatedMemoryMB: Math.round(estimatedTotalMemory * 100) / 100,
            complexityScore: calculateComplexity(pageCount, fileSize, hasImages),
            analysisTimestamp: new Date().toISOString(),
        };
        
    } finally {
        // Always cleanup
        try {
            pdf.destroy();
        } catch (e) {
            console.warn('Error destroying PDF:', e.message);
        }
    }
}

/**
 * Get page count only (faster)
 */
async function getPageCount(data) {
    const { arrayBuffer } = data;
    
    const pdf = await pdfjsWorker.getDocument({
        data: new Uint8Array(arrayBuffer),
        disableAutoFetch: true,
        disableStream: true,
    }).promise;
    
    try {
        return {
            pageCount: pdf.numPages,
        };
    } finally {
        try {
            pdf.destroy();
        } catch (e) {
            // Ignore
        }
    }
}

/**
 * Validate PDF structure
 */
async function validatePDF(data) {
    const { arrayBuffer } = data;
    
    try {
        const pdf = await pdfjsWorker.getDocument({
            data: new Uint8Array(arrayBuffer),
            disableAutoFetch: true,
        }).promise;
        
        try {
            const isValid = pdf.numPages > 0;
            return {
                isValid,
                pageCount: pdf.numPages,
            };
        } finally {
            try {
                pdf.destroy();
            } catch (e) {
                // Ignore
            }
        }
    } catch (error) {
        return {
            isValid: false,
            error: error.message,
        };
    }
}

/**
 * Extract metadata without full analysis
 */
async function extractMetadata(data) {
    const { arrayBuffer, fileSize } = data;
    
    const pdf = await pdfjsWorker.getDocument({
        data: new Uint8Array(arrayBuffer),
        disableAutoFetch: true,
    }).promise;
    
    try {
        const metadata = await pdf.getMetadata().catch(() => ({}));
        
        return {
            pageCount: pdf.numPages,
            isEncrypted: pdf.isEncrypted,
            fileSize,
            fileSizeMB: Math.round((fileSize / (1024 * 1024)) * 100) / 100,
            title: metadata.info?.Title || 'Unknown',
            author: metadata.info?.Author || 'Unknown',
            producer: metadata.info?.Producer || 'Unknown',
        };
    } finally {
        try {
            pdf.destroy();
        } catch (e) {
            // Ignore
        }
    }
}

/**
 * Calculate complexity score (1-100)
 * Considers: page count, file size, image content
 */
function calculateComplexity(pageCount, fileSize, hasImages) {
    const fileSizeMB = fileSize / (1024 * 1024);
    
    let score = 0;
    
    // Page count contribution (0-40)
    score += Math.min((pageCount / 300) * 40, 40);
    
    // File size contribution (0-40)
    score += Math.min((fileSizeMB / 50) * 40, 40);
    
    // Image presence (0-20)
    score += hasImages ? 20 : 0;
    
    return Math.round(score);
}

// Fallback error handler
self.onerror = (error) => {
    console.error('Worker error:', error);
    self.postMessage({
        status: 'ERROR',
        error: {
            message: error.message || 'Unknown worker error',
        },
    });
};
