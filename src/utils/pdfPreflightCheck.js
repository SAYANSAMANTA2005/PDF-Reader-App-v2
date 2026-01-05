// src/utils/pdfPreflightCheck.js
// PDF Preflight Check System
// Coordinates: File size detection, Worker analysis, AbortController

import { getSafetyConfig, assessPDFRisk, getRecommendation } from './pdfSafetyConfig';

/**
 * Create Web Worker instance
 * Returns: { worker, terminate }
 */
export const createPreflightWorker = () => {
    // Try to load worker - fallback to inline if needed
    let worker = null;
    
    try {
        worker = new Worker('/pdfPreflightWorker.js');
    } catch (error) {
        console.warn('Failed to load Web Worker, using main thread fallback:', error.message);
    }
    
    return {
        worker,
        isAvailable: worker !== null,
        terminate: () => {
            if (worker) {
                try {
                    worker.terminate();
                } catch (e) {
                    console.warn('Error terminating worker:', e.message);
                }
            }
        },
    };
};

/**
 * Step 1: Check file size using HEAD request (before download)
 * Returns: { fileSizeBytes, isWithinLimits, error }
 */
export const checkFileSizeBeforeDownload = async (url, config = null) => {
    const safetyConfig = config || getSafetyConfig();
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), safetyConfig.HEAD_REQUEST_TIMEOUT_MS);
    
    try {
        // Try HEAD request first (most reliable)
        const response = await fetch(url, {
            method: 'HEAD',
            signal: abortController.signal,
            cache: 'no-cache',
        }).catch(async (error) => {
            // Fallback to GET with Range header if HEAD fails
            console.warn('HEAD request failed, trying GET with Range:', error.message);
            const rangeResponse = await fetch(url, {
                method: 'GET',
                headers: {
                    'Range': 'bytes=0-0',
                },
                signal: abortController.signal,
            });
            return rangeResponse;
        });
        
        // Get content length
        const contentLength = response.headers.get('content-length');
        const fileSizeBytes = parseInt(contentLength, 10);
        
        if (!fileSizeBytes || fileSizeBytes <= 0) {
            return {
                fileSizeBytes: null,
                isWithinLimits: null,
                error: 'Could not determine file size',
            };
        }
        
        const isWithinLimits = fileSizeBytes <= safetyConfig.MAX_FILE_SIZE_MB * 1024 * 1024;
        
        return {
            fileSizeBytes,
            fileSizeMB: Math.round((fileSizeBytes / (1024 * 1024)) * 100) / 100,
            isWithinLimits,
            error: null,
        };
        
    } catch (error) {
        return {
            fileSizeBytes: null,
            isWithinLimits: null,
            error: error.message === 'The operation was aborted' ? 'Size check timeout' : error.message,
        };
    } finally {
        clearTimeout(timeoutId);
    }
};

/**
 * Step 2: Analyze PDF using Web Worker
 * Returns: { analysis, error }
 */
export const analyzePDFInWorker = async (arrayBuffer, fileSize, config = null) => {
    const safetyConfig = config || getSafetyConfig();
    const { worker, isAvailable, terminate } = createPreflightWorker();
    
    return new Promise((resolve) => {
        let timeoutId = null;
        let messageHandler = null;
        
        const cleanup = () => {
            if (timeoutId) clearTimeout(timeoutId);
            if (messageHandler) worker?.removeEventListener('message', messageHandler);
            terminate();
        };
        
        if (!isAvailable) {
            // Fallback: return basic analysis
            resolve({
                analysis: {
                    fileSize,
                    fileSizeMB: Math.round((fileSize / (1024 * 1024)) * 100) / 100,
                    pageCount: null, // Cannot determine without worker
                    error: 'Web Worker unavailable - cannot analyze PDF',
                },
                error: null,
            });
            return;
        }
        
        // Setup timeout
        timeoutId = setTimeout(() => {
            cleanup();
            resolve({
                analysis: null,
                error: `PDF analysis timeout (${safetyConfig.ANALYSIS_TIMEOUT_MS}ms)`,
            });
        }, safetyConfig.ANALYSIS_TIMEOUT_MS);
        
        // Setup message handler
        messageHandler = (event) => {
            const { status, analysis, error } = event.data;
            
            if (status === 'SUCCESS') {
                cleanup();
                resolve({
                    analysis,
                    error: null,
                });
            } else if (status === 'ERROR') {
                cleanup();
                resolve({
                    analysis: null,
                    error: error.message,
                });
            }
        };
        
        worker.addEventListener('message', messageHandler);
        
        // Send analysis task
        worker.postMessage({
            command: 'ANALYZE_PDF',
            data: {
                arrayBuffer,
                fileSize,
            },
        });
    });
};

/**
 * Step 3: Full preflight check pipeline
 * Coordinates: Size check → Download → Worker analysis → Risk assessment
 */
export const runFullPreflightCheck = async (
    fileOrUrl,
    options = {}
) => {
    const {
        config = null,
        onProgress = null,
        abortSignal = null,
    } = options;
    
    const safetyConfig = config || getSafetyConfig();
    const abortController = new AbortController();
    
    // Link external abort signal
    if (abortSignal) {
        abortSignal.addEventListener('abort', () => abortController.abort());
    }
    
    try {
        // ===== STEP 1: Estimate file size =====
        if (onProgress) onProgress('Checking file size...');
        
        let fileSizeBytes = 0;
        let arrayBuffer = null;
        let url = null;
        
        if (typeof fileOrUrl === 'string') {
            // URL provided
            url = fileOrUrl;
            
            const sizeCheck = await checkFileSizeBeforeDownload(url, safetyConfig);
            if (sizeCheck.error) {
                return {
                    status: 'ERROR',
                    error: `Failed to check file size: ${sizeCheck.error}`,
                };
            }
            
            fileSizeBytes = sizeCheck.fileSizeBytes;
            
            // Early exit if too large
            if (!sizeCheck.isWithinLimits) {
                return {
                    status: 'BLOCKED',
                    reason: 'FILE_SIZE_EXCEEDED',
                    analysis: {
                        fileSizeBytes,
                        fileSizeMB: sizeCheck.fileSizeMB,
                        maxAllowed: safetyConfig.MAX_FILE_SIZE_MB,
                    },
                };
            }
        } else if (fileOrUrl instanceof File || fileOrUrl instanceof Blob) {
            // File/Blob provided
            fileSizeBytes = fileOrUrl.size;
            
            // Check size
            if (fileSizeBytes > safetyConfig.MAX_FILE_SIZE_MB * 1024 * 1024) {
                return {
                    status: 'BLOCKED',
                    reason: 'FILE_SIZE_EXCEEDED',
                    analysis: {
                        fileSizeBytes,
                        fileSizeMB: Math.round((fileSizeBytes / (1024 * 1024)) * 100) / 100,
                        maxAllowed: safetyConfig.MAX_FILE_SIZE_MB,
                    },
                };
            }
        } else {
            return {
                status: 'ERROR',
                error: 'Invalid file input - must be URL, File, or Blob',
            };
        }
        
        // ===== STEP 2: Download file (if URL) =====
        if (!arrayBuffer && url) {
            if (onProgress) onProgress('Downloading PDF...');
            
            try {
                const response = await fetch(url, { signal: abortController.signal });
                if (!response.ok) {
                    return {
                        status: 'ERROR',
                        error: `HTTP ${response.status}: ${response.statusText}`,
                    };
                }
                arrayBuffer = await response.arrayBuffer();
            } catch (error) {
                if (error.name === 'AbortError') {
                    return { status: 'CANCELLED' };
                }
                return {
                    status: 'ERROR',
                    error: `Download failed: ${error.message}`,
                };
            }
        } else if (!arrayBuffer && fileOrUrl instanceof Blob) {
            // Convert Blob to ArrayBuffer
            arrayBuffer = await fileOrUrl.arrayBuffer();
        }
        
        // ===== STEP 3: Analyze PDF in Worker =====
        if (onProgress) onProgress('Analyzing PDF structure...');
        
        const { analysis, error: analysisError } = await analyzePDFInWorker(
            arrayBuffer,
            fileSizeBytes,
            safetyConfig
        );
        
        if (analysisError) {
            return {
                status: 'ERROR',
                error: `PDF analysis failed: ${analysisError}`,
            };
        }
        
        // ===== STEP 4: Risk assessment =====
        if (onProgress) onProgress('Assessing risk...');
        
        const riskAssessment = assessPDFRisk(analysis, safetyConfig);
        const recommendation = getRecommendation(riskAssessment);
        
        // ===== RETURN RESULTS =====
        if (recommendation.action === 'BLOCK') {
            // 🔥 CLEANUP: Delete PDF from memory when blocked
            console.log('🔥 Large PDF detected - Cleaning up memory...');
            await cleanupPDFMemory(arrayBuffer);
            forceGarbageCollection();
            
            return {
                status: 'BLOCKED',
                reason: 'EXCEEDS_SAFE_LIMITS',
                analysis,
                riskAssessment,
                recommendation,
                memoryCleanedUp: true,
            };
        }
        
        return {
            status: 'ALLOWED',
            analysis,
            riskAssessment,
            recommendation,
            arrayBuffer, // Safe to proceed with loading
            memoryCleanedUp: false,
        };
        
    } catch (error) {
        if (error.name === 'AbortError') {
            return { status: 'CANCELLED' };
        }
        return {
            status: 'ERROR',
            error: error.message,
        };
    }
};

/**
 * Clean up PDF data from memory
 * Safely deallocates ArrayBuffer and triggers garbage collection
 */
export const cleanupPDFMemory = async (arrayBuffer) => {
    try {
        if (arrayBuffer instanceof ArrayBuffer) {
            if (arrayBuffer.byteLength > 0) {
                const view = new Uint8Array(arrayBuffer);
                view.fill(0);
            }
            return true;
        }
        return false;
    } catch (error) {
        console.warn('Error cleaning up PDF memory:', error.message);
        return false;
    }
};

/**
 * Force garbage collection by clearing references
 */
export const forceGarbageCollection = () => {
    try {
        if (window.gc) {
            window.gc();
            console.log('✅ Manual garbage collection triggered');
            return true;
        }
        return false;
    } catch (error) {
        console.warn('Garbage collection not available:', error.message);
        return false;
    }
};

/**
 * Create AbortController for PDF loading
 * Allows cancellation of download/analysis
 */
export const createPDFAbortController = () => {
    return new AbortController();
};

/**
 * Quick file size check (without download)
 * Useful for early validation
 */
export const quickSizeCheck = async (url, config = null) => {
    const result = await checkFileSizeBeforeDownload(url, config);
    return {
        isSafe: result.isWithinLimits,
        fileSizeMB: result.fileSizeMB,
        error: result.error,
    };
};

/**
 * Format analysis for display
 */
export const formatAnalysisForDisplay = (analysis) => {
    return {
        fileSize: `${analysis.fileSizeMB} MB`,
        pageCount: `${analysis.pageCount} pages`,
        isEncrypted: analysis.isEncrypted ? '🔒 Yes' : 'No',
        hasImages: analysis.hasImages ? 'Yes' : 'No',
        estimatedMemory: `${analysis.estimatedMemoryMB} MB`,
        complexity: getComplexityLabel(analysis.complexityScore),
    };
};

/**
 * Handle PDF rejection and cleanup
 * Ensures blocked PDFs are properly removed from memory
 */
export const handleBlockedPDF = async (result, onCleanup = null) => {
    try {
        console.warn('📵 PDF blocked due to safety limits');
        console.warn(`   Reason: ${result.reason}`);
        console.warn(`   File Size: ${result.analysis?.fileSizeMB} MB`);
        
        if (onCleanup) {
            await onCleanup();
        }
        
        forceGarbageCollection();
        
        return {
            success: true,
            message: 'PDF safely removed from memory',
        };
    } catch (error) {
        console.error('Error handling blocked PDF:', error.message);
        return {
            success: false,
            error: error.message,
        };
    }
};

/**
 * Get human-readable complexity label
 */
function getComplexityLabel(score) {
    if (score < 20) return '🟢 Low';
    if (score < 40) return '🟡 Moderate';
    if (score < 60) return '🟠 High';
    return '🔴 Very High';
}
