import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

/**
 * Mobile-aware file picker utility
 * Uses Capacitor Filesystem API on mobile, falls back to web input on web
 */

export const isMobile = () => {
    return Capacitor.isNativePlatform();
};

/**
 * Pick a PDF file from device storage
 * @returns {Promise<File|null>} File object or null if cancelled
 */
export const pickPDFFile = async () => {
    if (!isMobile()) {
        // Web fallback - use standard file input
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/pdf';
            input.onchange = (e) => {
                const file = e.target.files?.[0];
                resolve(file || null);
            };
            input.click();
        });
    }

    // Mobile - use Capacitor Filesystem
    try {
        // Note: Capacitor doesn't have a built-in file picker
        // We'll use the web fallback for now, which works in WebView
        // For production, consider using @capacitor-community/file-picker plugin
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/pdf';
            input.onchange = (e) => {
                const file = e.target.files?.[0];
                resolve(file || null);
            };
            input.click();
        });
    } catch (error) {
        console.error('Error picking file:', error);
        return null;
    }
};

/**
 * Read file as ArrayBuffer for PDF.js
 * @param {File} file - File object
 * @returns {Promise<ArrayBuffer>}
 */
export const readFileAsArrayBuffer = async (file) => {
    if (file instanceof File) {
        return await file.arrayBuffer();
    }
    throw new Error('Invalid file object');
};

/**
 * Save PDF to device storage (mobile only)
 * @param {Blob} blob - PDF blob
 * @param {string} filename - Filename to save as
 */
export const savePDFToDevice = async (blob, filename) => {
    if (!isMobile()) {
        // Web fallback - trigger download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        return;
    }

    try {
        // Convert blob to base64
        const reader = new FileReader();
        const base64Data = await new Promise((resolve, reject) => {
            reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        // Save to device
        await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: Directory.Documents,
        });

        console.log('PDF saved to Documents folder');
    } catch (error) {
        console.error('Error saving PDF:', error);
        throw error;
    }
};
