// src/workers/pdfRenderWorker.js
// This worker handles all CPU-intensive PDF operations
// Workers run on separate threads, keeping main thread responsive

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// Track render tasks so we can cancel them
const renderTasks = new Map();

/**
 * Main message handler for render requests
 * Messages are non-blocking and executed asynchronously
 */
self.onmessage = async (event) => {
    const { type, payload, taskId } = event.data;

    try {
        switch (type) {
            case 'LOAD_PDF':
                await handleLoadPDF(payload, taskId);
                break;
            case 'RENDER_PAGE':
                await handleRenderPage(payload, taskId);
                break;
            case 'CANCEL_RENDER':
                await handleCancelRender(taskId);
                break;
            case 'GET_PAGE_METADATA':
                await handleGetPageMetadata(payload, taskId);
                break;
            case 'EXTRACT_TEXT':
                await handleExtractText(payload, taskId);
                break;
            default:
                sendError(taskId, `Unknown message type: ${type}`);
        }
    } catch (error) {
        sendError(taskId, error.message, error.stack);
    }
};

/**
 * LOAD_PDF: Parse PDF document and extract metadata
 * Runs once per document - subsequent operations reference cached PDF
 */
async function handleLoadPDF(payload, taskId) {
    const { file, cacheKey } = payload;
    
    try {
        // Convert ArrayBuffer to LoadingTask
        const pdf = await pdfjsLib.getDocument(file).promise;

        // Extract basic metadata without loading all pages
        const metadata = await pdf.getMetadata();
        const { numPages } = pdf;

        // Pre-calculate page dimensions to avoid blocking later
        const firstPage = await pdf.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1 });

        self.postMessage({
            type: 'PDF_LOADED',
            taskId,
            success: true,
            data: {
                cacheKey,
                numPages,
                title: metadata?.info?.Title || 'Untitled',
                author: metadata?.info?.Author || '',
                createdDate: metadata?.info?.CreationDate || '',
                defaultDimensions: {
                    width: viewport.width,
                    height: viewport.height
                }
            }
        }, [file]); // Transfer ownership of buffer
    } catch (error) {
        sendError(taskId, `PDF load failed: ${error.message}`);
    }
}

/**
 * RENDER_PAGE: Decode and render a page to canvas
 * Uses OffscreenCanvas when available (no blocking main thread)
 * Critical for smooth scrolling and responsiveness
 */
async function handleRenderPage(payload, taskId) {
    const { 
        cacheKey, 
        pageNum, 
        scale = 1, 
        rotation = 0 
    } = payload;

    try {
        // Get PDF from cache (main thread maintains reference)
        // For this worker, we'll receive it each time (simplified approach)
        // Advanced: Could implement shared cache across workers

        const startTime = performance.now();

        // This operation can be cancelled (if user scrolls away)
        const renderTask = {
            cancelled: false,
            promise: null
        };
        renderTasks.set(taskId, renderTask);

        // Check if render was already cancelled before starting
        if (renderTask.cancelled) {
            sendError(taskId, 'Render cancelled before start');
            return;
        }

        // Simulate getting PDF (in real implementation, pass ref or URL)
        // We'll receive full PDF data from main thread
        const pdfRef = self.pdfCache?.get(cacheKey);
        if (!pdfRef) {
            throw new Error('PDF not in worker cache');
        }

        const page = await pdfRef.getPage(pageNum);
        
        if (renderTask.cancelled) {
            sendError(taskId, 'Render cancelled during page load');
            return;
        }

        // Get viewport dimensions
        const viewport = page.getViewport({ scale, rotation });

        // Create OffscreenCanvas (doesn't block main thread)
        const offscreen = new OffscreenCanvas(viewport.width, viewport.height);
        const ctx = offscreen.getContext('2d');

        if (!ctx) {
            throw new Error('Failed to get canvas context');
        }

        // Render page to canvas
        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };

        const pageRenderTask = page.render(renderContext);
        renderTask.promise = pageRenderTask.promise;

        if (renderTask.cancelled) {
            pageRenderTask.cancel();
            sendError(taskId, 'Render cancelled before render start');
            return;
        }

        // Wait for render to complete
        await pageRenderTask.promise;

        if (renderTask.cancelled) {
            sendError(taskId, 'Render cancelled after completion');
            return;
        }

        // Convert canvas to ImageData for transfer
        const imageData = ctx.getImageData(0, 0, viewport.width, viewport.height);

        const renderTime = performance.now() - startTime;

        // Send result back to main thread
        self.postMessage({
            type: 'PAGE_RENDERED',
            taskId,
            success: true,
            data: {
                pageNum,
                imageData,
                dimensions: {
                    width: viewport.width,
                    height: viewport.height
                },
                renderTime,
                scale,
                rotation
            }
        }, [imageData.data.buffer]); // Transfer ownership of buffer

        renderTasks.delete(taskId);
    } catch (error) {
        sendError(taskId, `Render failed: ${error.message}`);
        renderTasks.delete(taskId);
    }
}

/**
 * CANCEL_RENDER: Abort render operation immediately
 * Called when user scrolls to different page or app unmounts
 * Prevents wasted rendering and frees up worker
 */
async function handleCancelRender(taskId) {
    const renderTask = renderTasks.get(taskId);
    
    if (renderTask) {
        renderTask.cancelled = true;
        
        if (renderTask.promise) {
            try {
                renderTask.promise.cancel();
            } catch (e) {
                // Already completed or error, ignore
            }
        }
        
        renderTasks.delete(taskId);
        
        self.postMessage({
            type: 'RENDER_CANCELLED',
            taskId,
            success: true
        });
    }
}

/**
 * GET_PAGE_METADATA: Extract page dimensions without rendering
 * Used for layout calculations, doesn't require image data
 */
async function handleGetPageMetadata(payload, taskId) {
    const { cacheKey, pageNum, scale = 1, rotation = 0 } = payload;

    try {
        const pdfRef = self.pdfCache?.get(cacheKey);
        if (!pdfRef) {
            throw new Error('PDF not in worker cache');
        }

        const page = await pdfRef.getPage(pageNum);
        const viewport = page.getViewport({ scale, rotation });

        self.postMessage({
            type: 'METADATA_EXTRACTED',
            taskId,
            success: true,
            data: {
                pageNum,
                width: viewport.width,
                height: viewport.height,
                scale,
                rotation
            }
        });
    } catch (error) {
        sendError(taskId, `Metadata extraction failed: ${error.message}`);
    }
}

/**
 * EXTRACT_TEXT: Get text from page for search indexing
 * Runs asynchronously without blocking main thread
 * Builds search index incrementally
 */
async function handleExtractText(payload, taskId) {
    const { cacheKey, pageNum, chunkSize = 100 } = payload;

    try {
        const pdfRef = self.pdfCache?.get(cacheKey);
        if (!pdfRef) {
            throw new Error('PDF not in worker cache');
        }

        const page = await pdfRef.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Extract text items
        const items = textContent.items.map(item => ({
            str: item.str,
            x: item.transform[4],
            y: item.transform[5],
            width: item.width,
            height: item.height
        }));

        // Join all text for search
        const fullText = items.map(item => item.str).join(' ');

        // Tokenize for search index (simple word splitting)
        const words = fullText
            .toLowerCase()
            .match(/\b\w+\b/g) || [];

        // Build inverted index for this page
        const pageIndex = {};
        words.forEach(word => {
            pageIndex[word] = (pageIndex[word] || 0) + 1;
        });

        self.postMessage({
            type: 'TEXT_EXTRACTED',
            taskId,
            success: true,
            data: {
                pageNum,
                items,
                fullText,
                wordCount: words.length,
                pageIndex
            }
        });
    } catch (error) {
        sendError(taskId, `Text extraction failed: ${error.message}`);
    }
}

/**
 * Helper: Send error message back to main thread
 */
function sendError(taskId, message, stack = '') {
    self.postMessage({
        type: 'ERROR',
        taskId,
        success: false,
        error: {
            message,
            stack
        }
    });
}

/**
 * Worker storage for PDF references (shared across messages)
 * Main thread will set this via structured clone
 */
self.pdfCache = new Map();

// Log that worker is ready
console.log('[PDF Render Worker] Initialized and ready for work');
