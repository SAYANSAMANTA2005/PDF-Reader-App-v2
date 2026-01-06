// src/hooks/usePDFSafetyGuard.js
// Hook for integrating PDF Safety Guard into components

import { useState, useRef, useCallback } from 'react';
import { runFullPreflightCheck, cleanupPDFMemory, forceGarbageCollection, handleBlockedPDF } from '../utils/pdfPreflightCheck';

/**
 * Hook for PDF safety checking
 * Manages: preflight checks, loading states, warnings, memory cleanup
 */
export const usePDFSafetyGuard = (config = null) => {
    const [isChecking, setIsChecking] = useState(false);
    const [checkProgress, setCheckProgress] = useState(null);
    const [preflightResult, setPreflightResult] = useState(null);
    const [showWarning, setShowWarning] = useState(false);
    const [memoryStatus, setMemoryStatus] = useState(null);
    const abortControllerRef = useRef(null);
    const fileInputRef = useRef(null);

    /**
     * Cleanup PDF file from memory
     */
    const cleanupFile = useCallback(async () => {
        try {
            setMemoryStatus('Cleaning up PDF from memory...');

            // Clear file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

            // Trigger garbage collection
            forceGarbageCollection();

            setMemoryStatus('PDF successfully removed from memory');
            setTimeout(() => setMemoryStatus(null), 3000);

            return true;
        } catch (error) {
            console.error('Error in cleanupFile:', error);
            return false;
        }
    }, []);

    /**
     * Run preflight check on PDF
     */
    const check = useCallback(async (fileOrUrl) => {
        abortControllerRef.current = new AbortController();
        setIsChecking(true);
        setCheckProgress(null);
        setMemoryStatus(null);

        try {
            const result = await runFullPreflightCheck(fileOrUrl, {
                config,
                onProgress: (message) => setCheckProgress(message),
                abortSignal: abortControllerRef.current.signal,
            });

            setPreflightResult(result);

            // Handle blocked PDFs with cleanup
            if (result.status === 'BLOCKED') {
                setShowWarning(true);

                // Cleanup and notify
                await handleBlockedPDF(result, cleanupFile);
                setMemoryStatus('⚠️ Large PDF detected - Removed from memory');
            } else if (result.riskAssessment?.warnings?.length > 0) {
                setShowWarning(true);
            }

            return result;
        } catch (error) {
            console.error('Check error:', error);
            return null;
        } finally {
            setIsChecking(false);
            setCheckProgress(null);
        }
    }, [config, cleanupFile]);

    /**
     * Cancel ongoing check and cleanup
     */
    const cancel = useCallback(async () => {
        abortControllerRef.current?.abort();
        setIsChecking(false);
        setCheckProgress(null);
        await cleanupFile();
    }, [cleanupFile]);

    /**
     * Reset state and cleanup
     */
    const reset = useCallback(async () => {
        setPreflightResult(null);
        setShowWarning(false);
        setCheckProgress(null);
        setMemoryStatus(null);
        await cleanupFile();
    }, [cleanupFile]);

    return {
        isChecking,
        checkProgress,
        preflightResult,
        showWarning,
        memoryStatus,
        check,
        cancel,
        reset,
        cleanupFile,
        setShowWarning,
        fileInputRef,
    };
};

/**
 * Format result for user display
 */
export const formatPreflightResult = (result) => {
    switch (result.status) {
        case 'ALLOWED':
            return {
                isSafe: true,
                message: '✅ PDF is safe to load',
                canProceed: true,
            };

        case 'BLOCKED':
            return {
                isSafe: false,
                message: '⚠️ PDF exceeds safe limits',
                canProceed: false,
                reason: result.reason,
            };

        case 'CANCELLED':
            return {
                isSafe: null,
                message: '⏹️ Check cancelled',
                canProceed: false,
            };

        case 'ERROR':
            return {
                isSafe: null,
                message: `❌ Error: ${result.error}`,
                canProceed: false,
            };

        default:
            return {
                isSafe: null,
                message: 'Unknown result',
                canProceed: false,
            };
    }
};